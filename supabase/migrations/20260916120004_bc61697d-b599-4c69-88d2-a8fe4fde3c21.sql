ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS protocol text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS product_links jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.admin_notifications
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS payload jsonb,
  ADD COLUMN IF NOT EXISTS email_sent boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.handle_order_milestone()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cnt integer;
  ini text;
  new_code text;
  pct numeric;
  p record;
  full_name text;
  addr text;
BEGIN
  SELECT count(*) INTO cnt FROM public.orders
    WHERE user_id = NEW.user_id AND status <> 'cancelled';

  SELECT * INTO p FROM public.profiles WHERE id = NEW.user_id;
  ini := upper(coalesce(left(p.first_name, 1), '') || coalesce(left(p.last_name, 1), ''));
  IF ini = '' THEN
    ini := upper(left(coalesce(p.email, 'XX'), 2));
  END IF;
  full_name := nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '');
  addr := nullif(trim(concat_ws(', ', p.address_line, p.city, p.state, p.postcode)), '');

  IF cnt IN (5, 10, 15, 20) THEN
    new_code := 'TITAN' || ini || cnt::text;
    pct := cnt;

    INSERT INTO public.discount_codes (code, discount_type, value, max_uses, user_id, milestone, note)
    VALUES (new_code, 'percent', pct, 1, NEW.user_id, cnt, 'Automatic milestone reward')
    ON CONFLICT (code) DO NOTHING;

    INSERT INTO public.admin_notifications (order_id, title, body, kind, email_sent)
    VALUES (
      NEW.id,
      'Milestone reached: ' || cnt || ' orders',
      coalesce(full_name, coalesce(p.email, 'A customer')) || ' has now placed ' || cnt ||
      ' orders. One-off personal discount code ' || new_code || ' (' || pct || '% off) has been generated for them.',
      'milestone',
      true
    );

  ELSIF cnt IN (50, 75, 100) THEN
    INSERT INTO public.admin_notifications (order_id, title, body, kind, email_sent, payload)
    VALUES (
      NEW.id,
      'Major milestone: ' || cnt || ' orders',
      coalesce(full_name, 'A customer') || ' has now placed ' || cnt || ' orders.' ||
      E'\nEmail: ' || coalesce(p.email, '-') ||
      E'\nPhone: ' || coalesce(p.phone_number, '-') ||
      E'\nAddress: ' || coalesce(addr, coalesce(p.postal_address, '-')),
      'milestone-major',
      false,
      jsonb_build_object(
        'milestone', cnt,
        'name', coalesce(full_name, ''),
        'email', coalesce(p.email, ''),
        'phone', coalesce(p.phone_number, ''),
        'address', coalesce(addr, coalesce(p.postal_address, '')),
        'order_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;