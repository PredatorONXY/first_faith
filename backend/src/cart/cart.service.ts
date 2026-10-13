import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma.service';
import { PromotionEngine } from '../common/promotions/promotion.engine';
import { GstEngine, DEFAULT_GST_RATE } from '../common/tax/gst.engine';

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
        relationLoadStrategy: 'join',
      });
    }

    if (!cart && userId) {
      cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: CART_INCLUDE,
        relationLoadStrategy: 'join',
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
            relationLoadStrategy: 'join',
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
            relationLoadStrategy: 'join',
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

  formatCart(cart: any) {
    const promoResult = PromotionEngine.calculatePromotion(cart.items || []);
    const gstResult = GstEngine.calculateOrderGst({
      items: (cart.items || []).map((item: any) => ({
        variantId: item.variantId,
        productName: item.variant?.product?.name || '',
        unitPrice: Number(item.variant?.price || 0),
        quantity: item.quantity,
        discount: promoResult.itemDiscounts?.[item.variantId]?.discountAmount || 0,
        isFree: Boolean(promoResult.itemDiscounts?.[item.variantId]?.isFreeItem),
      })),
      gstRate: DEFAULT_GST_RATE,
    });

    return {
      ...cart,
      subtotal: gstResult.subtotal,
      discountTotal: gstResult.discountTotal,
      taxableAmount: gstResult.taxableAmount,
      taxRate: gstResult.rate,
      taxTotal: gstResult.taxTotal,
      cgst: gstResult.cgstAmount,
      sgst: gstResult.sgstAmount,
      igst: gstResult.igstAmount,
      grandTotal: gstResult.grandTotal,
      promotion: {
        id: promoResult.promotionId,
        name: promoResult.promotionName,
        isActive: promoResult.isActive,
        discountTotal: promoResult.discountTotal,
        appliedOffers: promoResult.appliedOffers,
        itemDiscounts: promoResult.itemDiscounts,
        missingFreeItems: promoResult.missingFreeItems,
      },
    };
  }

  async getCart(sessionToken?: string, userId?: string) {
    const cart = await this.getOrCreateCart(sessionToken, userId);
    return this.formatCart(cart);
  }

  async addItem(sessionToken: string | undefined, variantId: string, quantity: number, userId?: string) {
    const t0 = Date.now();

    // 1. Fetch variant and cart concurrently via Promise.all
    const [variant, cart] = await Promise.all([
      this.prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { inventory: true, product: true },
      }),
      this.getOrCreateCart(sessionToken, userId),
    ]);
    const tLookup = Date.now() - t0;

    if (!variant || !variant.isActive) {
      throw new NotFoundException('Product is not available');
    }
    if (!variant.inventory || variant.inventory.stockQuantity < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    const existingItem = cart.items.find((item) => item.variantId === variantId);
    if (existingItem && existingItem.quantity + quantity > variant.inventory.stockQuantity) {
      throw new BadRequestException('Requested quantity exceeds available stock');
    }

    // 2. Evaluate 1+1 promotion companion in-memory without extra DB queries
    const buySlug = variant.product.slug;
    const freeSlug = PromotionEngine.getFreeSlugForBuySlug(buySlug);
    let freeVariant: any = null;
    let canAddFree = 0;

    if (freeSlug) {
      freeVariant = await PromotionEngine.getDefaultVariantForSlug(this.prisma, freeSlug);
      if (freeVariant && freeVariant.inventory && freeVariant.inventory.stockQuantity > 0) {
        let totalQualifyingBuy = 0;
        for (const it of cart.items) {
          const currentQty = it.variantId === variantId ? it.quantity + quantity : it.quantity;
          if (PromotionEngine.getFreeSlugForBuySlug(it.variant.product.slug) === freeSlug) {
            totalQualifyingBuy += currentQty;
          }
        }
        if (!existingItem && PromotionEngine.getFreeSlugForBuySlug(buySlug) === freeSlug) {
          totalQualifyingBuy += quantity;
        }

        const currentFreeItem = cart.items.find((it) => it.variant.product.slug === freeSlug);
        const currentFreeQty = currentFreeItem ? currentFreeItem.quantity : 0;

        if (currentFreeQty < totalQualifyingBuy) {
          const needed = totalQualifyingBuy - currentFreeQty;
          canAddFree = Math.min(needed, freeVariant.inventory.stockQuantity - currentFreeQty);
        }
      }
    }

    // 3. Execute upserts concurrently
    const tMutationsStart = Date.now();
    const mutationPromises: Promise<any>[] = [
      this.prisma.cartItem.upsert({
        where: { cartId_variantId: { cartId: cart.id, variantId } },
        create: { cartId: cart.id, variantId, quantity },
        update: { quantity: { increment: quantity } },
      }),
    ];

    if (canAddFree > 0 && freeVariant) {
      mutationPromises.push(
        this.prisma.cartItem.upsert({
          where: { cartId_variantId: { cartId: cart.id, variantId: freeVariant.id } },
          create: { cartId: cart.id, variantId: freeVariant.id, quantity: canAddFree },
          update: { quantity: { increment: canAddFree } },
        }),
      );
    }

    await Promise.all(mutationPromises);
    const tMutations = Date.now() - tMutationsStart;

    // 4. Fetch authoritative final cart by primary key (single round-trip with join)
    const tFinalStart = Date.now();
    const finalCart = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: CART_INCLUDE,
      relationLoadStrategy: 'join',
    });
    const tFinal = Date.now() - tFinalStart;

    const totalTime = Date.now() - t0;
    if (process.env.DEBUG_CART_PERF === 'true') {
      // eslint-disable-next-line no-console
      console.log(`[CART PERF] addItem total: ${totalTime}ms (lookups: ${tLookup}ms, mutations: ${tMutations}ms, finalCart: ${tFinal}ms)`);
    }

    return this.formatCart(finalCart || cart);
  }

  async updateItemQuantity(sessionToken: string | undefined, cartItemId: string, quantity: number, userId?: string) {
    const cart = await this.getOrCreateCart(sessionToken, userId);
    const item = cart.items.find((it) => it.id === cartItemId);
    if (!item) throw new NotFoundException('Cart item not found');
    if (quantity < 1) {
      return this.removeItem(sessionToken, cartItemId, userId);
    }
    if (!item.variant.inventory || quantity > item.variant.inventory.stockQuantity) {
      throw new BadRequestException('Requested quantity exceeds available stock');
    }

    const previousQuantity = item.quantity;
    const buySlug = item.variant.product.slug;
    const freeSlug = PromotionEngine.getFreeSlugForBuySlug(buySlug);

    const mutationPromises: Promise<any>[] = [
      this.prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity } }),
    ];

    if (freeSlug) {
      const freeVariant = await PromotionEngine.getDefaultVariantForSlug(this.prisma, freeSlug);

      let totalQualifyingBuy = 0;
      for (const it of cart.items) {
        const itemQty = it.id === cartItemId ? quantity : it.quantity;
        if (PromotionEngine.getFreeSlugForBuySlug(it.variant.product.slug) === freeSlug) {
          totalQualifyingBuy += itemQty;
        }
      }

      const currentFreeItem = cart.items.find((it) => it.variant.product.slug === freeSlug);
      const currentFreeQty = currentFreeItem ? currentFreeItem.quantity : 0;

      if (quantity > previousQuantity && freeVariant && freeVariant.inventory && freeVariant.inventory.stockQuantity > 0) {
        if (currentFreeQty < totalQualifyingBuy) {
          const needed = totalQualifyingBuy - currentFreeQty;
          const canAdd = Math.min(needed, freeVariant.inventory.stockQuantity - currentFreeQty);
          if (canAdd > 0) {
            mutationPromises.push(
              this.prisma.cartItem.upsert({
                where: { cartId_variantId: { cartId: cart.id, variantId: freeVariant.id } },
                create: { cartId: cart.id, variantId: freeVariant.id, quantity: canAdd },
                update: { quantity: { increment: canAdd } },
              }),
            );
          }
        }
      } else if (quantity < previousQuantity && currentFreeItem) {
        if (totalQualifyingBuy === 0) {
          mutationPromises.push(this.prisma.cartItem.delete({ where: { id: currentFreeItem.id } }));
        } else if (currentFreeQty > totalQualifyingBuy) {
          mutationPromises.push(
            this.prisma.cartItem.update({
              where: { id: currentFreeItem.id },
              data: { quantity: totalQualifyingBuy },
            }),
          );
        }
      }
    }

    await Promise.all(mutationPromises);

    const finalCart = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: CART_INCLUDE,
      relationLoadStrategy: 'join',
    });
    return this.formatCart(finalCart || cart);
  }

  async removeItem(sessionToken: string | undefined, cartItemId: string, userId?: string) {
    const cart = await this.getOrCreateCart(sessionToken, userId);
    const item = cart.items.find((it) => it.id === cartItemId);
    if (!item) throw new NotFoundException('Cart item not found');

    const removedSlug = item.variant.product.slug;
    const freeSlug = PromotionEngine.getFreeSlugForBuySlug(removedSlug);

    const mutationPromises: Promise<any>[] = [
      this.prisma.cartItem.delete({ where: { id: cartItemId } }),
    ];

    if (freeSlug) {
      let remainingQualifyingBuy = 0;
      for (const it of cart.items) {
        if (it.id === cartItemId) continue;
        if (PromotionEngine.getFreeSlugForBuySlug(it.variant.product.slug) === freeSlug) {
          remainingQualifyingBuy += it.quantity;
        }
      }

      const freeItem = cart.items.find((it) => it.id !== cartItemId && it.variant.product.slug === freeSlug);
      if (freeItem) {
        if (remainingQualifyingBuy === 0) {
          mutationPromises.push(this.prisma.cartItem.delete({ where: { id: freeItem.id } }));
        } else if (freeItem.quantity > remainingQualifyingBuy) {
          mutationPromises.push(
            this.prisma.cartItem.update({
              where: { id: freeItem.id },
              data: { quantity: remainingQualifyingBuy },
            }),
          );
        }
      }
    }

    await Promise.all(mutationPromises);

    const finalCart = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: CART_INCLUDE,
      relationLoadStrategy: 'join',
    });
    return this.formatCart(finalCart || cart);
  }

  async clearCart(sessionToken: string | undefined, userId?: string) {
    const cart = await this.getOrCreateCart(sessionToken, userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.formatCart({ ...cart, items: [] });
  }

  async calculateTotals(sessionToken?: string, userId?: string) {
    const cart = await this.getOrCreateCart(sessionToken, userId);
    const promoResult = PromotionEngine.calculatePromotion(cart.items);
    return {
      subtotal: promoResult.subtotal,
      discountTotal: promoResult.discountTotal,
      grandTotal: promoResult.grandTotal,
      itemCount: cart.items.reduce((n, i) => n + i.quantity, 0),
      promotion: {
        id: promoResult.promotionId,
        name: promoResult.promotionName,
        isActive: promoResult.isActive,
        discountTotal: promoResult.discountTotal,
      },
    };
  }
}
