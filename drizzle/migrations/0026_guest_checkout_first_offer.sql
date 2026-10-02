-- 0026 Guest checkout + new-member first-purchase offer (additive).

-- Ownership columns become nullable only so guest rows can exist; every row
-- must still have exactly one owner (member or guest session).
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.payment_attempts ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.order_acknowledgements ALTER COLUMN user_id DROP NOT NULL;

CREATE TABLE public.guest_checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.guest_checkout_sessions TO service_role;
ALTER TABLE public.guest_checkout_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders
  ADD COLUMN guest_session_id uuid REFERENCES public.guest_checkout_sessions(id),
  ADD COLUMN first_purchase_offer jsonb,
  ADD COLUMN first_offer_claim_id uuid,
  ADD COLUMN contact_email_normalized text GENERATED ALWAYS AS (lower(btrim(contact_email))) STORED;
ALTER TABLE public.orders ADD CONSTRAINT orders_has_owner
  CHECK (user_id IS NOT NULL OR guest_session_id IS NOT NULL);
CREATE INDEX orders_contact_email_normalized_idx ON public.orders (contact_email_normalized);
CREATE INDEX orders_guest_session_idx ON public.orders (guest_session_id) WHERE guest_session_id IS NOT NULL;

ALTER TABLE public.payment_attempts
  ADD COLUMN guest_session_id uuid REFERENCES public.guest_checkout_sessions(id),
  ADD COLUMN first_purchase_offer jsonb,
  ADD COLUMN first_offer_claim_id uuid,
  ADD COLUMN acknowledgement_id uuid REFERENCES public.order_acknowledgements(id);
ALTER TABLE public.payment_attempts ADD CONSTRAINT payment_attempts_has_owner
  CHECK (user_id IS NOT NULL OR guest_session_id IS NOT NULL);

ALTER TABLE public.order_acknowledgements
  ADD COLUMN guest_session_id uuid REFERENCES public.guest_checkout_sessions(id);
ALTER TABLE public.order_acknowledgements ADD CONSTRAINT order_acknowledgements_has_owner
  CHECK (user_id IS NOT NULL OR guest_session_id IS NOT NULL);

ALTER TABLE public.referral_settings
  ADD COLUMN first_offer_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN first_offer_percent numeric NOT NULL DEFAULT 10,
  ADD COLUMN first_offer_combine_multibuy boolean NOT NULL DEFAULT false,
  ADD COLUMN first_offer_combine_crypto boolean NOT NULL DEFAULT false,
  ADD COLUMN first_offer_combine_code boolean NOT NULL DEFAULT false,
  ADD COLUMN first_offer_combine_credit boolean NOT NULL DEFAULT false;

CREATE TABLE public.first_purchase_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  emails text[] NOT NULL,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','consumed','released')),
  payment_attempt_id uuid,
  order_id uuid REFERENCES public.orders(id),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.first_purchase_claims TO service_role;
ALTER TABLE public.first_purchase_claims ENABLE ROW LEVEL SECURITY;
CREATE INDEX first_purchase_claims_user_idx ON public.first_purchase_claims (user_id);
CREATE INDEX first_purchase_claims_emails_idx ON public.first_purchase_claims USING gin (emails);

CREATE OR REPLACE FUNCTION public.normalize_emails(_emails text[])
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(array_agg(DISTINCT lower(btrim(e))), '{}')
  FROM unnest(coalesce(_emails, '{}')) e WHERE coalesce(btrim(e), '') <> ''
$$;

