CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  product_slug text NOT NULL,
  variant_id text,
  variant_label text,
  kind text NOT NULL CHECK (kind IN ('receive','remove','count','editor','system')),
  before_qty integer NOT NULL,
  delta integer NOT NULL,
  after_qty integer NOT NULL CHECK (after_qty >= 0),
  reason text NOT NULL,
  reference text,
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inventory_movements_sku_idx ON public.inventory_movements (product_id, variant_id, created_at DESC);
GRANT SELECT ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read inventory movements" ON public.inventory_movements
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.inventory_movements_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Inventory movements are immutable'; END $$;
CREATE TRIGGER inventory_movements_no_change BEFORE UPDATE OR DELETE ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.inventory_movements_immutable();

CREATE TABLE public.inventory_reorder_settings (
  product_id uuid NOT NULL,
  variant_key text NOT NULL,
  threshold integer NOT NULL CHECK (threshold >= 0 AND threshold <= 100000),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, variant_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_reorder_settings TO authenticated;
GRANT ALL ON public.inventory_reorder_settings TO service_role;
ALTER TABLE public.inventory_reorder_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read reorder" ON public.inventory_reorder_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert reorder" ON public.inventory_reorder_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update reorder" ON public.inventory_reorder_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete reorder" ON public.inventory_reorder_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Atomic, compare-and-set stock adjustment with ledger entry.
CREATE OR REPLACE FUNCTION public.adjust_inventory(
  _product_id uuid, _variant_id text, _kind text, _quantity integer,
  _expected_before integer, _reason text, _reference text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p record; variants jsonb; idx integer := NULL; cur integer; nxt integer; lbl text := NULL; total integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _kind NOT IN ('receive','remove','count') THEN RAISE EXCEPTION 'Invalid adjustment type'; END IF;
  IF _quantity IS NULL OR _quantity < 0 OR _quantity > 100000 THEN RAISE EXCEPTION 'Quantity must be a whole number from 0 to 100000'; END IF;
  IF _kind IN ('receive','remove') AND _quantity = 0 THEN RAISE EXCEPTION 'Quantity must be greater than zero'; END IF;
  IF coalesce(btrim(_reason),'') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
  SELECT * INTO p FROM public.products WHERE id = _product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF p.unlimited_stock AND p.catalogue_section = 'equipment' THEN RAISE EXCEPTION 'Unlimited items are not stock tracked'; END IF;
  variants := coalesce(p.product_variants, '[]'::jsonb);
  IF jsonb_array_length(variants) > 0 THEN
    IF _variant_id IS NULL THEN RAISE EXCEPTION 'Size is required for this product'; END IF;
    SELECT (o - 1)::int, e->>'label', greatest(0, coalesce((e->>'stock')::numeric, 0))::int
      INTO idx, lbl, cur
      FROM jsonb_array_elements(variants) WITH ORDINALITY AS t(e, o) WHERE e->>'id' = _variant_id LIMIT 1;
    IF idx IS NULL THEN RAISE EXCEPTION 'This size no longer exists. Refresh and try again.'; END IF;
  ELSE
    IF _variant_id IS NOT NULL THEN RAISE EXCEPTION 'This size no longer exists. Refresh and try again.'; END IF;
    cur := greatest(0, p.stock_quantity);
  END IF;
  IF _expected_before IS DISTINCT FROM cur THEN
    RAISE EXCEPTION 'STALE: stock changed to % since you opened this item. Refresh and try again.', cur;
  END IF;
  nxt := CASE _kind WHEN 'receive' THEN cur + _quantity WHEN 'remove' THEN cur - _quantity ELSE _quantity END;
  IF nxt < 0 THEN RAISE EXCEPTION 'Stock cannot go below zero'; END IF;
  IF nxt = cur THEN RAISE EXCEPTION 'No change to save'; END IF;
  PERFORM set_config('titan.inventory_adjust', '1', true);
  IF idx IS NOT NULL THEN
    variants := jsonb_set(variants, ARRAY[idx::text, 'stock'], to_jsonb(nxt));
    SELECT coalesce(sum(greatest(0, coalesce((e->>'stock')::numeric,0))::int),0) INTO total FROM jsonb_array_elements(variants) e;
    UPDATE public.products SET product_variants = variants, stock_quantity = total WHERE id = _product_id;
  ELSE
    UPDATE public.products SET stock_quantity = nxt WHERE id = _product_id;
  END IF;
  INSERT INTO public.inventory_movements (product_id, product_slug, variant_id, variant_label, kind, before_qty, delta, after_qty, reason, reference, actor)
  VALUES (_product_id, p.slug, _variant_id, lbl, _kind, cur, nxt - cur, nxt, left(btrim(_reason), 300), nullif(left(btrim(coalesce(_reference,'')), 120), ''), auth.uid());
  PERFORM set_config('titan.inventory_adjust', '', true);
  RETURN jsonb_build_object('before', cur, 'after', nxt, 'delta', nxt - cur);
END $$;
REVOKE ALL ON FUNCTION public.adjust_inventory(uuid, text, text, integer, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_inventory(uuid, text, text, integer, integer, text, text) TO authenticated;

-- Audit stock changes made outside adjust_inventory (product editor, expense restock, other).
CREATE OR REPLACE FUNCTION public.products_audit_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; k text;
BEGIN
  IF current_setting('titan.inventory_adjust', true) = '1' THEN RETURN NEW; END IF;
  k := CASE WHEN auth.uid() IS NULL THEN 'system' ELSE 'editor' END;
  IF jsonb_array_length(coalesce(NEW.product_variants,'[]'::jsonb)) > 0 THEN
    FOR r IN
      SELECT n.e->>'id' AS vid, n.e->>'label' AS lbl,
             greatest(0, coalesce((n.e->>'stock')::numeric,0))::int AS after_q,
             CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE (SELECT greatest(0, coalesce((o.e->>'stock')::numeric,0))::int
               FROM jsonb_array_elements(coalesce(OLD.product_variants,'[]'::jsonb)) o(e) WHERE o.e->>'id' = n.e->>'id' LIMIT 1) END AS before_q
      FROM jsonb_array_elements(NEW.product_variants) n(e)
    LOOP
      IF r.before_q IS DISTINCT FROM r.after_q AND NOT (r.before_q IS NULL AND r.after_q = 0) THEN
        INSERT INTO public.inventory_movements (product_id, product_slug, variant_id, variant_label, kind, before_qty, delta, after_qty, reason, actor)
        VALUES (NEW.id, NEW.slug, r.vid, r.lbl, k, coalesce(r.before_q,0), r.after_q - coalesce(r.before_q,0), r.after_q,
          CASE WHEN r.before_q IS NULL THEN 'Size added with stock' WHEN k = 'editor' THEN 'Changed outside Inventory (product editor or restock expense)' ELSE 'Automated change' END, auth.uid());
      END IF;
    END LOOP;
  ELSIF TG_OP = 'UPDATE' AND jsonb_array_length(coalesce(OLD.product_variants,'[]'::jsonb)) = 0
        AND NEW.stock_quantity IS DISTINCT FROM OLD.stock_quantity THEN
    INSERT INTO public.inventory_movements (product_id, product_slug, kind, before_qty, delta, after_qty, reason, actor)
    VALUES (NEW.id, NEW.slug, k, greatest(0,OLD.stock_quantity), greatest(0,NEW.stock_quantity) - greatest(0,OLD.stock_quantity), greatest(0,NEW.stock_quantity),
      CASE WHEN k = 'editor' THEN 'Changed outside Inventory (product editor or restock expense)' ELSE 'Automated change' END, auth.uid());
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.products_audit_stock() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER products_audit_stock AFTER INSERT OR UPDATE OF product_variants, stock_quantity ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_audit_stock();