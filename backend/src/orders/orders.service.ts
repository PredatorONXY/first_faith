import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../common/email/email.service';
import { PromotionEngine } from '../common/promotions/promotion.engine';
import { SettingsService } from '../settings/settings.service';
import { DEFAULT_GST_RATE, DEFAULT_SELLER_STATE, GstEngine } from '../common/tax/gst.engine';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly settingsService?: SettingsService,
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
    if (paymentMethod !== PaymentProvider.RAZORPAY) {
      throw new BadRequestException('Only Razorpay online payments are accepted. Cash on delivery is not supported.');
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

    // 3. Validate Items & Stock (both BUY and FREE promotional items)
    for (const item of cart.items) {
      if (!item.variant.isActive || item.variant.product.status !== 'PUBLISHED') {
        throw new BadRequestException(`${item.variant.product.name} is no longer available`);
      }
      if (!item.variant.inventory || item.variant.inventory.stockQuantity < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${item.variant.product.name}`);
      }
    }

    // 4. Calculate Server-side Totals with Authoritative 1+1 Skincare Offer Engine & GST Engine
    const promotion = PromotionEngine.calculatePromotion(cart.items);
    const rawSubtotal = promotion.subtotal;
    let couponDiscount = 0;
    let couponId: string | undefined;

    if (couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: couponCode.trim().toUpperCase() } });
      const now = new Date();
      if (!coupon || !coupon.isActive || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt < now)) {
        throw new BadRequestException('Coupon is not valid');
      }
      const availableSubtotal = Math.max(rawSubtotal - promotion.discountTotal, 0);
      if (coupon.minOrderValue && availableSubtotal < Number(coupon.minOrderValue)) {
        throw new BadRequestException('Cart does not meet the coupon minimum');
      }
      const totalUsage = await this.prisma.couponUsage.count({ where: { couponId: coupon.id } });
      if (coupon.usageLimit !== null && totalUsage >= coupon.usageLimit) {
        throw new BadRequestException('Coupon usage limit reached');
      }
      couponDiscount = Math.min(
        coupon.discountType === 'PERCENTAGE'
          ? (availableSubtotal * Number(coupon.discountValue)) / 100
          : Number(coupon.discountValue),
        availableSubtotal,
      );
      couponId = coupon.id;
    }

    const availableSubtotalBeforeCoupon = Math.max(rawSubtotal - promotion.discountTotal, 0);
    const taxItems = cart.items.map((item) => {
      const itemPromo = promotion.itemDiscounts[item.variantId];
      const promoDiscount = itemPromo?.discountAmount || 0;
      const isFree = Boolean(itemPromo?.isFreeItem);

      let itemCouponShare = 0;
      if (couponDiscount > 0 && availableSubtotalBeforeCoupon > 0 && !isFree) {
        const itemNet = Math.max(Number(item.variant.price) * item.quantity - promoDiscount, 0);
        itemCouponShare = (couponDiscount * itemNet) / availableSubtotalBeforeCoupon;
      }

      return {
        variantId: item.variantId,
        productName: item.variant.product.name,
        unitPrice: Number(item.variant.price),
        quantity: item.quantity,
        discount: promoDiscount + itemCouponShare,
        isFree,
      };
    });

    const shippingState = finalShippingAddress?.state || '';
    const gstResult = GstEngine.calculateOrderGst({
      items: taxItems,
      shippingState,
      sellerState: DEFAULT_SELLER_STATE,
      gstRate: DEFAULT_GST_RATE,
      shippingFee: 0,
    });

    const subtotal = gstResult.subtotal;
    const discountTotal = gstResult.discountTotal;
    const taxableAmount = gstResult.taxableAmount;
    const taxTotal = gstResult.taxTotal;
    const taxRate = gstResult.rate;
    const cgst = gstResult.cgstAmount;
    const sgst = gstResult.sgstAmount;
    const igst = gstResult.igstAmount;
    const shippingFee = gstResult.shippingFee;
    const grandTotal = gstResult.grandTotal;

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
          taxableAmount,
          taxRate,
          taxTotal,
          cgst,
          sgst,
          igst,
          taxDetails: {
            rate: gstResult.rate,
            isInterState: gstResult.isInterState,
            cgstRate: gstResult.cgstRate,
            cgstAmount: gstResult.cgstAmount,
            sgstRate: gstResult.sgstRate,
            sgstAmount: gstResult.sgstAmount,
            igstRate: gstResult.igstRate,
            igstAmount: gstResult.igstAmount,
            taxableAmount: gstResult.taxableAmount,
            taxTotal: gstResult.taxTotal,
            sellerState: DEFAULT_SELLER_STATE,
            customerState: shippingState,
          } as unknown as Prisma.InputJsonValue,
          grandTotal,
          promotionName: promotion.isActive ? promotion.promotionName : null,
          promotionDiscount: promotion.discountTotal,
          promotionDetails: promotion.isActive
            ? ({
                promotionId: promotion.promotionId,
                promotionName: promotion.promotionName,
                appliedOffers: promotion.appliedOffers,
                discountTotal: promotion.discountTotal,
              } as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          paymentMethod,
          shippingAddress: finalShippingAddress,
          couponId,
          items: {
            create: cart.items.map((item) => {
              const itemPromo = promotion.itemDiscounts[item.variantId];
              const isFree = Boolean(itemPromo?.isFreeItem);
              const freeQuantity = itemPromo?.freeQuantity || 0;
              return {
                variantId: item.variantId,
                productName: item.variant.product.name,
                variantLabel: item.variant.sizeLabel,
                unitPrice: item.variant.price,
                quantity: item.quantity,
                lineTotal: Number(item.variant.price) * item.quantity,
                isFreeItem: isFree,
                freeQuantity,
              };
            }),
          },
        },
        include: { items: true },
      });

      // Atomically decrement stock for all items (both qualifying and free items)
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

  // ----------------------------------------------------
  // GUEST ORDER TRACKING METHODS (NO OTP / RESEND DEPENDENCY)
  // ----------------------------------------------------

  generateTrackingToken(orderId: string): string {
    const secret = (process.env.JWT_SECRET || 'first-faith-tracking-secret') + ':' + orderId;
    const expiresAt = Date.now() + 2 * 60 * 60 * 1000; // 2 hours validity
    const hmac = crypto.createHmac('sha256', secret).update(`${orderId}:${expiresAt}`).digest('hex');
    return Buffer.from(`${orderId}:${expiresAt}:${hmac}`).toString('base64url');
  }

  verifyTrackingToken(orderId: string, token: string): boolean {
    try {
      if (!token || typeof token !== 'string') return false;
      const decoded = Buffer.from(token, 'base64url').toString('utf-8');
      const [tokenOrderId, expiresAtStr, providedHmac] = decoded.split(':');
      if (tokenOrderId !== orderId) return false;
      const expiresAt = parseInt(expiresAtStr, 10);
      if (isNaN(expiresAt) || Date.now() > expiresAt) return false;
      const secret = (process.env.JWT_SECRET || 'first-faith-tracking-secret') + ':' + orderId;
      const expectedHmac = crypto.createHmac('sha256', secret).update(`${orderId}:${expiresAt}`).digest('hex');
      if (providedHmac.length !== expectedHmac.length) return false;
      return crypto.timingSafeEqual(Buffer.from(providedHmac, 'hex'), Buffer.from(expectedHmac, 'hex'));
    } catch {
      return false;
    }
  }

  normalizeContact(type: string, rawValue: string): { normalized: string; variants: string[] } {
    const cleanType = (type || '').trim().toUpperCase();
    if (!rawValue || typeof rawValue !== 'string') {
      throw new BadRequestException('Contact value is required');
    }

    if (cleanType === 'PHONE') {
      const trimmed = rawValue.trim();
      if (!/^[+\d\s().-]+$/.test(trimmed)) {
        throw new BadRequestException('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)');
      }

      let digits = trimmed.replace(/\D/g, '');
      if (digits.length === 12 && digits.startsWith('91')) {
        digits = digits.slice(2);
      } else if (digits.length === 11 && digits.startsWith('0')) {
        digits = digits.slice(1);
      }

      if (!/^[6-9]\d{9}$/.test(digits)) {
        throw new BadRequestException('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)');
      }

      return {
        normalized: digits,
        variants: [digits, `+91${digits}`, `91${digits}`, `0${digits}`],
      };
    } else if (cleanType === 'EMAIL') {
      const cleanEmail = rawValue.trim().toLowerCase();
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      if (!emailRegex.test(cleanEmail)) {
        throw new BadRequestException('Please enter a valid email address (e.g. you@example.com)');
      }

      return {
        normalized: cleanEmail,
        variants: [cleanEmail],
      };
    } else {
      throw new BadRequestException('Lookup type must be phone or email');
    }
  }

  maskShippingAddress(address: any, fallbackName?: string | null) {
    if (!address || typeof address !== 'object') {
      return null;
    }

    const rawName = (address.name || fallbackName || '').trim();
    let maskedName = '';
    if (rawName) {
      maskedName = rawName
        .split(/\s+/)
        .map((part: string) => (part.length > 1 ? `${part[0]}${'*'.repeat(Math.min(part.length - 1, 4))}` : part))
        .join(' ');
    }

    const rawLine1 = (address.line1 || '').trim();
    let maskedLine1 = '';
    if (rawLine1) {
      const parts = rawLine1.split(',');
      maskedLine1 = parts
        .map((p: string) => {
          const trimmed = p.trim();
          if (trimmed.length <= 2) return trimmed;
          return `${trimmed.slice(0, 2)}${'*'.repeat(Math.min(trimmed.length - 2, 5))}`;
        })
        .join(', ');
    }

    const rawPostal = (address.postalCode || '').trim();
    const maskedPostal = rawPostal.length === 6 ? `${rawPostal.slice(0, 3)}***` : rawPostal ? `${rawPostal.slice(0, 2)}****` : '';

    const rawPhone = (address.phone || '').replace(/\D/g, '');
    const maskedPhone = rawPhone.length >= 10 ? `******${rawPhone.slice(-4)}` : '';

    return {
      name: maskedName || 'Verified Customer',
      line1: maskedLine1,
      city: address.city || '',
      state: address.state || '',
      postalCode: maskedPostal,
      phone: maskedPhone,
      isMasked: true,
    };
  }

  buildStatusTimeline(order: { status: OrderStatus; createdAt: Date; updatedAt: Date; payment?: { status: PaymentStatus; updatedAt: Date } | null }) {
    const isPaid = order.status === OrderStatus.PAID ||
                   order.status === OrderStatus.PROCESSING ||
                   order.status === OrderStatus.SHIPPED ||
                   order.status === OrderStatus.DELIVERED;
    const isProcessing = order.status === OrderStatus.PROCESSING ||
                         order.status === OrderStatus.SHIPPED ||
                         order.status === OrderStatus.DELIVERED;
    const isShipped = order.status === OrderStatus.SHIPPED ||
                      order.status === OrderStatus.DELIVERED;
    const isDelivered = order.status === OrderStatus.DELIVERED;

    const isCancelled = order.status === OrderStatus.CANCELLED;
    const isRefunded = order.status === OrderStatus.REFUNDED;
    const isPaymentFailed = order.payment?.status === PaymentStatus.FAILED;

    const stages = [
      {
        key: 'ORDER_PLACED',
        label: 'Order Placed',
        description: 'Your order was successfully recorded in our system.',
        state: 'COMPLETED' as const,
        timestamp: order.createdAt,
      },
      {
        key: 'PAYMENT_CONFIRMED',
        label: 'Payment Confirmed',
        description: isPaid
          ? 'Online payment confirmed via Razorpay.'
          : isPaymentFailed
          ? 'Payment could not be completed.'
          : 'Awaiting payment confirmation.',
        state: isPaid ? ('COMPLETED' as const) : isPaymentFailed ? ('FAILED' as const) : ('PENDING' as const),
        timestamp: isPaid && order.payment?.updatedAt ? order.payment.updatedAt : undefined,
      },
      {
        key: 'PROCESSING',
        label: 'Processing & Packaging',
        description: isProcessing
          ? 'Order items are being freshly prepared and packed.'
          : 'Preparation begins once payment is finalized.',
        state: isProcessing ? (order.status === OrderStatus.PROCESSING ? ('CURRENT' as const) : ('COMPLETED' as const)) : ('PENDING' as const),
        timestamp: order.status === OrderStatus.PROCESSING ? order.updatedAt : undefined,
      },
      {
        key: 'SHIPPED',
        label: 'Dispatched & In Transit',
        description: isShipped
          ? 'Package handed over to courier partner.'
          : 'Parcel dispatch will occur after preparation.',
        state: isShipped ? (order.status === OrderStatus.SHIPPED ? ('CURRENT' as const) : ('COMPLETED' as const)) : ('PENDING' as const),
        timestamp: order.status === OrderStatus.SHIPPED ? order.updatedAt : undefined,
      },
      {
        key: 'DELIVERED',
        label: 'Delivered',
        description: isDelivered
          ? 'Delivered to recipient address.'
          : 'Courier will deliver to your doorstep.',
        state: isDelivered ? ('COMPLETED' as const) : ('PENDING' as const),
        timestamp: isDelivered ? order.updatedAt : undefined,
      },
    ];

    return {
      currentStatus: order.status,
      isTerminal: isCancelled || isRefunded,
      terminalStatus: isCancelled ? 'CANCELLED' : isRefunded ? 'REFUNDED' : null,
      terminalMessage: isCancelled
        ? 'This order has been cancelled.'
        : isRefunded
        ? 'This order has been refunded.'
        : null,
      stages,
    };
  }

  async trackOrdersLookup({ type, value, orderNumber }: { type: string; value: string; orderNumber?: string }) {
    const { variants, normalized } = this.normalizeContact(type, value);
    const cleanType = type.trim().toUpperCase();

    const where: Prisma.OrderWhereInput = {};
    if (cleanType === 'PHONE') {
      where.customerPhone = { in: variants };
    } else {
      where.customerEmail = { equals: normalized, mode: 'insensitive' };
    }

    if (orderNumber && orderNumber.trim()) {
      where.orderNumber = { equals: orderNumber.trim(), mode: 'insensitive' };
    }

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    slug: true,
                    name: true,
                    images: { take: 1, orderBy: { sortOrder: 'asc' } },
                  },
                },
              },
            },
          },
        },
        payment: {
          select: {
            status: true,
            provider: true,
            amount: true,
            refundedAmount: true,
            updatedAt: true,
          },
        },
      },
    });

    return {
      success: true,
      count: orders.length,
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        status: order.status,
        paymentStatus: order.payment?.status || (order.status === OrderStatus.PAID ? PaymentStatus.CAPTURED : PaymentStatus.CREATED),
        paymentMethod: order.paymentMethod,
        grandTotal: Number(order.grandTotal),
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        itemsSummary: order.items.map((it) => ({
          id: it.id,
          productName: it.productName,
          variantLabel: it.variantLabel,
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
          lineTotal: Number(it.lineTotal),
          isFreeItem: it.isFreeItem,
          slug: it.variant?.product?.slug || null,
          image: it.variant?.product?.images?.[0]?.url || null,
        })),
        trackingToken: this.generateTrackingToken(order.id),
      })),
    };
  }

  async trackOrderDetail(orderId: string, token: string) {
    if (!this.verifyTrackingToken(orderId, token)) {
      throw new NotFoundException('Order not found or tracking session has expired. Please search again.');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    slug: true,
                    name: true,
                    images: { take: 1, orderBy: { sortOrder: 'asc' } },
                  },
                },
              },
            },
          },
        },
        payment: {
          select: {
            status: true,
            provider: true,
            amount: true,
            refundedAmount: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const maskedAddress = this.maskShippingAddress(order.shippingAddress, order.customerName);
    const timeline = this.buildStatusTimeline(order);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      status: order.status,
      paymentStatus: order.payment?.status || (order.status === OrderStatus.PAID ? PaymentStatus.CAPTURED : PaymentStatus.CREATED),
      paymentMethod: order.paymentMethod,
      subtotal: Number(order.subtotal),
      discountTotal: Number(order.discountTotal),
      shippingFee: Number(order.shippingFee),
      grandTotal: Number(order.grandTotal),
      promotionName: order.promotionName,
      promotionDiscount: Number(order.promotionDiscount || 0),
      promotionDetails: order.promotionDetails,
      taxableAmount: Number(order.taxableAmount || 0),
      taxRate: Number(order.taxRate || 18),
      taxTotal: Number(order.taxTotal || 0),
      cgst: Number(order.cgst || 0),
      sgst: Number(order.sgst || 0),
      igst: Number(order.igst || 0),
      taxDetails: order.taxDetails,
      items: order.items.map((it) => ({
        id: it.id,
        productName: it.productName,
        variantLabel: it.variantLabel,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        lineTotal: Number(it.lineTotal),
        isFreeItem: it.isFreeItem,
        freeQuantity: it.freeQuantity,
        slug: it.variant?.product?.slug || null,
        image: it.variant?.product?.images?.[0]?.url || null,
      })),
      shippingAddress: maskedAddress,
      timeline,
    };
  }
}
