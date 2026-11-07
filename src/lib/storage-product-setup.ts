/** Approved initial product data. Existing rows, stock and owner edits always win. */
export const STORAGE_SETUP_KEY = "setup:peptide-vial-storage:v1";
export const STORAGE_PRODUCT = {
  slug: "peptide-vial-storage",
  name: "Peptide Vial Storage",
  catalogue_section: "equipment",
  price: 20,
  stock_quantity: 40,
  product_variants: [
    { id: "2x3ml", label: "2 × 3ml", price: 20, stock: 20, image: "/images/product-theme/storage-2x3ml-dark.webp", packSize: 1 },
    { id: "4x3ml", label: "4 × 3ml", price: 35, stock: 20, image: "/images/product-theme/storage-4x3ml-dark.webp", packSize: 1 },
  ],
  image_url: "/images/product-theme/storage-2x3ml-dark.webp",
  alt: "Titan Labs peptide vial storage container",
  active: true,
  starter_kit_enabled: false,
  v2_pen_offer_enabled: false,
  unlimited_stock: false,
  optional_equipment: [],
};

/** Only call after assertAdmin, with that authenticated admin's RLS client.
 * The durable marker prevents recreating the product after a deliberate deletion.
 * Ignore-conflict inserts make concurrent visits/retries safe and preserve edits.
 */
export async function ensureStorageProduct(admin: any) {
  const { data: marker, error: markerError } = await admin.from("site_content")
    .select("key").eq("key", STORAGE_SETUP_KEY).maybeSingle();
  if (markerError) throw markerError;
  if (marker) return;

  const { error: createError } = await admin.from("products")
    .upsert(STORAGE_PRODUCT, { onConflict: "slug", ignoreDuplicates: true });
  if (createError) throw createError;

  const { error: completionError } = await admin.from("site_content")
    .upsert({ key: STORAGE_SETUP_KEY, body: "complete" }, { onConflict: "key", ignoreDuplicates: true });
  if (completionError) throw completionError;
}
