ALTER TABLE public.products ADD COLUMN recon_dose_mg numeric;

UPDATE public.products
SET recon_dose_mg = recon_dose_mcg / 1000.0
WHERE recon_dose_mcg IS NOT NULL
  AND recon_dose_mg IS NULL;

UPDATE public.products
SET product_variants = COALESCE(
  (
    SELECT jsonb_agg(
      CASE
        WHEN item ? 'reconDoseMg' THEN item
        WHEN item ? 'reconDoseMcg' AND NULLIF(item->>'reconDoseMcg', '') IS NOT NULL
          THEN (item - 'reconDoseMcg') || jsonb_build_object('reconDoseMg', (item->>'reconDoseMcg')::numeric / 1000.0)
        ELSE item - 'reconDoseMcg'
      END
      ORDER BY ordinal
    )
    FROM jsonb_array_elements(products.product_variants) WITH ORDINALITY AS variants(item, ordinal)
  ),
  '[]'::jsonb
)
WHERE jsonb_typeof(product_variants) = 'array';