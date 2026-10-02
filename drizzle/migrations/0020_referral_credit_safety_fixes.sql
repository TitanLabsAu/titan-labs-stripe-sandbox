-- Credit denomination is fixed at AUD10 so past balances never revalue.
ALTER TABLE public.referral_settings ADD CONSTRAINT referral_settings_unit_fixed CHECK (credit_unit_cents = 1000);

CREATE OR REPLACE FUNCTION public.orders_referral_settlement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _new_paid boolean := NEW.payment_confirmed IS TRUE AND NEW.status <> 'cancelled' AND NEW.refunded_at IS NULL;
  _old_paid boolean := false;
  _net integer;
  _s record;
  _tally integer;
  _t integer;
  _name text;
  _inserted uuid;
  _why text;
  _reward integer;
  _enabled boolean;
  _avail integer;
  _use integer;
  _active boolean;
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

  IF _new_paid = _old_paid THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('order_settle:' || NEW.id::text));
  SELECT * INTO _s FROM public.referral_settings WHERE id = 1;

  IF _new_paid THEN
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
          -- Reservation lapsed or was released: never spend credit that is no longer there.
          UPDATE public.store_credit_reservations SET status = 'consumed', order_id = NEW.id
           WHERE id = NEW.credit_reservation_id AND user_id = NEW.user_id AND status IN ('reserved','released');
          _avail := public.store_credit_available_units(NEW.user_id);
          _use := least(NEW.credit_units, greatest(_avail, 0));
          IF _use < NEW.credit_units THEN
            INSERT INTO public.admin_notifications(order_id, title, body, kind, email_sent, payload)
            VALUES (NEW.id, 'Store credit shortfall',
              'An order was paid after its store credit hold lapsed. ' || (NEW.credit_units - _use) ||
              ' credit unit(s) applied at checkout were no longer available and were not deducted.',
              'credit-shortfall', true,
              jsonb_build_object('user_id', NEW.user_id, 'expected_units', NEW.credit_units, 'deducted_units', _use));
          END IF;
        END IF;
        IF _use > 0 THEN
          INSERT INTO public.store_credit_ledger(user_id, kind, units, unit_cents, order_id, reason)
          VALUES (NEW.user_id, 'redeemed', -_use, 1000, NEW.id, 'Redeemed at checkout');
        END IF;
      END IF;
    END IF;
    IF NEW.discount_code_id IS NOT NULL THEN
      UPDATE public.discount_codes SET times_used = times_used + 1 WHERE id = NEW.discount_code_id;
    END IF;
    _reward := coalesce((NEW.pricing_snapshot -> 'settings' ->> 'referralRewardUnits')::integer, _s.referral_reward_units, 0);
    _enabled := coalesce((NEW.pricing_snapshot -> 'settings' ->> 'programEnabled')::boolean, _s.program_enabled, true);
    IF NEW.referrer_user_id IS NOT NULL AND NEW.referrer_user_id <> NEW.user_id
       AND _enabled AND _reward > 0 THEN
      SELECT coalesce(sum(units), 0) INTO _net FROM public.store_credit_ledger
       WHERE order_id = NEW.id AND kind IN ('referral_earned','referral_reversed');
      IF _net = 0 THEN
        INSERT INTO public.store_credit_ledger(user_id, kind, units, unit_cents, order_id, reason)
        VALUES (NEW.referrer_user_id, 'referral_earned', _reward, 1000, NEW.id,
                'Referral code ' || coalesce(NEW.discount_code, '') || ' used on a paid order');
        SELECT count(*) INTO _tally FROM (
          SELECT order_id FROM public.store_credit_ledger
           WHERE user_id = NEW.referrer_user_id AND kind IN ('referral_earned','referral_reversed') AND order_id IS NOT NULL
           GROUP BY order_id HAVING sum(units) > 0) x;
        SELECT coalesce(nullif(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')), ''), email, 'A member')
          INTO _name FROM public.profiles WHERE id = NEW.referrer_user_id;
        FOREACH _t IN ARRAY coalesce(_s.milestone_thresholds, '{}') LOOP
          IF _t > 0 AND _tally >= _t THEN
            _inserted := NULL;
            INSERT INTO public.referral_milestone_awards(user_id, threshold, order_id)
            VALUES (NEW.referrer_user_id, _t, NEW.id)
            ON CONFLICT (user_id, threshold) DO NOTHING RETURNING id INTO _inserted;
            IF _inserted IS NOT NULL THEN
              INSERT INTO public.admin_notifications(order_id, title, body, kind, email_sent, payload)
              VALUES (NEW.id, 'Referral milestone: ' || _t || ' paid referrals',
                coalesce(_name, 'A member') || ' has reached ' || _t || ' successful paid referral orders.',
                'referral-milestone', true,
                jsonb_build_object('user_id', NEW.referrer_user_id, 'threshold', _t, 'tally', _tally));
            END IF;
          END IF;
        END LOOP;
      END IF;
    END IF;
  ELSE
    _why := CASE WHEN NEW.refunded_at IS NOT NULL THEN 'refunded' WHEN NEW.status = 'cancelled' THEN 'cancelled' ELSE 'payment unconfirmed' END;
    SELECT coalesce(sum(units), 0) INTO _net FROM public.store_credit_ledger
     WHERE order_id = NEW.id AND kind IN ('redeemed','redemption_reversed');
    IF _net < 0 THEN
      INSERT INTO public.store_credit_ledger(user_id, kind, units, unit_cents, order_id, reason)
      VALUES (NEW.user_id, 'redemption_reversed', -_net, 1000, NEW.id, 'Order ' || _why);
    END IF;
    SELECT coalesce(sum(units), 0) INTO _net FROM public.store_credit_ledger
     WHERE order_id = NEW.id AND kind IN ('referral_earned','referral_reversed');
    IF _net > 0 THEN
      INSERT INTO public.store_credit_ledger(user_id, kind, units, unit_cents, order_id, reason)
      SELECT user_id, 'referral_reversed', -_net, unit_cents, NEW.id, 'Referred order ' || _why
        FROM public.store_credit_ledger WHERE order_id = NEW.id AND kind = 'referral_earned'
        ORDER BY created_at DESC LIMIT 1;
    END IF;
    IF NEW.discount_code_id IS NOT NULL THEN
      UPDATE public.discount_codes SET times_used = greatest(times_used - 1, 0) WHERE id = NEW.discount_code_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.store_credit_summary(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _r jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  SELECT jsonb_build_object(
    'balanceUnits', coalesce((SELECT sum(units) FROM store_credit_ledger WHERE user_id = _user_id), 0),
    'earnedUnits', coalesce((SELECT sum(units) FROM store_credit_ledger WHERE user_id = _user_id
        AND (kind IN ('referral_earned','referral_reversed') OR (kind = 'adjustment' AND units > 0))), 0),
    'redeemedUnits', coalesce((SELECT -sum(units) FROM store_credit_ledger WHERE user_id = _user_id
        AND (kind IN ('redeemed','redemption_reversed') OR (kind = 'adjustment' AND units < 0))), 0),
    'reservedUnits', coalesce((SELECT sum(units) FROM store_credit_reservations WHERE user_id = _user_id
        AND status = 'reserved' AND (expires_at IS NULL OR expires_at > now())), 0),
    'availableUnits', greatest(public.store_credit_available_units(_user_id), 0),
    'paidReferralOrders', (SELECT count(*) FROM (SELECT order_id FROM store_credit_ledger
        WHERE user_id = _user_id AND kind IN ('referral_earned','referral_reversed') AND order_id IS NOT NULL
        GROUP BY order_id HAVING sum(units) > 0) x)
  ) INTO _r;
  RETURN _r;
END; $$;
REVOKE ALL ON FUNCTION public.store_credit_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.store_credit_summary(uuid) TO authenticated, service_role;