-- 1. Add 'pending_payment' to the order_status enum
ALTER TYPE public.order_status
  ADD VALUE IF NOT EXISTS 'pending_payment';

-- 2. Remove the customer UPDATE policy on orders (view/create/admin policies remain untouched)
DROP POLICY IF EXISTS "Users can update their own orders"
  ON public.orders;

-- 3. Add payment tracking columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_transaction_id text,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_failure_code text;