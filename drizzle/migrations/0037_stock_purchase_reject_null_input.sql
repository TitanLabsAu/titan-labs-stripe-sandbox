CREATE OR REPLACE FUNCTION public.record_stock_purchase(
  _request_id uuid, _occurred_on date, _supplier text, _description text,
  _other_costs_cents integer, _discount_cents integer, _apply_stock boolean, _items jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  it jsonb; n integer; i integer := 0; lines_total bigint := 0; total bigint; eid uuid; existing uuid;
  pid uuid; vid text; qty integer; cents integer; p record; variants jsonb; idx integer; lbl text;
  cur integer; nxt integer; vtotal integer; untracked boolean; applied boolean; any_applied boolean := false;
  seen text[] := '{}'; k text; moved integer := 0; h text; existing_hash text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _request_id IS NULL THEN RAISE EXCEPTION 'Missing request id'; END IF;
  h := md5(jsonb_build_array(_occurred_on, coalesce(btrim(_supplier),''), coalesce(btrim(_description),''), _other_costs_cents, _discount_cents, coalesce(_apply_stock,false), _items)::text);
  SELECT id, request_hash INTO existing, existing_hash FROM public.expenses WHERE request_id = _request_id;
  IF existing IS NOT NULL THEN
    IF existing_hash IS DISTINCT FROM h THEN RAISE EXCEPTION 'This save was already used for a different purchase. Nothing was changed; check Spending and try again.'; END IF;
    RETURN jsonb_build_object('expense_id', existing, 'duplicate', true);
  END IF;
  IF _occurred_on IS NULL THEN RAISE EXCEPTION 'Purchase date is required'; END IF;
  IF _other_costs_cents IS NULL OR _other_costs_cents < 0 OR _other_costs_cents > 100000000 THEN RAISE EXCEPTION 'Other costs must be zero or more'; END IF;
  IF _discount_cents IS NULL OR _discount_cents < 0 OR _discount_cents > 100000000 THEN RAISE EXCEPTION 'Discount must be zero or more'; END IF;
  IF _items IS NULL OR jsonb_typeof(_items) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Items must be a list'; END IF;
  IF _occurred_on IS NULL OR _apply_stock IS NULL OR _supplier IS NULL OR _description IS NULL THEN RAISE EXCEPTION 'Missing purchase details'; END IF;
  n := jsonb_array_length(_items);
  IF n IS NULL OR n < 1 OR n > 100 THEN RAISE EXCEPTION 'Add between 1 and 100 items'; END IF;

  -- Validate every line before writing anything.
  FOR it IN SELECT e FROM jsonb_array_elements(_items) e LOOP
    i := i + 1;
    IF jsonb_typeof(it) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Item %: invalid line', i; END IF;
    IF coalesce(it->>'product_id','') !~ '^[0-9a-fA-F-]{36}$' THEN RAISE EXCEPTION 'Item %: choose a product', i; END IF;
    IF coalesce(it->>'quantity','') !~ '^[0-9]{1,6}$' OR (it->>'quantity')::int < 1 OR (it->>'quantity')::int > 100000 THEN
      RAISE EXCEPTION 'Item %: quantity must be a whole number from 1 to 100000', i; END IF;
    IF coalesce(it->>'line_cost_cents','') !~ '^[0-9]{1,9}$' THEN RAISE EXCEPTION 'Item %: line cost must be zero or more in cents', i; END IF;
    k := (it->>'product_id') || '::' || coalesce(it->>'variant_id','base');
    IF k = ANY(seen) THEN RAISE EXCEPTION 'Item %: the same product and size appears twice. Combine them into one line.', i; END IF;
    seen := seen || k;
    lines_total := lines_total + (it->>'line_cost_cents')::bigint;
  END LOOP;
  total := lines_total + _other_costs_cents - _discount_cents;
  IF total < 0 THEN RAISE EXCEPTION 'Discount cannot be more than the purchase total'; END IF;
  IF total > 100000000 THEN RAISE EXCEPTION 'Purchase total is too large'; END IF;

  -- Lock all products in deterministic id order.
  PERFORM 1 FROM public.products WHERE id IN (SELECT (e->>'product_id')::uuid FROM jsonb_array_elements(_items) e) ORDER BY id FOR UPDATE;

  BEGIN
    INSERT INTO public.expenses (occurred_on, category, supplier, description, amount, restocked, created_by, request_id, request_hash, other_costs_cents, discount_cents)
    VALUES (_occurred_on, 'stock', left(coalesce(btrim(_supplier),''),200), left(coalesce(btrim(_description),''),500), total::numeric / 100, false, auth.uid(), _request_id, h, _other_costs_cents, _discount_cents)
    RETURNING id INTO eid;
  EXCEPTION WHEN unique_violation THEN
    SELECT id, request_hash INTO existing, existing_hash FROM public.expenses WHERE request_id = _request_id;
    IF existing_hash IS DISTINCT FROM h THEN RAISE EXCEPTION 'This save was already used for a different purchase. Nothing was changed; check Spending and try again.'; END IF;
    RETURN jsonb_build_object('expense_id', existing, 'duplicate', true);
  END;

  PERFORM set_config('titan.inventory_adjust', '1', true);
  i := 0;
  FOR it IN SELECT e FROM jsonb_array_elements(_items) e LOOP
    i := i + 1;
    pid := (it->>'product_id')::uuid; vid := nullif(it->>'variant_id',''); qty := (it->>'quantity')::int; cents := (it->>'line_cost_cents')::int;
    SELECT * INTO p FROM public.products WHERE id = pid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item %: product no longer exists (nothing saved)', i; END IF;
    variants := coalesce(p.product_variants, '[]'::jsonb); idx := NULL; lbl := NULL;
    IF jsonb_array_length(variants) > 0 THEN
      IF vid IS NULL THEN RAISE EXCEPTION 'Item %: choose a size for % (nothing saved)', i, p.name; END IF;
      SELECT (o - 1)::int, e->>'label', greatest(0, coalesce((e->>'stock')::numeric, 0))::int INTO idx, lbl, cur
        FROM jsonb_array_elements(variants) WITH ORDINALITY t(e, o) WHERE e->>'id' = vid LIMIT 1;
      IF idx IS NULL THEN RAISE EXCEPTION 'Item %: that size of % no longer exists (nothing saved)', i, p.name; END IF;
    ELSE
      IF vid IS NOT NULL THEN RAISE EXCEPTION 'Item %: that size of % no longer exists (nothing saved)', i, p.name; END IF;
      cur := greatest(0, p.stock_quantity);
    END IF;
    untracked := p.unlimited_stock AND p.catalogue_section = 'equipment';
    applied := _apply_stock AND NOT untracked;
    IF applied THEN
      nxt := cur + qty;
      IF idx IS NOT NULL THEN
        variants := jsonb_set(variants, ARRAY[idx::text, 'stock'], to_jsonb(nxt));
        SELECT coalesce(sum(greatest(0, coalesce((e->>'stock')::numeric,0))::int),0) INTO vtotal FROM jsonb_array_elements(variants) e;
        UPDATE public.products SET product_variants = variants, stock_quantity = vtotal WHERE id = pid;
      ELSE
        UPDATE public.products SET stock_quantity = nxt WHERE id = pid;
      END IF;
      INSERT INTO public.inventory_movements (product_id, product_slug, variant_id, variant_label, kind, before_qty, delta, after_qty, reason, reference, actor)
      VALUES (pid, p.slug, vid, lbl, 'receive', cur, qty, nxt, 'Stock purchase', 'expense:' || eid::text, auth.uid());
      any_applied := true; moved := moved + 1;
    END IF;
    INSERT INTO public.expense_items (expense_id, line_no, product_id, product_slug, product_name, variant_id, variant_label, quantity, line_cost_cents, untracked, stock_applied)
    VALUES (eid, i, pid, p.slug, p.name, vid, lbl, qty, cents, untracked, applied);
  END LOOP;
  PERFORM set_config('titan.inventory_adjust', '', true);
  IF any_applied THEN UPDATE public.expenses SET restocked = true WHERE id = eid; END IF;
  RETURN jsonb_build_object('expense_id', eid, 'duplicate', false, 'total_cents', total, 'stock_lines', moved);
END $$;
REVOKE ALL ON FUNCTION public.record_stock_purchase(uuid, date, text, text, integer, integer, boolean, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_stock_purchase(uuid, date, text, text, integer, integer, boolean, jsonb) TO authenticated;