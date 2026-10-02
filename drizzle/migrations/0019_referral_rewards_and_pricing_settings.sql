CREATE TABLE public.referral_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  multibuy_tiers jsonb NOT NULL DEFAULT '[{"units":2,"percent":10},{"units":3,"percent":15},{"units":4,"percent":20}]'::jsonb,
  crypto_percent numeric NOT NULL DEFAULT 10 CHECK (crypto_percent >= 0 AND crypto_percent <= 100),
  combined_cap_percent numeric NOT NULL DEFAULT 20 CHECK (combined_cap_percent >= 0 AND combined_cap_percent <= 100),
  allow_multibuy_crypto boolean NOT NULL DEFAULT true,
  allow_code_multibuy boolean NOT NULL DEFAULT false,
  allow_code_crypto boolean NOT NULL DEFAULT false,
  allow_credit_code boolean NOT NULL DEFAULT true,
  allow_credit_discounts boolean NOT NULL DEFAULT true,
  credit_unit_cents integer NOT NULL DEFAULT 1000 CHECK (credit_unit_cents > 0),
  max_credit_units integer NOT NULL DEFAULT 2 CHECK (max_credit_units >= 0 AND max_credit_units <= 20),
  referral_reward_units integer NOT NULL DEFAULT 1 CHECK (referral_reward_units >= 0 AND referral_reward_units <= 20),
  milestone_thresholds integer[] NOT NULL DEFAULT '{5,10,25,50,100}',
  program_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.referral_settings TO anon, authenticated;
GRANT UPDATE ON public.referral_settings TO authenticated;
GRANT ALL ON public.referral_settings TO service_role;
ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read program settings" ON public.referral_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins update program settings" ON public.referral_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.referral_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
CREATE TRIGGER referral_settings_updated_at BEFORE UPDATE ON public.referral_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.discount_codes
  ADD COLUMN code_kind text NOT NULL DEFAULT 'referral',
  ADD COLUMN min_spend_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN combine_multibuy boolean NOT NULL DEFAULT true,
  ADD COLUMN combine_crypto boolean NOT NULL DEFAULT true,
  ADD COLUMN combine_credit boolean NOT NULL DEFAULT true;
UPDATE public.discount_codes SET code_kind = 'member' WHERE user_id IS NOT NULL;
UPDATE public.discount_codes SET code = upper(btrim(code)) WHERE code <> upper(btrim(code));
ALTER TABLE public.discount_codes DROP CONSTRAINT discount_codes_value_check;
ALTER TABLE public.discount_codes
  ADD CONSTRAINT discount_codes_kind_check CHECK (code_kind IN ('referral','member')),
  ADD CONSTRAINT discount_codes_member_owner_check CHECK (code_kind <> 'member' OR user_id IS NOT NULL),
  ADD CONSTRAINT discount_codes_normalized_check CHECK (code = upper(btrim(code)) AND code ~ '^[A-Z0-9_-]{3,32}$'),
  ADD CONSTRAINT discount_codes_min_spend_check CHECK (min_spend_cents >= 0),
  ADD CONSTRAINT discount_codes_value_range_check CHECK (value >= 0 AND (discount_type <> 'percent' OR value <= 100));
CREATE UNIQUE INDEX discount_codes_code_upper_idx ON public.discount_codes (upper(code));
CREATE INDEX discount_codes_user_idx ON public.discount_codes (user_id);

CREATE TABLE public.discount_code_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid,
  code text NOT NULL,
  action text NOT NULL,
  actor uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.discount_code_events TO authenticated;
