-- Titan Foundation Member programme (additive, ships disabled).
CREATE TABLE public.foundation_member_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enrolment_enabled boolean NOT NULL DEFAULT false,
  launched_at timestamptz,
  capacity integer NOT NULL DEFAULT 50 CHECK (capacity = 50),
  benefit_percent numeric NOT NULL DEFAULT 5 CHECK (benefit_percent = 5),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
INSERT INTO public.foundation_member_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

GRANT SELECT, UPDATE ON public.foundation_member_settings TO authenticated;
GRANT ALL ON public.foundation_member_settings TO service_role;
ALTER TABLE public.foundation_member_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read foundation settings" ON public.foundation_member_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update foundation settings" ON public.foundation_member_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Launch cutoff is fixed on first enable and never reset; capacity/percent are immutable.
CREATE OR REPLACE FUNCTION public.foundation_settings_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.id := 1;
  NEW.capacity := OLD.capacity;
  NEW.benefit_percent := OLD.benefit_percent;
  IF OLD.launched_at IS NOT NULL THEN
    NEW.launched_at := OLD.launched_at;
  ELSIF NEW.enrolment_enabled AND NOT OLD.enrolment_enabled THEN
    NEW.launched_at := now();
  ELSE
    NEW.launched_at := NULL;
  END IF;
  NEW.updated_at := now();
  NEW.updated_by := coalesce(auth.uid(), NEW.updated_by);
  RETURN NEW;
END $$;
CREATE TRIGGER foundation_settings_guard BEFORE UPDATE ON public.foundation_member_settings
  FOR EACH ROW EXECUTE FUNCTION public.foundation_settings_guard();
CREATE TABLE public.foundation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  member_number integer NOT NULL UNIQUE CHECK (member_number BETWEEN 1 AND 50),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id),
  awarded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.foundation_members TO authenticated;
GRANT ALL ON public.foundation_members TO service_role;
ALTER TABLE public.foundation_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own foundation award" ON public.foundation_members
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read foundation awards" ON public.foundation_members
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.foundation_members_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Foundation awards are permanent'; END $$;
CREATE TRIGGER foundation_members_immutable BEFORE UPDATE OR DELETE ON public.foundation_members
  FOR EACH ROW EXECUTE FUNCTION public.foundation_members_immutable();

-- Award on the transition to paid (covers paid-at-insert Stripe finalisation and Admin PayID/crypto confirmation).
CREATE OR REPLACE FUNCTION public.orders_foundation_award()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _s record; _n integer;
BEGIN
  IF NEW.user_id IS NULL OR NOT (NEW.payment_confirmed IS TRUE AND NEW.status <> 'cancelled' AND NEW.refunded_at IS NULL) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.payment_confirmed IS TRUE AND OLD.status <> 'cancelled' AND OLD.refunded_at IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT * INTO _s FROM public.foundation_member_settings WHERE id = 1 FOR UPDATE;
  IF NOT FOUND OR NOT _s.enrolment_enabled OR _s.launched_at IS NULL OR NEW.created_at < _s.launched_at THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.foundation_members WHERE user_id = NEW.user_id) THEN RETURN NEW; END IF;
  SELECT count(*) INTO _n FROM public.foundation_members;
  IF _n >= _s.capacity THEN RETURN NEW; END IF;
  INSERT INTO public.foundation_members (user_id, member_number, order_id)
    VALUES (NEW.user_id, _n + 1, NEW.id)
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.orders_foundation_award() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER orders_foundation_award AFTER INSERT OR UPDATE OF payment_confirmed, status, refunded_at ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_foundation_award();

-- Public aggregate only (no identities).
CREATE OR REPLACE FUNCTION public.foundation_programme_status()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'enrolment_enabled', s.enrolment_enabled,
    'launched', s.launched_at IS NOT NULL,
    'capacity', s.capacity,
    'benefit_percent', s.benefit_percent,
    'awarded', (SELECT count(*) FROM public.foundation_members))
  FROM public.foundation_member_settings s WHERE s.id = 1
$$;
GRANT EXECUTE ON FUNCTION public.foundation_programme_status() TO anon, authenticated, service_role;
