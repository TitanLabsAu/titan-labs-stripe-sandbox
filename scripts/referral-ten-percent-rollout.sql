-- One-time authorized data operation, executed separately from DDL migrations.
-- The durable rollout key makes re-execution a no-op, preserving later Admin edits.
WITH rollout AS (
  INSERT INTO public.referral_discount_rollouts(key,before_rows)
  SELECT 'referral-percent-10-v1',coalesce(jsonb_agg(to_jsonb(d) ORDER BY id),'[]'::jsonb)
  FROM public.discount_codes d WHERE code_kind='referral'
  ON CONFLICT(key) DO NOTHING RETURNING key
), changed AS (
  UPDATE public.discount_codes SET discount_type='percent',value=10
  WHERE code_kind='referral' AND EXISTS(SELECT 1 FROM rollout)
  RETURNING id
)
SELECT count(*) AS updated FROM changed;