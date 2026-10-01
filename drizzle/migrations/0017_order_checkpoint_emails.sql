CREATE TABLE IF NOT EXISTS public.order_checkpoint_email_queue (
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('payment-confirmed', 'dispatched', 'delivered')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  outcome text CHECK (outcome IN ('sent', 'recipient_suppressed', 'superseded')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  PRIMARY KEY (order_id, kind)
);
ALTER TABLE public.order_checkpoint_email_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_checkpoint_email_queue FROM anon, authenticated;
GRANT ALL ON public.order_checkpoint_email_queue TO service_role;

CREATE OR REPLACE FUNCTION public.queue_order_checkpoint_emails()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'cancelled' THEN RETURN NEW; END IF;
  -- Initial paid card orders already say "payment confirmed" in their receipt.
  IF NEW.payment_confirmed IS TRUE AND OLD.payment_confirmed IS NOT TRUE THEN
    INSERT INTO public.order_checkpoint_email_queue(order_id, kind)
      VALUES (NEW.id, 'payment-confirmed') ON CONFLICT DO NOTHING;
  END IF;
  IF NEW.status = 'shipped' AND nullif(btrim(NEW.tracking_number), '') IS NOT NULL
      AND (OLD.status IS DISTINCT FROM 'shipped'
        OR OLD.tracking_number IS DISTINCT FROM NEW.tracking_number) THEN
    INSERT INTO public.order_checkpoint_email_queue(order_id, kind)
      VALUES (NEW.id, 'dispatched') ON CONFLICT DO NOTHING;
  END IF;
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    INSERT INTO public.order_checkpoint_email_queue(order_id, kind)
      VALUES (NEW.id, 'delivered') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_order_checkpoint_emails() FROM PUBLIC;
DROP TRIGGER IF EXISTS queue_order_checkpoint_emails ON public.orders;
CREATE TRIGGER queue_order_checkpoint_emails
AFTER UPDATE OF payment_confirmed, status, tracking_number ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.queue_order_checkpoint_emails();
-- No backfill: only new changes generate notifications.
