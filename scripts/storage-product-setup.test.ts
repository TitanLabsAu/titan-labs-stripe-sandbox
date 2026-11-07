import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureStorageProduct, STORAGE_PRODUCT, STORAGE_SETUP_KEY } from "../src/lib/storage-product-setup.ts";

function database(existing?: Record<string, any>) {
  const products = new Map<string, any>(existing ? [[existing.slug, structuredClone(existing)]] : []);
  const markers = new Map<string, any>();
  let failure: "read" | "product" | "marker" | null = null;
  const db = {
    products, markers,
    fail(next: typeof failure) { failure = next; },
    from(table: string) {
      const rows = table === "products" ? products : markers;
      return {
        select() { return { eq(_column: string, key: string) { return { async maybeSingle() { return failure === "read" ? { error: new Error("read failed") } : { data: rows.get(key) ?? null }; } }; } }; },
        async upsert(row: any, options: any) {
          assert.equal(options.ignoreDuplicates, true);
          const error = failure === (table === "products" ? "product" : "marker") ? new Error("write failed") : null;
          if (!error && !rows.has(row[options.onConflict])) rows.set(row[options.onConflict], structuredClone(row));
          return { error };
        },
      };
    },
  };
  return db;
}

test("first Admin visit creates one Equipment product with both approved options", async () => {
  const db = database();
  await Promise.all([ensureStorageProduct(db), ensureStorageProduct(db)]);
  assert.equal(db.products.size, 1);
  const product = db.products.get("peptide-vial-storage");
  assert.equal(product.catalogue_section, "equipment");
  assert.equal(product.active, true);
  assert.equal(product.stock_quantity, 40);
  assert.deepEqual(product.product_variants.map((v: any) => [v.id, v.price, v.stock]), [["2x3ml", 20, 20], ["4x3ml", 35, 20]]);
  assert.equal(db.markers.get(STORAGE_SETUP_KEY).body, "complete");
});

test("a migrated or edited product is never overwritten", async () => {
  const existing = { ...STORAGE_PRODUCT, price: 24, stock_quantity: 9, active: false, product_variants: [{ id: "4x3ml", price: 42, stock: 9 }] };
  const db = database(existing);
  await ensureStorageProduct(db);
  assert.deepEqual(db.products.get(existing.slug), existing);
});

test("later visits do not recreate a deliberately deleted product", async () => {
  const db = database();
  await ensureStorageProduct(db);
  db.products.clear();
  await ensureStorageProduct(db);
  assert.equal(db.products.size, 0);
});

test("failed product creation is surfaced and never marked complete", async () => {
  const db = database(); db.fail("product");
  await assert.rejects(() => ensureStorageProduct(db), /write failed/);
  assert.equal(db.markers.size, 0);
});

test("retry after marker failure preserves any intervening inventory edits", async () => {
  const db = database(); db.fail("marker");
  await assert.rejects(() => ensureStorageProduct(db), /write failed/);
  db.products.get(STORAGE_PRODUCT.slug).stock_quantity = 7;
  db.fail(null); await ensureStorageProduct(db);
  assert.equal(db.products.get(STORAGE_PRODUCT.slug).stock_quantity, 7);
});

test("read failures are surfaced without inserting products", async () => {
  const db = database(); db.fail("read");
  await assert.rejects(() => ensureStorageProduct(db), /read failed/);
  assert.equal(db.products.size, 0);
});
