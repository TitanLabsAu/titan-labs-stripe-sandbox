-- The Titan Club: admin-assigned permanent member benefit (percent OR fixed AUD per purchase).
-- PENDING OWNER APPROVAL: not applied to the project database. Apply verbatim via the migration tool once approved.
-- Additive only. Feature is OFF and has no members by default.

CREATE TABLE public.titan_club_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
INSERT INTO public.titan_club_settings (id, enabled) VALUES (1, false);

CREATE TABLE public.titan_club_members (
  user_id uuid PRIMARY KEY,
  benefit_type text NOT NULL CHECK (benefit_type IN ('percent', 'fixed')),
  percent numeric(5,2),
  fixed_cents integer,
  max_cap_percent numeric(5,2) NOT NULL DEFAULT 20 CHECK (max_cap_percent > 0 AND max_cap_percent <= 100),
  active boolean NOT NULL DEFAULT true,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  revoked_at timestamptz,
  CONSTRAINT titan_club_benefit_shape CHECK (
    (benefit_type = 'percent' AND percent > 0 AND percent <= 100 AND fixed_cents IS NULL)
    OR (benefit_type = 'fixed' AND fixed_cents > 0 AND fixed_cents <= 100000 AND percent IS NULL)
  )
);

-- Private admin note lives apart so members' own-row read can never see it.
CREATE TABLE public.titan_club_notes (
  user_id uuid PRIMARY KEY REFERENCES public.titan_club_members(user_id) ON DELETE CASCADE,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 500),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.titan_club_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('assign', 'edit', 'revoke', 'reactivate', 'note', 'enable', 'disable')),
  before jsonb,
  after jsonb,
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX titan_club_events_user_idx ON public.titan_club_events (user_id, created_at DESC);

GRANT SELECT ON public.titan_club_settings TO authenticated;
GRANT SELECT ON public.titan_club_members TO authenticated;
GRANT SELECT ON public.titan_club_notes TO authenticated;
GRANT SELECT ON public.titan_club_events TO authenticated;
GRANT ALL ON public.titan_club_settings, public.titan_club_members, public.titan_club_notes, public.titan_club_events TO service_role;

ALTER TABLE public.titan_club_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.titan_club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.titan_club_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.titan_club_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read club settings" ON public.titan_club_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read own club row" ON public.titan_club_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read club notes" ON public.titan_club_notes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read club audit" ON public.titan_club_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
-- No INSERT/UPDATE/DELETE policies or grants: writes only through the admin-checked functions below.

-- Member: own active benefit, only while the programme is switched on. No note, no audit.
CREATE OR REPLACE FUNCTION public.titan_club_my_benefit()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN s.enabled AND m.active THEN
    jsonb_build_object('benefit_type', m.benefit_type, 'percent', m.percent, 'fixed_cents', m.fixed_cents, 'max_cap_percent', m.max_cap_percent, 'assigned_at', m.assigned_at)
  END
  FROM public.titan_club_settings s
  LEFT JOIN public.titan_club_members m ON m.user_id = auth.uid()
  WHERE s.id = 1
$$;