CREATE OR REPLACE FUNCTION public.first_offer_eligible(_user_id uuid, _emails text[])
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _e text[] := public.normalize_emails(_emails);
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.orders o WHERE o.status <> 'cancelled'
      AND (o.user_id = _user_id OR o.contact_email_normalized = ANY(_e))) THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM public.first_purchase_claims c
      WHERE (c.user_id = _user_id OR c.emails && _e)
        AND (c.status = 'consumed' OR (c.status = 'reserved' AND (c.expires_at IS NULL OR c.expires_at > now())))) THEN
    RETURN false;
  END IF;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.claim_first_offer(_user_id uuid, _emails text[], _ttl_minutes integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _e text[] := public.normalize_emails(_emails); _k text; _id uuid;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'FIRST_OFFER_UNAVAILABLE'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('first_offer_user:' || _user_id::text));
  FOR _k IN SELECT x FROM unnest(_e) x ORDER BY x LOOP
    PERFORM pg_advisory_xact_lock(hashtext('first_offer_email:' || _k));
  END LOOP;
  IF NOT public.first_offer_eligible(_user_id, _e) THEN
    RAISE EXCEPTION 'FIRST_OFFER_UNAVAILABLE';
  END IF;
  INSERT INTO public.first_purchase_claims(user_id, emails, status, expires_at)
  VALUES (_user_id, _e, 'reserved', now() + make_interval(mins => greatest(coalesce(_ttl_minutes, 30), 1)))
  RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.attach_first_offer_claim(_claim_id uuid, _payment_attempt_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.first_purchase_claims SET payment_attempt_id = _payment_attempt_id, updated_at = now()
   WHERE id = _claim_id AND status = 'reserved';
$$;

CREATE OR REPLACE FUNCTION public.release_first_offer(_claim_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  UPDATE public.first_purchase_claims SET status = 'released', updated_at = now()
   WHERE id = _claim_id AND status = 'reserved' AND order_id IS NULL;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n > 0;
END $$;

CREATE OR REPLACE FUNCTION public.release_first_offer_for_attempt(_payment_attempt_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  UPDATE public.first_purchase_claims SET status = 'released', updated_at = now()
   WHERE payment_attempt_id = _payment_attempt_id AND status = 'reserved' AND order_id IS NULL;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;

-- Consumes the claim when its order is created (idempotent) and releases it if
-- the order is cancelled, so cancelled orders don't burn the offer.
CREATE OR REPLACE FUNCTION public.orders_first_offer_settlement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.first_offer_claim_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    UPDATE public.first_purchase_claims SET status = 'consumed', order_id = NEW.id, expires_at = NULL, updated_at = now()
     WHERE id = NEW.first_offer_claim_id AND (order_id IS NULL OR order_id = NEW.id);
  ELSIF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE public.first_purchase_claims SET status = 'released', updated_at = now()
     WHERE id = NEW.first_offer_claim_id AND order_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER orders_first_offer_settlement
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_first_offer_settlement();

-- Guest-aware Stripe finaliser. Ownership comes only from the payment attempt.
CREATE OR REPLACE FUNCTION public.finalize_checkout_order(
  _payment_intent_id text, _attempt_id uuid, _subtotal numeric, _shipping numeric, _total numeric,
  _contact_name text, _contact_email text, _contact_phone text, _shipping_address text, _notes text,
  _items jsonb, _profile jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE _a record; _o record; _p jsonb; _cn text;
BEGIN
  IF _payment_intent_id IS NULL OR length(trim(_payment_intent_id)) = 0 THEN
    RAISE EXCEPTION 'A payment transaction id is required.';
  END IF;
  SELECT * INTO _a FROM public.payment_attempts WHERE id = _attempt_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment attempt % not found.', _attempt_id; END IF;
  IF _a.provider <> 'stripe' THEN RAISE EXCEPTION 'Payment attempt % is not a Stripe attempt.', _attempt_id; END IF;
  IF _a.transaction_id IS DISTINCT FROM _payment_intent_id THEN
    RAISE EXCEPTION 'Payment attempt % is not bound to transaction %.', _attempt_id, _payment_intent_id;
  END IF;
  _p := coalesce(_a.order_payload -> 'pricing', '{}'::jsonb);

  SELECT id, user_id, guest_session_id, order_number, subtotal, shipping, total INTO _o
    FROM public.orders WHERE payment_transaction_id = _payment_intent_id;
  IF FOUND THEN
    IF _o.user_id IS DISTINCT FROM _a.user_id OR _o.guest_session_id IS DISTINCT FROM _a.guest_session_id THEN
      RAISE EXCEPTION 'Payment transaction % belongs to another order owner.', _payment_intent_id;
    END IF;
    UPDATE public.payment_attempts SET status = 'paid', order_id = _o.id, updated_at = now() WHERE id = _attempt_id;
    RETURN jsonb_build_object('id', _o.id, 'order_number', _o.order_number,
      'subtotal', _o.subtotal, 'shipping', _o.shipping, 'total', _o.total);
  END IF;

  BEGIN
    INSERT INTO public.orders (
      user_id, guest_session_id, status, subtotal, shipping, total, payment_method, payment_reference,
      payment_provider, payment_transaction_id, payment_confirmed, payment_confirmed_at,
      contact_name, contact_email, contact_phone, shipping_address, notes,
      discount_code_id, discount_code, discount_code_kind, code_discount_cents, referrer_user_id,
      credit_units, credit_cents, credit_reservation_id, pricing_snapshot,
      first_purchase_offer, first_offer_claim_id
    ) VALUES (
      _a.user_id, _a.guest_session_id, 'processing', _subtotal, _shipping, _total, 'card', _payment_intent_id,
      'stripe', _payment_intent_id, true, now(),
      _contact_name, _contact_email, _contact_phone, _shipping_address, _notes,
      nullif(_p->>'discount_code_id', '')::uuid,
      nullif(_p->>'discount_code', ''),
      nullif(_p->>'discount_code_kind', ''),
      coalesce((_p->>'code_discount_cents')::integer, 0),
      CASE WHEN nullif(_p->>'referrer_user_id', '')::uuid IS NOT DISTINCT FROM _a.user_id THEN NULL
           ELSE nullif(_p->>'referrer_user_id', '')::uuid END,
      CASE WHEN _a.user_id IS NULL THEN 0 ELSE coalesce((_p->>'credit_units')::integer, 0) END,
      CASE WHEN _a.user_id IS NULL THEN 0 ELSE coalesce((_p->>'credit_cents')::integer, 0) END,
      CASE WHEN _a.user_id IS NULL THEN NULL ELSE nullif(_p->>'credit_reservation_id', '')::uuid END,
      CASE WHEN _p = '{}'::jsonb THEN NULL ELSE _p END,
      _a.first_purchase_offer, _a.first_offer_claim_id
    ) RETURNING id, user_id, guest_session_id, order_number, subtotal, shipping, total INTO _o;
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS _cn = CONSTRAINT_NAME;
    IF _cn IS DISTINCT FROM 'orders_payment_transaction_id_unique_idx' THEN RAISE; END IF;
    SELECT id, user_id, guest_session_id, order_number, subtotal, shipping, total INTO _o
      FROM public.orders WHERE payment_transaction_id = _payment_intent_id;
    IF NOT FOUND OR _o.user_id IS DISTINCT FROM _a.user_id OR _o.guest_session_id IS DISTINCT FROM _a.guest_session_id THEN
      RAISE EXCEPTION 'Payment transaction % belongs to another order owner.', _payment_intent_id;
    END IF;
    UPDATE public.payment_attempts SET status = 'paid', order_id = _o.id, updated_at = now() WHERE id = _attempt_id;
    RETURN jsonb_build_object('id', _o.id, 'order_number', _o.order_number,
      'subtotal', _o.subtotal, 'shipping', _o.shipping, 'total', _o.total);
  END;

  INSERT INTO public.order_items (order_id, product_slug, product_name, unit_price, quantity, variant_label)
  SELECT _o.id, (item->>'product_slug')::text, (item->>'product_name')::text,
    (item->>'unit_price')::numeric, (item->>'quantity')::integer, COALESCE((item->>'variant_label')::text, '')
  FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb)) AS item;

  IF _a.user_id IS NOT NULL AND _profile IS NOT NULL THEN
    UPDATE public.profiles
    SET first_name = _profile->>'first_name', last_name = _profile->>'last_name', phone_number = _profile->>'phone',
        address_line = _profile->>'address_line', city = _profile->>'city', state = _profile->>'state',
        postcode = _profile->>'postcode', postal_address = _shipping_address, updated_at = now()
    WHERE id = _a.user_id;
  END IF;

  UPDATE public.payment_attempts SET status = 'paid', order_id = _o.id, updated_at = now() WHERE id = _attempt_id;

  IF _a.acknowledgement_id IS NOT NULL THEN
    UPDATE public.order_acknowledgements SET order_id = _o.id
     WHERE id = _a.acknowledgement_id AND order_id IS NULL
       AND user_id IS NOT DISTINCT FROM _a.user_id
       AND guest_session_id IS NOT DISTINCT FROM _a.guest_session_id;
  END IF;

  RETURN jsonb_build_object('id', _o.id, 'order_number', _o.order_number,
    'subtotal', _o.subtotal, 'shipping', _o.shipping, 'total', _o.total);
END $$;

-- Referral rewards stay correct when the buyer is a guest (NULL user).
DO $$
DECLARE _d text;
BEGIN
  _d := pg_get_functiondef('public.orders_referral_settlement()'::regprocedure);
  _d := replace(_d, 'NEW.referrer_user_id <> NEW.user_id', 'NEW.referrer_user_id IS DISTINCT FROM NEW.user_id');
  EXECUTE _d;
END $$;

-- Milestone codes are member-only.
DO $$
DECLARE _d text;
BEGIN
  _d := pg_get_functiondef('public.handle_order_milestone()'::regprocedure);
  _d := replace(_d, E'BEGIN\n  SELECT count(*) INTO cnt', E'BEGIN\n  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;\n  SELECT count(*) INTO cnt');
  EXECUTE _d;
END $$;

REVOKE ALL ON FUNCTION public.first_offer_eligible(uuid, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_first_offer(uuid, text[], integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_first_offer_claim(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_first_offer(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_first_offer_for_attempt(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.orders_first_offer_settlement() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_checkout_order(text, uuid, numeric, numeric, numeric, text, text, text, text, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.first_offer_eligible(uuid, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_first_offer(uuid, text[], integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_first_offer_claim(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_first_offer(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_first_offer_for_attempt(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_checkout_order(text, uuid, numeric, numeric, numeric, text, text, text, text, text, jsonb, jsonb) TO service_role;
