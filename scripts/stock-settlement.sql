-- Paid-order stock settlement v2: deduct stock exactly once when payment is confirmed.
-- Covers paid-at-INSERT (Stripe finalizers), false->true UPDATE (manual mark paid,
-- webhooks) and orders inserted paid BEFORE their items. Triggers are DEFERRED to
-- transaction end so settlement always sees the final item set. Idempotent via a
-- permanent per-order+product+variant sale ledger identity; never auto-restocks.
--
-- v2 fixes from source audit:
--  * Lines resolve to a canonical (product_id, variant_id) key — saved
--    order_items.variant_id first, label fallback — and kit+single lines of the
--    same SKU merge into ONE plan entry with kit-weighted units (no double plan
--    entries, no unique-marker skip under-deducting).
--  * Settled markers are checked BEFORE stock validation, so replaying an
--    already-settled order can never flag it insufficient.
--  * Settlement triggers are CONSTRAINT TRIGGERs DEFERRABLE INITIALLY DEFERRED:
--    they fire at commit with the complete item set, and a separate later
--    items transaction still settles via the order_items trigger.
--  * The item guard blocks INSERT as well as UPDATE/DELETE once an order is
--    stock-settled, and checks both OLD and NEW order ids (no moving items
--    between orders).
--  * Security: all functions REVOKE ALL FROM PUBLIC; the core settles only via
--    the trigger path or the admin-checked retry wrapper — no client-set GUC is
--    ever trusted.
--  * retry_stock_settlement returns a structured status instead of raising, so
--    a failed retry never rolls back the durable exception record.

-- Stable variant snapshot on order items (additive; label remains the fallback).
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id text;

-- Durable exception log for stock problems on already-confirmed payments.
CREATE TABLE IF NOT EXISTS public.stock_settlement_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  reason text NOT NULL,
  detail jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT SELECT ON public.stock_settlement_exceptions TO authenticated;
GRANT ALL ON public.stock_settlement_exceptions TO service_role;
ALTER TABLE public.stock_settlement_exceptions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'public.stock_settlement_exceptions'::regclass) THEN
    CREATE POLICY "Admins can read stock settlement exceptions"
      ON public.stock_settlement_exceptions FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Permanent debit identity: one sale ledger row per order + product + variant (NULL-safe).
CREATE UNIQUE INDEX IF NOT EXISTS inventory_movements_sale_identity
  ON public.inventory_movements (reference, product_id, coalesce(variant_id, ''))
  WHERE kind = 'sale';

