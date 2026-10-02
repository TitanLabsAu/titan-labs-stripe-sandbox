CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_transaction_id_unique_idx
ON public.orders (payment_transaction_id)
WHERE payment_transaction_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.finalize_stripe_order(
  _payment_intent_id text,
  _user_id uuid,
  _attempt_id uuid,
  _subtotal numeric,
  _shipping numeric,
  _total numeric,
  _contact_name text,
  _contact_email text,
  _contact_phone text,
  _shipping_address text,
  _notes text,
  _items jsonb,
  _profile_first_name text,
  _profile_last_name text,
  _profile_phone text,
  _profile_address_line text,
  _profile_city text,
  _profile_state text,
  _profile_postcode text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _attempt record;
  _order record;
  _constraint_name text;
BEGIN
  IF _payment_intent_id IS NULL OR length(trim(_payment_intent_id)) = 0 THEN
    RAISE EXCEPTION 'A payment transaction id is required.';
  END IF;

  SELECT id, user_id, transaction_id, status, order_id
  INTO _attempt
  FROM public.payment_attempts
  WHERE id = _attempt_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment attempt % not found.', _attempt_id;
  END IF;

  IF _attempt.user_id <> _user_id THEN
    RAISE EXCEPTION 'Payment attempt % does not belong to user %.', _attempt_id, _user_id;
  END IF;

  IF _attempt.transaction_id IS NOT NULL AND _attempt.transaction_id <> _payment_intent_id THEN
    RAISE EXCEPTION 'Payment attempt % is tied to transaction % (expected %).',
      _attempt_id, _attempt.transaction_id, _payment_intent_id;
  END IF;

  SELECT id, user_id, order_number, subtotal, shipping, total
  INTO _order
  FROM public.orders
  WHERE payment_transaction_id = _payment_intent_id;

  IF FOUND THEN
    IF _order.user_id <> _user_id THEN
      RAISE EXCEPTION 'Payment transaction % belongs to another user order.', _payment_intent_id;
    END IF;

    UPDATE public.payment_attempts
    SET status = 'paid',
        transaction_id = _payment_intent_id,
        order_id = _order.id,
        updated_at = now()
    WHERE id = _attempt_id
      AND user_id = _user_id;

    RETURN jsonb_build_object(
      'id', _order.id,
      'order_number', _order.order_number,
      'subtotal', _order.subtotal,
      'shipping', _order.shipping,
      'total', _order.total
    );
  END IF;

  BEGIN
    INSERT INTO public.orders (
      user_id,
      status,
      subtotal,
      shipping,
      total,
      payment_method,
      payment_reference,
      payment_provider,
      payment_transaction_id,
      payment_confirmed,
      payment_confirmed_at,
      contact_name,
      contact_email,
      contact_phone,
      shipping_address,
      notes
    ) VALUES (
      _user_id,
      'processing',
      _subtotal,
      _shipping,
      _total,
      'card',
      _payment_intent_id,
      'stripe',
      _payment_intent_id,
      true,
      now(),
      _contact_name,
      _contact_email,
      _contact_phone,
      _shipping_address,
      _notes
    )
    RETURNING id, user_id, order_number, subtotal, shipping, total
    INTO _order;

  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS _constraint_name = CONSTRAINT_NAME;

    IF _constraint_name IS DISTINCT FROM 'orders_payment_transaction_id_unique_idx' THEN
      RAISE;
    END IF;

    SELECT id, user_id, order_number, subtotal, shipping, total
    INTO _order
    FROM public.orders
    WHERE payment_transaction_id = _payment_intent_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unique violation on % but no matching order was found.', _payment_intent_id;
    END IF;

    IF _order.user_id <> _user_id THEN
      RAISE EXCEPTION 'Payment transaction % belongs to another user order.', _payment_intent_id;
    END IF;

    UPDATE public.payment_attempts
    SET status = 'paid',
        transaction_id = _payment_intent_id,
        order_id = _order.id,
        updated_at = now()
    WHERE id = _attempt_id
      AND user_id = _user_id;

    RETURN jsonb_build_object(
      'id', _order.id,
      'order_number', _order.order_number,
      'subtotal', _order.subtotal,
      'shipping', _order.shipping,
      'total', _order.total
    );
  END;

  INSERT INTO public.order_items (
    order_id,
    product_slug,
    product_name,
    unit_price,
    quantity,
    variant_label
  )
  SELECT
    _order.id,
    (item->>'product_slug')::text,
    (item->>'product_name')::text,
    (item->>'unit_price')::numeric,
    (item->>'quantity')::integer,
    COALESCE((item->>'variant_label')::text, '')
  FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb)) AS item;

  UPDATE public.profiles
  SET first_name = _profile_first_name,
      last_name = _profile_last_name,
      phone_number = _profile_phone,
      address_line = _profile_address_line,
      city = _profile_city,
      state = _profile_state,
      postcode = _profile_postcode,
      postal_address = _shipping_address,
      updated_at = now()
  WHERE id = _user_id;

  UPDATE public.payment_attempts
  SET status = 'paid',
      transaction_id = _payment_intent_id,
      order_id = _order.id,
      updated_at = now()
  WHERE id = _attempt_id
    AND user_id = _user_id;

  RETURN jsonb_build_object(
    'id', _order.id,
    'order_number', _order.order_number,
    'subtotal', _order.subtotal,
    'shipping', _order.shipping,
    'total', _order.total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_stripe_order(
  text, uuid, uuid, numeric, numeric, numeric, text, text, text, text, text,
  jsonb, text, text, text, text, text, text, text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.finalize_stripe_order(
  text, uuid, uuid, numeric, numeric, numeric, text, text, text, text, text,
  jsonb, text, text, text, text, text, text, text
) FROM anon;

REVOKE ALL ON FUNCTION public.finalize_stripe_order(
  text, uuid, uuid, numeric, numeric, numeric, text, text, text, text, text,
  jsonb, text, text, text, text, text, text, text
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.finalize_stripe_order(
  text, uuid, uuid, numeric, numeric, numeric, text, text, text, text, text,
  jsonb, text, text, text, text, text, text, text
) TO service_role;