-- 0027 A first-offer claim bound to a payment attempt stays reserved (no expiry)
-- until that payment is failed/cancelled (release) or paid (consume).
CREATE OR REPLACE FUNCTION public.attach_first_offer_claim(_claim_id uuid, _payment_attempt_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.first_purchase_claims
     SET payment_attempt_id = _payment_attempt_id, expires_at = NULL, updated_at = now()
   WHERE id = _claim_id AND status = 'reserved' AND payment_attempt_id IS NULL;
$$;
REVOKE ALL ON FUNCTION public.attach_first_offer_claim(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_first_offer_claim(uuid, uuid) TO service_role;
