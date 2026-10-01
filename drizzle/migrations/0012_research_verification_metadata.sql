ALTER TABLE public.research_entries
  ADD COLUMN IF NOT EXISTS evidence_status text NOT NULL DEFAULT 'not_reviewed',
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS claim_checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS blend_notice boolean NOT NULL DEFAULT false;

ALTER TABLE public.research_entries
  ADD CONSTRAINT research_entries_evidence_status_check CHECK (evidence_status IN
    ('not_reviewed','preclinical','limited_human','human_clinical','established_clinical','mixed','insufficient')),
  ADD CONSTRAINT research_entries_verification_status_check CHECK (verification_status IN
    ('unverified','partially_verified','verified','needs_correction'));

CREATE OR REPLACE FUNCTION public.research_entries_publish_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.published AND NEW.verification_status <> 'verified' THEN
    RAISE EXCEPTION 'Only entries with Verification Status = Verified can be published (entry %).', NEW.slug
      USING ERRCODE = 'P0001', HINT = 'research_publish_blocked';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS research_entries_publish_guard ON public.research_entries;
CREATE TRIGGER research_entries_publish_guard
BEFORE INSERT OR UPDATE ON public.research_entries
FOR EACH ROW EXECUTE FUNCTION public.research_entries_publish_guard();