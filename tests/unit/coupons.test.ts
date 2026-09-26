import { describe, expect, it } from "vitest";
import { applyDiscountStack, couponEligibleSubtotal, previewCouponDiscount } from "@/lib/coupons/math";

const items = [
  { categoryId: "steam", unitPriceMinor: 2400, quantity: 2 },
  { categoryId: "console", unitPriceMinor: 5000, quantity: 1 },
];

describe("coupon category scoping", () => {
  it("discounts only items from the selected categories", () => {
    const coupon = { percentOff: 10, allProducts: false, categoryIds: ["steam"] };
    expect(couponEligibleSubtotal(items, coupon)).toBe(4800);
    expect(previewCouponDiscount(items, coupon)).toBe(480);
  });

  it("applies an all-products coupon to the entire bundle", () => {
    expect(couponEligibleSubtotal(items, { percentOff: 15, allProducts: true, categoryIds: [] })).toBe(9800);
  });

  it("honors best-of and stacking modes with a subtotal cap", () => {
    expect(applyDiscountStack(1000, 120, 80, "best_of")).toBe(120);
    expect(applyDiscountStack(1000, 120, 80, "stack")).toBe(200);
    expect(applyDiscountStack(1000, 900, 900, "stack")).toBe(1000);
  });
});
