-- Create an inactive Range product for Admin review, or refresh its price and photo.
insert into public.products
  (slug, name, catalogue_section, price, sale_price, stock_quantity, sub_description, image_url, alt, active)
values
  ('lipo-b', 'Lipo-B', 'range', 120, null, 20, '25/50/50/1mg/ml', '/images/product-theme/lipo-b-dark.webp', 'Titan Labs Lipo-B vial', false)
on conflict (slug) do update
set price = excluded.price,
    sale_price = null,
    image_url = excluded.image_url;
