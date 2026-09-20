import { Injectable, BadRequestException, ServiceUnavailableException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { PrismaService } from '../../common/prisma.service';
import { EmailService } from '../../common/email/email.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export interface VerifyPaymentInput {
  orderId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private client?: Razorpay;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID')?.trim();
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET')?.trim();
    if (keyId && keySecret) this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  // Step 1 of the flow: backend creates a Razorpay order for an existing
  // First Faith order and records the provider reference. The amount is
  // read from our own DB record, never from the client request body.
  async createPaymentOrder(orderId: string, userId: string) {
    if (!this.client) throw new ServiceUnavailableException('Online payments are not configured');
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new BadRequestException('Order not found');
    if (order.paymentMethod !== 'RAZORPAY') throw new BadRequestException('This order does not use online payment');

    let razorpayOrder: { id: string; amount: number | string; currency: string };
    try {
      const res = await this.client.orders.create({
        amount: Math.round(Number(order.grandTotal) * 100), // paise
        currency: 'INR',
        receipt: order.orderNumber,
      });
      razorpayOrder = {
        id: res.id,
        amount: res.amount,
        currency: res.currency,
      };
    } catch (err: any) {
      const msg = err?.error?.description || err?.message || 'Razorpay order creation failed';
      this.logger.error(`Razorpay orders.create error for order #${order.orderNumber}: ${msg} (status: ${err?.statusCode})`);
      throw new BadRequestException(`Payment gateway error: ${msg}`);
    }

    await this.prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        provider: 'RAZORPAY',
        providerOrderId: razorpayOrder.id,
        amount: order.grandTotal,
        status: PaymentStatus.CREATED,
      },
      update: {
        providerOrderId: razorpayOrder.id,
        status: PaymentStatus.CREATED,
      },
    });

    return {
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: this.config.get<string>('RAZORPAY_KEY_ID')?.trim(),
    };
  }

  // Client verification endpoint: called by frontend after Razorpay modal completes
  async verifyPayment(dto: VerifyPaymentInput, userId: string) {
    // STEP 1: Validate the authenticated First Faith order
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
      include: {
        user: { select: { fullName: true, email: true } },
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { orderId: dto.orderId },
    });

    if (!payment) {
      throw new BadRequestException('Payment record not found for this order');
    }

    // Idempotency: if already paid/captured, return success without duplicate processing
    if (order.status === OrderStatus.PAID && payment.status === PaymentStatus.CAPTURED) {
      return {
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        alreadyProcessed: true,
      };
    }

    // STEP 2: Verify that the submitted razorpayOrderId exactly matches the Razorpay order ID stored for that First Faith Payment record
    if (!payment.providerOrderId || payment.providerOrderId !== dto.razorpayOrderId) {
      throw new BadRequestException('Razorpay order ID does not match order payment record');
    }

    // STEP 3: Verify the Razorpay signature using:
    // razorpay_order_id + "|" + razorpay_payment_id and the server-side RAZORPAY_KEY_SECRET
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET')?.trim();
    if (!keySecret || !this.client) {
      throw new ServiceUnavailableException('Payment verification not configured');
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
      .digest('hex');

    const signatureBuffer = Buffer.from(dto.razorpaySignature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    const isSignatureValid =
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, signatureBuffer);

    if (!isSignatureValid) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw new BadRequestException('Payment verification failed: Invalid payment signature');
    }

    // STEP 4: AFTER the signature is valid, make a server-to-server Razorpay API request
    // using the existing Razorpay SDK/client: payments.fetch(razorpayPaymentId)
    let razorpayPayment: any;
    try {
      razorpayPayment = await this.client.payments.fetch(dto.razorpayPaymentId);
    } catch (fetchErr: any) {
      const fetchMsg = fetchErr?.error?.description || fetchErr?.message || 'Payment not found on gateway';
      this.logger.error(`Razorpay payments.fetch error for payment ${dto.razorpayPaymentId}: ${fetchMsg}`);
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw new BadRequestException(`Payment gateway verification failed: ${fetchMsg}`);
    }

    // STEP 5: Verify the returned Razorpay payment:
    // - payment exists
    if (!razorpayPayment || !razorpayPayment.id) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw new BadRequestException('Razorpay payment not found on gateway');
    }

    // - payment belongs to the expected Razorpay order
    if (razorpayPayment.order_id !== dto.razorpayOrderId) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw new BadRequestException('Razorpay payment does not match expected order');
    }

    // - payment amount matches the First Faith order amount (calculated server-side from DB)
    const expectedAmountPaise = Math.round(Number(order.grandTotal) * 100);
    if (Number(razorpayPayment.amount) !== expectedAmountPaise) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw new BadRequestException('Payment amount mismatch with order total');
    }

    // - currency matches INR
    if (razorpayPayment.currency !== 'INR') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw new BadRequestException('Payment currency mismatch: expected INR');
    }

    // - status is valid for successful payment/capture
    if (razorpayPayment.status === 'authorized') {
      try {
        razorpayPayment = await this.client.payments.capture(
          dto.razorpayPaymentId,
          expectedAmountPaise,
          'INR',
        );
      } catch (captureErr: any) {
        const capMsg = captureErr?.error?.description || captureErr?.message || 'Payment capture failed';
        this.logger.error(`Razorpay payments.capture error for ${dto.razorpayPaymentId}: ${capMsg}`);
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        });
        throw new BadRequestException(`Payment capture failed: ${capMsg}`);
      }
    }

    if (razorpayPayment.status !== 'captured') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw new BadRequestException(`Payment not captured on gateway (status: ${razorpayPayment.status})`);
    }

    // STEP 6: Only after all checks succeed:
    // - Payment.status = CAPTURED
    // - Order.status = PAID
    // - preserve existing transaction/idempotency behavior
    // - preserve existing admin notification behavior
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CAPTURED,
          providerPaymentId: dto.razorpayPaymentId,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID },
      });

      await tx.adminNotification.create({
        data: {
          type: 'NEW_ORDER',
          title: `New Paid Order #${order.orderNumber}`,
          message: `Order #${order.orderNumber} paid via Razorpay by ${order.user?.fullName || order.user?.email || 'Customer'} for ₹${Number(order.grandTotal).toLocaleString('en-IN')}`,
          orderId: order.id,
          isRead: false,
        },
      });
    });

    // Send admin email notification (async, non-blocking)
    try {
      const itemCount = order.items.reduce((sum, it) => sum + it.quantity, 0);
      this.emailService
        .sendAdminNewOrderEmail({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.user?.fullName || null,
          customerEmail: order.user?.email || '',
          orderDate: order.createdAt || new Date(),
          itemCount,
          totalAmount: Number(order.grandTotal),
          paymentStatus: PaymentStatus.CAPTURED,
          orderStatus: OrderStatus.PAID,
        })
        .catch((err) => {
          this.logger.error(
            `Non-blocking admin alert email error for #${order.orderNumber}: ${err.message}`,
          );
        });
    } catch (emailErr: any) {
      this.logger.error(`Failed to trigger admin order alert email: ${emailErr.message}`);
    }

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  }

  // Step 2: webhook handler. Verifies the HMAC signature Razorpay sends
  // against our webhook secret BEFORE trusting anything in the payload.
  async handleWebhook(rawBody: Buffer, signature: string) {
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!secret || !signature) throw new BadRequestException('Invalid webhook signature');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    let payload: any;
    try { payload = JSON.parse(rawBody.toString()); } catch { throw new BadRequestException('Invalid webhook payload'); }
    const event = payload.event;

    const paymentEntity = payload?.payload?.payment?.entity;
    if ((event === 'payment.captured' || event === 'payment.failed') && (!paymentEntity?.order_id || !paymentEntity?.id)) {
      throw new BadRequestException('Invalid webhook payload');
    }

    if (event === 'payment.captured') {
      const providerOrderId = paymentEntity.order_id;
      const providerPaymentId = paymentEntity.id;

      const payment = await this.prisma.payment.findFirst({
        where: { providerOrderId },
      });

      if (!payment) return { received: true }; // unknown order — ignore safely

      // A valid signature proves Razorpay sent this event; this second check
      // binds it to the amount recorded when our server created the order.
      if (Number(paymentEntity.amount) !== Math.round(Number(payment.amount) * 100) || paymentEntity.currency !== 'INR') {
        throw new BadRequestException('Payment amount does not match order');
      }

      if (payment.status === PaymentStatus.CAPTURED) return { received: true };

      const updatedOrder = await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.CAPTURED,
            providerPaymentId,
            rawWebhookPayload: payload,
          },
        });

        const ord = await tx.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.PAID },
          include: {
            user: { select: { fullName: true, email: true } },
            items: true,
          },
        });

        await tx.adminNotification.create({
          data: {
            type: 'NEW_ORDER',
            title: `New Paid Order #${ord.orderNumber}`,
            message: `Order #${ord.orderNumber} paid via Razorpay for ₹${Number(ord.grandTotal).toLocaleString('en-IN')}`,
            orderId: ord.id,
            isRead: false,
          },
        });

        return ord;
      });

      try {
        const itemCount = updatedOrder.items.reduce((sum, it) => sum + it.quantity, 0);
        this.emailService
          .sendAdminNewOrderEmail({
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber,
            customerName: updatedOrder.user?.fullName || null,
            customerEmail: updatedOrder.user?.email || '',
            orderDate: updatedOrder.createdAt || new Date(),
            itemCount,
            totalAmount: Number(updatedOrder.grandTotal),
            paymentStatus: PaymentStatus.CAPTURED,
            orderStatus: OrderStatus.PAID,
          })
          .catch((err) => {
            this.logger.error(
              `Non-blocking webhook admin alert email error for #${updatedOrder.orderNumber}: ${err.message}`,
            );
          });
      } catch (emailErr: any) {
        this.logger.error(`Failed to trigger admin webhook order alert email: ${emailErr.message}`);
      }
    }

    if (event === 'payment.failed') {
      const providerOrderId = paymentEntity.order_id;
      await this.prisma.payment.updateMany({
        where: { providerOrderId },
        data: { status: PaymentStatus.FAILED, rawWebhookPayload: payload },
      });
    }

    return { received: true };
  }
}
