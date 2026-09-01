import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { PrismaService } from '../../common/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class RazorpayService {
  private client: Razorpay;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.client = new Razorpay({
      key_id: this.config.get<string>('RAZORPAY_KEY_ID')!,
      key_secret: this.config.get<string>('RAZORPAY_KEY_SECRET')!,
    });
  }

  // Step 1 of the flow: backend creates a Razorpay order for an existing
  // First Faith order and records the provider reference. The amount is
  // read from our own DB record, never from the client request body.
  async createPaymentOrder(orderId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });

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
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET')!;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody.toString());
    const event = payload.event;

    if (event === 'payment.captured') {
      const providerOrderId = payload.payload.payment.entity.order_id;
      const providerPaymentId = payload.payload.payment.entity.id;

      const payment = await this.prisma.payment.findFirst({
        where: { providerOrderId },
      });

      if (!payment) return { received: true }; // unknown order — ignore safely

      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.CAPTURED,
            providerPaymentId,
            rawWebhookPayload: payload,
          },
        });

        const order = await tx.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.PAID },
          include: { items: true },
        });

        // Decrement inventory only once payment is confirmed server-side.
        for (const item of order.items) {
          await tx.inventory.updateMany({
            where: { variantId: item.variantId },
            data: { stockQuantity: { decrement: item.quantity } },
          });
        }
      });
    }

    if (event === 'payment.failed') {
      const providerOrderId = payload.payload.payment.entity.order_id;
      await this.prisma.payment.updateMany({
        where: { providerOrderId },
        data: { status: PaymentStatus.FAILED, rawWebhookPayload: payload },
      });
    }

    return { received: true };
  }
}
