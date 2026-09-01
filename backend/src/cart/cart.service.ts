import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

const CART_INCLUDE = {
  items: {
    include: {
      variant: { include: { product: true, inventory: true } },
    },
  },
};

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  // Identifies the cart either by the authenticated user's id or a
  // guest session token generated client-side and stored in a cookie.
  private async getOrCreateCart(userId?: string, sessionToken?: string) {
    if (!userId && !sessionToken) {
      throw new BadRequestException('A user or session token is required');
    }

    const where = userId ? { userId } : { sessionToken };

    const existing = await this.prisma.cart.findFirst({ where, include: CART_INCLUDE });
    if (existing) return existing;

    return this.prisma.cart.create({
      data: userId ? { userId } : { sessionToken },
      include: CART_INCLUDE,
    });
  }

  getCart(userId?: string, sessionToken?: string) {
    return this.getOrCreateCart(userId, sessionToken);
  }

  async addItem(
    userId: string | undefined,
    sessionToken: string | undefined,
    variantId: string,
    quantity: number,
  ) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { inventory: true },
    });
    if (!variant || !variant.isActive) {
      throw new NotFoundException('Product is not available');
    }

    const cart = await this.getOrCreateCart(userId, sessionToken);

    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      create: { cartId: cart.id, variantId, quantity },
      update: { quantity: { increment: quantity } },
    });

    return this.getOrCreateCart(userId, sessionToken);
  }

  async updateItemQuantity(cartItemId: string, quantity: number) {
    if (quantity < 1) {
      return this.prisma.cartItem.delete({ where: { id: cartItemId } });
    }
    return this.prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity } });
  }

  removeItem(cartItemId: string) {
    return this.prisma.cartItem.delete({ where: { id: cartItemId } });
  }

  // Price is always recalculated from the current ProductVariant price in
  // the DB — the cart never trusts a price the client might send.
  async calculateTotals(userId?: string, sessionToken?: string) {
    const cart = await this.getOrCreateCart(userId, sessionToken);
    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.variant.price) * item.quantity,
      0,
    );
    return { subtotal, itemCount: cart.items.reduce((n, i) => n + i.quantity, 0) };
  }
}