GRANT ALL ON public.discount_code_events TO service_role;
ALTER TABLE public.discount_code_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view code history" ON public.discount_code_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX discount_code_events_code_idx ON public.discount_code_events (code_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_discount_code_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.discount_code_events(code_id, code, action, actor, after)
    VALUES (NEW.id, NEW.code, 'created', auth.uid(), to_jsonb(NEW) - 'times_used' - 'updated_at');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(OLD) - 'times_used' - 'updated_at') IS DISTINCT FROM (to_jsonb(NEW) - 'times_used' - 'updated_at') THEN
      INSERT INTO public.discount_code_events(code_id, code, action, actor, before, after)
      VALUES (NEW.id, NEW.code, 'updated', auth.uid(), to_jsonb(OLD) - 'times_used' - 'updated_at', to_jsonb(NEW) - 'times_used' - 'updated_at');
    END IF;
    RETURN NEW;
  ELSE
    INSERT INTO public.discount_code_events(code_id, code, action, actor, before)
    VALUES (OLD.id, OLD.code, 'deleted', auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  END IF;
END; $$;
CREATE TRIGGER discount_codes_audit AFTER INSERT OR UPDATE OR DELETE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.log_discount_code_event();

ALTER TABLE public.orders
  ADD COLUMN discount_code_id uuid REFERENCES public.discount_codes(id) ON DELETE SET NULL,
  ADD COLUMN discount_code text,
  ADD COLUMN discount_code_kind text,
  ADD COLUMN code_discount_cents integer NOT NULL DEFAULT 0 CHECK (code_discount_cents >= 0),
  ADD COLUMN referrer_user_id uuid,
  ADD COLUMN credit_units integer NOT NULL DEFAULT 0 CHECK (credit_units >= 0),
  ADD COLUMN credit_cents integer NOT NULL DEFAULT 0 CHECK (credit_cents >= 0),
  ADD COLUMN credit_reservation_id uuid,
  ADD COLUMN pricing_snapshot jsonb,
  ADD COLUMN refunded_at timestamptz;
CREATE INDEX orders_referrer_idx ON public.orders (referrer_user_id) WHERE referrer_user_id IS NOT NULL;
CREATE INDEX orders_discount_code_idx ON public.orders (discount_code_id) WHERE discount_code_id IS NOT NULL;

CREATE TABLE public.store_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('referral_earned','referral_reversed','redeemed','redemption_reversed','adjustment')),
  units integer NOT NULL CHECK (units <> 0 AND units BETWEEN -100 AND 100),
  unit_cents integer NOT NULL CHECK (unit_cents > 0),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind <> 'adjustment' OR length(btrim(coalesce(reason,''))) >= 3)
);
GRANT SELECT, INSERT ON public.store_credit_ledger TO authenticated;
GRANT ALL ON public.store_credit_ledger TO service_role;
ALTER TABLE public.store_credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own credit" ON public.store_credit_ledger FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view all credit" ON public.store_credit_ledger FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins add adjustments" ON public.store_credit_ledger FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND kind = 'adjustment' AND created_by = auth.uid() AND order_id IS NULL);
CREATE INDEX store_credit_ledger_user_idx ON public.store_credit_ledger (user_id, created_at DESC);
CREATE INDEX store_credit_ledger_order_idx ON public.store_credit_ledger (order_id, kind);

