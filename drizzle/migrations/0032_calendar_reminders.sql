ALTER TABLE public.member_calendar_entries ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS public.member_calendar_reminder_sends (
  entry_id uuid NOT NULL REFERENCES public.member_calendar_entries(id) ON DELETE CASCADE,
  occurs_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entry_id, occurs_on)
);
GRANT ALL ON public.member_calendar_reminder_sends TO service_role;
ALTER TABLE public.member_calendar_reminder_sends ENABLE ROW LEVEL SECURITY;