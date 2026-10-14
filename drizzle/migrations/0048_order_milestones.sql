CREATE TABLE public.order_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_count integer NOT NULL UNIQUE CHECK (order_count BETWEEN 1 AND 10000),
  reward_type text NOT NULL DEFAULT 'code' CHECK (reward_type IN ('code','alert')),
  discount_percent numeric NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  active boolean NOT NULL DEFAULT true,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_milestones TO authenticated;
GRANT ALL ON public.order_milestones TO service_role;
ALTER TABLE public.order_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage order milestones" ON public.order_milestones FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER order_milestones_updated_at BEFORE UPDATE ON public.order_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.order_milestones (order_count, reward_type, discount_percent) VALUES
  (5,'code',5),(10,'code',10),(15,'code',15),(20,'code',20),
  (50,'alert',0),(75,'alert',0),(100,'alert',0);

CREATE OR REPLACE FUNCTION public.handle_order_milestone()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  cnt integer; ini text; new_code text; pct numeric; p record; m record; full_name text; addr text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO cnt FROM public.orders WHERE user_id = NEW.user_id AND status <> 'cancelled';
  SELECT * INTO m FROM public.order_milestones WHERE order_count = cnt AND active;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT * INTO p FROM public.profiles WHERE id = NEW.user_id;
  ini := upper(coalesce(left(p.first_name, 1), '') || coalesce(left(p.last_name, 1), ''));
  IF ini = '' THEN ini := upper(left(coalesce(p.email, 'XX'), 2)); END IF;
  ini := regexp_replace(ini, '[^A-Z0-9]', 'X', 'g');
  full_name := nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '');
  addr := nullif(trim(concat_ws(', ', p.address_line, p.city, p.state, p.postcode)), '');

  IF m.reward_type = 'code' THEN
    IF EXISTS (SELECT 1 FROM public.discount_codes WHERE user_id = NEW.user_id AND milestone = cnt) THEN RETURN NEW; END IF;
    new_code := 'TITAN' || ini || cnt::text;
    pct := m.discount_percent;
    INSERT INTO public.discount_codes (code, discount_type, value, max_uses, user_id, milestone, note, code_kind)
    VALUES (new_code, 'percent', pct, 1, NEW.user_id, cnt, 'Automatic milestone reward', 'member')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.admin_notifications (order_id, title, body, kind, email_sent)
    VALUES (NEW.id, 'Milestone reached: ' || cnt || ' orders',
      coalesce(full_name, coalesce(p.email, 'A customer')) || ' has now placed ' || cnt ||
      ' orders. One-off personal discount code ' || new_code || ' (' || pct || '% off) has been generated for them.',
      'milestone', true);
  ELSE
    INSERT INTO public.admin_notifications (order_id, title, body, kind, email_sent, payload)
    VALUES (NEW.id, 'Major milestone: ' || cnt || ' orders',
      coalesce(full_name, 'A customer') || ' has now placed ' || cnt || ' orders.' ||
      E'\nEmail: ' || coalesce(p.email, '-') || E'\nPhone: ' || coalesce(p.phone_number, '-') ||
      E'\nAddress: ' || coalesce(addr, coalesce(p.postal_address, '-')),
      'milestone-major', false,
      jsonb_build_object('milestone', cnt, 'name', coalesce(full_name, ''), 'email', coalesce(p.email, ''),
        'phone', coalesce(p.phone_number, ''), 'address', coalesce(addr, coalesce(p.postal_address, '')), 'order_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$function$;