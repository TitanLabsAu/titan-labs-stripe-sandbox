-- Foundation Member programme: reduce capacity from 50 to 25 places.
-- Additive: existing awards, numbers, 5% benefit, launch cutoff and enrolment state are untouched.
-- Enforcement stays server-side: the award trigger and admin grant RPC both lock the settings row
-- and call foundation_next_number(capacity), so at most 25 numbers can ever be allocated.
-- member_number keeps its 1..50 range so any already-issued number is never invalidated.
ALTER TABLE public.foundation_member_settings DROP CONSTRAINT foundation_member_settings_capacity_check;
ALTER TABLE public.foundation_member_settings DISABLE TRIGGER foundation_settings_guard;
UPDATE public.foundation_member_settings SET capacity = 25 WHERE id = 1;
ALTER TABLE public.foundation_member_settings ENABLE TRIGGER foundation_settings_guard;
ALTER TABLE public.foundation_member_settings ALTER COLUMN capacity SET DEFAULT 25;
ALTER TABLE public.foundation_member_settings ADD CONSTRAINT foundation_member_settings_capacity_check CHECK (capacity = 25);
