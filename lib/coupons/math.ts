export type CouponCartItem = { categoryId: string | null; unitPriceMinor: number; quantity: number };
export type CouponRules = { percentOff: number; allProducts: boolean; categoryIds: readonly string[] };

export function couponEligibleSubtotal(items: readonly CouponCartItem[], coupon: CouponRules): number {
  return items.reduce((total, item) => {
    const eligible = coupon.allProducts || (item.categoryId !== null && coupon.categoryIds.includes(item.categoryId));
    return eligible && Number.isSafeInteger(item.unitPriceMinor) && Number.isInteger(item.quantity) && item.quantity > 0
      ? total + item.unitPriceMinor * item.quantity
      : total;
  }, 0);
}

export function previewCouponDiscount(items: readonly CouponCartItem[], coupon: CouponRules): number {
  const subtotal = couponEligibleSubtotal(items, coupon);
  if (!Number.isSafeInteger(subtotal) || coupon.percentOff < 1 || coupon.percentOff > 100) return 0;
  return Math.floor(subtotal * coupon.percentOff / 100);
}

export function applyDiscountStack(
  subtotalMinor: number,
  tierDiscountMinor: number,
  couponDiscountMinor: number,
  mode: "best_of" | "stack",
): number {
  if (![subtotalMinor, tierDiscountMinor, couponDiscountMinor].every(Number.isSafeInteger)) return 0;
  if (subtotalMinor <= 0) return 0;
  const requested = mode === "stack" ? tierDiscountMinor + couponDiscountMinor : Math.max(tierDiscountMinor, couponDiscountMinor);
  return Math.min(subtotalMinor, Math.max(0, requested));
}
