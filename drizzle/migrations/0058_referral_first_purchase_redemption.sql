-- Referral codes: redeemable once per buyer, on their first successful purchase only.
-- Additive: new claim table + functions, two nullable columns, settlement guard. No historical data touched.

CREATE TABLE public.referral_redemption_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  emails text[] NOT NULL DEFAULT '{}',
  code_id uuid,
  status text NOT NULL DEFAULT 'reserved',
  payment_attempt_id uuid,
  order_id uuid,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.referral_redemption_claims TO service_role;
ALTER TABLE public.referral_redemption_claims ENABLE ROW LEVEL SECURITY;
CREATE INDEX referral_redemption_claims_user_idx ON public.referral_redemption_claims (user_id);
CREATE INDEX referral_redemption_claims_attempt_idx ON public.referral_redemption_claims (payment_attempt_id);
CREATE INDEX referral_redemption_claims_order_idx ON public.referral_redemption_claims (order_id);

ALTER TABLE public.orders ADD COLUMN referral_claim_id uuid;
ALTER TABLE public.payment_attempts ADD COLUMN referral_claim_id uuid;

-- Eligible only when the buyer (by account id OR normalised email, guest orders included)
-- has no prior paid, non-cancelled, non-refunded order and no live claim.
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

-- Atomic one-time claim; advisory locks stop two concurrent checkouts both winning.
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

