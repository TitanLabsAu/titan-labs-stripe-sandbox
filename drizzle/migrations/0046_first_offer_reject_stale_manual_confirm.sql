CREATE OR REPLACE FUNCTION public.orders_first_offer_settlement()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _n integer;
BEGIN
  IF NEW.first_offer_claim_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.stripe_livemode = false THEN
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
      RAISE EXCEPTION 'FIRST_OFFER_STALE';
    END IF;
  END IF;
  RETURN NEW;
END $function$;