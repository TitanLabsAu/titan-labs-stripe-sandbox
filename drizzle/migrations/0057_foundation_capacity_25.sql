ALTER TABLE public.foundation_member_settings DROP CONSTRAINT foundation_member_settings_capacity_check;
ALTER TABLE public.foundation_member_settings DISABLE TRIGGER foundation_settings_guard;
UPDATE public.foundation_member_settings SET capacity = 25 WHERE id = 1;
ALTER TABLE public.foundation_member_settings ENABLE TRIGGER foundation_settings_guard;
ALTER TABLE public.foundation_member_settings ALTER COLUMN capacity SET DEFAULT 25;
ALTER TABLE public.foundation_member_settings ADD CONSTRAINT foundation_member_settings_capacity_check CHECK (capacity = 25);