-- Admin: assign / edit / revoke / reactivate with atomic audit. Same values = no-op (idempotent).
CREATE OR REPLACE FUNCTION public.admin_set_titan_club(
  _user_id uuid, _benefit_type text, _percent numeric, _fixed_cents integer, _max_cap numeric, _active boolean, _note text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old public.titan_club_members%ROWTYPE;
  old_note text;
  new_row public.titan_club_members%ROWTYPE;
  act text;
  pct numeric := CASE WHEN _benefit_type = 'percent' THEN _percent END;
  fx integer := CASE WHEN _benefit_type = 'fixed' THEN _fixed_cents END;
  nt text := coalesce(_note, '');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF _user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RAISE EXCEPTION 'unknown member' USING ERRCODE = '22023';
  END IF;
  IF _benefit_type NOT IN ('percent', 'fixed') THEN RAISE EXCEPTION 'invalid benefit type' USING ERRCODE = '22023'; END IF;
  IF _benefit_type = 'percent' AND (pct IS NULL OR pct <= 0 OR pct > 100 OR pct <> round(pct, 2)) THEN
    RAISE EXCEPTION 'percent must be 0.01 to 100' USING ERRCODE = '22023';
  END IF;
  IF _benefit_type = 'fixed' AND (fx IS NULL OR fx <= 0 OR fx > 100000) THEN
    RAISE EXCEPTION 'fixed amount must be 1 cent to $1000' USING ERRCODE = '22023';
  END IF;
  IF _max_cap IS NULL OR _max_cap <= 0 OR _max_cap > 100 OR _max_cap <> round(_max_cap, 2) THEN
    RAISE EXCEPTION 'maximum discount must be 0.01 to 100' USING ERRCODE = '22023';
  END IF;
  IF _active IS NULL THEN RAISE EXCEPTION 'active required' USING ERRCODE = '22023'; END IF;
  IF char_length(nt) > 500 THEN RAISE EXCEPTION 'note too long' USING ERRCODE = '22023'; END IF;

  PERFORM pg_advisory_xact_lock(hashtext('titan_club:' || _user_id::text));
  SELECT * INTO old FROM public.titan_club_members WHERE user_id = _user_id FOR UPDATE;
  SELECT note INTO old_note FROM public.titan_club_notes WHERE user_id = _user_id;
  -- New or changed personal maxima must be at least the current trusted website cap
  -- (kit prices embed savings a lower cap could not enforce). Unchanged existing maxima are preserved.
  IF (old.user_id IS NULL OR old.max_cap_percent <> _max_cap)
     AND _max_cap < coalesce((SELECT combined_cap_percent FROM public.referral_settings WHERE id = 1), 20) THEN
    RAISE EXCEPTION 'maximum discount below website cap' USING ERRCODE = '22023';
  END IF;

  IF old.user_id IS NULL THEN
    IF NOT _active THEN RAISE EXCEPTION 'member is not in the club' USING ERRCODE = '22023'; END IF;
    INSERT INTO public.titan_club_members (user_id, benefit_type, percent, fixed_cents, max_cap_percent, active, assigned_by, updated_by)
      VALUES (_user_id, _benefit_type, pct, fx, _max_cap, true, auth.uid(), auth.uid()) RETURNING * INTO new_row;
    INSERT INTO public.titan_club_notes (user_id, note) VALUES (_user_id, nt);
    act := 'assign';
  ELSE
    IF old.benefit_type = _benefit_type AND old.percent IS NOT DISTINCT FROM pct AND old.fixed_cents IS NOT DISTINCT FROM fx AND old.max_cap_percent = _max_cap
       AND old.active = _active AND coalesce(old_note, '') = nt THEN
      RETURN jsonb_build_object('changed', false, 'action', null, 'active', old.active);
    END IF;
    act := CASE
      WHEN old.active AND NOT _active THEN 'revoke'
      WHEN NOT old.active AND _active THEN 'reactivate'
      WHEN old.benefit_type = _benefit_type AND old.percent IS NOT DISTINCT FROM pct AND old.fixed_cents IS NOT DISTINCT FROM fx AND old.max_cap_percent = _max_cap THEN 'note'
      ELSE 'edit' END;
    UPDATE public.titan_club_members SET benefit_type = _benefit_type, percent = pct, fixed_cents = fx, max_cap_percent = _max_cap, active = _active,
      updated_at = now(), updated_by = auth.uid(),
      revoked_at = CASE WHEN _active THEN NULL WHEN old.active THEN now() ELSE old.revoked_at END
      WHERE user_id = _user_id RETURNING * INTO new_row;
    INSERT INTO public.titan_club_notes (user_id, note, updated_at) VALUES (_user_id, nt, now())
      ON CONFLICT (user_id) DO UPDATE SET note = EXCLUDED.note, updated_at = now();
  END IF;

  INSERT INTO public.titan_club_events (user_id, action, before, after, actor) VALUES (
    _user_id, act,
    CASE WHEN old.user_id IS NULL THEN NULL ELSE jsonb_build_object('benefit_type', old.benefit_type, 'percent', old.percent, 'fixed_cents', old.fixed_cents, 'max_cap_percent', old.max_cap_percent, 'active', old.active, 'note_changed', false) END,
    jsonb_build_object('benefit_type', new_row.benefit_type, 'percent', new_row.percent, 'fixed_cents', new_row.fixed_cents, 'max_cap_percent', new_row.max_cap_percent, 'active', new_row.active, 'note_changed', coalesce(old_note, '') <> nt),
    auth.uid());
  RETURN jsonb_build_object('changed', true, 'action', act, 'active', new_row.active);
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_titan_club_enabled(_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE was boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT enabled INTO was FROM public.titan_club_settings WHERE id = 1 FOR UPDATE;
  IF was IS NOT DISTINCT FROM _enabled THEN RETURN jsonb_build_object('changed', false); END IF;
  UPDATE public.titan_club_settings SET enabled = _enabled, updated_at = now(), updated_by = auth.uid() WHERE id = 1;
  INSERT INTO public.titan_club_events (user_id, action, before, after, actor)
    VALUES (auth.uid(), CASE WHEN _enabled THEN 'enable' ELSE 'disable' END,
      jsonb_build_object('enabled', was), jsonb_build_object('enabled', _enabled), auth.uid());
  RETURN jsonb_build_object('changed', true);
END $$;

REVOKE ALL ON FUNCTION public.admin_set_titan_club(uuid, text, numeric, integer, numeric, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_titan_club_enabled(boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.titan_club_my_benefit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_titan_club(uuid, text, numeric, integer, numeric, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_titan_club_enabled(boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.titan_club_my_benefit() TO authenticated, service_role;
