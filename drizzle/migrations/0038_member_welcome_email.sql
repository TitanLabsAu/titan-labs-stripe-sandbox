CREATE TABLE public.welcome_email_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  activated_at timestamptz,
  template_version text NOT NULL DEFAULT 'v1',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, UPDATE ON public.welcome_email_settings TO authenticated;
GRANT ALL ON public.welcome_email_settings TO service_role;
ALTER TABLE public.welcome_email_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read welcome settings" ON public.welcome_email_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update welcome settings" ON public.welcome_email_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.welcome_email_settings (id, enabled) VALUES (1, false) ON CONFLICT DO NOTHING;

-- Enabling always moves the cutoff forward, so nobody confirmed while OFF is ever queued later.
CREATE OR REPLACE FUNCTION public.welcome_settings_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.enabled AND NOT OLD.enabled THEN NEW.activated_at := now(); END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER welcome_settings_guard BEFORE UPDATE ON public.welcome_email_settings FOR EACH ROW EXECUTE FUNCTION public.welcome_settings_guard();

CREATE TABLE public.member_welcome_email_queue (
  user_id uuid NOT NULL,
  template_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  claimed_until timestamptz,
  completed_at timestamptz,
  outcome text,
  last_error text,
  PRIMARY KEY (user_id, template_version)
);
GRANT SELECT ON public.member_welcome_email_queue TO authenticated;
GRANT ALL ON public.member_welcome_email_queue TO service_role;
ALTER TABLE public.member_welcome_email_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read welcome queue" ON public.member_welcome_email_queue FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.queue_member_welcome_email() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record;
BEGIN
  IF NEW.email_confirmed_at IS NULL OR (TG_OP = 'UPDATE' AND OLD.email_confirmed_at IS NOT NULL) THEN RETURN NEW; END IF;
  BEGIN
    SELECT enabled, activated_at, template_version INTO s FROM public.welcome_email_settings WHERE id = 1;
    IF s.enabled AND s.activated_at IS NOT NULL AND NEW.created_at >= s.activated_at THEN
      INSERT INTO public.member_welcome_email_queue (user_id, template_version) VALUES (NEW.id, s.template_version)
      ON CONFLICT DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'welcome queue skipped: %', SQLERRM; -- never block sign-up/confirmation
  END;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.queue_member_welcome_email() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_confirmed_welcome AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.queue_member_welcome_email();

-- Atomic claim; only while the feature is enabled.
CREATE OR REPLACE FUNCTION public.claim_member_welcome_emails(_limit integer DEFAULT 20) RETURNS SETOF public.member_welcome_email_queue
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.member_welcome_email_queue q SET attempts = q.attempts + 1, claimed_until = now() + interval '10 minutes'
  WHERE (q.user_id, q.template_version) IN (
    SELECT user_id, template_version FROM public.member_welcome_email_queue
    WHERE completed_at IS NULL AND next_attempt_at <= now() AND (claimed_until IS NULL OR claimed_until < now())
      AND EXISTS (SELECT 1 FROM public.welcome_email_settings WHERE id = 1 AND enabled)
    ORDER BY created_at LIMIT least(greatest(_limit, 1), 50) FOR UPDATE SKIP LOCKED)
  RETURNING q.*;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_member_welcome_emails(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_member_welcome_emails(integer) TO service_role;