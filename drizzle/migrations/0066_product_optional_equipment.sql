ALTER TABLE public.products ADD COLUMN IF NOT EXISTS optional_equipment jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS v2_pen_offer_enabled boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.products.optional_equipment IS 'Ordered Admin-chosen optional Equipment add-ons; NULL keeps the built-in starter-kit default.';