-- Core settlement. Never raises for stock problems (external payment truth must
-- commit); records a durable exception + admin notification instead. Not granted
-- to any client role: reachable only from the settlement triggers (function
-- owner) or the admin-checked retry wrapper.
CREATE OR REPLACE FUNCTION public.settle_order_stock(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  g record;
  p record;
  plan jsonb := '[]'::jsonb;
  problems jsonb := '[]'::jsonb;
  entry jsonb;
  vid text;
  idx integer;
  cur integer;
  variants jsonb;
  ins integer;
  settled integer := 0;
  already integer := 0;
  skipped integer := 0;
  total integer;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF NOT o.payment_confirmed OR o.status = 'cancelled' OR o.refunded_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'not_payable');
  END IF;

  -- Planning pass: resolve every line to a canonical product+variant key
  -- (saved variant_id snapshot first, label fallback), merge repeated lines of
  -- the same SKU into one entry with kit-weighted units.
  FOR g IN
    WITH resolved AS (
      SELECT
        pr.id AS product_id,
        pr.slug,
        pr.catalogue_section,
        oi.variant_label,
        oi.quantity,
        -- Saved variant id wins; otherwise resolve the base label (kit suffix
        -- stripped) against the product's variants.
        coalesce(
          nullif(oi.variant_id, ''),
          (SELECT v.e->>'id'
             FROM jsonb_array_elements(coalesce(pr.product_variants, '[]'::jsonb)) v(e)
            WHERE v.e->>'label' = CASE
                    WHEN pr.catalogue_section = 'range' AND oi.variant_label LIKE '% · 10x Kit'
                      THEN left(oi.variant_label, length(oi.variant_label) - length(' · 10x Kit'))
                    ELSE oi.variant_label END
            LIMIT 1)
        ) AS variant_id,
        (pr.catalogue_section = 'range' AND oi.variant_label LIKE '% · 10x Kit') AS kit_flag
      FROM public.order_items oi
      JOIN public.products pr ON pr.slug = oi.product_slug
      WHERE oi.order_id = _order_id
    )
    SELECT product_id, max(slug) AS slug, variant_id,
           min(variant_label) AS variant_label,
           sum(quantity * (CASE WHEN kit_flag THEN 10 ELSE 1 END))::int AS units
    FROM resolved
    GROUP BY product_id, variant_id
    ORDER BY product_id, variant_id
  LOOP
    SELECT * INTO p FROM public.products WHERE id = g.product_id FOR UPDATE;

    -- Range kits are 10 physical vials; Equipment multipack stock is counted in
    -- packs already, so packSize is never multiplied here.
    IF p.unlimited_stock AND p.catalogue_section = 'equipment' THEN
      skipped := skipped + 1;
      CONTINUE;
    END IF;

    -- Settled-marker check FIRST: a replay of an already-settled line is a
    -- no-op regardless of current stock, never an insufficiency.
    IF EXISTS (
      SELECT 1 FROM public.inventory_movements m
      WHERE m.kind = 'sale'
        AND m.reference = 'order:' || o.id::text
        AND m.product_id = g.product_id
        AND coalesce(m.variant_id, '') = coalesce(g.variant_id, '')
    ) THEN
      already := already + 1;
      CONTINUE;
    END IF;

    variants := coalesce(p.product_variants, '[]'::jsonb);
    IF jsonb_array_length(variants) > 0 THEN
      IF g.variant_id IS NULL THEN
        problems := problems || jsonb_build_object('slug', p.slug, 'label', g.variant_label, 'issue', 'missing_variant');
        CONTINUE;
      END IF;
      SELECT count(*), min((t.o - 1)::int), max(greatest(0, coalesce((t.e->>'stock')::numeric, 0))::int)
        INTO ins, idx, cur
        FROM jsonb_array_elements(variants) WITH ORDINALITY AS t(e, o)
        WHERE t.e->>'id' = g.variant_id;
      IF ins = 0 THEN
        problems := problems || jsonb_build_object('slug', p.slug, 'label', g.variant_label, 'issue', 'missing_variant');
        CONTINUE;
      END IF;
      IF ins > 1 THEN
        problems := problems || jsonb_build_object('slug', p.slug, 'label', g.variant_label, 'issue', 'ambiguous_variant');
        CONTINUE;
      END IF;
      vid := g.variant_id;
    ELSE
      vid := NULL;
      idx := NULL;
      cur := greatest(0, p.stock_quantity);
    END IF;

    IF cur < g.units THEN
      problems := problems || jsonb_build_object('slug', p.slug, 'label', g.variant_label, 'issue', 'insufficient_stock', 'have', cur, 'need', g.units);
      CONTINUE;
    END IF;

    plan := plan || jsonb_build_object(
      'product_id', p.id, 'slug', p.slug, 'variant_id', vid, 'variant_label', g.variant_label,
      'idx', idx, 'units', g.units, 'before', cur);
  END LOOP;

  -- Lines whose product row vanished entirely (slug no longer in products).
  IF EXISTS (
    SELECT 1 FROM public.order_items oi
    WHERE oi.order_id = _order_id
      AND NOT EXISTS (SELECT 1 FROM public.products pr WHERE pr.slug = oi.product_slug)
  ) THEN
    problems := problems || jsonb_build_object('issue', 'missing_product',
      'slugs', (SELECT jsonb_agg(DISTINCT oi.product_slug) FROM public.order_items oi
                WHERE oi.order_id = _order_id
                  AND NOT EXISTS (SELECT 1 FROM public.products pr WHERE pr.slug = oi.product_slug)));
  END IF;

  -- All-or-nothing: any problem means no deduction at all, plus a durable exception.
  IF jsonb_array_length(problems) > 0 THEN
    IF NOT EXISTS (SELECT 1 FROM public.stock_settlement_exceptions WHERE order_id = _order_id AND resolved_at IS NULL) THEN
      INSERT INTO public.stock_settlement_exceptions (order_id, reason, detail)
      VALUES (_order_id, ((problems->0)->>'issue'), problems);
      INSERT INTO public.admin_notifications (order_id, title, body, kind, read, email_sent)
      VALUES (_order_id, 'Stock settlement needs attention',
        'Payment is confirmed for order #' || o.order_number || ' but stock could not be deducted (' || ((problems->0)->>'issue') || '). Review Inventory and retry from Admin.',
        'stock_settlement', false, false);
    END IF;
    RETURN jsonb_build_object('status', 'exception', 'problems', problems);
  END IF;

  -- Execution pass: ledger insert is the debit marker; stock only moves when the
  -- insert actually happened, so replays/concurrent calls can never double-deduct.
  FOR entry IN SELECT * FROM jsonb_array_elements(plan)
  LOOP
    INSERT INTO public.inventory_movements
      (product_id, product_slug, variant_id, variant_label, kind, before_qty, delta, after_qty, reason, reference, actor)
    VALUES
      ((entry->>'product_id')::uuid, entry->>'slug', entry->>'variant_id', entry->>'variant_label',
       'sale', (entry->>'before')::int, -(entry->>'units')::int, (entry->>'before')::int - (entry->>'units')::int,
       'Sale — order #' || o.order_number, 'order:' || o.id::text, auth.uid())
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS ins = ROW_COUNT;
    IF ins = 1 THEN
      PERFORM set_config('titan.inventory_adjust', '1', true);
      IF entry->>'variant_id' IS NOT NULL THEN
        SELECT * INTO p FROM public.products WHERE id = (entry->>'product_id')::uuid;
        variants := jsonb_set(p.product_variants, ARRAY[entry->>'idx', 'stock'], to_jsonb((entry->>'before')::int - (entry->>'units')::int));
        SELECT coalesce(sum(greatest(0, coalesce((e->>'stock')::numeric, 0))::int), 0)
          INTO total FROM jsonb_array_elements(variants) e;
        UPDATE public.products SET product_variants = variants, stock_quantity = total WHERE id = p.id;
      ELSE
        UPDATE public.products SET stock_quantity = (entry->>'before')::int - (entry->>'units')::int
        WHERE id = (entry->>'product_id')::uuid;
      END IF;
      PERFORM set_config('titan.inventory_adjust', '', true);
      settled := settled + 1;
    END IF;
  END LOOP;

  IF jsonb_array_length(plan) = 0 AND already = 0 THEN
    RETURN jsonb_build_object('status', 'nothing_to_settle', 'skipped', skipped);
  END IF;
  -- Every line either inserted fresh or already had its permanent marker.
  UPDATE public.stock_settlement_exceptions SET resolved_at = now()
    WHERE order_id = _order_id AND resolved_at IS NULL;
  RETURN jsonb_build_object('status', CASE WHEN settled = 0 THEN 'already_settled' ELSE 'settled' END,
    'settled', settled, 'already', already, 'skipped', skipped);
