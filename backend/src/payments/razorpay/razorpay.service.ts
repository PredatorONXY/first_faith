import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { PrismaService } from '../../common/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class RazorpayService {
  private client?: Razorpay;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
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

    const razorpayOrder = await this.client.orders.create({
      amount: Math.round(Number(order.grandTotal) * 100), // paise
      currency: 'INR',
      receipt: order.orderNumber,
    });

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
      keyId: this.config.get<string>('RAZORPAY_KEY_ID'),
    };
  }

  // Step 2: webhook handler. Verifies the HMAC signature Razorpay sends
  // against our webhook secret BEFORE trusting anything in the payload.
  // This is the only place an order is ever marked PAID.
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

      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.CAPTURED,
            providerPaymentId,
            rawWebhookPayload: payload,
          },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.PAID },
        });
      });
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
