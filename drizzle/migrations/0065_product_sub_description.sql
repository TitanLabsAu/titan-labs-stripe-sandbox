ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sub_description text NOT NULL DEFAULT '';
UPDATE public.products SET sub_description = CASE catalogue_section WHEN 'pens' THEN 'Pre-filled Pen Only' WHEN 'range' THEN 'Single vial' ELSE 'Single item' END
WHERE sub_description = '' AND jsonb_array_length(product_variants) = 0;
COMMENT ON COLUMN public.products.sub_description IS 'Optional Admin-editable short subtitle shown on cards and product page; empty renders nothing.';