import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  private async getOrCreateCart(userId: string) {
    const where = { userId };

    const existing = await this.prisma.cart.findFirst({ where, include: CART_INCLUDE });
    if (existing) return existing;

    return this.prisma.cart.create({
      data: { userId },
      include: CART_INCLUDE,
    });
  }

  getCart(userId: string) {
    return this.getOrCreateCart(userId);
  }

  async addItem(
    userId: string,
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
    if (!variant.inventory || variant.inventory.stockQuantity < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    const cart = await this.getOrCreateCart(userId);
    const existingItem = cart.items.find((item) => item.variantId === variantId);
    if (existingItem && existingItem.quantity + quantity > variant.inventory.stockQuantity) {
      throw new BadRequestException('Requested quantity exceeds available stock');
    }

    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      create: { cartId: cart.id, variantId, quantity },
      update: { quantity: { increment: quantity } },
    });

    return this.getOrCreateCart(userId);
  }

  async updateItemQuantity(userId: string, cartItemId: string, quantity: number) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, cart: { userId } },
      include: { variant: { include: { inventory: true } } },
    });
    if (!item) throw new NotFoundException('Cart item not found');
    if (quantity < 1) {
      await this.prisma.cartItem.delete({ where: { id: cartItemId } });
      return this.getOrCreateCart(userId);
    }
    if (!item.variant.inventory || quantity > item.variant.inventory.stockQuantity) {
      throw new BadRequestException('Requested quantity exceeds available stock');
    }
    await this.prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity } });
    return this.getOrCreateCart(userId);
  }

  async removeItem(userId: string, cartItemId: string) {
    const item = await this.prisma.cartItem.findFirst({ where: { id: cartItemId, cart: { userId } } });
    if (!item) throw new NotFoundException('Cart item not found');
    await this.prisma.cartItem.delete({ where: { id: cartItemId } });
    return this.getOrCreateCart(userId);
  }

  // Price is always recalculated from the current ProductVariant price in
  // the DB — the cart never trusts a price the client might send.
  async calculateTotals(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.variant.price) * item.quantity,
      0,
    );
    return { subtotal, itemCount: cart.items.reduce((n, i) => n + i.quantity, 0) };
  }
}