CREATE OR REPLACE FUNCTION public.store_credit_ledger_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.order_id IS NOT NULL AND NEW.order_id IS NULL
     AND (to_jsonb(OLD) - 'order_id') = (to_jsonb(NEW) - 'order_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Store credit ledger entries are append-only.';
END; $$;
CREATE TRIGGER store_credit_ledger_no_update BEFORE UPDATE OR DELETE ON public.store_credit_ledger
  FOR EACH ROW EXECUTE FUNCTION public.store_credit_ledger_immutable();

CREATE TABLE public.store_credit_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  units integer NOT NULL CHECK (units > 0 AND units <= 20),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','consumed','released')),
  payment_attempt_id uuid REFERENCES public.payment_attempts(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_credit_reservations TO authenticated;
GRANT ALL ON public.store_credit_reservations TO service_role;
ALTER TABLE public.store_credit_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own reservations" ON public.store_credit_reservations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view reservations" ON public.store_credit_reservations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX store_credit_reservations_user_idx ON public.store_credit_reservations (user_id, status);
CREATE INDEX store_credit_reservations_attempt_idx ON public.store_credit_reservations (payment_attempt_id);
CREATE TRIGGER store_credit_reservations_updated_at BEFORE UPDATE ON public.store_credit_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.referral_milestone_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  threshold integer NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, threshold)
);
GRANT SELECT ON public.referral_milestone_awards TO authenticated;
GRANT ALL ON public.referral_milestone_awards TO service_role;
ALTER TABLE public.referral_milestone_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view milestones" ON public.referral_milestone_awards FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members view own milestones" ON public.referral_milestone_awards FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.store_credit_available_units(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (coalesce((SELECT sum(units) FROM public.store_credit_ledger WHERE user_id = _user_id), 0)
        - coalesce((SELECT sum(units) FROM public.store_credit_reservations
                    WHERE user_id = _user_id AND status = 'reserved'
                      AND (expires_at IS NULL OR expires_at > now())), 0))::integer
$$;

CREATE OR REPLACE FUNCTION public.reserve_store_credit(_user_id uuid, _units integer, _payment_attempt_id uuid, _ttl_minutes integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _available integer; _max integer; _id uuid;
BEGIN
  IF _units IS NULL OR _units <= 0 THEN RAISE EXCEPTION 'Credit units must be positive.'; END IF;
  SELECT max_credit_units INTO _max FROM public.referral_settings WHERE id = 1;
  IF _units > coalesce(_max, 0) THEN RAISE EXCEPTION 'You can use at most % credit units per order.', _max; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('store_credit:' || _user_id::text));
  _available := public.store_credit_available_units(_user_id);
  IF _units > _available THEN
    RAISE EXCEPTION 'Not enough store credit available.' USING HINT = 'store_credit_insufficient';
  END IF;
  INSERT INTO public.store_credit_reservations(user_id, units, payment_attempt_id, expires_at)
  VALUES (_user_id, _units, _payment_attempt_id,
          CASE WHEN _ttl_minutes IS NULL THEN NULL ELSE now() + make_interval(mins => _ttl_minutes) END)
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.release_store_credit(_reservation_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  UPDATE public.store_credit_reservations SET status = 'released'
   WHERE id = _reservation_id AND status = 'reserved' AND order_id IS NULL;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n > 0;
END; $$;

CREATE OR REPLACE FUNCTION public.release_store_credit_for_attempt(_payment_attempt_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  UPDATE public.store_credit_reservations SET status = 'released'
   WHERE payment_attempt_id = _payment_attempt_id AND status = 'reserved' AND order_id IS NULL;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END; $$;

CREATE OR REPLACE FUNCTION public.attach_store_credit_reservation(_reservation_id uuid, _payment_attempt_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.store_credit_reservations SET payment_attempt_id = _payment_attempt_id
   WHERE id = _reservation_id AND status = 'reserved';
$$;

REVOKE ALL ON FUNCTION public.store_credit_available_units(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_store_credit(uuid, integer, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_store_credit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_store_credit_for_attempt(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_store_credit_reservation(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.store_credit_available_units(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_store_credit(uuid, integer, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_store_credit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_store_credit_for_attempt(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_store_credit_reservation(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.orders_customer_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF _uid IS NOT NULL AND NOT public.has_role(_uid, 'admin') THEN
      NEW.payment_confirmed := false;
      NEW.payment_confirmed_at := NULL;
      NEW.discount_code_id := NULL; NEW.discount_code := NULL; NEW.discount_code_kind := NULL;
      NEW.code_discount_cents := 0; NEW.referrer_user_id := NULL;
      NEW.credit_units := 0; NEW.credit_cents := 0; NEW.credit_reservation_id := NULL;
      NEW.refunded_at := NULL;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.discount_code IS DISTINCT FROM OLD.discount_code
     OR NEW.discount_code_kind IS DISTINCT FROM OLD.discount_code_kind
     OR NEW.code_discount_cents IS DISTINCT FROM OLD.code_discount_cents
     OR NEW.referrer_user_id IS DISTINCT FROM OLD.referrer_user_id
     OR NEW.credit_units IS DISTINCT FROM OLD.credit_units
     OR NEW.credit_cents IS DISTINCT FROM OLD.credit_cents
     OR NEW.credit_reservation_id IS DISTINCT FROM OLD.credit_reservation_id
     OR NEW.pricing_snapshot IS DISTINCT FROM OLD.pricing_snapshot
     OR (NEW.discount_code_id IS DISTINCT FROM OLD.discount_code_id AND NEW.discount_code_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Order pricing snapshots cannot be changed.';
  END IF;
  IF _uid IS NOT NULL AND NOT public.has_role(_uid, 'admin') THEN
    IF (to_jsonb(NEW) - 'payment_reference' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'payment_reference' - 'updated_at') THEN
      RAISE EXCEPTION 'Only the payment reference can be updated on your order.';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER orders_customer_guard BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_customer_guard();

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
BEGIN
  IF TG_OP = 'UPDATE' THEN
    _old_paid := OLD.payment_confirmed IS TRUE AND OLD.status <> 'cancelled' AND OLD.refunded_at IS NULL;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.credit_reservation_id IS NOT NULL THEN
    UPDATE public.store_credit_reservations SET order_id = NEW.id, expires_at = NULL
     WHERE id = NEW.credit_reservation_id AND user_id = NEW.user_id AND status = 'reserved';
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
        INSERT INTO public.store_credit_ledger(user_id, kind, units, unit_cents, order_id, reason)
        VALUES (NEW.user_id, 'redeemed', -NEW.credit_units, coalesce(_s.credit_unit_cents, 1000), NEW.id, 'Redeemed at checkout');
        UPDATE public.store_credit_reservations SET status = 'consumed'
         WHERE id = NEW.credit_reservation_id AND status IN ('reserved','released');
      END IF;
    END IF;
    IF NEW.discount_code_id IS NOT NULL THEN
      UPDATE public.discount_codes SET times_used = times_used + 1 WHERE id = NEW.discount_code_id;
    END IF;
    IF NEW.referrer_user_id IS NOT NULL AND NEW.referrer_user_id <> NEW.user_id
       AND coalesce(_s.referral_reward_units, 0) > 0 THEN
      SELECT coalesce(sum(units), 0) INTO _net FROM public.store_credit_ledger
       WHERE order_id = NEW.id AND kind IN ('referral_earned','referral_reversed');
      IF _net = 0 THEN
        INSERT INTO public.store_credit_ledger(user_id, kind, units, unit_cents, order_id, reason)
        VALUES (NEW.referrer_user_id, 'referral_earned', _s.referral_reward_units, _s.credit_unit_cents, NEW.id,
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
      VALUES (NEW.user_id, 'redemption_reversed', -_net, coalesce(_s.credit_unit_cents, 1000), NEW.id, 'Order ' || _why);
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
CREATE TRIGGER orders_referral_settlement AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_referral_settlement();

CREATE OR REPLACE FUNCTION public.handle_order_milestone()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cnt integer;
  ini text;
  new_code text;
  pct numeric;
  p record;
  full_name text;
  addr text;
BEGIN
  SELECT count(*) INTO cnt FROM public.orders
    WHERE user_id = NEW.user_id AND status <> 'cancelled';

  SELECT * INTO p FROM public.profiles WHERE id = NEW.user_id;
  ini := upper(coalesce(left(p.first_name, 1), '') || coalesce(left(p.last_name, 1), ''));
  IF ini = '' THEN
    ini := upper(left(coalesce(p.email, 'XX'), 2));
  END IF;
  ini := regexp_replace(ini, '[^A-Z0-9]', 'X', 'g');
  full_name := nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '');
  addr := nullif(trim(concat_ws(', ', p.address_line, p.city, p.state, p.postcode)), '');

  IF cnt IN (5, 10, 15, 20) THEN
    new_code := 'TITAN' || ini || cnt::text;
    pct := cnt;

    INSERT INTO public.discount_codes (code, discount_type, value, max_uses, user_id, milestone, note, code_kind)
    VALUES (new_code, 'percent', pct, 1, NEW.user_id, cnt, 'Automatic milestone reward', 'member')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.admin_notifications (order_id, title, body, kind, email_sent)
    VALUES (
      NEW.id,
      'Milestone reached: ' || cnt || ' orders',
      coalesce(full_name, coalesce(p.email, 'A customer')) || ' has now placed ' || cnt ||
      ' orders. One-off personal discount code ' || new_code || ' (' || pct || '% off) has been generated for them.',
      'milestone',
      true
    );

  ELSIF cnt IN (50, 75, 100) THEN
    INSERT INTO public.admin_notifications (order_id, title, body, kind, email_sent, payload)
    VALUES (
      NEW.id,
      'Major milestone: ' || cnt || ' orders',
      coalesce(full_name, 'A customer') || ' has now placed ' || cnt || ' orders.' ||
      E'\nEmail: ' || coalesce(p.email, '-') ||
      E'\nPhone: ' || coalesce(p.phone_number, '-') ||
      E'\nAddress: ' || coalesce(addr, coalesce(p.postal_address, '-')),
      'milestone-major',
      false,
      jsonb_build_object(
        'milestone', cnt,
        'name', coalesce(full_name, ''),
        'email', coalesce(p.email, ''),
        'phone', coalesce(p.phone_number, ''),
        'address', coalesce(addr, coalesce(p.postal_address, '')),
        'order_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_stripe_order(_payment_intent_id text, _user_id uuid, _attempt_id uuid, _subtotal numeric, _shipping numeric, _total numeric, _contact_name text, _contact_email text, _contact_phone text, _shipping_address text, _notes text, _items jsonb, _profile_first_name text, _profile_last_name text, _profile_phone text, _profile_address_line text, _profile_city text, _profile_state text, _profile_postcode text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _attempt record;
  _order record;
  _constraint_name text;
  _p jsonb;
BEGIN
  IF _payment_intent_id IS NULL OR length(trim(_payment_intent_id)) = 0 THEN
    RAISE EXCEPTION 'A payment transaction id is required.';
  END IF;

  SELECT id, user_id, transaction_id, status, order_id, order_payload
  INTO _attempt
  FROM public.payment_attempts
  WHERE id = _attempt_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment attempt % not found.', _attempt_id;
  END IF;

  IF _attempt.user_id <> _user_id THEN
    RAISE EXCEPTION 'Payment attempt % does not belong to user %.', _attempt_id, _user_id;
  END IF;

  IF _attempt.transaction_id IS NOT NULL AND _attempt.transaction_id <> _payment_intent_id THEN
    RAISE EXCEPTION 'Payment attempt % is tied to transaction % (expected %).',
      _attempt_id, _attempt.transaction_id, _payment_intent_id;
  END IF;

  _p := coalesce(_attempt.order_payload -> 'pricing', '{}'::jsonb);

  SELECT id, user_id, order_number, subtotal, shipping, total
  INTO _order
  FROM public.orders
  WHERE payment_transaction_id = _payment_intent_id;

  IF FOUND THEN
    IF _order.user_id <> _user_id THEN
      RAISE EXCEPTION 'Payment transaction % belongs to another user order.', _payment_intent_id;
    END IF;
    UPDATE public.payment_attempts
    SET status = 'paid', transaction_id = _payment_intent_id, order_id = _order.id, updated_at = now()
    WHERE id = _attempt_id AND user_id = _user_id;
    RETURN jsonb_build_object('id', _order.id, 'order_number', _order.order_number,
      'subtotal', _order.subtotal, 'shipping', _order.shipping, 'total', _order.total);
  END IF;

  BEGIN
    INSERT INTO public.orders (
      user_id, status, subtotal, shipping, total, payment_method, payment_reference,
      payment_provider, payment_transaction_id, payment_confirmed, payment_confirmed_at,
      contact_name, contact_email, contact_phone, shipping_address, notes,
      discount_code_id, discount_code, discount_code_kind, code_discount_cents, referrer_user_id,
      credit_units, credit_cents, credit_reservation_id, pricing_snapshot
    ) VALUES (
      _user_id, 'processing', _subtotal, _shipping, _total, 'card', _payment_intent_id,
      'stripe', _payment_intent_id, true, now(),
      _contact_name, _contact_email, _contact_phone, _shipping_address, _notes,
      nullif(_p->>'discount_code_id', '')::uuid,
      nullif(_p->>'discount_code', ''),
      nullif(_p->>'discount_code_kind', ''),
      coalesce((_p->>'code_discount_cents')::integer, 0),
      CASE WHEN nullif(_p->>'referrer_user_id', '')::uuid = _user_id THEN NULL ELSE nullif(_p->>'referrer_user_id', '')::uuid END,
      coalesce((_p->>'credit_units')::integer, 0),
      coalesce((_p->>'credit_cents')::integer, 0),
      nullif(_p->>'credit_reservation_id', '')::uuid,
      CASE WHEN _p = '{}'::jsonb THEN NULL ELSE _p END
    )
    RETURNING id, user_id, order_number, subtotal, shipping, total
    INTO _order;

  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS _constraint_name = CONSTRAINT_NAME;
    IF _constraint_name IS DISTINCT FROM 'orders_payment_transaction_id_unique_idx' THEN
      RAISE;
    END IF;
    SELECT id, user_id, order_number, subtotal, shipping, total
    INTO _order
    FROM public.orders
    WHERE payment_transaction_id = _payment_intent_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unique violation on % but no matching order was found.', _payment_intent_id;
    END IF;
    IF _order.user_id <> _user_id THEN
      RAISE EXCEPTION 'Payment transaction % belongs to another user order.', _payment_intent_id;
    END IF;
    UPDATE public.payment_attempts
    SET status = 'paid', transaction_id = _payment_intent_id, order_id = _order.id, updated_at = now()
    WHERE id = _attempt_id AND user_id = _user_id;
    RETURN jsonb_build_object('id', _order.id, 'order_number', _order.order_number,
      'subtotal', _order.subtotal, 'shipping', _order.shipping, 'total', _order.total);
  END;

  INSERT INTO public.order_items (order_id, product_slug, product_name, unit_price, quantity, variant_label)
  SELECT _order.id, (item->>'product_slug')::text, (item->>'product_name')::text,
    (item->>'unit_price')::numeric, (item->>'quantity')::integer, COALESCE((item->>'variant_label')::text, '')
  FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb)) AS item;

  UPDATE public.profiles
  SET first_name = _profile_first_name, last_name = _profile_last_name, phone_number = _profile_phone,
      address_line = _profile_address_line, city = _profile_city, state = _profile_state,
      postcode = _profile_postcode, postal_address = _shipping_address, updated_at = now()
  WHERE id = _user_id;

  UPDATE public.payment_attempts
  SET status = 'paid', transaction_id = _payment_intent_id, order_id = _order.id, updated_at = now()
  WHERE id = _attempt_id AND user_id = _user_id;

  RETURN jsonb_build_object('id', _order.id, 'order_number', _order.order_number,
    'subtotal', _order.subtotal, 'shipping', _order.shipping, 'total', _order.total);
END;
$function$;
REVOKE ALL ON FUNCTION public.finalize_stripe_order(text, uuid, uuid, numeric, numeric, numeric, text, text, text, text, text, jsonb, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_stripe_order(text, uuid, uuid, numeric, numeric, numeric, text, text, text, text, text, jsonb, text, text, text, text, text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.orders_referral_settlement() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.orders_customer_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_discount_code_event() FROM PUBLIC, anon, authenticated;