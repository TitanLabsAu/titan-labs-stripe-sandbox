-- Supersedes 0058's global first-purchase referral restriction; 0059 finalizer unchanged.
CREATE TABLE public.referral_code_redemptions (
  user_id uuid NOT NULL, code_id uuid NOT NULL, order_id uuid NOT NULL UNIQUE,
  emails text[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, code_id)
);
GRANT ALL ON public.referral_code_redemptions TO service_role;
ALTER TABLE public.referral_code_redemptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX referral_claim_code_identity_idx ON public.referral_redemption_claims(code_id, user_id, status);

CREATE OR REPLACE FUNCTION public.referral_redemption_eligible(_user_id uuid, _emails text[], _except_order_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$ SELECT false $$;
COMMENT ON FUNCTION public.referral_redemption_eligible(uuid,text[],uuid) IS 'DEPRECATED: use code-scoped four-argument overload; no-code requests fail closed';

CREATE OR REPLACE FUNCTION public.referral_redemption_eligible(_user_id uuid, _emails text[], _code_id uuid, _except_order_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _e text[]; _owner uuid; _owner_email text;
BEGIN
  IF _user_id IS NULL OR _code_id IS NULL THEN RETURN false; END IF;
  _e := public.normalize_emails(coalesce(_emails,'{}') || ARRAY[(SELECT email FROM public.profiles WHERE id=_user_id)]);
  SELECT d.user_id, lower(trim(p.email)) INTO _owner, _owner_email
    FROM public.discount_codes d LEFT JOIN public.profiles p ON p.id=d.user_id
    WHERE d.id=_code_id AND d.code_kind='referral';
  IF NOT FOUND OR _owner=_user_id OR _owner_email=ANY(_e) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.orders o WHERE o.discount_code_id=_code_id
    AND o.payment_confirmed IS TRUE AND o.stripe_livemode IS DISTINCT FROM false
    AND o.id IS DISTINCT FROM _except_order_id
    AND (o.user_id=_user_id OR o.contact_email_normalized=ANY(_e))) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.referral_code_redemptions r WHERE r.code_id=_code_id
    AND r.order_id IS DISTINCT FROM _except_order_id
    AND (r.user_id=_user_id OR r.emails && _e)) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.referral_redemption_claims c WHERE c.code_id=_code_id
    AND (c.user_id=_user_id OR c.emails && _e)
    AND (_except_order_id IS NULL OR c.order_id IS DISTINCT FROM _except_order_id)
    AND (c.status='consumed' OR (c.status='reserved' AND (c.expires_at IS NULL OR c.expires_at>now())))) THEN RETURN false; END IF;
  RETURN true;
END $function$;

CREATE OR REPLACE FUNCTION public.lock_referral_code_buyer(_user_id uuid,_emails text[],_code_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _k text;
BEGIN
  FOR _k IN SELECT x FROM unnest(ARRAY['user:'||_user_id::text] ||
    ARRAY(SELECT 'email:'||e FROM unnest(public.normalize_emails(_emails)) e)) x ORDER BY x LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('referral_code:'||_code_id::text||':'||_k,0));
  END LOOP;
END $function$;

