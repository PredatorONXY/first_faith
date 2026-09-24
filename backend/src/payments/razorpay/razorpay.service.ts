import { Injectable, BadRequestException, ServiceUnavailableException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { PrismaService } from '../../common/prisma.service';
import { EmailService } from '../../common/email/email.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export interface VerifyPaymentInput {
  orderId: string;
  guestToken?: string;
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
  async createPaymentOrder(
    orderIdOrDto: string | { orderId: string; guestToken?: string },
    guestTokenOrUserId?: string,
    maybeUserId?: string,
  ) {
    if (!this.client) throw new ServiceUnavailableException('Online payments are not configured');

    const orderId = typeof orderIdOrDto === 'object' ? orderIdOrDto.orderId : orderIdOrDto;
    const guestToken = typeof orderIdOrDto === 'object' ? orderIdOrDto.guestToken : (maybeUserId ? guestTokenOrUserId : undefined);
    const userId = maybeUserId || (typeof orderIdOrDto !== 'object' && !maybeUserId ? guestTokenOrUserId : undefined);

    let order = userId
      ? await this.prisma.order.findFirst({
          where: { id: orderId, userId },
          include: { payment: true },
        })
      : null;

    if (!order && guestToken) {
      order = await this.prisma.order.findFirst({
        where: { id: orderId, guestToken },
        include: { payment: true },
      });
    }

    if (!order && !userId && guestTokenOrUserId) {
      order = await this.prisma.order.findFirst({
        where: { id: orderId, guestToken: guestTokenOrUserId },
        include: { payment: true },
      });
    }

    if (!order) throw new BadRequestException('Order not found');

    if (order.paymentMethod !== 'RAZORPAY') throw new BadRequestException('This order does not use online payment');

    // 1. Guard against paying already paid, refunded, or cancelled orders
    if (order.status === OrderStatus.PAID || order.payment?.status === PaymentStatus.CAPTURED) {
      throw new BadRequestException('This order has already been paid');
    }
    if (order.status === OrderStatus.REFUNDED || order.payment?.status === PaymentStatus.REFUNDED) {
      throw new BadRequestException('This order has been refunded');
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('This order has been cancelled and cannot be paid');
    }

    const amountPaise = Math.round(Number(order.grandTotal) * 100);
    let razorpayOrderId = order.payment?.providerOrderId;

    // 2. Reuse existing Razorpay order if still open/valid, or create a fresh one
    if (razorpayOrderId) {
      try {
        const existingOrder = await this.client.orders.fetch(razorpayOrderId);
        if (existingOrder.status === 'paid') {
          throw new BadRequestException('This order has already been paid on the payment gateway');
        }
      } catch (fetchErr: any) {
        if (fetchErr instanceof BadRequestException) throw fetchErr;
        this.logger.warn(`Existing Razorpay order ${razorpayOrderId} cannot be reused: ${fetchErr.message}. Creating fresh order.`);
        razorpayOrderId = null;
      }
    }

    if (!razorpayOrderId) {
      try {
        const res = await this.client.orders.create({
          amount: amountPaise,
          currency: 'INR',
          receipt: order.orderNumber,
        });
        razorpayOrderId = res.id;
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
          providerOrderId: razorpayOrderId,
          amount: order.grandTotal,
          status: PaymentStatus.CREATED,
        },
        update: {
          providerOrderId: razorpayOrderId,
          status: PaymentStatus.CREATED,
        },
      });
    }

    return {
      razorpayOrderId,
      amount: amountPaise,
      currency: 'INR',
      keyId: this.config.get<string>('RAZORPAY_KEY_ID')?.trim(),
    };
  }

  // Client verification endpoint: called by frontend after Razorpay modal completes
  async verifyPayment(dto: VerifyPaymentInput, userId?: string) {
    // STEP 1: Validate the First Faith order and ownership
    const targetUserId = userId || dto.guestToken;
    let order = targetUserId
      ? await this.prisma.order.findFirst({
          where: { id: dto.orderId, userId: targetUserId },
          include: {
            user: { select: { fullName: true, email: true } },
            items: true,
          },
        })
      : null;

    if (!order && dto.guestToken) {
      order = await this.prisma.order.findFirst({
        where: { id: dto.orderId, guestToken: dto.guestToken },
        include: {
          user: { select: { fullName: true, email: true } },
          items: true,
        },
      });
    }

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

    if (order.status === OrderStatus.REFUNDED || payment.status === PaymentStatus.REFUNDED) {
      throw new BadRequestException('This order has been refunded');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('This order has been cancelled and cannot be paid');
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

      const customerDisplayName = order.customerName || order.user?.fullName || order.customerEmail || order.user?.email || 'Customer';
      await tx.adminNotification.create({
        data: {
          type: 'NEW_ORDER',
          title: `New Paid Order #${order.orderNumber}`,
          message: `Order #${order.orderNumber} paid via Razorpay by ${customerDisplayName} for ₹${Number(order.grandTotal).toLocaleString('en-IN')}`,
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
          customerName: order.customerName || order.user?.fullName || null,
          customerEmail: order.customerEmail || order.user?.email || '',
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
        where: {
          providerOrderId,
          status: { notIn: [PaymentStatus.CAPTURED, PaymentStatus.REFUNDED] },
        },
        data: { status: PaymentStatus.FAILED, rawWebhookPayload: payload },
      });
    }

    if (event === 'refund.processed' || event === 'refund.created') {
      const refundEntity = payload?.payload?.refund?.entity;

      if (!refundEntity?.id || !refundEntity?.payment_id) {
        throw new BadRequestException('Invalid refund webhook payload: missing refund or payment identifier');
      }

      const providerPaymentId = refundEntity.payment_id;
      const providerRefundId = refundEntity.id;
      const providerOrderId = paymentEntity?.order_id;

      let payment = await this.prisma.payment.findFirst({
        where: { providerPaymentId },
        include: { order: true },
      });

      if (!payment && providerOrderId) {
        payment = await this.prisma.payment.findFirst({
          where: { providerOrderId },
          include: { order: true },
        });
      }

      if (!payment) {
        this.logger.warn(`Refund webhook received for unknown payment: ${providerPaymentId}`);
        return { received: true };
      }

      if (providerOrderId && payment.providerOrderId && providerOrderId !== payment.providerOrderId) {
        throw new BadRequestException('Refund order ID does not match payment order record');
      }

      if (refundEntity.currency && refundEntity.currency !== 'INR') {
        throw new BadRequestException('Refund currency mismatch: expected INR');
      }

      const refundAmountPaise = Number(refundEntity.amount);
      const paymentTotalPaise = Math.round(Number(payment.amount) * 100);

      if (isNaN(refundAmountPaise) || refundAmountPaise <= 0 || refundAmountPaise > paymentTotalPaise) {
        throw new BadRequestException('Invalid refund amount on gateway');
      }

      // Idempotency check: prevent duplicate counting of the same refund ID
      const existingPayload = (payment.rawWebhookPayload as any) || {};
      const processedRefunds: string[] = Array.isArray(existingPayload.processedRefundIds)
        ? existingPayload.processedRefundIds
        : (payment.providerRefundId ? [payment.providerRefundId] : []);

      if (processedRefunds.includes(providerRefundId)) {
        this.logger.log(`Refund webhook already processed for refund ID: ${providerRefundId}`);
        return { received: true };
      }

      // Determine cumulative refunded amount (use gateway's amount_refunded when present)
      let cumulativeRefundedPaise: number;
      if (paymentEntity?.amount_refunded !== undefined && paymentEntity?.amount_refunded !== null) {
        cumulativeRefundedPaise = Number(paymentEntity.amount_refunded);
      } else {
        const currentRefundedPaise = Math.round(Number(payment.refundedAmount || 0) * 100);
        cumulativeRefundedPaise = currentRefundedPaise + refundAmountPaise;
      }

      if (cumulativeRefundedPaise > paymentTotalPaise) {
        throw new BadRequestException('Cumulative refund amount exceeds payment amount');
      }

      const isFullRefund = cumulativeRefundedPaise >= paymentTotalPaise;
      const newRefundedAmountDecimal = cumulativeRefundedPaise / 100;
      const updatedProcessedRefunds = [...processedRefunds, providerRefundId];

      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: isFullRefund ? PaymentStatus.REFUNDED : payment.status,
            providerRefundId,
            refundedAmount: newRefundedAmountDecimal,
            refundedAt: refundEntity.created_at ? new Date(refundEntity.created_at * 1000) : new Date(),
            rawWebhookPayload: {
              ...existingPayload,
              processedRefundIds: updatedProcessedRefunds,
              lastRefundEvent: payload,
            },
          },
        });

        if (isFullRefund) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: OrderStatus.REFUNDED },
          });
        }

        await tx.adminNotification.create({
          data: {
            type: 'ORDER_REFUND',
            title: `Refund Processed for Order #${payment.order.orderNumber}`,
            message: `Order #${payment.order.orderNumber} ${isFullRefund ? 'fully refunded' : 'partially refunded'} for ₹${(refundAmountPaise / 100).toLocaleString('en-IN')} (Refund ID: ${providerRefundId})`,
            orderId: payment.order.id,
            isRead: false,
          },
        });
      });
    }

    if (event === 'refund.failed') {
      const refundEntity = payload?.payload?.refund?.entity;
      if (refundEntity?.payment_id) {
        const payment = await this.prisma.payment.findFirst({
          where: { providerPaymentId: refundEntity.payment_id },
          include: { order: true },
        });

        if (payment) {
          this.logger.warn(`Refund ${refundEntity.id} failed for payment ${refundEntity.payment_id}`);
          await this.prisma.adminNotification.create({
            data: {
              type: 'REFUND_FAILED',
              title: `Refund Failed for Order #${payment.order.orderNumber}`,
              message: `Refund of ₹${(Number(refundEntity.amount || 0) / 100).toLocaleString('en-IN')} failed on gateway (Refund ID: ${refundEntity.id || '—'})`,
              orderId: payment.order.id,
              isRead: false,
            },
          });
        }
      }
    }

    return { received: true };
  }
}
