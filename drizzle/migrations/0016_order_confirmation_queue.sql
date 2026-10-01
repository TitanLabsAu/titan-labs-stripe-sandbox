CREATE TABLE IF NOT EXISTS public.order_confirmation_queue (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  outcome text CHECK (outcome IN ('sent', 'recipient_suppressed', 'cancelled'))
);
ALTER TABLE public.order_confirmation_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_confirmation_queue FROM anon, authenticated;
GRANT ALL ON public.order_confirmation_queue TO service_role;

CREATE OR REPLACE FUNCTION public.queue_order_confirmation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.order_confirmation_queue(order_id) VALUES (NEW.id)
    ON CONFLICT (order_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_order_confirmation() FROM PUBLIC;
DROP TRIGGER IF EXISTS queue_order_confirmation ON public.orders;
CREATE TRIGGER queue_order_confirmation AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.queue_order_confirmation();
-- Intentionally no backfill: existing orders must not generate unexpected emails.