CREATE OR REPLACE FUNCTION public.claim_referral_redemption(_user_id uuid,_emails text[],_code_id uuid,_ttl_minutes integer,_except_order_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _e text[]; _id uuid;
BEGIN
  IF _user_id IS NULL OR _code_id IS NULL THEN RAISE EXCEPTION 'REFERRAL_REDEMPTION_UNAVAILABLE'; END IF;
  _e:=public.normalize_emails(coalesce(_emails,'{}') || ARRAY[(SELECT email FROM public.profiles WHERE id=_user_id)]);
  PERFORM public.lock_referral_code_buyer(_user_id,_e,_code_id);
  IF NOT public.referral_redemption_eligible(_user_id,_e,_code_id,_except_order_id) THEN RAISE EXCEPTION 'REFERRAL_REDEMPTION_UNAVAILABLE'; END IF;
  INSERT INTO public.referral_redemption_claims(user_id,emails,code_id,status,expires_at)
    VALUES(_user_id,_e,_code_id,'reserved',now()+make_interval(mins=>greatest(coalesce(_ttl_minutes,30),1))) RETURNING id INTO _id;
  RETURN _id;
END $function$;

CREATE OR REPLACE FUNCTION public.ensure_referral_redemption(_order_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _o record; _c record; _e text[]; _claim uuid; _d record;
BEGIN
  SELECT * INTO _o FROM public.orders WHERE id=_order_id;
  IF NOT FOUND OR _o.user_id IS NULL OR _o.discount_code_id IS NULL OR _o.stripe_livemode=false THEN RETURN false; END IF;
  _e:=public.normalize_emails(ARRAY[_o.contact_email_normalized,(SELECT email FROM public.profiles WHERE id=_o.user_id)]);
  PERFORM public.lock_referral_code_buyer(_o.user_id,_e,_o.discount_code_id);
  IF EXISTS(SELECT 1 FROM public.referral_code_redemptions WHERE order_id=_o.id AND user_id=_o.user_id AND code_id=_o.discount_code_id) THEN RETURN true; END IF;
  IF NOT public.referral_redemption_eligible(_o.user_id,_e,_o.discount_code_id,_o.id) THEN RETURN false; END IF;
  SELECT * INTO _d FROM public.discount_codes WHERE id=_o.discount_code_id FOR UPDATE;
  IF NOT FOUND OR _d.code_kind<>'referral' OR _d.times_used>=_d.max_uses THEN RETURN false; END IF;
  IF _o.referral_claim_id IS NOT NULL THEN
    SELECT * INTO _c FROM public.referral_redemption_claims WHERE id=_o.referral_claim_id FOR UPDATE;
    IF NOT FOUND OR _c.user_id<>_o.user_id OR _c.code_id IS DISTINCT FROM _o.discount_code_id
      OR _c.status NOT IN ('reserved','consumed') OR (_c.order_id IS NOT NULL AND _c.order_id<>_o.id) THEN RETURN false; END IF;
    _claim:=_c.id;
  ELSE
    INSERT INTO public.referral_redemption_claims(user_id,emails,code_id,status,order_id)
      VALUES(_o.user_id,_e,_o.discount_code_id,'reserved',_o.id) RETURNING id INTO _claim;
  END IF;
  INSERT INTO public.referral_code_redemptions(user_id,code_id,order_id,emails) VALUES(_o.user_id,_o.discount_code_id,_o.id,_e);
  UPDATE public.referral_redemption_claims SET status='consumed',order_id=_o.id,expires_at=NULL,updated_at=now() WHERE id=_claim;
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END $function$;

REVOKE ALL ON FUNCTION public.referral_redemption_eligible(uuid,text[],uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.lock_referral_code_buyer(uuid,text[],uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.referral_redemption_eligible(uuid,text[],uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.lock_referral_code_buyer(uuid,text[],uuid) TO service_role;

DO $migration$
DECLARE _sql text;
BEGIN
  SELECT pg_get_functiondef('public.orders_referral_settlement()'::regprocedure) INTO _sql;
  _sql:=replace(_sql, $old$    ELSIF _new_paid THEN
      UPDATE public.referral_redemption_claims SET status = 'consumed', order_id = NEW.id, expires_at = NULL, updated_at = now()
       WHERE id = NEW.referral_claim_id AND status IN ('reserved','consumed') AND (order_id IS NULL OR order_id = NEW.id);$old$, '');
  _sql:=replace(_sql, $old$AND status IN ('reserved','consumed');$old$, $new$AND status = 'reserved';$new$);
  _sql:=replace(_sql,'referral codes are limited to a first successful purchase','each specific referral code is usable once per member on successful payment');
  EXECUTE _sql;
END $migration$;