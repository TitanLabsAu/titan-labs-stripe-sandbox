-- STAGED, NOT APPLIED. Titan Club per-member stacking policy (owner review required before install).
-- Additive only: new boolean columns default TRUE (legacy all-allowed behaviour), no RLS/grant loosening.
-- Foundation stacking defaults FALSE for new assignments; rows existing at install keep legacy behaviour (TRUE).

ALTER TABLE public.titan_club_members
  ADD COLUMN IF NOT EXISTS stack_multibuy boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS stack_crypto boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS stack_first_offer boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS stack_code boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS stack_credit boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS stack_foundation boolean NOT NULL DEFAULT true;
-- Existing rows got TRUE above (preserves saved behaviour); new rows default to FALSE.
ALTER TABLE public.titan_club_members ALTER COLUMN stack_foundation SET DEFAULT false;

-- Member: own active benefit + policy, only while the programme is on. No note, no audit.
CREATE OR REPLACE FUNCTION public.titan_club_my_benefit()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN s.enabled AND m.active THEN
    jsonb_build_object('benefit_type', m.benefit_type, 'percent', m.percent, 'fixed_cents', m.fixed_cents,
      'max_cap_percent', m.max_cap_percent, 'assigned_at', m.assigned_at,
      'stacking', jsonb_build_object('multibuy', m.stack_multibuy, 'crypto', m.stack_crypto,
        'first_offer', m.stack_first_offer, 'code', m.stack_code, 'credit', m.stack_credit, 'foundation', m.stack_foundation))
  END
  FROM public.titan_club_settings s
  LEFT JOIN public.titan_club_members m ON m.user_id = auth.uid()
  WHERE s.id = 1
$$;

-- Admin: benefit + stacking policy in one transaction. Delegates benefit validation/audit to the
-- existing admin-checked function, then records a separate 'policy' audit event. Same values = no-op.
CREATE OR REPLACE FUNCTION public.admin_set_titan_club_v2(
  _user_id uuid, _benefit_type text, _percent numeric, _fixed_cents integer, _max_cap numeric, _active boolean, _note text,
  _stack_multibuy boolean, _stack_crypto boolean, _stack_first_offer boolean, _stack_code boolean, _stack_credit boolean, _stack_foundation boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  res jsonb;
  old public.titan_club_members%ROWTYPE;
  pol_changed boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF _stack_multibuy IS NULL OR _stack_crypto IS NULL OR _stack_first_offer IS NULL OR _stack_code IS NULL OR _stack_credit IS NULL OR _stack_foundation IS NULL THEN
    RAISE EXCEPTION 'stacking policy required' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('titan_club:' || _user_id::text));
  res := public.admin_set_titan_club(_user_id, _benefit_type, _percent, _fixed_cents, _max_cap, _active, _note);
  SELECT * INTO old FROM public.titan_club_members WHERE user_id = _user_id FOR UPDATE;
  IF old.user_id IS NULL THEN RETURN res; END IF;
  pol_changed := old.stack_multibuy <> _stack_multibuy OR old.stack_crypto <> _stack_crypto OR old.stack_first_offer <> _stack_first_offer
    OR old.stack_code <> _stack_code OR old.stack_credit <> _stack_credit OR old.stack_foundation <> _stack_foundation;
  IF NOT pol_changed THEN RETURN res; END IF;
  UPDATE public.titan_club_members SET stack_multibuy = _stack_multibuy, stack_crypto = _stack_crypto, stack_first_offer = _stack_first_offer,
    stack_code = _stack_code, stack_credit = _stack_credit, stack_foundation = _stack_foundation, updated_at = now(), updated_by = auth.uid()
    WHERE user_id = _user_id;
  INSERT INTO public.titan_club_events (user_id, action, before, after, actor) VALUES (_user_id, 'policy',
    jsonb_build_object('multibuy', old.stack_multibuy, 'crypto', old.stack_crypto, 'first_offer', old.stack_first_offer, 'code', old.stack_code, 'credit', old.stack_credit, 'foundation', old.stack_foundation),
    jsonb_build_object('multibuy', _stack_multibuy, 'crypto', _stack_crypto, 'first_offer', _stack_first_offer, 'code', _stack_code, 'credit', _stack_credit, 'foundation', _stack_foundation),
    auth.uid());
  RETURN jsonb_build_object('changed', true, 'action', coalesce(res->>'action', 'policy'), 'active', old.active);
END $$;

REVOKE ALL ON FUNCTION public.admin_set_titan_club_v2(uuid, text, numeric, integer, numeric, boolean, text, boolean, boolean, boolean, boolean, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_titan_club_v2(uuid, text, numeric, integer, numeric, boolean, text, boolean, boolean, boolean, boolean, boolean, boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.titan_club_my_benefit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.titan_club_my_benefit() TO authenticated, service_role;
