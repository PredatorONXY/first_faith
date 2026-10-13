const { GstEngine, DEFAULT_GST_RATE, DEFAULT_SELLER_STATE } = require('../dist/src/common/tax/gst.engine.js');

describe('GstEngine Unit Tests (GST-Inclusive Pricing Model)', () => {
  test('Scenario 1: ₹695 inclusive price -> taxable value ₹588.98, included GST ₹106.02, final price ₹695.00', () => {
    const res = GstEngine.calculateOrderGst({
      items: [
        { productName: 'Clay Mask', unitPrice: 695, quantity: 1 },
      ],
      shippingState: 'Maharashtra',
      sellerState: 'Maharashtra',
    });

    expect(res.subtotal).toBe(695);
    expect(res.discountTotal).toBe(0);
    expect(res.taxableAmount).toBe(588.98);
    expect(res.taxTotal).toBe(106.02);
    expect(res.grandTotal).toBe(695);
    expect(res.isInterState).toBe(false);
    expect(res.cgstRate).toBe(9);
    expect(res.cgstAmount).toBe(53.01);
    expect(res.sgstRate).toBe(9);
    expect(res.sgstAmount).toBe(53.01);
    expect(res.igstAmount).toBe(0);
    expect(Number((res.taxableAmount + res.taxTotal).toFixed(2))).toBe(695);
  });

  test('Scenario 2: ₹500 inclusive price -> taxable value ₹423.73, included GST ₹76.27, final price ₹500.00', () => {
    const res = GstEngine.calculateOrderGst({
      items: [
        { productName: 'Standard Cream', unitPrice: 500, quantity: 1 },
      ],
      shippingState: 'Maharashtra',
      sellerState: 'Maharashtra',
    });

    expect(res.subtotal).toBe(500);
    expect(res.discountTotal).toBe(0);
    expect(res.taxableAmount).toBe(423.73);
    expect(res.taxTotal).toBe(76.27);
    expect(res.grandTotal).toBe(500);
    expect(res.isInterState).toBe(false);
    expect(res.cgstRate).toBe(9);
    expect(res.cgstAmount).toBe(38.14);
    expect(res.sgstRate).toBe(9);
    expect(res.sgstAmount).toBe(38.13);
    expect(res.igstAmount).toBe(0);
    expect(Number((res.cgstAmount + res.sgstAmount).toFixed(2))).toBe(76.27);
    expect(Number((res.taxableAmount + res.taxTotal).toFixed(2))).toBe(500);
  });

  test('Scenario 3: Inter-state sale applies IGST 18% without increasing grand total', () => {
    const res = GstEngine.calculateOrderGst({
      items: [
        { productName: 'Clay Mask', unitPrice: 695, quantity: 1 },
      ],
      shippingState: 'Delhi',
      sellerState: 'Maharashtra',
    });

    expect(res.subtotal).toBe(695);
    expect(res.taxableAmount).toBe(588.98);
    expect(res.taxTotal).toBe(106.02);
    expect(res.grandTotal).toBe(695);
    expect(res.isInterState).toBe(true);
    expect(res.cgstAmount).toBe(0);
    expect(res.sgstAmount).toBe(0);
    expect(res.igstRate).toBe(18);
    expect(res.igstAmount).toBe(106.02);
    expect(Number((res.taxableAmount + res.taxTotal).toFixed(2))).toBe(695);
  });

  test('Scenario 4: Multiple products with different prices and quantities', () => {
    const res = GstEngine.calculateOrderGst({
      items: [
        { productName: 'Clay Mask', unitPrice: 695, quantity: 2 }, // 1390
        { productName: 'Sunscreen', unitPrice: 795, quantity: 1 }, // 795
      ],
      shippingState: 'Maharashtra',
    });

    // Subtotal = 1390 + 795 = 2185 (all inclusive)
    // Mask net 1390: taxable = round(13900000 / 118) / 100 = 1177.97, tax = 212.03
    // Sunscreen net 795: taxable = round(7950000 / 118) / 100 = 673.73, tax = 121.27
    // Taxable Total = 1177.97 + 673.73 = 1851.70
    // Tax Total = 212.03 + 121.27 = 333.30
    // Grand Total remains 2185.00
    expect(res.subtotal).toBe(2185);
    expect(res.discountTotal).toBe(0);
    expect(res.taxableAmount).toBe(1851.70);
    expect(res.taxTotal).toBe(333.30);
    expect(res.grandTotal).toBe(2185);
    expect(Number((res.cgstAmount + res.sgstAmount).toFixed(2))).toBe(333.30);
    expect(Number((res.taxableAmount + res.taxTotal).toFixed(2))).toBe(2185);
  });

  test('Scenario 5: Free 1+1 companion product has ₹0 taxable value, ₹0 GST, customer pays ₹695', () => {
    const res = GstEngine.calculateOrderGst({
      items: [
        { productName: 'Clay Mask', unitPrice: 695, quantity: 1 },
        { productName: 'Cleanser', unitPrice: 525, quantity: 1, discount: 525, isFree: true },
      ],
      shippingState: 'Maharashtra',
    });

    // Subtotal before discounts = 695 + 525 = 1220
    // Discount = 525
    // Net Customer Total = 695
    // Taxable value of Clay Mask = 588.98, Included GST = 106.02
    // Grand total = 695 (customer is NOT charged 820.10)
    expect(res.subtotal).toBe(1220);
    expect(res.discountTotal).toBe(525);
    expect(res.taxableAmount).toBe(588.98);
    expect(res.taxTotal).toBe(106.02);
    expect(res.grandTotal).toBe(695);
    expect(res.items[1].taxableAmount).toBe(0);
    expect(res.items[1].taxAmount).toBe(0);
    expect(res.items[1].isFree).toBe(true);
    expect(Number((res.taxableAmount + res.taxTotal).toFixed(2))).toBe(695);
  });

  test('Scenario 6: All three 1+1 skincare offers in same cart', () => {
    const res = GstEngine.calculateOrderGst({
      items: [
        { productName: 'Clay Mask', unitPrice: 695, quantity: 1 },
        { productName: 'Cleanser', unitPrice: 525, quantity: 1, discount: 525, isFree: true },
        { productName: 'Body Butter', unitPrice: 625, quantity: 1 },
        { productName: 'Serum', unitPrice: 675, quantity: 1, discount: 675, isFree: true },
        { productName: 'Sunscreen', unitPrice: 795, quantity: 1 },
        { productName: 'Cleanser', unitPrice: 525, quantity: 1, discount: 525, isFree: true },
      ],
      shippingState: 'Maharashtra',
    });

    // Net payable = 695 + 625 + 795 = 2115.00
    expect(res.subtotal).toBe(695 + 625 + 795 + 525 + 675 + 525);
    expect(res.discountTotal).toBe(525 + 675 + 525);
    expect(res.grandTotal).toBe(2115);
    expect(Number((res.taxableAmount + res.taxTotal).toFixed(2))).toBe(2115);
  });

  test('Scenario 7: Decimal rounding precision on odd prices', () => {
    const res = GstEngine.calculateOrderGst({
      items: [
        { productName: 'Test Product', unitPrice: 1, quantity: 1 },
      ],
      shippingState: 'Maharashtra',
    });

    // 1 rupee inclusive price:
    // Taxable paise = round(100 * 100 / 118) = 85 paise (0.85)
    // Tax paise = 100 - 85 = 15 paise (0.15)
    // Total = 1.00
    expect(res.taxableAmount).toBe(0.85);
    expect(res.taxTotal).toBe(0.15);
    expect(res.grandTotal).toBe(1);
    expect(res.cgstAmount).toBe(0.08);
    expect(res.sgstAmount).toBe(0.07);
    expect(Number((res.cgstAmount + res.sgstAmount).toFixed(2))).toBe(0.15);
  });

  test('Scenario 8: Inclusive-of-GST price extraction helper', () => {
    const res695 = GstEngine.extractInclusiveGst(695, 18);
    expect(res695.taxableAmount).toBe(588.98);
    expect(res695.taxAmount).toBe(106.02);
    expect(res695.total).toBe(695);

    const res500 = GstEngine.extractInclusiveGst(500, 18);
    expect(res500.taxableAmount).toBe(423.73);
    expect(res500.taxAmount).toBe(76.27);
    expect(res500.total).toBe(500);

    const res118 = GstEngine.extractInclusiveGst(118, 18);
    expect(res118.taxableAmount).toBe(100);
    expect(res118.taxAmount).toBe(18);
    expect(res118.total).toBe(118);
  });

  test('Scenario 9: Configurable GST rate (e.g. 12% inclusive extraction on ₹1000)', () => {
    const res12 = GstEngine.calculateOrderGst({
      items: [{ productName: 'Special Item', unitPrice: 1000, quantity: 1 }],
      gstRate: 12,
    });
    // 1000 inclusive at 12%:
    // Taxable = round(100000 * 100 / 112) = 89286 paise = 892.86
    // Tax = 1000 - 892.86 = 107.14
    // Grand total remains 1000.00
    expect(res12.taxableAmount).toBe(892.86);
    expect(res12.taxTotal).toBe(107.14);
    expect(res12.grandTotal).toBe(1000);
    expect(Number((res12.taxableAmount + res12.taxTotal).toFixed(2))).toBe(1000);
  });

  test('Scenario 10: Strict reconciliation invariant: taxableAmount + taxTotal === grandTotal (minus shipping)', () => {
    const testPrices = [695, 500, 625, 795, 525, 675, 1220, 2495.70, 99.99, 1499, 2999];
    for (const p of testPrices) {
      const res = GstEngine.calculateOrderGst({
        items: [{ productName: 'Item', unitPrice: p, quantity: 1 }],
      });
      expect(Number((res.taxableAmount + res.taxTotal).toFixed(2))).toBe(p);
      expect(res.grandTotal).toBe(p);
      expect(Number((res.cgstAmount + res.sgstAmount).toFixed(2))).toBe(res.taxTotal);
    }
  });
});
