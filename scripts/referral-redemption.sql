-- Referral redemption functions under test (mirrors drizzle migration 0058).
CREATE OR REPLACE FUNCTION public.referral_redemption_eligible(_user_id uuid, _emails text[], _except_order_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _e text[] := public.normalize_emails(_emails);
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.orders o
      WHERE o.status <> 'cancelled' AND o.payment_confirmed = true AND o.refunded_at IS NULL
        AND o.stripe_livemode IS DISTINCT FROM false
        AND o.id IS DISTINCT FROM _except_order_id
        AND (o.user_id = _user_id OR o.contact_email_normalized = ANY(_e))) THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM public.referral_redemption_claims c
      WHERE (c.user_id = _user_id OR c.emails && _e)
        AND (c.status = 'consumed' OR (c.status = 'reserved' AND (c.expires_at IS NULL OR c.expires_at > now())))) THEN
    RETURN false;
  END IF;
  RETURN true;
END $function$;

CREATE OR REPLACE FUNCTION public.claim_referral_redemption(_user_id uuid, _emails text[], _code_id uuid, _ttl_minutes integer, _except_order_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _e text[] := public.normalize_emails(_emails); _k text; _id uuid;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'REFERRAL_REDEMPTION_UNAVAILABLE'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('referral_redeem_user:' || _user_id::text));
  FOR _k IN SELECT x FROM unnest(_e) x ORDER BY x LOOP
    PERFORM pg_advisory_xact_lock(hashtext('referral_redeem_email:' || _k));
  END LOOP;
  IF NOT public.referral_redemption_eligible(_user_id, _e, _except_order_id) THEN
    RAISE EXCEPTION 'REFERRAL_REDEMPTION_UNAVAILABLE';
  END IF;
  INSERT INTO public.referral_redemption_claims(user_id, emails, code_id, status, expires_at)
  VALUES (_user_id, _e, _code_id, 'reserved', now() + make_interval(mins => greatest(coalesce(_ttl_minutes, 30), 1)))
  RETURNING id INTO _id;
  RETURN _id;
END $function$;

CREATE OR REPLACE FUNCTION public.release_referral_redemption_for_attempt(_payment_attempt_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _n integer;
BEGIN
  UPDATE public.referral_redemption_claims SET status = 'released', updated_at = now()
   WHERE payment_attempt_id = _payment_attempt_id AND status = 'reserved' AND order_id IS NULL;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $function$;

CREATE OR REPLACE FUNCTION public.ensure_referral_redemption(_order_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _o record; _claim uuid; _n integer;
BEGIN
  SELECT id, user_id, contact_email_normalized, referral_claim_id, discount_code_id
    INTO _o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND OR _o.user_id IS NULL THEN RETURN false; END IF;
  IF _o.referral_claim_id IS NOT NULL THEN
    UPDATE public.referral_redemption_claims
       SET status = 'consumed', order_id = _o.id, expires_at = NULL, updated_at = now()
     WHERE id = _o.referral_claim_id AND status = 'reserved'
       AND (order_id IS NULL OR order_id = _o.id);
    GET DIAGNOSTICS _n = ROW_COUNT;
    IF _n > 0 THEN RETURN true; END IF;
    RETURN EXISTS (SELECT 1 FROM public.referral_redemption_claims
                    WHERE id = _o.referral_claim_id AND order_id = _o.id AND status = 'consumed');
  END IF;
  BEGIN
    _claim := public.claim_referral_redemption(_o.user_id, ARRAY[_o.contact_email_normalized], _o.discount_code_id, 1, _o.id);
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  UPDATE public.referral_redemption_claims
     SET status = 'consumed', order_id = _o.id, expires_at = NULL, updated_at = now()
   WHERE id = _claim AND status = 'reserved';
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n > 0;
END $function$;

CREATE OR REPLACE FUNCTION public.referral_paid_order_count(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT count(*)::integer FROM public.orders o
   WHERE o.referrer_user_id = _user_id AND o.referrer_user_id <> o.user_id
     AND o.payment_confirmed IS TRUE AND o.status <> 'cancelled' AND o.refunded_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.admin_notifications n
                      WHERE n.order_id = o.id AND n.kind = 'referral-redemption-skipped');
$function$;

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
