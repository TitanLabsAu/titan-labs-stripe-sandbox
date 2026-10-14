CREATE OR REPLACE FUNCTION public.orders_first_offer_settlement()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.first_offer_claim_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_confirmed AND NEW.status <> 'cancelled' THEN
      UPDATE public.first_purchase_claims SET status = 'consumed', order_id = NEW.id, expires_at = NULL, updated_at = now()
       WHERE id = NEW.first_offer_claim_id AND status IN ('reserved','consumed') AND (order_id IS NULL OR order_id = NEW.id);
    ELSE
      UPDATE public.first_purchase_claims SET status = 'reserved', order_id = NEW.id, expires_at = NULL, updated_at = now()
       WHERE id = NEW.first_offer_claim_id AND status = 'reserved' AND (order_id IS NULL OR order_id = NEW.id);
    END IF;
  ELSIF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE public.first_purchase_claims SET status = 'released', updated_at = now()
     WHERE id = NEW.first_offer_claim_id AND order_id = NEW.id AND status IN ('reserved','consumed');
  ELSIF NEW.payment_confirmed AND NOT OLD.payment_confirmed AND NEW.status <> 'cancelled' THEN
    UPDATE public.first_purchase_claims SET status = 'consumed', expires_at = NULL, updated_at = now()
     WHERE id = NEW.first_offer_claim_id AND order_id = NEW.id AND status = 'reserved';
  END IF;
  RETURN NEW;
END $function$;