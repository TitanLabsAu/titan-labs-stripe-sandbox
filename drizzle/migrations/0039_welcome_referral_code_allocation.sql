-- One shareable referral code per NEW welcome-queued member, reusing the Admin defaults
-- for new referral codes (0% customer discount, unlimited uses, normal stacking flags),
-- so no extra customer discount is invented. Existing codes are always reused.
CREATE OR REPLACE FUNCTION public.allocate_welcome_referral_code(_user_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text; i integer;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Missing member'; END IF;
  -- Gate: only members already admitted to the (flag + cutoff gated) welcome queue.
  IF NOT EXISTS (SELECT 1 FROM public.member_welcome_email_queue WHERE user_id = _user_id AND completed_at IS NULL) THEN
    RAISE EXCEPTION 'Member is not awaiting a welcome email';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id AND email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Member email is not confirmed';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('welcome-ref:' || _user_id::text, 0));
  SELECT code INTO c FROM public.discount_codes
    WHERE user_id = _user_id AND code_kind = 'referral' AND active AND (expires_at IS NULL OR expires_at > now())
    ORDER BY created_at LIMIT 1;
  IF c IS NOT NULL THEN RETURN c; END IF;
  FOR attempt IN 1..20 LOOP
    c := 'TL';
    FOR i IN 1..6 LOOP c := c || substr(alphabet, 1 + floor(random() * 32)::int, 1); END LOOP;
    BEGIN
      INSERT INTO public.discount_codes (code, code_kind, discount_type, value, max_uses, user_id, note, min_spend_cents, combine_multibuy, combine_crypto, combine_credit)
      VALUES (c, 'referral', 'percent', 0, 1000000, _user_id, 'Auto-issued with welcome email', 0, true, true, true);
      RETURN c;
    EXCEPTION WHEN unique_violation THEN
      -- collision; try another
    END;
  END LOOP;
  RAISE EXCEPTION 'Could not allocate a unique referral code';
END $$;
REVOKE EXECUTE ON FUNCTION public.allocate_welcome_referral_code(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_welcome_referral_code(uuid) TO service_role;