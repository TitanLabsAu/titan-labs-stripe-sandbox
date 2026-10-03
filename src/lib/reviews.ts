export type CustomerReview = {
  id: string;
  reviewer_name: string;
  review_text: string;
  location: string | null;
  rating: number | null;
  published: boolean;
  sort_order: number;
  created_at: string;
  featured: boolean;
  archived: boolean;
  review_date: string | null;
  product_slug: string | null;
  product_name?: string | null;
};

export type ReviewInput = {
  id?: string | undefined;
  reviewer_name: string;
  review_text: string;
  location?: string | null;
  rating?: number | null;
  published?: boolean;
  sort_order?: number;
  featured?: boolean;
  archived?: boolean;
  review_date?: string | null;
  product_slug?: string | null;
};

/** Validates and normalises a review before it is saved. Throws on bad input. */
export function validateReviewInput(input: ReviewInput) {
  const name = String(input?.reviewer_name ?? "").trim();
  const text = String(input?.review_text ?? "").trim();
  if (!name || name.length > 120) throw new Error("Reviewer name is required (max 120 characters)");
  if (!text || text.length > 2000) throw new Error("Review text is required (max 2000 characters)");
  const location = String(input?.location ?? "").trim();
  if (location.length > 120) throw new Error("Location is too long");
  const reviewDate = input?.review_date || null;
  if (reviewDate && (!/^\d{4}-\d{2}-\d{2}$/.test(reviewDate) || !Number.isFinite(Date.parse(reviewDate)) || new Date(reviewDate).toISOString().slice(0, 10) !== reviewDate)) throw new Error("Choose a valid review date");
  const productSlug = String(input?.product_slug ?? "").trim() || null;
  if (productSlug && !/^[a-z0-9-]{1,160}$/.test(productSlug)) throw new Error("Choose a valid product");
  let rating: number | null = null;
  if (input?.rating !== null && input?.rating !== undefined && String(input.rating) !== "") {
    rating = Number(input.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Rating must be 1–5");
  }
  return {
    reviewer_name: name,
    review_text: text,
    location: location || null,
    rating,
    published: Boolean(input?.published),
    sort_order: Math.trunc(Number(input?.sort_order ?? 0)) || 0,
    featured: Boolean(input?.featured),
    archived: Boolean(input?.archived),
    review_date: reviewDate,
    product_slug: productSlug,
  };
}

/** Homepage uses at most three real, visible featured reviews in saved order. */
export function featuredReviews(reviews: CustomerReview[]) {
  return reviews.filter((r) => r.published && !r.archived && r.featured)
    .sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id))
    .slice(0, 3);
}

export function reviewDateLabel(date: string | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
