import { describe, expect, test } from "bun:test";
import { featuredReviews, reviewDateLabel, validateReviewInput, type CustomerReview } from "../src/lib/reviews";
import { HOME_SECTIONS, pageSectionOrder } from "../src/lib/homeContent";

const review = (id: string, patch: Partial<CustomerReview> = {}): CustomerReview => ({ id, reviewer_name: "Test", review_text: "Fixture only", location: null, rating: 5, published: true, sort_order: 0, created_at: "2026-10-03", featured: true, archived: false, review_date: null, product_slug: null, ...patch });
describe("featured reviews", () => {
  test("only visible featured reviews, saved order, maximum three", () => {
    const rows = [review("4", { sort_order: 4 }), review("2", { sort_order: 2 }), review("draft", { published: false }), review("archived", { archived: true }), review("ordinary", { featured: false }), review("1", { sort_order: 1 }), review("3", { sort_order: 3 })];
    expect(featuredReviews(rows).map((r) => r.id)).toEqual(["1", "2", "3"]);
    expect(rows[0].id).toBe("4");
  });
  test("validate fields and calendar dates without inventing dates", () => {
    const input = { reviewer_name: "Sam", review_text: "Genuine supplied text" };
    expect(validateReviewInput(input)).toMatchObject({ featured: false, archived: false, review_date: null, product_slug: null });
    expect(validateReviewInput({ ...input, review_date: "2026-10-03", product_slug: "bac-water", featured: true }).featured).toBe(true);
    for (const review_date of ["2026-02-30", "bad", "2026-13-01"]) expect(() => validateReviewInput({ ...input, review_date })).toThrow();
    expect(() => validateReviewInput({ ...input, rating: 4.5 })).toThrow();
    expect(reviewDateLabel("2026-10-03")).toBe("3 Oct 2026");
  });
  test("reviews appended for legacy order and can move once anywhere", () => {
    const legacy = pageSectionOrder({ home_layout_order: "signup,pillars,tagline" }, "home_layout_order", HOME_SECTIONS);
    expect(legacy.at(-1)).toBe("reviews");
    const moved = pageSectionOrder({ home_layout_order: "reviews,tagline,reviews,pillars" }, "home_layout_order", HOME_SECTIONS);
    expect(moved.indexOf("reviews")).toBeLessThan(moved.indexOf("tagline"));
    expect(new Set(moved).size).toBe(moved.length);
  });
});