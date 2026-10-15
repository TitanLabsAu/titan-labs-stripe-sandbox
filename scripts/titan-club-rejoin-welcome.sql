-- Staged only: requires explicit approval before applying to the shared/live database.
-- Publish the event-aware sender before applying this SQL; older senders deduplicate by user only.
-- Reuse the existing protected queue, with a fresh identity for each reactivation.
-- 'initial' preserves provider idempotency for all existing first-assignment jobs.
ALTER TABLE public.titan_club_welcome_email_queue
  ADD COLUMN welcome_event_id text NOT NULL DEFAULT 'initial';

CREATE OR REPLACE FUNCTION public.queue_titan_club_welcome_email() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.titan_club_members%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.active OR NOT NEW.active THEN RETURN NULL; END IF;
  END IF;
  -- Deferred until commit: include the final stacking/shipping values saved by v3.
  SELECT * INTO m FROM public.titan_club_members WHERE user_id = NEW.user_id;
  IF m.user_id IS NULL OR NOT m.active THEN RETURN NULL; END IF;
  INSERT INTO public.titan_club_welcome_email_queue (user_id, snapshot, welcome_event_id)
  VALUES (m.user_id, jsonb_build_object(
    'benefit_type', m.benefit_type, 'percent', m.percent, 'fixed_cents', m.fixed_cents, 'max_cap_percent', m.max_cap_percent,
    'stack_multibuy', m.stack_multibuy, 'stack_crypto', m.stack_crypto, 'stack_first_offer', m.stack_first_offer,
    'stack_code', m.stack_code, 'stack_credit', m.stack_credit, 'stack_foundation', m.stack_foundation,
    'free_shipping', m.free_shipping),
    CASE WHEN TG_OP = 'INSERT' THEN 'initial' ELSE gen_random_uuid()::text END)
  ON CONFLICT (user_id) DO UPDATE SET
    snapshot = EXCLUDED.snapshot,
    welcome_event_id = EXCLUDED.welcome_event_id,
    created_at = now(), attempts = 0, next_attempt_at = now(),
    claimed_until = NULL, completed_at = NULL, outcome = NULL, last_error = NULL
  WHERE TG_OP = 'UPDATE';
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.queue_titan_club_welcome_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER titan_club_welcome_on_first_assign ON public.titan_club_members;
CREATE CONSTRAINT TRIGGER titan_club_welcome_on_activation
  AFTER INSERT OR UPDATE ON public.titan_club_members DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.queue_titan_club_welcome_email();
-- No backfill, membership edits, sends, grants or policy changes.