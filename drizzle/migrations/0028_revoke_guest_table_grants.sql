REVOKE ALL ON public.guest_checkout_sessions FROM anon, authenticated;
REVOKE ALL ON public.first_purchase_claims FROM anon, authenticated;
GRANT ALL ON public.guest_checkout_sessions TO service_role;
GRANT ALL ON public.first_purchase_claims TO service_role;