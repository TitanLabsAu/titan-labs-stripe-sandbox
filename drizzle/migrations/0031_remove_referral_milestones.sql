CREATE OR REPLACE FUNCTION public.orders_referral_settlement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _new_paid boolean := NEW.payment_confirmed IS TRUE AND NEW.status <> 'cancelled' AND NEW.refunded_at IS NULL;
  _old_paid boolean := false;
  _net integer; _s record; _tally integer; _why text;
  _enabled boolean; _avail integer; _use integer; _active boolean;
  _every integer; _target integer; _earned integer;
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
  _every := greatest(coalesce(_s.reward_every_referrals, 5), 1);

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
    IF NEW.discount_code_id IS NOT NULL THEN
      UPDATE public.discount_codes SET times_used = times_used + 1 WHERE id = NEW.discount_code_id;
    END IF;
    _enabled := coalesce((NEW.pricing_snapshot -> 'settings' ->> 'programEnabled')::boolean, _s.program_enabled, true);
    IF NEW.referrer_user_id IS NOT NULL AND NEW.referrer_user_id IS DISTINCT FROM NEW.user_id AND _enabled THEN
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
    IF NEW.discount_code_id IS NOT NULL THEN
      UPDATE public.discount_codes SET times_used = greatest(times_used - 1, 0) WHERE id = NEW.discount_code_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;