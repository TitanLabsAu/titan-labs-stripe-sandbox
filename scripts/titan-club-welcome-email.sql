-- Titan Club congratulations email queue. STAGED FOR OWNER REVIEW: not applied to the project database.
-- Additive only. Queues exactly one congratulations per member, on their FIRST ever Club row insert.
-- Existing members already have rows, so nothing is queued retroactively (no backfill).

CREATE TABLE public.titan_club_welcome_email_queue (
  user_id uuid PRIMARY KEY,                        -- stable event identity: one congratulations per member, ever
  snapshot jsonb NOT NULL,                         -- final saved benefit/policy/shipping at commit; never the private note
  created_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  claimed_until timestamptz,
  completed_at timestamptz,
  outcome text,
  last_error text
);
GRANT SELECT ON public.titan_club_welcome_email_queue TO authenticated;
GRANT ALL ON public.titan_club_welcome_email_queue TO service_role;
ALTER TABLE public.titan_club_welcome_email_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read club welcome queue" ON public.titan_club_welcome_email_queue FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
-- No write policies or grants for authenticated/anon: rows come only from the trigger below; the worker uses service_role.

-- Deferred to COMMIT so v3 -> v2 -> v1 have all finished: reads the FINAL saved row, not v1's intermediate defaults.
-- Runs inside the assigning transaction, so a failed assignment rolls the queue row back too.
CREATE OR REPLACE FUNCTION public.queue_titan_club_welcome_email() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.titan_club_members%ROWTYPE;
BEGIN
  SELECT * INTO m FROM public.titan_club_members WHERE user_id = NEW.user_id;
  IF m.user_id IS NULL OR NOT m.active THEN RETURN NULL; END IF;
  INSERT INTO public.titan_club_welcome_email_queue (user_id, snapshot) VALUES (m.user_id, jsonb_build_object(
    'benefit_type', m.benefit_type, 'percent', m.percent, 'fixed_cents', m.fixed_cents, 'max_cap_percent', m.max_cap_percent,
    'stack_multibuy', m.stack_multibuy, 'stack_crypto', m.stack_crypto, 'stack_first_offer', m.stack_first_offer,
    'stack_code', m.stack_code, 'stack_credit', m.stack_credit, 'stack_foundation', m.stack_foundation,
    'free_shipping', m.free_shipping))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.queue_titan_club_welcome_email() FROM PUBLIC, anon, authenticated;
CREATE CONSTRAINT TRIGGER titan_club_welcome_on_first_assign
  AFTER INSERT ON public.titan_club_members DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.queue_titan_club_welcome_email();

-- Service-only atomic claim; nothing is claimed while the programme is switched off.
CREATE OR REPLACE FUNCTION public.claim_titan_club_welcome_emails(_limit integer DEFAULT 20)
RETURNS SETOF public.titan_club_welcome_email_queue LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.titan_club_welcome_email_queue q SET attempts = q.attempts + 1, claimed_until = now() + interval '10 minutes'
  WHERE q.user_id IN (
    SELECT user_id FROM public.titan_club_welcome_email_queue
    WHERE completed_at IS NULL AND next_attempt_at <= now() AND (claimed_until IS NULL OR claimed_until < now())
      AND EXISTS (SELECT 1 FROM public.titan_club_settings WHERE id = 1 AND enabled)
    ORDER BY created_at LIMIT least(greatest(_limit, 1), 50) FOR UPDATE SKIP LOCKED)
  RETURNING q.*;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_titan_club_welcome_emails(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_titan_club_welcome_emails(integer) TO service_role;
