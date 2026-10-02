CREATE TABLE public.member_calendar_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name text NOT NULL CHECK (length(btrim(product_name)) BETWEEN 1 AND 120),
  dose_label text NOT NULL DEFAULT '' CHECK (length(dose_label) <= 240),
  start_date date NOT NULL,
  end_date date CHECK (end_date IS NULL OR end_date >= start_date),
  frequency text NOT NULL DEFAULT 'once' CHECK (frequency IN ('once','daily','weekly','fortnightly','monthly')),
  time_of_day time,
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.member_calendar_entries ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_calendar_entries TO authenticated;
GRANT ALL ON public.member_calendar_entries TO service_role;
CREATE POLICY "members read own calendar" ON public.member_calendar_entries FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "members insert own calendar" ON public.member_calendar_entries FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "members update own calendar" ON public.member_calendar_entries FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "members delete own calendar" ON public.member_calendar_entries FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE INDEX member_calendar_user_date_idx ON public.member_calendar_entries (user_id,start_date);
CREATE TRIGGER member_calendar_updated_at BEFORE UPDATE ON public.member_calendar_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.products ADD COLUMN starter_kit_enabled boolean NOT NULL DEFAULT true;

-- Starter kits are normal single-item Equipment products. Admin edits price,
-- contents, image, stock and visibility through the existing product editor.
-- No inventory quantities have been supplied: zero stock until Admin allocates it.
INSERT INTO public.products (slug,name,price,image_url,alt,blurb,description,details,categories,catalogue_section,product_variants,stock_quantity,active,sort_order,starter_kit_enabled)
VALUES
('range-starter-kit','Range Starter Kit',30,'/images/titan-range-starter-kit.webp','Illustration of Titan Range Starter Kit','Optional equipment pack for Range products.','Range Starter Kit. Contents and pricing can be changed in Admin.',ARRAY['1 × 3ml BAC Water','10 × Insulin Syringes','10 × Alcohol Prep Pads','1 × Sharps Container'],ARRAY[]::text[],'equipment','[]'::jsonb,0,true,910,false),
('pen-starter-kit','Pen Starter Kit',30,'/images/titan-pen-starter-kit.webp','Illustration of Titan Pen Starter Kit','Optional equipment pack for disposable pens.','Pen Starter Kit, separate from the Range Starter Kit. Contents and pricing can be changed in Admin.',ARRAY['20 × Pen Pins','20 × Alcohol Prep Pads','1 × Sharps Container'],ARRAY[]::text[],'equipment','[]'::jsonb,0,true,911,false),
('ghk-cu-50mg-disposable-pen','GHK-CU 50mg Pre-filled Pen',105,'/images/titan-disposable-pen.webp','Illustration of a white Titan Labs pen with blue end','GHK-CU 50mg — pre-filled disposable research pen.','Pre-filled disposable pen. Optional Pen Starter Kit is sold separately. Laboratory research use only.',ARRAY['50mg per pen','Pre-filled disposable format','Optional Pen Starter Kit'],ARRAY['Dermal'],'pens','[]'::jsonb,0,true,900,true),
('kpv-10mg-disposable-pen','KPV 10mg Pre-filled Pen',105,'/images/titan-disposable-pen.webp','Illustration of a white Titan Labs pen with blue end','KPV 10mg — pre-filled disposable research pen.','Pre-filled disposable pen. Optional Pen Starter Kit is sold separately. Laboratory research use only.',ARRAY['10mg per pen','Pre-filled disposable format','Optional Pen Starter Kit'],ARRAY[]::text[],'pens','[]'::jsonb,0,true,901,true),
('tesamorelin-5mg-disposable-pen','Tesamorelin 5mg Pre-filled Pen',105,'/images/titan-disposable-pen.webp','Illustration of a white Titan Labs pen with blue end','Tesamorelin 5mg — pre-filled disposable research pen.','Pre-filled disposable pen. Optional Pen Starter Kit is sold separately. Laboratory research use only.',ARRAY['5mg per pen','Pre-filled disposable format','Optional Pen Starter Kit'],ARRAY[]::text[],'pens','[]'::jsonb,0,true,902,true),
('tirzepatide-10mg-disposable-pen','Tirzepatide 10mg Pre-filled Pen',125,'/images/titan-disposable-pen.webp','Illustration of a white Titan Labs pen with blue end','Tirzepatide 10mg — pre-filled disposable research pen.','Pre-filled disposable pen. Optional Pen Starter Kit is sold separately. Laboratory research use only.',ARRAY['10mg per pen','Pre-filled disposable format','Optional Pen Starter Kit'],ARRAY['Metabolic'],'pens','[]'::jsonb,0,true,903,true)
ON CONFLICT (slug) DO NOTHING;