END;
$$;
REVOKE ALL ON FUNCTION public.settle_order_stock(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_order_stock(uuid) TO service_role;

-- Manual retry from Admin: admin-checked, returns a structured status and never
-- raises for stock problems, so the durable exception record always commits.
CREATE OR REPLACE FUNCTION public.retry_stock_settlement(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN public.settle_order_stock(_order_id);
END;
$$;
REVOKE ALL ON FUNCTION public.retry_stock_settlement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retry_stock_settlement(uuid) TO authenticated, service_role;

-- Trigger entry point. Deferred to transaction end so settlement sees the final
-- item set (order inserted paid before its items settles once, completely).
CREATE OR REPLACE FUNCTION public.trigger_settle_order_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    IF NEW.payment_confirmed AND NEW.status <> 'cancelled' AND NEW.refunded_at IS NULL THEN
      PERFORM public.settle_order_stock(NEW.id);
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public.settle_order_stock(NEW.order_id);
    RETURN NEW;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.trigger_settle_order_stock() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_stock_settlement ON public.orders;
DROP TRIGGER IF EXISTS order_items_stock_settlement ON public.order_items;

CREATE CONSTRAINT TRIGGER orders_stock_settlement
  AFTER INSERT OR UPDATE ON public.orders
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.trigger_settle_order_stock();

CREATE CONSTRAINT TRIGGER order_items_stock_settlement
  AFTER INSERT ON public.order_items
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.trigger_settle_order_stock();

-- Prevent ledger drift: once an order is stock-settled its items can no longer
-- be inserted, changed, deleted, or moved to/from another order.
CREATE OR REPLACE FUNCTION public.order_items_settled_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP IN ('UPDATE', 'DELETE') AND EXISTS (
        SELECT 1 FROM public.inventory_movements m
        WHERE m.kind = 'sale' AND m.reference = 'order:' || OLD.order_id::text))
     OR (TG_OP IN ('INSERT', 'UPDATE') AND EXISTS (
        SELECT 1 FROM public.inventory_movements m
        WHERE m.kind = 'sale' AND m.reference = 'order:' || NEW.order_id::text))
  THEN
    RAISE EXCEPTION 'Items of a stock-settled paid order cannot be changed';
  END IF;
  RETURN coalesce(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.order_items_settled_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS order_items_settled_guard ON public.order_items;
CREATE TRIGGER order_items_settled_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.order_items_settled_guard();

-- Finalizers snapshot the variant id onto each order item.
CREATE OR REPLACE FUNCTION public.finalize_checkout_order(_payment_intent_id text, _attempt_id uuid, _subtotal numeric, _shipping numeric, _total numeric, _contact_name text, _contact_email text, _contact_phone text, _shipping_address text, _notes text, _items jsonb, _profile jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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

CREATE OR REPLACE FUNCTION public.finalize_stripe_order(_payment_intent_id text, _user_id uuid, _attempt_id uuid, _subtotal numeric, _shipping numeric, _total numeric, _contact_name text, _contact_email text, _contact_phone text, _shipping_address text, _notes text, _items jsonb, _profile_first_name text, _profile_last_name text, _profile_phone text, _profile_address_line text, _profile_city text, _profile_state text, _profile_postcode text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _attempt record;
  _order record;
  _constraint_name text;
  _p jsonb;
BEGIN
  IF _payment_intent_id IS NULL OR length(trim(_payment_intent_id)) = 0 THEN
    RAISE EXCEPTION 'A payment transaction id is required.';
  END IF;

  SELECT id, user_id, transaction_id, status, order_id, order_payload
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
      _attempt_id, _payment_intent_id, _attempt.transaction_id;
  END IF;

  _p := coalesce(_attempt.order_payload -> 'pricing', '{}'::jsonb);

  SELECT id, user_id, order_number, subtotal, shipping, total
  INTO _order
  FROM public.orders
  WHERE payment_transaction_id = _payment_intent_id;

  IF FOUND THEN
    IF _order.user_id <> _user_id THEN
      RAISE EXCEPTION 'Payment transaction % belongs to another user order.', _payment_intent_id;
    END IF;
    UPDATE public.payment_attempts
    SET status = 'paid', transaction_id = _payment_intent_id, order_id = _order.id, updated_at = now()
    WHERE id = _attempt_id AND user_id = _user_id;
    RETURN jsonb_build_object('id', _order.id, 'order_number', _order.order_number,
      'subtotal', _order.subtotal, 'shipping', _order.shipping, 'total', _order.total);
  END IF;

  BEGIN
    INSERT INTO public.orders (
      user_id, status, subtotal, shipping, total, payment_method, payment_reference,
      payment_provider, payment_transaction_id, payment_confirmed, payment_confirmed_at,
      contact_name, contact_email, contact_phone, shipping_address, notes,
      discount_code_id, discount_code, discount_code_kind, code_discount_cents, referrer_user_id,
      credit_units, credit_cents, credit_reservation_id, pricing_snapshot
    ) VALUES (
      _user_id, 'processing', _subtotal, _shipping, _total, 'card', _payment_intent_id,
      'stripe', _payment_intent_id, true, now(),
      _contact_name, _contact_email, _contact_phone, _shipping_address, _notes,
      nullif(_p->>'discount_code_id', '')::uuid,
      nullif(_p->>'discount_code', ''),
      nullif(_p->>'discount_code_kind', ''),
      coalesce((_p->>'code_discount_cents')::integer, 0),
      CASE WHEN nullif(_p->>'referrer_user_id', '')::uuid = _user_id THEN NULL ELSE nullif(_p->>'referrer_user_id', '')::uuid END,
      coalesce((_p->>'credit_units')::integer, 0),
      coalesce((_p->>'credit_cents')::integer, 0),
      nullif(_p->>'credit_reservation_id', '')::uuid,
      CASE WHEN _p = '{}'::jsonb THEN NULL ELSE _p END
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
    SET status = 'paid', transaction_id = _payment_intent_id, order_id = _order.id, updated_at = now()
    WHERE id = _attempt_id AND user_id = _user_id;
    RETURN jsonb_build_object('id', _order.id, 'order_number', _order.order_number,
      'subtotal', _order.subtotal, 'shipping', _order.shipping, 'total', _order.total);
  END;

  INSERT INTO public.order_items (order_id, product_slug, product_name, unit_price, quantity, variant_label, variant_id)
  SELECT _order.id, (item->>'product_slug')::text, (item->>'product_name')::text,
    (item->>'unit_price')::numeric, (item->>'quantity')::integer, COALESCE((item->>'variant_label')::text, ''),
    nullif((item->>'variant_id')::text, '')
  FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb)) AS item;

  UPDATE public.profiles
  SET first_name = _profile_first_name, last_name = _profile_last_name, phone_number = _profile_phone,
      address_line = _profile_address_line, city = _profile_city, state = _profile_state,
      postcode = _profile_postcode, postal_address = _shipping_address, updated_at = now()
  WHERE id = _user_id;

  UPDATE public.payment_attempts
  SET status = 'paid', transaction_id = _payment_intent_id, order_id = _order.id, updated_at = now()
  WHERE id = _attempt_id AND user_id = _user_id;

  RETURN jsonb_build_object('id', _order.id, 'order_number', _order.order_number,
    'subtotal', _order.subtotal, 'shipping', _order.shipping, 'total', _order.total);
END;
$function$;
