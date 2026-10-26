-- Restore the acknowledgement-linking block in finalize_checkout_order (dropped in 0058's rewrite).
CREATE OR REPLACE FUNCTION public.finalize_checkout_order(_payment_intent_id text, _attempt_id uuid, _subtotal numeric, _shipping numeric, _total numeric, _contact_name text, _contact_email text, _contact_phone text, _shipping_address text, _notes text, _items jsonb, _profile jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
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
      first_purchase_offer, first_offer_claim_id, referral_claim_id
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
      _a.first_purchase_offer, _a.first_offer_claim_id, _a.referral_claim_id
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

  INSERT INTO public.order_items (order_id, product_slug, product_name, unit_price, quantity, variant_label, variant_id)
  SELECT _o.id, (item->>'product_slug')::text, (item->>'product_name')::text,
    (item->>'unit_price')::numeric, (item->>'quantity')::integer, COALESCE((item->>'variant_label')::text, ''),
    nullif((item->>'variant_id')::text, '')
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
END $function$;