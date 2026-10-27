ALTER TABLE public.products ADD COLUMN IF NOT EXISTS extra_catalogue_sections text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.products ADD CONSTRAINT products_extra_catalogue_sections_valid
  CHECK (extra_catalogue_sections <@ ARRAY['range','pens','equipment']::text[]);
COMMENT ON COLUMN public.products.extra_catalogue_sections IS 'Additional storefront listings only. Pricing, discounts and offers still follow catalogue_section.';