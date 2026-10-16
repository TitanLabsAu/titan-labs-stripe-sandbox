-- Paid-order stock settlement: deduct stock exactly once when payment is confirmed.
-- Covers paid-at-INSERT (Stripe finalizers), false->true UPDATE (manual mark paid,
-- webhooks) and orders inserted paid BEFORE their items (item-insert settlement).
-- Idempotent via a permanent per-order+SKU sale ledger identity; never auto-restocks.

-- Durable exception log for stock problems on already-confirmed payments.
CREATE TABLE public.stock_settlement_exceptions (
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
CREATE POLICY "Admins can read stock settlement exceptions"
  ON public.stock_settlement_exceptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Permanent debit identity: one sale ledger row per order + product + variant (NULL-safe).
CREATE UNIQUE INDEX inventory_movements_sale_identity
  ON public.inventory_movements (reference, product_id, coalesce(variant_id, ''))
  WHERE kind = 'sale';

-- Core settlement. Never raises for stock problems (external payment truth must
-- commit); records a durable exception + admin notification instead. Direct calls
-- require admin; trigger calls are flagged via the titan.stock_settle GUC.
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
  base_label text;
  is_kit boolean;
  units integer;
  vids text[];
  vid text;
  idx integer;
  cur integer;
  variants jsonb;
  ins integer;
  settled integer := 0;
  skipped integer := 0;
  total integer;
BEGIN
  IF coalesce(current_setting('titan.stock_settle', true), '') <> '1'
     AND (auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF NOT o.payment_confirmed OR o.status = 'cancelled' OR o.refunded_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'not_payable');
  END IF;

  -- Planning pass: group repeated same-SKU lines, resolve variants, check stock.
  FOR g IN
    SELECT oi.product_slug, oi.variant_label, sum(oi.quantity)::int AS qty
    FROM public.order_items oi
    WHERE oi.order_id = _order_id
    GROUP BY oi.product_slug, oi.variant_label
    ORDER BY oi.product_slug, oi.variant_label
  LOOP
    SELECT * INTO p FROM public.products WHERE slug = g.product_slug FOR UPDATE;
    IF NOT FOUND THEN
      problems := problems || jsonb_build_object('slug', g.product_slug, 'label', g.variant_label, 'issue', 'missing_product');
      CONTINUE;
    END IF;
    IF p.unlimited_stock AND p.catalogue_section = 'equipment' THEN
      skipped := skipped + 1;
      CONTINUE;
    END IF;

    base_label := g.variant_label;
    is_kit := false;
    IF p.catalogue_section = 'range' AND g.variant_label LIKE '% · 10x Kit' THEN
      is_kit := true;
      base_label := left(g.variant_label, length(g.variant_label) - length(' · 10x Kit'));
    END IF;
    -- Range kits are 10 physical vials; Equipment multipack stock is counted in
    -- packs already, so packSize is never multiplied here.
    units := g.qty * (CASE WHEN is_kit THEN 10 ELSE 1 END);

    variants := coalesce(p.product_variants, '[]'::jsonb);
    IF jsonb_array_length(variants) > 0 THEN
      SELECT array_agg(e->>'id') INTO vids
        FROM jsonb_array_elements(variants) e
        WHERE e->>'label' = base_label;
      IF vids IS NULL THEN
        problems := problems || jsonb_build_object('slug', g.product_slug, 'label', g.variant_label, 'issue', 'missing_variant');
        CONTINUE;
      END IF;
      IF array_length(vids, 1) > 1 THEN
        problems := problems || jsonb_build_object('slug', g.product_slug, 'label', g.variant_label, 'issue', 'ambiguous_variant');
        CONTINUE;
      END IF;
      vid := vids[1];
      SELECT (t.o - 1)::int, greatest(0, coalesce((t.e->>'stock')::numeric, 0))::int
        INTO idx, cur
        FROM jsonb_array_elements(variants) WITH ORDINALITY AS t(e, o)
        WHERE t.e->>'id' = vid;
    ELSE
      vid := NULL;
      idx := NULL;
      cur := greatest(0, p.stock_quantity);
    END IF;

    IF cur < units THEN
      problems := problems || jsonb_build_object('slug', g.product_slug, 'label', g.variant_label, 'issue', 'insufficient_stock', 'have', cur, 'need', units);
      CONTINUE;
    END IF;

    plan := plan || jsonb_build_object(
      'product_id', p.id, 'slug', p.slug, 'variant_id', vid, 'variant_label', g.variant_label,
      'idx', idx, 'units', units, 'before', cur);
  END LOOP;

  -- All-or-nothing: any problem means no deduction at all, plus a durable exception.
  IF jsonb_array_length(problems) > 0 THEN
    IF NOT EXISTS (SELECT 1 FROM public.stock_settlement_exceptions WHERE order_id = _order_id AND resolved_at IS NULL) THEN
      INSERT INTO public.stock_settlement_exceptions (order_id, reason, detail)
      VALUES (_order_id, problems->0->>'issue', problems);
      INSERT INTO public.admin_notifications (order_id, title, body, kind, read, email_sent)
      VALUES (_order_id, 'Stock settlement needs attention',
        'Payment is confirmed for order #' || o.order_number || ' but stock could not be deducted (' || problems->0->>'issue' || '). Review Inventory and retry from Admin.',
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

  IF settled > 0 OR skipped > 0 THEN
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(plan)) THEN
      RETURN jsonb_build_object('status', 'nothing_to_settle', 'skipped', skipped);
    END IF;
    IF settled = jsonb_array_length(plan) - (SELECT count(*) FROM jsonb_array_elements(plan) e2 WHERE EXISTS (
         SELECT 1 FROM public.inventory_movements m
         WHERE m.kind = 'sale' AND m.reference = 'order:' || o.id::text
           AND m.product_id = (e2.value->>'product_id')::uuid
           AND coalesce(m.variant_id, '') = coalesce(e2.value->>'variant_id', '')
           AND m.created_at < now() - interval '1 minute')) THEN
      NULL; -- mixed fresh/replayed lines still count as settled below
    END IF;
    UPDATE public.stock_settlement_exceptions SET resolved_at = now()
      WHERE order_id = _order_id AND resolved_at IS NULL;
    RETURN jsonb_build_object('status', CASE WHEN settled = 0 THEN 'already_settled' ELSE 'settled' END,
      'settled', settled, 'skipped', skipped);
  END IF;

  IF EXISTS (SELECT 1 FROM public.inventory_movements WHERE kind = 'sale' AND reference = 'order:' || o.id::text) THEN
    UPDATE public.stock_settlement_exceptions SET resolved_at = now()
      WHERE order_id = _order_id AND resolved_at IS NULL;
    RETURN jsonb_build_object('status', 'already_settled');
  END IF;
  RETURN jsonb_build_object('status', 'nothing_to_settle');
END;
$$;
REVOKE ALL ON FUNCTION public.settle_order_stock(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.settle_order_stock(uuid) TO authenticated, service_role;

-- Manual retry from Admin: settles and raises a clear error when stock still fails.
CREATE OR REPLACE FUNCTION public.retry_stock_settlement(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  PERFORM set_config('titan.stock_settle', '1', true);
  result := public.settle_order_stock(_order_id);
  IF result->>'status' = 'exception' THEN
    RAISE EXCEPTION 'Stock could not be deducted: %', result->'problems'->0->>'issue';
  END IF;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.retry_stock_settlement(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.retry_stock_settlement(uuid) TO authenticated, service_role;

-- Trigger entry point for orders (paid transition) and order_items (paid-before-items).
CREATE OR REPLACE FUNCTION public.trigger_settle_order_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('titan.stock_settle', '1', true);
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

CREATE TRIGGER orders_stock_settlement
  AFTER INSERT OR UPDATE OF payment_confirmed, status, refunded_at ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trigger_settle_order_stock();

CREATE TRIGGER order_items_stock_settlement
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.trigger_settle_order_stock();

-- Prevent ledger drift: items of a stock-settled paid order can no longer change.
CREATE OR REPLACE FUNCTION public.order_items_settled_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.inventory_movements m
    WHERE m.kind = 'sale' AND m.reference = 'order:' || coalesce(OLD.order_id, NEW.order_id)::text
  ) THEN
    RAISE EXCEPTION 'Items of a stock-settled paid order cannot be changed';
  END IF;
  RETURN coalesce(NEW, OLD);
END;
$$;

CREATE TRIGGER order_items_settled_guard
  BEFORE UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.order_items_settled_guard();
