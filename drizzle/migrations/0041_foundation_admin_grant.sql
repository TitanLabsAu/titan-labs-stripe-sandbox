ALTER TABLE public.foundation_members ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE public.foundation_members ADD COLUMN IF NOT EXISTS granted_by uuid;

CREATE OR REPLACE FUNCTION public.foundation_next_number(_cap integer)
RETURNS integer LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT min(n) FROM generate_series(1, _cap) n
  WHERE NOT EXISTS (SELECT 1 FROM public.foundation_members m WHERE m.member_number = n)
$$;

CREATE OR REPLACE FUNCTION public.foundation_members_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('titan.foundation_admin', true) = 'on' THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'Foundation awards are permanent';
END $$;

CREATE OR REPLACE FUNCTION public.orders_foundation_award()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _s record; _n integer;
BEGIN
  IF NEW.user_id IS NULL OR NOT (NEW.payment_confirmed IS TRUE AND NEW.status <> 'cancelled' AND NEW.refunded_at IS NULL) THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.payment_confirmed IS TRUE AND OLD.status <> 'cancelled' AND OLD.refunded_at IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO _s FROM public.foundation_member_settings WHERE id = 1 FOR UPDATE;
  IF NOT FOUND OR NOT _s.enrolment_enabled OR _s.launched_at IS NULL OR NEW.created_at < _s.launched_at THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.foundation_members WHERE user_id = NEW.user_id) THEN RETURN NEW; END IF;
  _n := public.foundation_next_number(_s.capacity);
  IF _n IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.foundation_members (user_id, member_number, order_id) VALUES (NEW.user_id, _n, NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.orders_foundation_award() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_foundation_member(_user_id uuid, _enable boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _s record; _n integer; _existing integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN RAISE EXCEPTION 'Member not found'; END IF;
  SELECT * INTO _s FROM public.foundation_member_settings WHERE id = 1 FOR UPDATE;
  SELECT member_number INTO _existing FROM public.foundation_members WHERE user_id = _user_id;
  IF _enable THEN
    IF _existing IS NOT NULL THEN RETURN jsonb_build_object('member_number', _existing); END IF;
    _n := public.foundation_next_number(_s.capacity);
    IF _n IS NULL THEN RAISE EXCEPTION 'All Foundation places are taken'; END IF;
    INSERT INTO public.foundation_members (user_id, member_number, order_id, granted_by) VALUES (_user_id, _n, NULL, auth.uid());
    RETURN jsonb_build_object('member_number', _n);
  END IF;
  PERFORM set_config('titan.foundation_admin', 'on', true);
  DELETE FROM public.foundation_members WHERE user_id = _user_id;
  PERFORM set_config('titan.foundation_admin', 'off', true);
  RETURN jsonb_build_object('member_number', NULL);
END $$;
REVOKE ALL ON FUNCTION public.admin_set_foundation_member(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_foundation_member(uuid, boolean) TO authenticated;