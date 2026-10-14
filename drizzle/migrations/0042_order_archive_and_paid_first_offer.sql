ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid,
  ADD COLUMN IF NOT EXISTS archive_reason text;
CREATE INDEX IF NOT EXISTS orders_archived_at_idx ON public.orders (archived_at);

-- Only a successful (paid, non-cancelled) order or a live/consumed claim blocks the first-purchase offer.
CREATE OR REPLACE FUNCTION public.first_offer_eligible(_user_id uuid, _emails text[])
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _e text[] := public.normalize_emails(_emails);
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.orders o
      WHERE o.status <> 'cancelled' AND o.payment_confirmed = true
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