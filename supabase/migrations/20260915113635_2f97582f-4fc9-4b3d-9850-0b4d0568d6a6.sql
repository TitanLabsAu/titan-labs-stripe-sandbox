ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address_line TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postcode TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, postal_address, address_line, city, state, postcode)
  VALUES (
    NEW.id,
    NEW.email,
    nullif(trim(NEW.raw_user_meta_data ->> 'first_name'), ''),
    nullif(trim(NEW.raw_user_meta_data ->> 'last_name'), ''),
    nullif(trim(NEW.raw_user_meta_data ->> 'postal_address'), ''),
    nullif(trim(NEW.raw_user_meta_data ->> 'address_line'), ''),
    nullif(trim(NEW.raw_user_meta_data ->> 'city'), ''),
    nullif(trim(NEW.raw_user_meta_data ->> 'state'), ''),
    nullif(trim(NEW.raw_user_meta_data ->> 'postcode'), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;