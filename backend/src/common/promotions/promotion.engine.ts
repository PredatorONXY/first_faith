import { PrismaService } from '../prisma.service';

export interface PromotionRule {
  id: string;
  name: string;
  buyProductSlug: string;
  buyProductName: string;
  freeProductSlug: string;
  freeProductName: string;
}

export const PROMOTION_RULES: PromotionRule[] = [
  {
    id: 'OFFER_A',
    name: 'Clay Mask → Cleanser FREE',
    buyProductSlug: 'clay-mask',
    buyProductName: 'Clay Mask',
    freeProductSlug: 'cleanser',
    freeProductName: 'Cleanser',
  },
  {
    id: 'OFFER_B',
    name: 'Body Butter → Serum FREE',
    buyProductSlug: 'body-butter',
    buyProductName: 'Body Butter',
    freeProductSlug: 'serum',
    freeProductName: 'Serum',
  },
  {
    id: 'OFFER_C',
    name: 'Sunscreen → Cleanser FREE',
    buyProductSlug: 'sunscreen',
    buyProductName: 'Sunscreen',
    freeProductSlug: 'cleanser',
    freeProductName: 'Cleanser',
  },
];

export interface CartItemLike {
  id?: string;
  variantId: string;
  quantity: number;
  variant: {
    id: string;
    price: number | string | { toString(): string };
    sizeLabel?: string;
    product: {
      id?: string;
      slug: string;
      name: string;
      status?: string;
    };
    inventory?: {
      stockQuantity: number;
    } | null;
  };
}

export interface AppliedPromotionOffer {
  offerId: string;
  offerName: string;
  buyProductSlug: string;
  buyProductName: string;
  buyQuantity: number;
  freeProductSlug: string;
  freeProductName: string;
  freeQuantity: number;
  unitPrice: number;
  discount: number;
}

export interface ItemPromotionDetails {
  freeQuantity: number;
  isFreeItem: boolean;
  discountAmount: number;
  unitPrice: number;
}

export interface PromotionCalculationResult {
  promotionId: string;
  promotionName: string;
  isActive: boolean;
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  appliedOffers: AppliedPromotionOffer[];
  itemDiscounts: Record<string, ItemPromotionDetails>;
  missingFreeItems: Array<{
    offerId: string;
    buyProductSlug: string;
    buyProductName: string;
    freeProductSlug: string;
    freeProductName: string;
    quantityEligible: number;
  }>;
}

