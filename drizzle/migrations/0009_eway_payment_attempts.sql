-- Server-only staging records for Eway hosted payment attempts.
-- No card number, expiry or CVV is stored here.
CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'eway',
  access_code text UNIQUE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'AUD',
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','ready','paid','failed','cancelled')),
  order_payload jsonb NOT NULL,
  transaction_id text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

-- Intentionally no browser/user policies. Trusted server code uses the service-role client.
CREATE INDEX IF NOT EXISTS idx_payment_attempts_user_created
  ON public.payment_attempts (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_attempts_transaction_id
  ON public.payment_attempts (transaction_id)
  WHERE transaction_id IS NOT NULL;

