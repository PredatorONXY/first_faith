const { PromotionEngine } = require('../dist/src/common/promotions/promotion.engine.js');

describe('PromotionEngine Unit Tests', () => {
  const createMockItem = (slug, name, price, quantity, variantId) => ({
    variantId: variantId || `var_${slug}`,
    quantity,
    variant: {
      id: variantId || `var_${slug}`,
      price,
      sizeLabel: '50ml',
      product: {
        slug,
        name,
        status: 'PUBLISHED',
      },
    },
  });

  describe('Single Offer combinations', () => {
    test('Scenario 1: Clay Mask only (buy 1) with no cleanser in cart gives 0 discount but identifies missing free item', () => {
      const items = [createMockItem('clay-mask', 'Clay Mask', 695, 1)];
      const res = PromotionEngine.calculatePromotion(items);
      expect(res.subtotal).toBe(695);
      expect(res.discountTotal).toBe(0);
      expect(res.grandTotal).toBe(695);
      expect(res.isActive).toBe(false);
      expect(res.missingFreeItems.length).toBe(1);
      expect(res.missingFreeItems[0].freeProductSlug).toBe('cleanser');
      expect(res.missingFreeItems[0].quantityEligible).toBe(1);
    });

    test('Scenario 2: Clay Mask (buy 1) + Cleanser (get 1 free) applies full cleanser discount', () => {
      const items = [
        createMockItem('clay-mask', 'Clay Mask', 695, 1),
        createMockItem('cleanser', 'Cleanser', 525, 1),
      ];
      const res = PromotionEngine.calculatePromotion(items);
      expect(res.subtotal).toBe(1220);
      expect(res.discountTotal).toBe(525);
      expect(res.grandTotal).toBe(695);
      expect(res.isActive).toBe(true);
      expect(res.appliedOffers.length).toBe(1);
      expect(res.appliedOffers[0].offerId).toBe('OFFER_A');
      expect(res.appliedOffers[0].discount).toBe(525);
      expect(res.itemDiscounts['var_cleanser'].isFreeItem).toBe(true);
      expect(res.itemDiscounts['var_cleanser'].freeQuantity).toBe(1);
      expect(res.itemDiscounts['var_cleanser'].discountAmount).toBe(525);
    });

    test('Scenario 3: Body Butter (buy 1) + Serum (get 1 free) applies full serum discount', () => {
      const items = [
        createMockItem('body-butter', 'Body Butter', 625, 1),
        createMockItem('serum', 'Serum', 675, 1),
      ];
      const res = PromotionEngine.calculatePromotion(items);
      expect(res.subtotal).toBe(1300);
      expect(res.discountTotal).toBe(675);
      expect(res.grandTotal).toBe(625);
      expect(res.appliedOffers[0].offerId).toBe('OFFER_B');
      expect(res.itemDiscounts['var_serum'].isFreeItem).toBe(true);
    });

    test('Scenario 4: Sunscreen (buy 1) + Cleanser (get 1 free) applies full cleanser discount', () => {
      const items = [
        createMockItem('sunscreen', 'Sunscreen', 795, 1),
        createMockItem('cleanser', 'Cleanser', 525, 1),
      ];
      const res = PromotionEngine.calculatePromotion(items);
      expect(res.subtotal).toBe(1320);
      expect(res.discountTotal).toBe(525);
      expect(res.grandTotal).toBe(795);
      expect(res.appliedOffers[0].offerId).toBe('OFFER_C');
    });
  });

  describe('Multiple Offers and Combinations in same cart', () => {
    test('Scenario 5: Clay Mask + Body Butter gives both Cleanser and Serum free', () => {
      const items = [
        createMockItem('clay-mask', 'Clay Mask', 695, 1),
        createMockItem('cleanser', 'Cleanser', 525, 1),
        createMockItem('body-butter', 'Body Butter', 625, 1),
        createMockItem('serum', 'Serum', 675, 1),
      ];
      const res = PromotionEngine.calculatePromotion(items);
      expect(res.subtotal).toBe(695 + 525 + 625 + 675);
      expect(res.discountTotal).toBe(525 + 675);
      expect(res.grandTotal).toBe(695 + 625);
      expect(res.appliedOffers.length).toBe(2);
    });

    test('Scenario 6: Clay Mask + Sunscreen provides 2 free Cleansers', () => {
      const items = [
        createMockItem('clay-mask', 'Clay Mask', 695, 1),
        createMockItem('sunscreen', 'Sunscreen', 795, 1),
        createMockItem('cleanser', 'Cleanser', 525, 2),
      ];
      const res = PromotionEngine.calculatePromotion(items);
      expect(res.subtotal).toBe(695 + 795 + (525 * 2));
      expect(res.discountTotal).toBe(525 * 2);
      expect(res.grandTotal).toBe(695 + 795);
      expect(res.appliedOffers.length).toBe(2);
      expect(res.itemDiscounts['var_cleanser'].freeQuantity).toBe(2);
    });

    test('Scenario 7: Body Butter + Sunscreen provides Serum free and Cleanser free', () => {
      const items = [
        createMockItem('body-butter', 'Body Butter', 625, 1),
        createMockItem('sunscreen', 'Sunscreen', 795, 1),
        createMockItem('serum', 'Serum', 675, 1),
        createMockItem('cleanser', 'Cleanser', 525, 1),
      ];
      const res = PromotionEngine.calculatePromotion(items);
      expect(res.discountTotal).toBe(675 + 525);
      expect(res.grandTotal).toBe(625 + 795);
      expect(res.appliedOffers.length).toBe(2);
    });

    test('Scenario 8: All three qualifying products in same cart', () => {
      const items = [
        createMockItem('clay-mask', 'Clay Mask', 695, 1),
        createMockItem('body-butter', 'Body Butter', 625, 1),
        createMockItem('sunscreen', 'Sunscreen', 795, 1),
        createMockItem('cleanser', 'Cleanser', 525, 2), // 1 for Clay Mask, 1 for Sunscreen
        createMockItem('serum', 'Serum', 675, 1), // 1 for Body Butter
      ];
      const res = PromotionEngine.calculatePromotion(items);
      expect(res.discountTotal).toBe((525 * 2) + 675);
      expect(res.grandTotal).toBe(695 + 625 + 795);
      expect(res.appliedOffers.length).toBe(3);
    });
  });

  describe('Quantity rules and caps', () => {
    test('Scenario 9: BUY quantity 2 grants FREE quantity 2', () => {
      const items = [
        createMockItem('clay-mask', 'Clay Mask', 695, 2),
        createMockItem('cleanser', 'Cleanser', 525, 2),
      ];
      const res = PromotionEngine.calculatePromotion(items);
      expect(res.discountTotal).toBe(525 * 2);
      expect(res.grandTotal).toBe(695 * 2);
      expect(res.itemDiscounts['var_cleanser'].freeQuantity).toBe(2);
    });

    test('Scenario 10: FREE product quantity greater than qualifying BUY quantity is capped', () => {
      const items = [
        createMockItem('clay-mask', 'Clay Mask', 695, 1),
        createMockItem('cleanser', 'Cleanser', 525, 3),
      ];
      const res = PromotionEngine.calculatePromotion(items);
      expect(res.subtotal).toBe(695 + (525 * 3));
      expect(res.discountTotal).toBe(525); // only 1 is free
      expect(res.grandTotal).toBe(695 + (525 * 2));
      expect(res.itemDiscounts['var_cleanser'].freeQuantity).toBe(1);
    });

    test('Scenario 11: Non-qualifying products get 0 discount', () => {
      const items = [
        createMockItem('cleanser', 'Cleanser', 525, 2),
      ];
      const res = PromotionEngine.calculatePromotion(items);
      expect(res.subtotal).toBe(1050);
      expect(res.discountTotal).toBe(0);
      expect(res.grandTotal).toBe(1050);
      expect(res.isActive).toBe(false);
    });
  });
});
