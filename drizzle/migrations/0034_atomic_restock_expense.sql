CREATE OR REPLACE FUNCTION public.record_restock_expense(
  _occurred_on date, _category text, _supplier text, _description text, _amount numeric,
  _product_slug text, _variant_label text, _quantity integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; variants jsonb; idx integer := NULL; vid text; cur integer; nxt integer; total integer; matches integer; eid uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _quantity IS NULL OR _quantity <= 0 OR _quantity > 100000 THEN RAISE EXCEPTION 'Quantity must be a whole number above zero'; END IF;
  SELECT * INTO p FROM public.products WHERE slug = _product_slug FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF p.unlimited_stock AND p.catalogue_section = 'equipment' THEN RAISE EXCEPTION 'Unlimited items are not stock tracked'; END IF;
  variants := coalesce(p.product_variants, '[]'::jsonb);
  IF jsonb_array_length(variants) > 0 THEN
    SELECT count(*) INTO matches FROM jsonb_array_elements(variants) e WHERE e->>'label' = coalesce(btrim(_variant_label), '');
    IF matches = 0 THEN RAISE EXCEPTION 'Choose an existing size for this product (no stock or spend saved)'; END IF;
    IF matches > 1 THEN RAISE EXCEPTION 'That size name matches more than one size; use the Inventory tab'; END IF;
    SELECT (o - 1)::int, e->>'id', greatest(0, coalesce((e->>'stock')::numeric, 0))::int INTO idx, vid, cur
      FROM jsonb_array_elements(variants) WITH ORDINALITY t(e, o) WHERE e->>'label' = btrim(_variant_label);
  ELSE
    cur := greatest(0, p.stock_quantity);
  END IF;
  nxt := cur + _quantity;
  INSERT INTO public.expenses (occurred_on, category, supplier, description, amount, product_slug, variant_label, quantity, restocked, created_by)
  VALUES (_occurred_on, coalesce(nullif(_category, ''), 'stock'), coalesce(btrim(_supplier), ''), coalesce(btrim(_description), ''), coalesce(_amount, 0),
    p.slug, nullif(btrim(coalesce(_variant_label, '')), ''), _quantity, true, auth.uid())
  RETURNING id INTO eid;
  PERFORM set_config('titan.inventory_adjust', '1', true);
  IF idx IS NOT NULL THEN
    variants := jsonb_set(variants, ARRAY[idx::text, 'stock'], to_jsonb(nxt));
    SELECT coalesce(sum(greatest(0, coalesce((e->>'stock')::numeric,0))::int),0) INTO total FROM jsonb_array_elements(variants) e;
    UPDATE public.products SET product_variants = variants, stock_quantity = total WHERE id = p.id;
  ELSE
    UPDATE public.products SET stock_quantity = nxt WHERE id = p.id;
  END IF;
  INSERT INTO public.inventory_movements (product_id, product_slug, variant_id, variant_label, kind, before_qty, delta, after_qty, reason, reference, actor)
  VALUES (p.id, p.slug, vid, nullif(btrim(coalesce(_variant_label,'')), ''), 'receive', cur, _quantity, nxt, 'Restock expense', 'expense:' || eid::text, auth.uid());
  PERFORM set_config('titan.inventory_adjust', '', true);
  RETURN jsonb_build_object('expense_id', eid, 'before', cur, 'after', nxt);
END $$;
REVOKE ALL ON FUNCTION public.record_restock_expense(date, text, text, text, numeric, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_restock_expense(date, text, text, text, numeric, text, text, integer) TO authenticated;