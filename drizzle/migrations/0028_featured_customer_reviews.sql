ALTER TABLE public.customer_reviews
  ADD COLUMN featured boolean NOT NULL DEFAULT false,
  ADD COLUMN archived boolean NOT NULL DEFAULT false,
  ADD COLUMN review_date date,
  ADD COLUMN product_slug text REFERENCES public.products(slug) ON DELETE SET NULL;

ALTER POLICY "Public can read published reviews" ON public.customer_reviews
  USING (published = true AND archived = false);

CREATE INDEX customer_reviews_featured_order_idx
  ON public.customer_reviews (sort_order, created_at DESC)
  WHERE published = true AND archived = false AND featured = true;
