/**
 * First Faith GST Calculation Engine
 * 
 * Provides authoritative decimal/paise arithmetic for:
 * - Dynamic 18% GST (configurable) calculation on base product prices
 * - Reconciliation of 1+1 skincare promotion discounts
 * - Intra-state (CGST + SGST) vs Inter-state (IGST) tax classification
 * - Inclusive-of-tax extraction helpers
 * - Precision rounding without floating-point inaccuracies
 */

export const DEFAULT_GST_RATE = 18; // 18% GST
export const DEFAULT_SELLER_STATE = 'Maharashtra';

export function toPaise(rupees: number | string | { toString(): string }): number {
  if (rupees === null || rupees === undefined) return 0;
  const str = typeof rupees === 'object' ? rupees.toString() : String(rupees);
  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function toRupees(paise: number): number {
  return Number((paise / 100).toFixed(2));
}

export function isSameState(stateA?: string | null, stateB?: string | null): boolean {
  if (!stateA || !stateB) return false;
  const normA = stateA.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const normB = stateB.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  const aliases: Record<string, string[]> = {
    maharashtra: ['mh', 'maharashtra', 'maha'],
    delhi: ['dl', 'delhi', 'newdelhi', 'nctofdelhi'],
    karnataka: ['ka', 'karnataka'],
    tamilnadu: ['tn', 'tamilnadu', 'tamil'],
    gujarat: ['gj', 'gujarat'],
    telangana: ['ts', 'tg', 'telangana'],
    uttarpradesh: ['up', 'uttarpradesh'],
    westbengal: ['wb', 'westbengal', 'bengal'],
    rajasthan: ['rj', 'rajasthan'],
    kerala: ['kl', 'kerala'],
    haryana: ['hr', 'haryana'],
    punjab: ['pb', 'punjab'],
    andhrapradesh: ['ap', 'andhrapradesh'],
    madhyapradesh: ['mp', 'madhyapradesh'],
    bihar: ['br', 'bihar'],
    odisha: ['od', 'or', 'odisha', 'orissa'],
  };

  for (const [canonical, list] of Object.entries(aliases)) {
    const aMatches = list.includes(normA) || normA.includes(canonical);
    const bMatches = list.includes(normB) || normB.includes(canonical);
    if (aMatches && bMatches) return true;
  }
  return false;
}

export interface TaxItemInput {
  variantId?: string;
  productName: string;
  unitPrice: number | string;
  quantity: number;
  discount?: number | string;
  isFree?: boolean;
}

export interface ItemTaxDetail {
  variantId?: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineSubtotal: number;
  discount: number;
  taxableAmount: number;
  taxAmount: number;
  isFree: boolean;
}

export interface GstCalculationResult {
  rate: number;
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  taxTotal: number;
  isInterState: boolean;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  shippingFee: number;
  grandTotal: number;
  items: ItemTaxDetail[];
}

export class GstEngine {
  /**
   * Calculate 18% GST extracted from inclusive product prices, respecting discounts and customer state.
   * Product prices already include GST. Never adds GST on top of product prices.
   */
  static calculateOrderGst({
    items,
    shippingState,
    sellerState = DEFAULT_SELLER_STATE,
    gstRate = DEFAULT_GST_RATE,
    shippingFee = 0,
  }: {
    items: TaxItemInput[];
    shippingState?: string | null;
    sellerState?: string;
    gstRate?: number;
    shippingFee?: number;
  }): GstCalculationResult {
    let subtotalPaise = 0;
    let discountPaise = 0;
    let taxablePaiseTotal = 0;
    let taxPaiseTotal = 0;

    const itemDetails: ItemTaxDetail[] = [];

    for (const item of items) {
      const unitPricePaise = toPaise(item.unitPrice);
      const qty = Math.max(item.quantity || 1, 0);
      const lineSubtotalPaise = unitPricePaise * qty;
      const lineDiscountPaise = Math.min(toPaise(item.discount || 0), lineSubtotalPaise);
      const isFree = Boolean(lineSubtotalPaise > 0 && lineDiscountPaise >= lineSubtotalPaise);

      // In the GST-inclusive model, product prices already include 18% GST.
      // Net customer payable amount for this line (inclusive of GST)
      const lineNetPaise = isFree ? 0 : Math.max(lineSubtotalPaise - lineDiscountPaise, 0);
      // Taxable amount extracted from inclusive price: P / (1 + rate/100)
      const lineTaxablePaise = isFree ? 0 : Math.round((lineNetPaise * 100) / (100 + gstRate));
      // Embedded GST extracted: P - taxable amount
      const lineTaxPaise = isFree ? 0 : lineNetPaise - lineTaxablePaise;

      subtotalPaise += lineSubtotalPaise;
      discountPaise += lineDiscountPaise;
      taxablePaiseTotal += lineTaxablePaise;
      taxPaiseTotal += lineTaxPaise;

      itemDetails.push({
        variantId: item.variantId,
        productName: item.productName,
        unitPrice: toRupees(unitPricePaise),
        quantity: qty,
        lineSubtotal: toRupees(lineSubtotalPaise),
        discount: toRupees(lineDiscountPaise),
        taxableAmount: toRupees(lineTaxablePaise),
        taxAmount: toRupees(lineTaxPaise),
        isFree,
      });
    }

    const shippingPaise = toPaise(shippingFee);
    // Grand total is the inclusive product net total plus shipping fee.
    // GST is embedded within the product price, NOT added on top.
    const grandTotalPaise = (subtotalPaise - discountPaise) + shippingPaise;

    // Determine state classification
    const isSame = shippingState ? isSameState(shippingState, sellerState) : true;
    const isInterState = !isSame;

    let cgstRate = 0;
    let cgstPaise = 0;
    let sgstRate = 0;
    let sgstPaise = 0;
    let igstRate = 0;
    let igstPaise = 0;

    if (isInterState) {
      igstRate = gstRate;
      igstPaise = taxPaiseTotal;
    } else {
      cgstRate = gstRate / 2;
      sgstRate = gstRate / 2;
      cgstPaise = Math.round(taxPaiseTotal / 2);
      sgstPaise = taxPaiseTotal - cgstPaise; // Exact zero-drift split
    }

    return {
      rate: gstRate,
      subtotal: toRupees(subtotalPaise),
      discountTotal: toRupees(discountPaise),
      taxableAmount: toRupees(taxablePaiseTotal),
      taxTotal: toRupees(taxPaiseTotal),
      isInterState,
      cgstRate,
      cgstAmount: toRupees(cgstPaise),
      sgstRate,
      sgstAmount: toRupees(sgstPaise),
      igstRate,
      igstAmount: toRupees(igstPaise),
      shippingFee: toRupees(shippingPaise),
      grandTotal: toRupees(grandTotalPaise),
      items: itemDetails,
    };
  }

  /**
   * Helper to extract taxable amount and embedded GST from an inclusive amount.
   */
  static extractInclusiveGst(
    inclusiveAmount: number | string,
    gstRate = DEFAULT_GST_RATE,
  ): { taxableAmount: number; taxAmount: number; total: number } {
    const inclusivePaise = toPaise(inclusiveAmount);
    const taxablePaise = Math.round((inclusivePaise * 100) / (100 + gstRate));
    const taxPaise = inclusivePaise - taxablePaise;
    return {
      taxableAmount: toRupees(taxablePaise),
      taxAmount: toRupees(taxPaise),
      total: toRupees(inclusivePaise),
    };
  }
}
