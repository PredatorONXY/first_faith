/**
 * Frontend Tax & GST Helper for First Faith
 * Authoritative client-side calculation mirroring backend GstEngine with zero-drift integer paise arithmetic.
 */

export const DEFAULT_GST_RATE = 18;
export const DEFAULT_SELLER_STATE = 'Maharashtra';

export function toPaise(rupees: number | string): number {
  if (rupees === null || rupees === undefined) return 0;
  const num = parseFloat(String(rupees));
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

export interface TaxLineItem {
  variantId?: string;
  unitPrice: number | string;
  quantity: number;
  discount?: number;
  isFree?: boolean;
}

export interface CalculatedOrderTax {
  rate: number;
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  taxTotal: number;
  isInterState: boolean;
  isStateDetermined: boolean;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  shippingFee: number;
  grandTotal: number;
}

export function calculateFrontendTax({
  items,
  shippingState,
  sellerState = DEFAULT_SELLER_STATE,
  gstRate = DEFAULT_GST_RATE,
  shippingFee = 0,
}: {
  items: TaxLineItem[];
  shippingState?: string | null;
  sellerState?: string;
  gstRate?: number;
  shippingFee?: number;
}): CalculatedOrderTax {
  let subtotalPaise = 0;
  let discountPaise = 0;
  let taxablePaiseTotal = 0;
  let taxPaiseTotal = 0;

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
  }

  const shippingPaise = toPaise(shippingFee);
  // Grand total is the inclusive product net total plus shipping fee.
  // GST is embedded within the product price, NOT added on top.
  const grandTotalPaise = (subtotalPaise - discountPaise) + shippingPaise;

  const hasState = Boolean(shippingState && shippingState.trim().length > 1);
  const isSame = hasState ? isSameState(shippingState, sellerState) : true;
  const isInterState = hasState ? !isSame : false;

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
    sgstPaise = taxPaiseTotal - cgstPaise;
  }

  return {
    rate: gstRate,
    subtotal: toRupees(subtotalPaise),
    discountTotal: toRupees(discountPaise),
    taxableAmount: toRupees(taxablePaiseTotal),
    taxTotal: toRupees(taxPaiseTotal),
    isInterState,
    isStateDetermined: hasState,
    cgstRate,
    cgstAmount: toRupees(cgstPaise),
    sgstRate,
    sgstAmount: toRupees(sgstPaise),
    igstRate,
    igstAmount: toRupees(igstPaise),
    shippingFee: toRupees(shippingPaise),
    grandTotal: toRupees(grandTotalPaise),
  };
}

/**
 * Helper to extract taxable amount and embedded GST from an inclusive amount.
 */
export function extractInclusiveGst(
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
