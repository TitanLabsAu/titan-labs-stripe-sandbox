CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1048;
GRANT USAGE, SELECT ON SEQUENCE public.order_number_seq TO authenticated;
GRANT ALL ON SEQUENCE public.order_number_seq TO service_role;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number bigint NOT NULL DEFAULT nextval('public.order_number_seq'),
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'payid',
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS shipping_address text,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_label text NOT NULL DEFAULT '';