CREATE OR REPLACE FUNCTION public.attach_referral_redemption_claim(_claim_id uuid, _payment_attempt_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $function$
  UPDATE public.referral_redemption_claims
     SET payment_attempt_id = _payment_attempt_id, expires_at = NULL, updated_at = now()
   WHERE id = _claim_id AND status = 'reserved' AND payment_attempt_id IS NULL;
$function$;

CREATE OR REPLACE FUNCTION public.release_referral_redemption(_claim_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _n integer;
BEGIN
  UPDATE public.referral_redemption_claims SET status = 'released', updated_at = now()
   WHERE id = _claim_id AND status = 'reserved' AND order_id IS NULL;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n > 0;
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

-- Settlement-side guard: consume the order's claim, or claim+consume atomically for
-- legacy/manual orders. NEVER raises: a stale or duplicate referral must not block
-- payment recording, order finalisation or stock settlement.
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

-- Skipped (invalid) redemptions must not count towards the referrer's reward tally.
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

  -- Referral claim lifecycle: attach to the new order, consume on paid insert,
  -- release for test-mode inserts; cancelled orders always release so the buyer can retry.
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
    -- One-time referral rule: an ineligible/stale referral is skipped, never fatal.
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

-- Finalisation copies the claim from the attempt onto the order (same pattern as first offer).
CREATE OR REPLACE FUNCTION public.finalize_checkout_order(_payment_intent_id text, _attempt_id uuid, _subtotal numeric, _shipping numeric, _total numeric, _contact_name text, _contact_email text, _contact_phone text, _shipping_address text, _notes text, _items jsonb, _profile jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE _a record; _o record; _p jsonb; _cn text;
BEGIN
  IF _payment_intent_id IS NULL OR length(trim(_payment_intent_id)) = 0 THEN
    RAISE EXCEPTION 'A payment transaction id is required.';
  END IF;
  SELECT * INTO _a FROM public.payment_attempts WHERE id = _attempt_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment attempt % not found.', _attempt_id; END IF;
  IF _a.provider <> 'stripe' THEN RAISE EXCEPTION 'Payment attempt % is not a Stripe attempt.', _attempt_id; END IF;
  IF _a.transaction_id IS DISTINCT FROM _payment_intent_id THEN
    RAISE EXCEPTION 'Payment attempt % is not bound to transaction %.', _attempt_id, _payment_intent_id;
  END IF;
  _p := coalesce(_a.order_payload -> 'pricing', '{}'::jsonb);

  SELECT id, user_id, guest_session_id, order_number, subtotal, shipping, total INTO _o
    FROM public.orders WHERE payment_transaction_id = _payment_intent_id;
  IF FOUND THEN
    IF _o.user_id IS DISTINCT FROM _a.user_id OR _o.guest_session_id IS DISTINCT FROM _a.guest_session_id THEN
      RAISE EXCEPTION 'Payment transaction % belongs to another order owner.', _payment_intent_id;
    END IF;
    UPDATE public.payment_attempts SET status = 'paid', order_id = _o.id, updated_at = now() WHERE id = _attempt_id;
    RETURN jsonb_build_object('id', _o.id, 'order_number', _o.order_number,
      'subtotal', _o.subtotal, 'shipping', _o.shipping, 'total', _o.total);
  END IF;

  BEGIN
    INSERT INTO public.orders (
      user_id, guest_session_id, status, subtotal, shipping, total, payment_method, payment_reference,
      payment_provider, payment_transaction_id, payment_confirmed, payment_confirmed_at,
      contact_name, contact_email, contact_phone, shipping_address, notes,
      discount_code_id, discount_code, discount_code_kind, code_discount_cents, referrer_user_id,
      credit_units, credit_cents, credit_reservation_id, pricing_snapshot,
      first_purchase_offer, first_offer_claim_id, referral_claim_id
    ) VALUES (
      _a.user_id, _a.guest_session_id, 'processing', _subtotal, _shipping, _total, 'card', _payment_intent_id,
      'stripe', _payment_intent_id, true, now(),
      _contact_name, _contact_email, _contact_phone, _shipping_address, _notes,
      nullif(_p->>'discount_code_id', '')::uuid,
      nullif(_p->>'discount_code', ''),
      nullif(_p->>'discount_code_kind', ''),
      coalesce((_p->>'code_discount_cents')::integer, 0),
      CASE WHEN nullif(_p->>'referrer_user_id', '')::uuid IS NOT DISTINCT FROM _a.user_id THEN NULL
           ELSE nullif(_p->>'referrer_user_id', '')::uuid END,
      CASE WHEN _a.user_id IS NULL THEN 0 ELSE coalesce((_p->>'credit_units')::integer, 0) END,
      CASE WHEN _a.user_id IS NULL THEN 0 ELSE coalesce((_p->>'credit_cents')::integer, 0) END,
      CASE WHEN _a.user_id IS NULL THEN NULL ELSE nullif(_p->>'credit_reservation_id', '')::uuid END,
      CASE WHEN _p = '{}'::jsonb THEN NULL ELSE _p END,
      _a.first_purchase_offer, _a.first_offer_claim_id, _a.referral_claim_id
    ) RETURNING id, user_id, guest_session_id, order_number, subtotal, shipping, total INTO _o;
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS _cn = CONSTRAINT_NAME;
    IF _cn IS DISTINCT FROM 'orders_payment_transaction_id_unique_idx' THEN RAISE; END IF;
    SELECT id, user_id, guest_session_id, order_number, subtotal, shipping, total INTO _o
      FROM public.orders WHERE payment_transaction_id = _payment_intent_id;
    IF NOT FOUND OR _o.user_id IS DISTINCT FROM _a.user_id OR _o.guest_session_id IS DISTINCT FROM _a.guest_session_id THEN
      RAISE EXCEPTION 'Payment transaction % belongs to another order owner.', _payment_intent_id;
    END IF;
    UPDATE public.payment_attempts SET status = 'paid', order_id = _o.id, updated_at = now() WHERE id = _attempt_id;
    RETURN jsonb_build_object('id', _o.id, 'order_number', _o.order_number,
      'subtotal', _o.subtotal, 'shipping', _o.shipping, 'total', _o.total);
  END;

  INSERT INTO public.order_items (order_id, product_slug, product_name, unit_price, quantity, variant_label, variant_id)
  SELECT _o.id, (item->>'product_slug')::text, (item->>'product_name')::text,
    (item->>'unit_price')::numeric, (item->>'quantity')::integer, COALESCE((item->>'variant_label')::text, ''),
    nullif((item->>'variant_id')::text, '')
  FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb)) AS item;

  IF _a.user_id IS NOT NULL AND _profile IS NOT NULL THEN
    UPDATE public.profiles
    SET first_name = _profile->>'first_name', last_name = _profile->>'last_name',
        phone_number = _profile->>'phone', address_line = _profile->>'address_line',
        city = _profile->>'city', state = _profile->>'state',
        postcode = _profile->>'postcode', postal_address = _shipping_address, updated_at = now()
    WHERE id = _a.user_id;
  END IF;

  UPDATE public.payment_attempts
  SET status = 'paid', order_id = _o.id, updated_at = now()
  WHERE id = _attempt_id;

  RETURN jsonb_build_object('id', _o.id, 'order_number', _o.order_number,
    'subtotal', _o.subtotal, 'shipping', _o.shipping, 'total', _o.total);
END;
$function$;

REVOKE ALL ON FUNCTION public.referral_redemption_eligible(uuid, text[], uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_referral_redemption(uuid, text[], uuid, integer, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_referral_redemption_claim(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_referral_redemption(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_referral_redemption_for_attempt(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_referral_redemption(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.referral_redemption_eligible(uuid, text[], uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_referral_redemption(uuid, text[], uuid, integer, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_referral_redemption_claim(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_referral_redemption(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_referral_redemption_for_attempt(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_referral_redemption(uuid) TO service_role;