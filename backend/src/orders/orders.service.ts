import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // Creates a PENDING order from the user's current cart. All prices are
  // read from ProductVariant in the DB at this moment — never from the
  // client — so the order total can't be tampered with client-side.
  async createFromCart(userId: string, addressId: string, couponCode?: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { variant: { include: { product: true } } } } },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const address = await this.prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) {
      throw new NotFoundException('Address not found for this account');
    }

    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.variant.price) * item.quantity,
      0,
    );

    let discountTotal = 0;
    let couponId: string | undefined;

    if (couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: couponCode } });
      if (coupon?.isActive) {
        discountTotal =
          coupon.discountType === 'PERCENTAGE'
            ? (subtotal * Number(coupon.discountValue)) / 100
            : Number(coupon.discountValue);
        couponId = coupon.id;
      }
    }

    // Shipping fee is a placeholder (0) until the client supplies a
    // shipping policy — see the architecture doc's "missing information" list.
    const shippingFee = 0;
    const grandTotal = Math.max(subtotal - discountTotal, 0) + shippingFee;

    const orderNumber = `FF-${Date.now().toString().slice(-8)}`;

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId,
          status: OrderStatus.PENDING,
          subtotal,
          discountTotal,
          shippingFee,
          grandTotal,
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

      // Clear the cart now that it's been converted into an order.
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });

    return order;
  }

  findAllForUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: true, payment: true },
    });
  }

  async findOne(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true, payment: true, address: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // Admin only
  findAllForAdmin() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true, payment: true, user: true },
    });
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    return this.prisma.order.update({ where: { id: orderId }, data: { status } });
  }
}
