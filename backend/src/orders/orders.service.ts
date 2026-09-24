import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentProvider, PaymentStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../common/email/email.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async createOrder({
    sessionToken,
    userId,
    customer,
    shippingAddress,
    addressId,
    paymentMethod,
    couponCode,
  }: {
    sessionToken?: string;
    userId?: string;
    customer?: { name: string; email: string; phone: string };
    shippingAddress?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country?: string;
      phone?: string;
    };
    addressId?: string;
    paymentMethod: PaymentProvider;
    couponCode?: string;
  }) {
    if (paymentMethod !== PaymentProvider.COD && paymentMethod !== PaymentProvider.RAZORPAY) {
      throw new BadRequestException('That payment method is not available yet');
    }

    // 1. Locate Cart
    let cart = null;
    if (sessionToken?.trim()) {
      cart = await this.prisma.cart.findUnique({
        where: { sessionToken: sessionToken.trim() },
        include: { items: { include: { variant: { include: { product: true, inventory: true } } } } },
      });
    }

    if (!cart && userId) {
      cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: { items: { include: { variant: { include: { product: true, inventory: true } } } } },
      });
    }

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // 2. Validate Customer and Shipping Address
    let customerName = customer?.name?.trim() || '';
    let customerEmail = customer?.email?.trim().toLowerCase() || '';
    let customerPhone = customer?.phone?.trim() || '';
    let finalShippingAddress: Record<string, any> = {};

    if (customer && shippingAddress) {
      if (!customerName || !customerEmail || !customerPhone) {
        throw new BadRequestException('Please provide complete customer details (name, email, phone)');
      }
      if (!shippingAddress.line1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode) {
        throw new BadRequestException('Please provide a complete shipping address');
      }

      finalShippingAddress = {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        line1: shippingAddress.line1.trim(),
        line2: shippingAddress.line2?.trim() || null,
        city: shippingAddress.city.trim(),
        state: shippingAddress.state.trim(),
        postalCode: shippingAddress.postalCode.trim(),
        country: shippingAddress.country?.trim() || 'IN',
      };
    } else if (addressId && userId) {
      // Legacy authenticated flow
      const [address, user] = await Promise.all([
        this.prisma.address.findFirst({ where: { id: addressId, userId } }),
        this.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, email: true, phone: true } }),
      ]);
      if (!address) throw new NotFoundException('Address not found for this account');

      customerName = user?.fullName || 'Customer';
      customerEmail = user?.email || '';
      customerPhone = user?.phone || address.phone || '';

      finalShippingAddress = {
        name: customerName,
        label: address.label,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        phone: address.phone || customerPhone,
      };
    } else {
      throw new BadRequestException('Customer and shipping address are required for checkout');
    }

    // 3. Validate Items & Stock
    for (const item of cart.items) {
      if (!item.variant.isActive || item.variant.product.status !== 'PUBLISHED') {
        throw new BadRequestException(`${item.variant.product.name} is no longer available`);
      }
      if (!item.variant.inventory || item.variant.inventory.stockQuantity < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${item.variant.product.name}`);
      }
    }

    // 4. Calculate Server-side Totals
    const subtotal = cart.items.reduce((sum, item) => sum + Number(item.variant.price) * item.quantity, 0);
    let discountTotal = 0;
    let couponId: string | undefined;

    if (couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: couponCode.trim().toUpperCase() } });
      const now = new Date();
      if (!coupon || !coupon.isActive || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt < now)) {
        throw new BadRequestException('Coupon is not valid');
      }
      if (coupon.minOrderValue && subtotal < Number(coupon.minOrderValue)) {
        throw new BadRequestException('Cart does not meet the coupon minimum');
      }
      const totalUsage = await this.prisma.couponUsage.count({ where: { couponId: coupon.id } });
      if (coupon.usageLimit !== null && totalUsage >= coupon.usageLimit) {
        throw new BadRequestException('Coupon usage limit reached');
      }
      discountTotal = Math.min(
        coupon.discountType === 'PERCENTAGE' ? (subtotal * Number(coupon.discountValue)) / 100 : Number(coupon.discountValue),
        subtotal,
      );
      couponId = coupon.id;
    }

    const shippingFee = 0;
    const grandTotal = Math.max(subtotal - discountTotal, 0) + shippingFee;
    const orderNumber = `FF-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const guestToken = crypto.randomUUID();

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          guestToken,
          userId: userId || null,
          addressId: addressId || null,
          customerEmail,
          customerName,
          customerPhone,
          status: OrderStatus.PENDING,
          subtotal,
          discountTotal,
          shippingFee,
          grandTotal,
          paymentMethod,
          shippingAddress: finalShippingAddress,
          couponId,
          items: {
            create: cart.items.map((item) => ({
              variantId: item.variantId,
              productName: item.variant.product.name,
              variantLabel: item.variant.sizeLabel,
              unitPrice: item.variant.price,
              quantity: item.quantity,
              lineTotal: Number(item.variant.price) * item.quantity,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of cart.items) {
        const updated = await tx.inventory.updateMany({
          where: { variantId: item.variantId, stockQuantity: { gte: item.quantity } },
          data: { stockQuantity: { decrement: item.quantity } },
        });
        if (updated.count !== 1) throw new BadRequestException('Inventory changed; please review your cart');
      }

      await tx.payment.create({
        data: { orderId: created.id, provider: paymentMethod, amount: grandTotal, status: PaymentStatus.CREATED },
      });

      if (couponId && userId) {
        await tx.couponUsage.create({ data: { couponId, userId } });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    });

    // For COD orders, dispatch notification & email alert
    if (paymentMethod === PaymentProvider.COD) {
      try {
        await this.prisma.adminNotification.create({
          data: {
            type: 'NEW_ORDER',
            title: `New Order #${createdOrder.orderNumber}`,
            message: `Order #${createdOrder.orderNumber} placed by ${customerName || 'Guest Customer'} for ₹${Number(createdOrder.grandTotal).toLocaleString('en-IN')} (COD)`,
            orderId: createdOrder.id,
            isRead: false,
          },
        });
      } catch (notifErr: any) {
        this.logger.error(`Failed to create admin dashboard notification: ${notifErr.message}`);
      }

      try {
        const itemCount = cart.items.reduce((sum, it) => sum + it.quantity, 0);
        this.emailService
          .sendAdminNewOrderEmail({
            orderId: createdOrder.id,
            orderNumber: createdOrder.orderNumber,
            customerName: customerName || null,
            customerEmail: customerEmail || '',
            orderDate: new Date(),
            itemCount,
            totalAmount: Number(createdOrder.grandTotal),
            paymentStatus: PaymentStatus.CREATED,
            orderStatus: createdOrder.status,
          })
          .catch((err) => {
            this.logger.error(`Non-blocking admin alert email error for #${createdOrder.orderNumber}: ${err.message}`);
          });
      } catch (emailErr: any) {
        this.logger.error(`Failed to trigger admin order alert email: ${emailErr.message}`);
      }
    }

    return createdOrder;
  }

  // Backwards compatibility wrapper for existing tests/callers
  createFromCart(userId: string, addressId: string, paymentMethod: PaymentProvider, couponCode?: string) {
    return this.createOrder({ userId, addressId, paymentMethod, couponCode });
  }

  findAllForUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: true, payment: true },
    });
  }

  async findOne(orderId: string, guestToken?: string, userId?: string, isAdmin = false) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payment: true,
        address: true,
        user: { select: { fullName: true, email: true, phone: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (isAdmin) {
      return order;
    }

    if (guestToken && order.guestToken === guestToken) {
      return order;
    }

    if (userId && order.userId === userId) {
      return order;
    }

    throw new NotFoundException('Order not found');
  }

  findAllForAdmin() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true, payment: true, user: true, address: true },
    });
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    return this.prisma.order.update({ where: { id: orderId }, data: { status } });
  }
}
