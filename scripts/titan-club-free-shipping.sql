-- Titan Club per-member free shipping (additive). Default OFF for every existing and new row.
-- Older v1/v2 admin writes never touch the column, so they preserve the saved flag.

ALTER TABLE public.titan_club_members
  ADD COLUMN IF NOT EXISTS free_shipping boolean NOT NULL DEFAULT false;

-- Allow the new 'shipping' audit action (existing list + 'shipping').
ALTER TABLE public.titan_club_events DROP CONSTRAINT IF EXISTS titan_club_events_action_check;
ALTER TABLE public.titan_club_events ADD CONSTRAINT titan_club_events_action_check
  CHECK (action IN ('assign', 'edit', 'revoke', 'reactivate', 'note', 'enable', 'disable', 'policy', 'shipping'));

-- Member: own active benefit + policy + free shipping, only while the programme is on.
CREATE OR REPLACE FUNCTION public.titan_club_my_benefit()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN s.enabled AND m.active THEN
    jsonb_build_object('benefit_type', m.benefit_type, 'percent', m.percent, 'fixed_cents', m.fixed_cents,
      'max_cap_percent', m.max_cap_percent, 'assigned_at', m.assigned_at, 'free_shipping', m.free_shipping,
      'stacking', jsonb_build_object('multibuy', m.stack_multibuy, 'crypto', m.stack_crypto,
        'first_offer', m.stack_first_offer, 'code', m.stack_code, 'credit', m.stack_credit, 'foundation', m.stack_foundation))
  END
  FROM public.titan_club_settings s
  LEFT JOIN public.titan_club_members m ON m.user_id = auth.uid()
  WHERE s.id = 1
$$;

-- Admin: benefit + stacking + free shipping in one transaction. Delegates to v2 (admin-checked,
-- audited), then records a separate 'shipping' audit event only when the flag changes.
CREATE OR REPLACE FUNCTION public.admin_set_titan_club_v3(
  _user_id uuid, _benefit_type text, _percent numeric, _fixed_cents integer, _max_cap numeric, _active boolean, _note text,
  _stack_multibuy boolean, _stack_crypto boolean, _stack_first_offer boolean, _stack_code boolean, _stack_credit boolean, _stack_foundation boolean,
  _free_shipping boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  res jsonb;
  old_fs boolean;
  cur_active boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF _free_shipping IS NULL THEN RAISE EXCEPTION 'free shipping flag required' USING ERRCODE = '22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('titan_club_v3:' || _user_id::text));
  res := public.admin_set_titan_club_v2(_user_id, _benefit_type, _percent, _fixed_cents, _max_cap, _active, _note,
    _stack_multibuy, _stack_crypto, _stack_first_offer, _stack_code, _stack_credit, _stack_foundation);
  SELECT free_shipping, active INTO old_fs, cur_active FROM public.titan_club_members WHERE user_id = _user_id FOR UPDATE;
  IF old_fs IS NULL OR old_fs = _free_shipping THEN RETURN res; END IF;
  UPDATE public.titan_club_members SET free_shipping = _free_shipping, updated_at = now(), updated_by = auth.uid() WHERE user_id = _user_id;
  INSERT INTO public.titan_club_events (user_id, action, before, after, actor, created_at) VALUES (_user_id, 'shipping',
    jsonb_build_object('free_shipping', old_fs), jsonb_build_object('free_shipping', _free_shipping), auth.uid(), clock_timestamp());
  RETURN jsonb_build_object('changed', true, 'action', coalesce(res->>'action', 'shipping'), 'active', cur_active);
END $$;

REVOKE ALL ON FUNCTION public.admin_set_titan_club_v3(uuid, text, numeric, integer, numeric, boolean, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_titan_club_v3(uuid, text, numeric, integer, numeric, boolean, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.titan_club_my_benefit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.titan_club_my_benefit() TO authenticated, service_role;
