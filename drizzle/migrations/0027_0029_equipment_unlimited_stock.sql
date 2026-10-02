ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unlimited_stock boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD CONSTRAINT products_unlimited_stock_equipment_only CHECK (NOT unlimited_stock OR catalogue_section = 'equipment');
COMMENT ON COLUMN public.products.unlimited_stock IS 'Equipment only: quantity is not tracked and stock never limits ordering.';