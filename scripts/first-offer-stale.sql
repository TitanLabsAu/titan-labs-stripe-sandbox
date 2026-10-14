-- Record trusted Stripe livemode; test-mode payments never consume the production offer or count as spend.
ALTER TABLE public.payment_attempts ADD COLUMN IF NOT EXISTS stripe_livemode boolean;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_livemode boolean;
COMMENT ON COLUMN public.orders.stripe_livemode IS 'Copied from the Stripe PaymentIntent livemode at creation; NULL = not a Stripe order or historical/unknown.';

CREATE OR REPLACE FUNCTION public.orders_copy_stripe_livemode()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.payment_transaction_id IS NOT NULL AND NEW.stripe_livemode IS NULL THEN
    SELECT a.stripe_livemode INTO NEW.stripe_livemode FROM public.payment_attempts a
     WHERE a.transaction_id = NEW.payment_transaction_id AND a.provider = 'stripe' LIMIT 1;
  END IF;
  RETURN NEW;
END $function$;
DROP TRIGGER IF EXISTS orders_copy_stripe_livemode ON public.orders;
CREATE TRIGGER orders_copy_stripe_livemode BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.orders_copy_stripe_livemode();

CREATE OR REPLACE FUNCTION public.first_offer_eligible(_user_id uuid, _emails text[])
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _e text[] := public.normalize_emails(_emails);
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.orders o
      WHERE o.status <> 'cancelled' AND o.payment_confirmed = true AND o.stripe_livemode IS DISTINCT FROM false
        AND (o.user_id = _user_id OR o.contact_email_normalized = ANY(_e))) THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM public.first_purchase_claims c
      WHERE (c.user_id = _user_id OR c.emails && _e)
        AND (c.status = 'consumed' OR (c.status = 'reserved' AND (c.expires_at IS NULL OR c.expires_at > now())))) THEN
    RETURN false;
  END IF;
  RETURN true;
END $function$;

CREATE OR REPLACE FUNCTION public.orders_first_offer_settlement()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _n integer;
BEGIN
  IF NEW.first_offer_claim_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.stripe_livemode = false THEN
      -- Simulated (test-mode) success never consumes the production offer.
      UPDATE public.first_purchase_claims SET status = 'released', order_id = NEW.id, updated_at = now()
       WHERE id = NEW.first_offer_claim_id AND status = 'reserved';
    ELSIF NEW.payment_confirmed AND NEW.status <> 'cancelled' THEN
      UPDATE public.first_purchase_claims SET status = 'consumed', order_id = NEW.id, expires_at = NULL, updated_at = now()
       WHERE id = NEW.first_offer_claim_id AND status IN ('reserved','consumed') AND (order_id IS NULL OR order_id = NEW.id);
    ELSE
      UPDATE public.first_purchase_claims SET status = 'reserved', order_id = NEW.id, expires_at = NULL, updated_at = now()
       WHERE id = NEW.first_offer_claim_id AND status = 'reserved' AND (order_id IS NULL OR order_id = NEW.id);
    END IF;
  ELSIF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE public.first_purchase_claims SET status = 'released', updated_at = now()
     WHERE id = NEW.first_offer_claim_id AND order_id = NEW.id AND status IN ('reserved','consumed');
  ELSIF NEW.payment_confirmed AND NOT OLD.payment_confirmed AND NEW.status <> 'cancelled' AND NEW.stripe_livemode IS DISTINCT FROM false THEN
    UPDATE public.first_purchase_claims SET status = 'consumed', expires_at = NULL, updated_at = now()
     WHERE id = NEW.first_offer_claim_id AND order_id = NEW.id AND status = 'reserved';
    GET DIAGNOSTICS _n = ROW_COUNT;
    IF _n = 0 AND NEW.payment_transaction_id IS NULL AND NOT EXISTS (
        SELECT 1 FROM public.first_purchase_claims WHERE id = NEW.first_offer_claim_id AND order_id = NEW.id AND status = 'consumed') THEN
      -- Manual confirmation of an order whose 10% was released (e.g. cancelled then reopened): needs price review.
      RAISE EXCEPTION 'FIRST_OFFER_STALE';
    END IF;
  END IF;
  RETURN NEW;
END $function$;
