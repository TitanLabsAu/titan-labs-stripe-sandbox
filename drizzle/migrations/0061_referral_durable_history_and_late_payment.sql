-- Add durable historical success evidence without changing orders, code counters or rewards.
CREATE TABLE public.referral_code_success_history (
  order_id uuid PRIMARY KEY, user_id uuid, code_id uuid NOT NULL,
  emails text[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.referral_code_success_history TO service_role;
ALTER TABLE public.referral_code_success_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX referral_code_success_history_identity_idx ON public.referral_code_success_history(code_id,user_id);
-- Schema backfill: historical paid flag, retained confirmed timestamp, paid provider attempt,
-- consumed claim, or the payment-confirmed checkpoint (queued only on verified paid transition).
INSERT INTO public.referral_code_success_history(order_id,user_id,code_id,emails)
SELECT o.id,o.user_id,o.discount_code_id,public.normalize_emails(ARRAY[o.contact_email_normalized,p.email])
FROM public.orders o LEFT JOIN public.profiles p ON p.id=o.user_id
WHERE o.discount_code_id IS NOT NULL AND o.discount_code_kind='referral'
  AND o.stripe_livemode IS DISTINCT FROM false
  AND (o.payment_confirmed IS TRUE OR o.payment_confirmed_at IS NOT NULL
    OR EXISTS(SELECT 1 FROM public.payment_attempts a WHERE a.order_id=o.id AND a.status='paid' AND a.stripe_livemode IS DISTINCT FROM false)
    OR EXISTS(SELECT 1 FROM public.referral_redemption_claims c WHERE c.order_id=o.id AND c.status='consumed')
    OR EXISTS(SELECT 1 FROM public.order_checkpoint_email_queue q WHERE q.order_id=o.id AND q.kind='payment-confirmed'))
ON CONFLICT(order_id) DO NOTHING;
DO $migration$
DECLARE _sql text;
BEGIN
  SELECT pg_get_functiondef('public.referral_redemption_eligible(uuid,text[],uuid,uuid)'::regprocedure) INTO _sql;
  _sql:=replace(_sql,'  RETURN true;', $new$  IF EXISTS(SELECT 1 FROM public.referral_code_success_history h WHERE h.code_id=_code_id
    AND h.order_id IS DISTINCT FROM _except_order_id
    AND (h.user_id=_user_id OR h.emails && _e)) THEN RETURN false; END IF;
  RETURN true;$new$);
  EXECUTE _sql;
  SELECT pg_get_functiondef('public.ensure_referral_redemption(uuid)'::regprocedure) INTO _sql;
  _sql:=replace(_sql,$old$_c.status NOT IN ('reserved','consumed')$old$,$new$_c.status NOT IN ('reserved','consumed','released')$new$);
  EXECUTE _sql;
END $migration$;