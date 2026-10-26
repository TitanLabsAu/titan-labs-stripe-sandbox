CREATE OR REPLACE FUNCTION public.release_referral_redemption_for_attempt(_payment_attempt_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _n integer;
BEGIN
  UPDATE public.referral_redemption_claims SET status = 'released', updated_at = now()
   WHERE payment_attempt_id = _payment_attempt_id AND status = 'reserved' AND order_id IS NULL;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $function$;

CREATE OR REPLACE FUNCTION public.referral_paid_order_count(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT count(*)::integer FROM public.orders o
   WHERE o.referrer_user_id = _user_id AND o.referrer_user_id <> o.user_id
     AND o.payment_confirmed IS TRUE AND o.status <> 'cancelled' AND o.refunded_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.admin_notifications n
                      WHERE n.order_id = o.id AND n.kind = 'referral-redemption-skipped');
$function$;

-- Isolated fixture applies the exact corrective SQL over the previous settlement definition.
CREATE OR REPLACE FUNCTION public.orders_referral_settlement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _new_paid boolean := NEW.payment_confirmed IS TRUE AND NEW.status <> 'cancelled' AND NEW.refunded_at IS NULL;
  _old_paid boolean := false;
  _net integer; _s record; _tally integer; _why text;
  _enabled boolean; _avail integer; _use integer; _active boolean;
  _every integer; _target integer; _earned integer;
  _referral_ok boolean := true;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    _old_paid := OLD.payment_confirmed IS TRUE AND OLD.status <> 'cancelled' AND OLD.refunded_at IS NULL;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.credit_reservation_id IS NOT NULL THEN
    UPDATE public.store_credit_reservations SET order_id = NEW.id, expires_at = NULL
     WHERE id = NEW.credit_reservation_id AND user_id = NEW.user_id AND status = 'reserved'
       AND (expires_at IS NULL OR expires_at > now());
  END IF;

  IF NEW.status = 'cancelled' AND NOT _new_paid AND NOT _old_paid AND NEW.credit_reservation_id IS NOT NULL THEN
    UPDATE public.store_credit_reservations SET status = 'released'
     WHERE id = NEW.credit_reservation_id AND status = 'reserved';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.referral_claim_id IS NOT NULL THEN
    IF NEW.stripe_livemode = false THEN
      UPDATE public.referral_redemption_claims SET status = 'released', order_id = NEW.id, updated_at = now()
       WHERE id = NEW.referral_claim_id AND status = 'reserved';
    ELSIF _new_paid THEN
      UPDATE public.referral_redemption_claims SET status = 'consumed', order_id = NEW.id, expires_at = NULL, updated_at = now()
       WHERE id = NEW.referral_claim_id AND status IN ('reserved','consumed') AND (order_id IS NULL OR order_id = NEW.id);
    ELSE
      UPDATE public.referral_redemption_claims SET order_id = NEW.id, expires_at = NULL, updated_at = now()
       WHERE id = NEW.referral_claim_id AND status = 'reserved' AND (order_id IS NULL OR order_id = NEW.id);
    END IF;
  END IF;

  IF NEW.status = 'cancelled' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'cancelled') THEN
    UPDATE public.referral_redemption_claims SET status = 'released', updated_at = now()
     WHERE (order_id = NEW.id OR (id = NEW.referral_claim_id AND order_id IS NULL))
       AND status IN ('reserved','consumed');
  END IF;

  IF _new_paid = _old_paid THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('order_settle:' || NEW.id::text));
  SELECT * INTO _s FROM public.referral_settings WHERE id = 1;
  _every := greatest(coalesce(_s.reward_every_referrals, 5), 1);

  IF _new_paid THEN
    IF NEW.discount_code_kind = 'referral' AND (NEW.discount_code_id IS NOT NULL OR NEW.referrer_user_id IS NOT NULL) THEN
      _referral_ok := public.ensure_referral_redemption(NEW.id);
      IF NOT _referral_ok THEN
        INSERT INTO public.admin_notifications(order_id, title, body, kind, email_sent, payload)
        VALUES (NEW.id, 'Referral redemption skipped',
          'Order ' || coalesce(NEW.order_number::text, NEW.id::text) || ' was paid with referral code ' || coalesce(NEW.discount_code, '?') ||
          ' but the buyer was no longer eligible (referral codes are limited to a first successful purchase). ' ||
          'The payment and order were recorded normally; no code use or referral reward was counted.',
          'referral-redemption-skipped', true,
          jsonb_build_object('user_id', NEW.user_id, 'code', NEW.discount_code, 'referrer_user_id', NEW.referrer_user_id));
      END IF;
    END IF;
    IF NEW.credit_units > 0 THEN
      SELECT coalesce(sum(units), 0) INTO _net FROM public.store_credit_ledger
       WHERE order_id = NEW.id AND kind IN ('redeemed','redemption_reversed');
      IF _net = 0 THEN
        PERFORM pg_advisory_xact_lock(hashtext('store_credit:' || NEW.user_id::text));
        SELECT EXISTS (SELECT 1 FROM public.store_credit_reservations
          WHERE id = NEW.credit_reservation_id AND user_id = NEW.user_id AND status = 'reserved'
            AND (expires_at IS NULL OR expires_at > now() OR order_id = NEW.id)) INTO _active;
        IF _active THEN
          _use := NEW.credit_units;
          UPDATE public.store_credit_reservations SET status = 'consumed', order_id = NEW.id, expires_at = NULL
           WHERE id = NEW.credit_reservation_id;
        ELSE
          UPDATE public.store_credit_reservations SET status = 'consumed', order_id = NEW.id
           WHERE id = NEW.credit_reservation_id AND user_id = NEW.user_id AND status IN ('reserved','released');
          _avail := public.store_credit_available_units(NEW.user_id);
          _use := least(NEW.credit_units, greatest(_avail, 0));
          IF _use < NEW.credit_units THEN
            INSERT INTO public.admin_notifications(order_id, title, body, kind, email_sent, payload)
            VALUES (NEW.id, 'Referral reward shortfall',
              'An order was paid after its referral reward hold lapsed. ' || (NEW.credit_units - _use) ||
              ' reward(s) applied at checkout were no longer available and were not deducted.',
              'credit-shortfall', true,
              jsonb_build_object('user_id', NEW.user_id, 'expected_units', NEW.credit_units, 'deducted_units', _use));
          END IF;
        END IF;
        IF _use > 0 THEN
          INSERT INTO public.store_credit_ledger(user_id, kind, units, unit_cents, order_id, reason)
          VALUES (NEW.user_id, 'redeemed', -_use, 0, NEW.id, 'Used at checkout');
        END IF;
      END IF;
    END IF;
    IF NEW.discount_code_id IS NOT NULL AND _referral_ok THEN
      UPDATE public.discount_codes SET times_used = times_used + 1 WHERE id = NEW.discount_code_id;
    END IF;
    _enabled := coalesce((NEW.pricing_snapshot -> 'settings' ->> 'programEnabled')::boolean, _s.program_enabled, true);
    IF NEW.referrer_user_id IS NOT NULL AND NEW.referrer_user_id IS DISTINCT FROM NEW.user_id AND _enabled AND _referral_ok THEN
      PERFORM pg_advisory_xact_lock(hashtext('referral_tally:' || NEW.referrer_user_id::text));
      _tally := public.referral_paid_order_count(NEW.referrer_user_id);
      SELECT coalesce(sum(units), 0) INTO _earned FROM public.store_credit_ledger
       WHERE user_id = NEW.referrer_user_id AND kind IN ('referral_earned','referral_reversed');
      _target := _tally / _every;
      IF _target > _earned THEN
        INSERT INTO public.store_credit_ledger(user_id, kind, units, unit_cents, order_id, reason, expires_at)
        VALUES (NEW.referrer_user_id, 'referral_earned', _target - _earned, 0, NEW.id,
                coalesce(_s.reward_percent, 10) || '% reward for reaching ' || (_target * _every) || ' paid referrals',
                now() + make_interval(days => greatest(coalesce(_s.reward_expiry_days, 90), 1)));
      END IF;
    END IF;
  ELSE
    _why := CASE WHEN NEW.refunded_at IS NOT NULL THEN 'refunded' WHEN NEW.status = 'cancelled' THEN 'cancelled' ELSE 'payment unconfirmed' END;
    SELECT coalesce(sum(units), 0) INTO _net FROM public.store_credit_ledger
     WHERE order_id = NEW.id AND kind IN ('redeemed','redemption_reversed');
    IF _net < 0 THEN
      INSERT INTO public.store_credit_ledger(user_id, kind, units, unit_cents, order_id, reason, expires_at)
      VALUES (NEW.user_id, 'redemption_reversed', -_net, 0, NEW.id, 'Order ' || _why || ' — reward returned',
              now() + make_interval(days => greatest(coalesce(_s.reward_expiry_days, 90), 1)));
    END IF;
    IF NEW.referrer_user_id IS NOT NULL AND NEW.referrer_user_id IS DISTINCT FROM NEW.user_id THEN
      PERFORM pg_advisory_xact_lock(hashtext('referral_tally:' || NEW.referrer_user_id::text));
      _tally := public.referral_paid_order_count(NEW.referrer_user_id);
      SELECT coalesce(sum(units), 0) INTO _earned FROM public.store_credit_ledger
       WHERE user_id = NEW.referrer_user_id AND kind IN ('referral_earned','referral_reversed');
      _target := _tally / _every;
      IF _earned > _target THEN
        INSERT INTO public.store_credit_ledger(user_id, kind, units, unit_cents, order_id, reason)
        VALUES (NEW.referrer_user_id, 'referral_reversed', _target - _earned, 0, NEW.id,
                'Referred order ' || _why || ' — below ' || ((_target + 1) * _every) || ' paid referrals');
      END IF;
    END IF;
    IF NEW.discount_code_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.admin_notifications n
                        WHERE n.order_id = NEW.id AND n.kind = 'referral-redemption-skipped') THEN
      UPDATE public.discount_codes SET times_used = greatest(times_used - 1, 0) WHERE id = NEW.discount_code_id;
    END IF;
  END IF;
  RETURN NEW;
END $function$;

-- Supersedes 0058's global first-purchase referral restriction; 0059 finalizer unchanged.
CREATE TABLE public.referral_code_redemptions (
  user_id uuid NOT NULL, code_id uuid NOT NULL, order_id uuid NOT NULL UNIQUE,
  emails text[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, code_id)
);
GRANT ALL ON public.referral_code_redemptions TO service_role;
ALTER TABLE public.referral_code_redemptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX referral_claim_code_identity_idx ON public.referral_redemption_claims(code_id, user_id, status);

-- Obsolete no-code overload fails closed, never checks unrelated purchase history.
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
  -- Sorted code-scoped identity locks; different codes never share these locks.
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
  -- Global limit stays code-wide; row lock lasts through the trigger's increment.
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
  -- A captured payment must still record and reconcile even if referral settlement fails.
  RETURN false;
END $function$;

REVOKE ALL ON FUNCTION public.referral_redemption_eligible(uuid,text[],uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.lock_referral_code_buyer(uuid,text[],uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.referral_redemption_eligible(uuid,text[],uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.lock_referral_code_buyer(uuid,text[],uuid) TO service_role;

-- Replace only the erroneous referral lifecycle/copy; retain all reward/credit logic.
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
