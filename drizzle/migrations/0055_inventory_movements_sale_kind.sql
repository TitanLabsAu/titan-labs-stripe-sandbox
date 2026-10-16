ALTER TABLE public.inventory_movements DROP CONSTRAINT inventory_movements_kind_check;
ALTER TABLE public.inventory_movements ADD CONSTRAINT inventory_movements_kind_check
  CHECK (kind = ANY (ARRAY['receive'::text, 'remove'::text, 'count'::text, 'editor'::text, 'system'::text, 'sale'::text]));