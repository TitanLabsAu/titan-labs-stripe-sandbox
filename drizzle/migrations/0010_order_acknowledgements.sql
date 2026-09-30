CREATE TABLE public.order_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  accepted boolean NOT NULL DEFAULT true,
  version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX order_acknowledgements_order_id_unique_idx
  ON public.order_acknowledgements (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX order_acknowledgements_user_id_idx ON public.order_acknowledgements (user_id);

GRANT SELECT, INSERT ON public.order_acknowledgements TO authenticated;
GRANT ALL ON public.order_acknowledgements TO service_role;

ALTER TABLE public.order_acknowledgements ENABLE ROW LEVEL SECURITY;

-- Server-controlled values: the caller cannot back-date or impersonate.
CREATE OR REPLACE FUNCTION public.order_acknowledgements_before_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
    NEW.order_id := NULL;
  END IF;
  NEW.accepted_at := now();
  NEW.created_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER order_acknowledgements_before_insert
BEFORE INSERT ON public.order_acknowledgements
FOR EACH ROW EXECUTE FUNCTION public.order_acknowledgements_before_insert();

CREATE POLICY "Users can record their own acknowledgement"
ON public.order_acknowledgements FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND accepted = true AND order_id IS NULL);

CREATE POLICY "Users can view their own acknowledgements"
ON public.order_acknowledgements FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all acknowledgements"
ON public.order_acknowledgements FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Links an unlinked acknowledgement to an order, only when both belong to the caller.
CREATE OR REPLACE FUNCTION public.link_order_acknowledgement(_ack_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _rows integer;
BEGIN
  IF _uid IS NULL THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = _order_id AND o.user_id = _uid) THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM public.order_acknowledgements a WHERE a.order_id = _order_id) THEN
    RETURN true;
  END IF;
  UPDATE public.order_acknowledgements
     SET order_id = _order_id
   WHERE id = _ack_id AND user_id = _uid AND order_id IS NULL;
  GET DIAGNOSTICS _rows = ROW_COUNT;
  RETURN _rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.link_order_acknowledgement(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_order_acknowledgement(uuid, uuid) TO authenticated;