export type CustomerReview = {
  id: string;
  reviewer_name: string;
  review_text: string;
  location: string | null;
  rating: number | null;
  published: boolean;
  sort_order: number;
  created_at: string;
};

export type ReviewInput = {
  id?: string;
  reviewer_name: string;
  review_text: string;
  location?: string | null;
  rating?: number | null;
  published?: boolean;
  sort_order?: number;
};

/** Validates and normalises a review before it is saved. Throws on bad input. */
export function validateReviewInput(input: ReviewInput) {
  const name = String(input?.reviewer_name ?? "").trim();
  const text = String(input?.review_text ?? "").trim();
  if (!name || name.length > 120) throw new Error("Reviewer name is required (max 120 characters)");
  if (!text || text.length > 2000) throw new Error("Review text is required (max 2000 characters)");
  const location = String(input?.location ?? "").trim();
  if (location.length > 120) throw new Error("Location is too long");
  let rating: number | null = null;
  if (input?.rating !== null && input?.rating !== undefined && String(input.rating) !== "") {
    rating = Math.trunc(Number(input.rating));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw new Error("Rating must be 1–5");
  }
  return {
    reviewer_name: name,
    review_text: text,
    location: location || null,
    rating,
    published: Boolean(input?.published),
    sort_order: Math.trunc(Number(input?.sort_order ?? 0)) || 0,
  };
}
