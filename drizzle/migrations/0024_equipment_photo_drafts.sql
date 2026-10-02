-- Equipment drafts: hidden until Admin supplies pricing, stock and details.
-- Existing schema requires a numeric price: zero means unset in Admin.
-- Never overwrite an existing product or a later Admin edit.
INSERT INTO public.products (slug,name,price,image_url,alt,blurb,description,details,categories,catalogue_section,product_variants,stock_quantity,active,sort_order,starter_kit_enabled)
VALUES
('sharps-container-1-8l','Sharps Container 1.8L',0,'/images/titan-sharps-container-1-8l.webp','Illustration of Sharps Container 1.8L','','',ARRAY[]::text[],ARRAY[]::text[],'equipment','[]'::jsonb,0,false,920,false),
('portable-sharps-container','Portable Sharps Container',0,'/images/titan-portable-sharps-container.webp','Illustration of Portable Sharps Container','','',ARRAY[]::text[],ARRAY[]::text[],'equipment','[]'::jsonb,0,false,921,false),
('syringe-top-up-kit','Syringe Top-Up Kit',0,'/images/titan-syringe-top-up-kit.webp','Illustration of Syringe Top-Up Kit','','',ARRAY[]::text[],ARRAY[]::text[],'equipment','[]'::jsonb,0,false,922,false),
('luer-lock-syringe','Luer Lock Syringe',0,'/images/titan-luer-lock-syringe.webp','Illustration of Luer Lock Syringe','','',ARRAY[]::text[],ARRAY[]::text[],'equipment','[]'::jsonb,0,false,923,false),
('v2-pen-cartridges','V2 Pen Cartridges',0,'/images/titan-v2-pen-cartridges.webp','Illustration of V2 Pen Cartridges','','',ARRAY[]::text[],ARRAY[]::text[],'equipment','[]'::jsonb,0,false,924,false),
('pen-pins','Pen Pins',0,'/images/titan-pen-pins.webp','Illustration of Pen Pins','','',ARRAY[]::text[],ARRAY[]::text[],'equipment','[]'::jsonb,0,false,925,false)
ON CONFLICT (slug) DO NOTHING;