export class PromotionEngine {
  /**
   * Authoritative calculation of 1+1 Skincare Offer promotion for cart or order items.
   * Never trusts client-supplied amounts. Computes discounts strictly from variant prices.
   */
  static calculatePromotion(items: CartItemLike[]): PromotionCalculationResult {
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.variant.price) * item.quantity,
      0,
    );

    // 1. Group qualifying BUY quantities by product slug
    const buyQuantities: Record<string, number> = {
      'clay-mask': 0,
      'body-butter': 0,
      'sunscreen': 0,
    };

    // 2. Track FREE candidate items present in cart
    const freeProductItems: Record<string, CartItemLike[]> = {
      'cleanser': [],
      'serum': [],
    };

    for (const item of items) {
      const slug = item.variant.product.slug;
      if (buyQuantities[slug] !== undefined) {
        buyQuantities[slug] += item.quantity;
      }
      if (freeProductItems[slug] !== undefined) {
        freeProductItems[slug].push(item);
      }
    }

    // 3. Determine maximum eligible free quantities per free product
    // - Cleanser is earned by Clay Mask (Offer A) and Sunscreen (Offer C)
    const eligibleFreeCleansers = buyQuantities['clay-mask'] + buyQuantities['sunscreen'];
    // - Serum is earned by Body Butter (Offer B)
    const eligibleFreeSerums = buyQuantities['body-butter'];

    const actualCleanserInCart = freeProductItems['cleanser'].reduce((sum, it) => sum + it.quantity, 0);
    const actualSerumInCart = freeProductItems['serum'].reduce((sum, it) => sum + it.quantity, 0);

    const grantedFreeCleansers = Math.min(actualCleanserInCart, eligibleFreeCleansers);
    const grantedFreeSerums = Math.min(actualSerumInCart, eligibleFreeSerums);

    const appliedOffers: AppliedPromotionOffer[] = [];
    const itemDiscounts: Record<string, ItemPromotionDetails> = {};

    let totalDiscount = 0;

    // Allocate Cleanser discount across Offer A and Offer C
    if (grantedFreeCleansers > 0) {
      let remainingGrantedCleansers = grantedFreeCleansers;

      // Offer A: Clay Mask -> Cleanser
      const offerACleanseCap = Math.min(buyQuantities['clay-mask'], remainingGrantedCleansers);
      if (offerACleanseCap > 0) {
        const cleanserPrice = Number(freeProductItems['cleanser'][0]?.variant.price || 0);
        const discountA = offerACleanseCap * cleanserPrice;
        totalDiscount += discountA;
        appliedOffers.push({
          offerId: 'OFFER_A',
          offerName: 'Clay Mask → Cleanser FREE',
          buyProductSlug: 'clay-mask',
          buyProductName: 'Clay Mask',
          buyQuantity: buyQuantities['clay-mask'],
          freeProductSlug: 'cleanser',
          freeProductName: 'Cleanser',
          freeQuantity: offerACleanseCap,
          unitPrice: cleanserPrice,
          discount: discountA,
        });
        remainingGrantedCleansers -= offerACleanseCap;
      }

      // Offer C: Sunscreen -> Cleanser
      const offerCCleanseCap = Math.min(buyQuantities['sunscreen'], remainingGrantedCleansers);
      if (offerCCleanseCap > 0) {
        const cleanserPrice = Number(freeProductItems['cleanser'][0]?.variant.price || 0);
        const discountC = offerCCleanseCap * cleanserPrice;
        totalDiscount += discountC;
        appliedOffers.push({
          offerId: 'OFFER_C',
          offerName: 'Sunscreen → Cleanser FREE',
          buyProductSlug: 'sunscreen',
          buyProductName: 'Sunscreen',
          buyQuantity: buyQuantities['sunscreen'],
          freeProductSlug: 'cleanser',
          freeProductName: 'Cleanser',
          freeQuantity: offerCCleanseCap,
          unitPrice: cleanserPrice,
          discount: discountC,
        });
        remainingGrantedCleansers -= offerCCleanseCap;
      }

      // Mark Cleanser items
      let cleansersToMark = grantedFreeCleansers;
      for (const cleanserItem of freeProductItems['cleanser']) {
        const freeCount = Math.min(cleanserItem.quantity, cleansersToMark);
        const unitPrice = Number(cleanserItem.variant.price);
        const discountAmount = freeCount * unitPrice;
        itemDiscounts[cleanserItem.variantId] = {
          freeQuantity: freeCount,
          isFreeItem: freeCount > 0,
          discountAmount,
          unitPrice,
        };
        cleansersToMark -= freeCount;
      }
    }

    // Allocate Serum discount for Offer B
    if (grantedFreeSerums > 0) {
      const serumPrice = Number(freeProductItems['serum'][0]?.variant.price || 0);
      const discountB = grantedFreeSerums * serumPrice;
      totalDiscount += discountB;
      appliedOffers.push({
        offerId: 'OFFER_B',
        offerName: 'Body Butter → Serum FREE',
        buyProductSlug: 'body-butter',
        buyProductName: 'Body Butter',
        buyQuantity: buyQuantities['body-butter'],
        freeProductSlug: 'serum',
        freeProductName: 'Serum',
        freeQuantity: grantedFreeSerums,
        unitPrice: serumPrice,
        discount: discountB,
      });

      let serumsToMark = grantedFreeSerums;
      for (const serumItem of freeProductItems['serum']) {
        const freeCount = Math.min(serumItem.quantity, serumsToMark);
        const unitPrice = Number(serumItem.variant.price);
        const discountAmount = freeCount * unitPrice;
        itemDiscounts[serumItem.variantId] = {
          freeQuantity: freeCount,
          isFreeItem: freeCount > 0,
          discountAmount,
          unitPrice,
        };
        serumsToMark -= freeCount;
      }
    }

    // Identify if any eligible free items have not been added yet
    const missingFreeItems: Array<{
      offerId: string;
      buyProductSlug: string;
      buyProductName: string;
      freeProductSlug: string;
      freeProductName: string;
      quantityEligible: number;
    }> = [];

    const missingCleansers = eligibleFreeCleansers - actualCleanserInCart;
    if (missingCleansers > 0) {
      if (buyQuantities['clay-mask'] > 0) {
        missingFreeItems.push({
          offerId: 'OFFER_A',
          buyProductSlug: 'clay-mask',
          buyProductName: 'Clay Mask',
          freeProductSlug: 'cleanser',
          freeProductName: 'Cleanser',
          quantityEligible: Math.min(buyQuantities['clay-mask'], missingCleansers),
        });
      }
      if (buyQuantities['sunscreen'] > 0) {
        missingFreeItems.push({
          offerId: 'OFFER_C',
          buyProductSlug: 'sunscreen',
          buyProductName: 'Sunscreen',
          freeProductSlug: 'cleanser',
          freeProductName: 'Cleanser',
          quantityEligible: Math.min(buyQuantities['sunscreen'], missingCleansers),
        });
      }
    }

    const missingSerums = eligibleFreeSerums - actualSerumInCart;
    if (missingSerums > 0 && buyQuantities['body-butter'] > 0) {
      missingFreeItems.push({
        offerId: 'OFFER_B',
        buyProductSlug: 'body-butter',
        buyProductName: 'Body Butter',
        freeProductSlug: 'serum',
        freeProductName: 'Serum',
        quantityEligible: missingSerums,
      });
    }

    const isActive = totalDiscount > 0;
    const grandTotal = Math.max(subtotal - totalDiscount, 0);

    return {
      promotionId: 'FIRST_FAITH_1_PLUS_1',
      promotionName: 'FIRST FAITH 1+1 SKINCARE OFFER',
      isActive,
      subtotal,
      discountTotal: totalDiscount,
      grandTotal,
      appliedOffers,
      itemDiscounts,
      missingFreeItems,
    };
  }

  /**
   * Helper to find the default active variant for a product slug
   */
  static async getDefaultVariantForSlug(prisma: PrismaService, slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        variants: {
          where: { isActive: true },
          include: { inventory: true },
          orderBy: { isDefault: 'desc' },
        },
      },
    });

    if (!product || product.status !== 'PUBLISHED' || product.variants.length === 0) {
      return null;
    }

    return product.variants[0];
  }

  /**
   * Returns the target free product slug for an added buy product slug (if eligible)
   */
  static getFreeSlugForBuySlug(buySlug: string): string | null {
    if (buySlug === 'clay-mask') return 'cleanser';
    if (buySlug === 'body-butter') return 'serum';
    if (buySlug === 'sunscreen') return 'cleanser';
    return null;
  }
}
