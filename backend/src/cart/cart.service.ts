import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
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

  async getOrCreateCart(sessionToken?: string, userId?: string) {
    const cleanSession = sessionToken?.trim() || crypto.randomUUID();

    let cart = null;
    if (sessionToken?.trim()) {
      cart = await this.prisma.cart.findUnique({
        where: { sessionToken: cleanSession },
        include: CART_INCLUDE,
      });
    }

    if (!cart && userId) {
      cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: CART_INCLUDE,
      });
      if (cart && !cart.sessionToken) {
        cart = await this.prisma.cart.update({
          where: { id: cart.id },
          data: { sessionToken: cleanSession },
          include: CART_INCLUDE,
        });
      }
    }

    if (!cart) {
      try {
        cart = await this.prisma.cart.create({
          data: {
            sessionToken: cleanSession,
            ...(userId ? { userId } : {}),
          },
          include: CART_INCLUDE,
        });
      } catch (error: any) {
        // If create() throws Prisma P2002 for Cart_sessionToken_key, immediately query again by sessionToken
        const isSessionTokenUniqueViolation =
          error?.code === 'P2002' &&
          (Array.isArray(error?.meta?.target)
            ? error.meta.target.includes('sessionToken') || error.meta.target.includes('Cart_sessionToken_key')
            : typeof error?.meta?.target === 'string'
              ? error.meta.target.includes('sessionToken') || error.meta.target.includes('Cart_sessionToken_key')
              : String(error?.message).includes('Cart_sessionToken_key') ||
                String(error?.message).includes('sessionToken'));

        if (isSessionTokenUniqueViolation) {
          cart = await this.prisma.cart.findUnique({
            where: { sessionToken: cleanSession },
            include: CART_INCLUDE,
          });
          if (cart) {
            return cart;
          }
        }

        // Preserve authenticated user behavior: if userId unique constraint collided concurrently
        const isUserIdUniqueViolation =
          Boolean(userId) &&
          error?.code === 'P2002' &&
          (Array.isArray(error?.meta?.target)
            ? error.meta.target.includes('userId') || error.meta.target.includes('Cart_userId_key')
            : typeof error?.meta?.target === 'string'
              ? error.meta.target.includes('userId') || error.meta.target.includes('Cart_userId_key')
              : String(error?.message).includes('Cart_userId_key') ||
                String(error?.message).includes('userId'));

        if (isUserIdUniqueViolation) {
          cart = await this.prisma.cart.findUnique({
            where: { userId },
            include: CART_INCLUDE,
          });
          if (cart) {
            return cart;
          }
        }

        throw error;
      }
    }

    return cart;
  }

  getCart(sessionToken?: string, userId?: string) {
    return this.getOrCreateCart(sessionToken, userId);
  }

  async addItem(sessionToken: string | undefined, variantId: string, quantity: number, userId?: string) {
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

    const cart = await this.getOrCreateCart(sessionToken, userId);
    const existingItem = cart.items.find((item) => item.variantId === variantId);
    if (existingItem && existingItem.quantity + quantity > variant.inventory.stockQuantity) {
      throw new BadRequestException('Requested quantity exceeds available stock');
    }

    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      create: { cartId: cart.id, variantId, quantity },
      update: { quantity: { increment: quantity } },
    });

    return this.getOrCreateCart(cart.sessionToken ?? sessionToken, userId);
  }

  async updateItemQuantity(sessionToken: string | undefined, cartItemId: string, quantity: number, userId?: string) {
    const cart = await this.getOrCreateCart(sessionToken, userId);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, cartId: cart.id },
      include: { variant: { include: { inventory: true } } },
    });
    if (!item) throw new NotFoundException('Cart item not found');
    if (quantity < 1) {
      await this.prisma.cartItem.delete({ where: { id: cartItemId } });
      return this.getOrCreateCart(cart.sessionToken ?? sessionToken, userId);
    }
    if (!item.variant.inventory || quantity > item.variant.inventory.stockQuantity) {
      throw new BadRequestException('Requested quantity exceeds available stock');
    }
    await this.prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity } });
    return this.getOrCreateCart(cart.sessionToken ?? sessionToken, userId);
  }

  async removeItem(sessionToken: string | undefined, cartItemId: string, userId?: string) {
    const cart = await this.getOrCreateCart(sessionToken, userId);
    const item = await this.prisma.cartItem.findFirst({ where: { id: cartItemId, cartId: cart.id } });
    if (!item) throw new NotFoundException('Cart item not found');
    await this.prisma.cartItem.delete({ where: { id: cartItemId } });
    return this.getOrCreateCart(cart.sessionToken ?? sessionToken, userId);
  }

  async clearCart(sessionToken: string | undefined, userId?: string) {
    const cart = await this.getOrCreateCart(sessionToken, userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.getOrCreateCart(cart.sessionToken ?? sessionToken, userId);
  }

  async calculateTotals(sessionToken?: string, userId?: string) {
    const cart = await this.getOrCreateCart(sessionToken, userId);
    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.variant.price) * item.quantity,
      0,
    );
    return { subtotal, itemCount: cart.items.reduce((n, i) => n + i.quantity, 0) };
  }
}
