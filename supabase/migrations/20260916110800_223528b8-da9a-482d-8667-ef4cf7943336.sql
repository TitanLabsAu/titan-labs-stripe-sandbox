-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  image_url text NOT NULL DEFAULT '',
  alt text NOT NULL DEFAULT '',
  blurb text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  details text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "Admins can view all products" ON public.products FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.products (slug, name, price, image_url, alt, blurb, details, sort_order) VALUES
('klow-80mg','KLOW 80mg',140,'/__l5e/assets-v1/071e0a31-ae2e-4e34-9e76-ea85beedb29c/klow80.jpeg','KLOW 80mg vials by Titan Labs','A premium blended 80mg vial, batch tested for purity and shipped discreetly across Australia.',ARRAY['80mg per vial','Lab tested for purity','Express, insured shipping'],1),
('wolverine-20mg','Wolverine 20mg',120,'/__l5e/assets-v1/864d9e9b-6cc7-4c97-889e-90e0af5ffeda/wolverine.jpeg','Wolverine 20mg vials by Titan Labs','Our recovery favourite. 20mg per vial, pure form, research use only.',ARRAY['20mg per vial','Lab tested for purity','Express, insured shipping'],2),
('nad-1000mg','NAD+ 1000mg',120,'/__l5e/assets-v1/29f33921-36b9-4ee2-bac6-ba42cb1430b6/nad1000.jpeg','NAD+ 1000mg vials by Titan Labs','High strength 1000mg NAD+ for wellness research protocols.',ARRAY['1000mg per vial','Lab tested for purity','Express, insured shipping'],3);

-- LINKS
CREATE TABLE public.site_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_links TO authenticated;
GRANT ALL ON public.site_links TO service_role;
ALTER TABLE public.site_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view links" ON public.site_links FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert links" ON public.site_links FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update links" ON public.site_links FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete links" ON public.site_links FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_site_links_updated_at BEFORE UPDATE ON public.site_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SITE CONTENT
CREATE TABLE public.site_content (
  key text PRIMARY KEY,
  body text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view site content" ON public.site_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert site content" ON public.site_content FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update site content" ON public.site_content FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_site_content_updated_at BEFORE UPDATE ON public.site_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.site_content (key, body) VALUES
('reconstitution_advice',''),
('dosage_protocols','');

-- DISCOUNT CODES
CREATE TYPE public.discount_type AS ENUM ('percent','fixed');
CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type public.discount_type NOT NULL DEFAULT 'percent',
  value numeric NOT NULL CHECK (value > 0),
  max_uses integer NOT NULL DEFAULT 1,
  times_used integer NOT NULL DEFAULT 0,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  milestone integer,
  note text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_codes TO service_role;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own codes" ON public.discount_codes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all codes" ON public.discount_codes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert codes" ON public.discount_codes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update codes" ON public.discount_codes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete codes" ON public.discount_codes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_discount_codes_updated_at BEFORE UPDATE ON public.discount_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MILESTONE REWARDS
CREATE OR REPLACE FUNCTION public.handle_order_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt integer;
  ini text;
  new_code text;
  pct numeric;
  p record;
  full_name text;
BEGIN
  SELECT count(*) INTO cnt FROM public.orders
    WHERE user_id = NEW.user_id AND status <> 'cancelled';
  IF cnt = 0 OR cnt % 5 <> 0 THEN
    RETURN NEW;
  END IF;

  SELECT * INTO p FROM public.profiles WHERE id = NEW.user_id;
  ini := upper(coalesce(left(p.first_name, 1), '') || coalesce(left(p.last_name, 1), ''));
  IF ini = '' THEN
    ini := upper(left(coalesce(p.email, 'XX'), 2));
  END IF;
  new_code := 'TITAN' || ini || cnt::text;
  pct := least(cnt, 50);
  full_name := nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '');

  INSERT INTO public.discount_codes (code, discount_type, value, max_uses, user_id, milestone, note)
  VALUES (new_code, 'percent', pct, 1, NEW.user_id, cnt, 'Automatic milestone reward')
  ON CONFLICT (code) DO NOTHING;

  INSERT INTO public.admin_notifications (order_id, title, body)
  VALUES (
    NEW.id,
    'Milestone reached: ' || cnt || ' orders',
    coalesce(full_name, coalesce(p.email, 'A customer')) || ' has now placed ' || cnt ||
    ' orders. One-off discount code ' || new_code || ' (' || pct || '% off) has been generated for them.'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_milestone_reward
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_order_milestone();