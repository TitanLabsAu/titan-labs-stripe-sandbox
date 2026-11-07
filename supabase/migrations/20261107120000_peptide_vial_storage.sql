-- Initial inventory only. Never reset stock or overwrite an existing product on replay.
insert into public.products
 (slug, name, catalogue_section, price, stock_quantity, product_variants,
  image_url, alt, active, starter_kit_enabled, v2_pen_offer_enabled, unlimited_stock, optional_equipment)
values
 ('peptide-vial-storage', 'Peptide Vial Storage', 'equipment', 20, 40,
  '[{"id": "2x3ml", "label": "2 \u00d7 3ml", "price": 20, "stock": 20, "image": "/images/product-theme/storage-2x3ml-dark.webp", "packSize": 1}, {"id": "4x3ml", "label": "4 \u00d7 3ml", "price": 35, "stock": 20, "image": "/images/product-theme/storage-4x3ml-dark.webp", "packSize": 1}]'::jsonb,
  '/images/product-theme/storage-2x3ml-dark.webp',
  'Titan Labs peptide vial storage container', true, false, false, false, '[]'::jsonb)
on conflict (slug) do nothing;
