ALTER TABLE public.products ADD COLUMN IF NOT EXISTS catalogue_section text NOT NULL DEFAULT 'range';
UPDATE public.products SET catalogue_section = 'range' WHERE catalogue_section IS DISTINCT FROM 'range';
ALTER TABLE public.products ADD CONSTRAINT products_catalogue_section_check CHECK (catalogue_section IN ('range','pens','equipment'));
CREATE INDEX IF NOT EXISTS products_catalogue_section_idx ON public.products (catalogue_section);

CREATE TABLE public.customer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_name text NOT NULL CHECK (length(btrim(reviewer_name)) BETWEEN 1 AND 120),
  review_text text NOT NULL CHECK (length(btrim(review_text)) BETWEEN 1 AND 2000),
  location text,
  rating smallint CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.customer_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_reviews TO authenticated;
GRANT ALL ON public.customer_reviews TO service_role;
ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published reviews" ON public.customer_reviews FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "Admins can read all reviews" ON public.customer_reviews FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert reviews" ON public.customer_reviews FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update reviews" ON public.customer_reviews FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete reviews" ON public.customer_reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER customer_reviews_updated_at BEFORE UPDATE ON public.customer_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX customer_reviews_public_idx ON public.customer_reviews (published, sort_order, created_at);