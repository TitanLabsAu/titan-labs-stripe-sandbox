ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sale_price numeric,
  ADD COLUMN IF NOT EXISTS promo_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS recon_vial_mg numeric,
  ADD COLUMN IF NOT EXISTS recon_water_ml numeric,
  ADD COLUMN IF NOT EXISTS recon_dose_mcg numeric,
  ADD COLUMN IF NOT EXISTS recon_notes text NOT NULL DEFAULT '';

INSERT INTO public.site_content (key, body)
VALUES ('home_featured', '')
ON CONFLICT (key) DO NOTHING;