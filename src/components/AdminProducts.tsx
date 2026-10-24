import { HomeCategoryPhotoButton } from "@/components/HomeCategoryPhotoButton";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES } from "@/lib/categories";
import { useProducts } from "@/lib/useCatalog";
import { sanitizeBundle, parsePackSizeInput, isValidPackSizeInput, type BundleItem } from "@/lib/products";
import {
  CATALOGUE_SECTIONS,
  CATALOGUE_SECTION_LABELS,
  normalizeCatalogueSection,
  type CatalogueSection,
} from "@/lib/catalogue-sections";
import { ProductImageGenerator } from "@/components/ProductImageGenerator";
import {
  formatPrice,
  LOW_STOCK_THRESHOLD,
  stockState,
  isUnlimitedStock,
} from "@/lib/products";
import {
  adminDeleteProduct,
  adminSetProductFlags,
  adminListProducts,
  adminSaveProduct,
  type AdminProduct,
  type AdminProductLink,
} from "@/lib/admin.functions";

export type DraftVariant = {
  salePrice?: string;
  promoLabel?: string;
  hotProduct?: boolean | undefined;
  id: string;
  label: string;
  price: string;
  stock: string;
  cost: string;
  comingSoon: boolean;
  reconVialMg: string;
  reconWaterMl: string;
  reconDoseMg: string;
  reconNotes: string;
  image: string;
  contents: BundleItem[];
  packSize?: string;
};

function BundleEditor({ items, onChange }: { items: BundleItem[]; onChange: (items: BundleItem[]) => void }) {
  const { products } = useProducts();
  // Included Equipment links existing Equipment catalogue products only.
  const choices = products
    .filter((p) => normalizeCatalogueSection(p.catalogueSection) === "equipment")
    .flatMap((p) =>
      (p.variants ?? []).length
        ? (p.variants ?? []).map((v) => ({ slug: p.slug, name: `${p.name} ${v.label}` }))
        : [{ slug: p.slug, name: p.name }],
    );
  const [pick, setPick] = useState("");
  return (
    <div className="mt-2 rounded-md border border-dashed border-input p-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Included equipment (optional) — shown as included with this option at no extra charge; stock is not deducted for listed items
      </p>
      {items.map((it, j) => (
        <div key={j} className="mt-2 flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={99}
            className="h-8 w-16"
            aria-label={`Quantity of ${it.name}`}
            value={it.quantity}
            onChange={(e) =>
              onChange(items.map((x, k) => (k === j ? { ...x, quantity: Math.min(99, Math.max(1, Math.trunc(Number(e.target.value)) || 1)) } : x)))
            }
          />
          <span className="min-w-0 flex-1 truncate text-xs">{it.name}</span>
          <Button variant="ghost" size="icon" aria-label={`Remove ${it.name}`} onClick={() => onChange(items.filter((_, k) => k !== j))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div className="mt-2 flex gap-2">
        <select
          className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs"
          value={pick}
          aria-label="Choose a product to add to this bundle"
          onChange={(e) => setPick(e.target.value)}
        >
          <option value="">Choose item to include…</option>
          {choices.map((c, k) => (
            <option key={k} value={String(k)}>{c.name}</option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          disabled={pick === ""}
          onClick={() => {
            const c = choices[Number(pick)];
            if (c) onChange([...items, { ...c, quantity: 1 }]);
            setPick("");
          }}
        >
          Add item
        </Button>
      </div>
    </div>
  );
}

export type Draft = {
  id?: string;
  slug: string;
  name: string;
  price: string;
  sale_price: string;
  promo_label: string;
  variants: DraftVariant[];
  image_url: string;
  alt: string;
  blurb: string;
  description: string;
  details: string;
  protocol: string;
  recon_vial_mg: string;
  recon_water_ml: string;
  recon_dose_mg: string;
  recon_notes: string;
  categories: string[];
  links: AdminProductLink[];
  active: boolean;
  sort_order: string;
  stock_quantity: string;
  catalogue_section: CatalogueSection;
  starter_kit_enabled: boolean;
  unlimited_stock: boolean;
};

const emptyDraft: Draft = {
  slug: "",
  name: "",
  price: "",
  sale_price: "",
  promo_label: "",
  variants: [],
  image_url: "",
  alt: "",
  blurb: "",
  description: "",
  details: "",
  protocol: "",
  recon_vial_mg: "",
  recon_water_ml: "",
  recon_dose_mg: "",
  recon_notes: "",
  categories: [],
  links: [],
  active: true,
  sort_order: "0",
  stock_quantity: "0",
  catalogue_section: "range",
  starter_kit_enabled: true,
  unlimited_stock: false,
};

function safeVariantId(label: string) {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || crypto.randomUUID();
}

function storagePathFor(file: File, draft: Draft) {
  const ext =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";
  const base =
    (draft.slug || draft.name || "product")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "product";
  return `${base}/${crypto.randomUUID()}.${ext}`;
}

export function toDraft(p: AdminProduct): Draft {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: Number(p.price) > 0 ? String(p.price) : "",
    sale_price: p.sale_price == null ? "" : String(p.sale_price),
    promo_label: p.promo_label ?? "",
    variants: (p.product_variants ?? []).map((v) => ({
      id: v.id,
      label: v.label,
      price: String(v.price),
      salePrice: v.salePrice == null ? "" : String(v.salePrice),
      promoLabel: v.promoLabel ?? "",
      hotProduct: v.hotProduct,
      stock: String(v.stock ?? 0),
      cost: v.cost == null ? "" : String(v.cost),
      comingSoon: Boolean(v.comingSoon),
      reconVialMg: v.reconVialMg == null ? "" : String(v.reconVialMg),
      reconWaterMl: v.reconWaterMl == null ? "" : String(v.reconWaterMl),
      reconDoseMg: v.reconDoseMg == null ? "" : String(v.reconDoseMg),
      reconNotes: v.reconNotes ?? "",
      image: v.image ?? "",
      contents: sanitizeBundle(v.contents),
      packSize: String(v.packSize ?? 1),
    })),
    image_url: p.image_url,
    alt: p.alt,
    blurb: p.blurb,
    description: p.description,
    details: (p.details ?? []).join("\n"),
    protocol: p.protocol ?? "",
    recon_vial_mg: p.recon_vial_mg == null ? "" : String(p.recon_vial_mg),
    recon_water_ml: p.recon_water_ml == null ? "" : String(p.recon_water_ml),
    recon_dose_mg: p.recon_dose_mg == null ? "" : String(p.recon_dose_mg),
    recon_notes: p.recon_notes ?? "",
    categories: p.categories ?? [],
    links: p.product_links ?? [],
    active: p.active,
    sort_order: String(p.sort_order),
    stock_quantity: String(p.stock_quantity ?? 0),
    catalogue_section: normalizeCatalogueSection(p.catalogue_section),
    starter_kit_enabled: p.starter_kit_enabled !== false,
    unlimited_stock: Boolean(p.unlimited_stock) && normalizeCatalogueSection(p.catalogue_section) === "equipment",
  };
}

export function draftToPayload(d: Draft) {
  const num = (v: string) =>
    v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v);
  const variants = d.variants
    .map((v) => ({
      id: v.id || safeVariantId(v.label),
      label: v.label.trim(),
      price: Number(v.price) || 0,
      salePrice: num(v.salePrice ?? ""),
      promoLabel: v.promoLabel ?? "",
      ...(typeof v.hotProduct === "boolean" ? { hotProduct: v.hotProduct } : {}),
      stock: Math.max(0, Math.trunc(Number(v.stock)) || 0),
      cost: num(v.cost),
      comingSoon: v.comingSoon,
      reconVialMg: num(v.reconVialMg),
      reconWaterMl: num(v.reconWaterMl),
      reconDoseMg: num(v.reconDoseMg),
      reconNotes: v.reconNotes,
      image: v.image.trim() || null,
      // Included Equipment is available for every section (display-only, no extra charge).
      contents: sanitizeBundle(v.contents),
      packSize: d.catalogue_section === "equipment" ? parsePackSizeInput(v.packSize ?? "1", v.label) : 1,
    }))
    .filter((v) => {
      if (!v.label && !(v.price > 0)) return false; // untouched blank row
      if (!v.label) throw new Error("Every option needs a name.");
      if (!(v.price > 0)) throw new Error(`Add a price above $0 for ${v.label}.`);
      return true;
    });
  const variantPrices = variants.map((v) => v.price).filter((p) => p > 0);
  return {
    ...(d.id ? { id: d.id } : {}),
    slug: d.slug || d.name,
    name: d.name,
    price:
      variantPrices.length > 0
        ? Math.min(...variantPrices)
        : Number(d.price) || 0,
    sale_price: num(d.sale_price),
    promo_label: d.promo_label,
    product_variants: variants,
    image_url: d.image_url,
    alt: d.alt || d.name,
    blurb: d.blurb,
    description: d.description,
    details: d.details
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    protocol: d.protocol,
    recon_vial_mg: num(d.recon_vial_mg),
    recon_water_ml: num(d.recon_water_ml),
    recon_dose_mg: num(d.recon_dose_mg),
    recon_notes: d.recon_notes,
    categories: d.categories,
    product_links: d.links
      .map((l) => ({ ...l, label: l.label.trim(), url: l.url.trim() }))
      .filter((l) => l.url),
    active: d.active,
    sort_order: Number(d.sort_order) || 0,
    stock_quantity:
      variants.length > 0
        ? variants.reduce((sum, v) => sum + v.stock, 0)
        : Math.max(0, Math.trunc(Number(d.stock_quantity)) || 0),
    catalogue_section: d.catalogue_section,
    starter_kit_enabled: d.starter_kit_enabled,
    unlimited_stock: d.catalogue_section === "equipment" && d.unlimited_stock,
  };
}

export function ProductEditor({
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
  title,
  showPromo = false,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSave: () => void;
  onCancel?: () => void;
  saving: boolean;
  title?: string;
  showPromo?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [linkUploading, setLinkUploading] = useState<number | null>(null);
  const [variantUploading, setVariantUploading] = useState<number | null>(null);
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const toggleCategory = (c: string) =>
    set({
      categories: draft.categories.includes(c)
        ? draft.categories.filter((x) => x !== c)
        : [...draft.categories, c],
    });
  const setLink = (i: number, patch: Partial<AdminProductLink>) =>
    set({
      links: draft.links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    });
  const setVariant = (i: number, patch: Partial<DraftVariant>) =>
    set({
      variants: draft.variants.map((v, idx) =>
        idx === i ? { ...v, ...patch } : v,
      ),
    });

  /** Uploads one file to storage and returns its public URL. Rejects on failure. */
  async function uploadImageFile(file: File): Promise<string> {
    const path = storagePathFor(file, draft);
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, {
        upsert: true,
        contentType: file.type || "application/octet-stream",
      });
    if (error) throw error;
    return `/api/public/product-image?path=${encodeURIComponent(path)}`;
  }

  /** Uploads the main product photo. Resolves only on success; rejects on failure. */
  async function uploadImage(file: File): Promise<void> {
    setUploading(true);
    try {
      const url = await uploadImageFile(file);
      set({ image_url: url });
      toast.success("Product image uploaded");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not upload the image",
      );
      throw error instanceof Error ? error : new Error("Could not upload the image");
    } finally {
      setUploading(false);
    }
  }

  /** Uploads a photo for one option/variant; the draft keeps it until Save. */
  async function uploadVariantImage(i: number, file: File): Promise<void> {
    setVariantUploading(i);
    try {
      const url = await uploadImageFile(file);
      setVariant(i, { image: url });
      toast.success("Option photo uploaded — remember to save the product");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload the image");
    } finally {
      setVariantUploading(null);
    }
  }

  async function uploadLinkFile(i: number, file: File) {
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File is too large (max 20MB)");
      return;
    }
    setLinkUploading(i);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);
      const path = `certificates/${(draft.slug || "product").replace(/[^a-z0-9-]/gi, "")}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (error) throw error;
      const label = draft.links[i]?.label?.trim() ? undefined : file.name.replace(/\.[^.]+$/, "");
      setLink(i, {
        url: `/api/public/product-image?path=${encodeURIComponent(path)}`,
        ...(label ? { label } : {}),
      });
      toast.success("File uploaded — remember to save the product");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload the file");
    } finally {
      setLinkUploading(null);
    }
  }

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-extrabold uppercase text-foreground">
          {title ?? (draft.id ? "Edit product" : "New product")}
        </h3>
        <div className="flex gap-3">
          <Button
            className="font-bold uppercase"
            disabled={saving || uploading || linkUploading !== null || !draft.name.trim() || !draft.image_url.trim()}
            onClick={onSave}
          >
            {uploading ? "Uploading" : "Save product"}
          </Button>
          {onCancel ? (
            <Button
              variant="outline"
              className="font-bold uppercase"
              onClick={onCancel}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Product name</Label>
          <Input
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </div>
        <div>
          <Label>Web address name (slug)</Label>
          <Input
            value={draft.slug}
            placeholder="klow-80mg"
            onChange={(e) => set({ slug: e.target.value })}
          />
        </div>
        <div>
          <Label>Display order (products list A–Z on the site)</Label>
          <Input
            type="number"
            value={draft.sort_order}
            onChange={(e) => set({ sort_order: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="catalogue-section">Catalogue section</Label>
          {draft.catalogue_section !== "equipment" ? <label className="my-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.starter_kit_enabled} onChange={e=>set({starter_kit_enabled:e.target.checked})}/>Offer starter kit with this product</label> : null}
          <p className="mb-3 text-xs text-muted-foreground">Edit “Range Starter Kit” or “Pen Starter Kit” in Equipment to change kit price, contents, photo, stock or visibility. Disabling a kit hides its offer everywhere.</p>
          <select
            id="catalogue-section"
            value={draft.catalogue_section}
            onChange={(e) => {
              const next = normalizeCatalogueSection(e.target.value);
              // Unlimited stock is Equipment-only; changing section always resets it.
              set({ catalogue_section: next, unlimited_stock: false });
            }}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            {CATALOGUE_SECTIONS.map((s) => (
              <option key={s} value={s}>
                {CATALOGUE_SECTION_LABELS[s]}
              </option>
            ))}
          </select>
          {draft.catalogue_section === "equipment" ? (
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.unlimited_stock}
                onChange={(e) => set({ unlimited_stock: e.target.checked })}
                aria-describedby="unlimited-stock-help"
              />
              <span>
                Unlimited stock — don’t track quantity
                <span id="unlimited-stock-help" className="block text-xs text-muted-foreground">
                  Customers can order 1–99 per line even when stock is 0. No stock or low-stock labels are shown, and stock is never adjusted for this item.
                </span>
              </span>
            </label>
          ) : null}
        </div>
      </div>

      {/* Included Equipment summary — quick overview and jump links to each option's editor */}
      {(() => {
        const included = draft.variants
          .map((v) => ({ v, items: sanitizeBundle(v.contents) }))
          .filter((x) => x.items.length > 0);
        return (
          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Included Equipment
            </p>
            {included.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                None yet — open an option below to list equipment included with it at no extra charge.
              </p>
            ) : (
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {included.map(({ v, items }) => (
                  <li key={v.id}>
                    <a href={`#variant-includes-${v.id}`} className="font-semibold text-primary hover:underline">
                      {v.label || "Unnamed option"}
                    </a>
                    {" includes "}
                    {items.map((it) => `${it.quantity} × ${it.productName}`).join(", ")}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })()}

      <div className="space-y-3 rounded-xl border border-primary/20 bg-background/45 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Label>{draft.catalogue_section === "range" ? "Vial sizes, prices and stock" : "Options, pack sizes, prices and stock"}</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              {draft.catalogue_section !== "range"
                ? draft.catalogue_section === "equipment" ? "Each option is one sellable pack: set items per pack (1 for a single item) and the price for the whole pack. Cart quantity, stock and restocks count packs. " : "Pens are sold as single items. Starter kits are separate products. "
                : "Add every vial size you sell, even if there is only one. "}
              Stock is counted per
              size — under {LOW_STOCK_THRESHOLD} shows a low stock warning, 0
              shows out of stock for that size.
            </p>
          </div>
          <Button
            variant="outline"
            className="font-bold uppercase"
            onClick={() =>
              set({
                variants: [
                  ...draft.variants,
                  {
                    id: crypto.randomUUID(),
                    label: "",
                    price: "",
                    stock: "0",
                    cost: "",
                    comingSoon: false,
                    reconVialMg: "",
                    reconWaterMl: "",
                    reconDoseMg: "",
                    reconNotes: "", image: "", contents: [], packSize: "1",
                  },
                ],
              })
            }
          >
            {draft.catalogue_section === "range" ? "Add size" : "Add option"}
          </Button>
        </div>
        {draft.variants.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {draft.catalogue_section === "range"
                ? "No vial sizes yet — add at least one size with its price so this product can be ordered."
                : "No options yet — this item sells as one single item at the price below, or use Add option for packs (e.g. 10 x 5mm 31g Pen Needles) and multiple choices."}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
        {draft.catalogue_section !== "range" && draft.variants.length === 0 ? (
          <>
            <div>
              <Label htmlFor="single-product-price">Price (AUD)</Label>
              <Input id="single-product-price" type="number" min={0} step="0.01"
                value={draft.price} placeholder="Add price when ready"
                onChange={(e) => set({ price: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="single-product-stock">Stock quantity</Label>
              <Input id="single-product-stock" type="number" min={0} step="1"
                disabled={draft.unlimited_stock}
                title={draft.unlimited_stock ? "Unlimited stock — quantity is not tracked" : undefined}
                value={draft.stock_quantity}
                onChange={(e) => set({ stock_quantity: e.target.value })} />
            </div>
          </>
        ) : null}
        {showPromo && draft.variants.length === 0 ? (
          <>
            <div>
              <Label>Sale price (AUD) — leave empty for no sale</Label>
              <Input
                type="number"
                min={0}
                value={draft.sale_price}
                placeholder="e.g. 99"
                onChange={(e) => set({ sale_price: e.target.value })}
              />
            </div>
            <div>
              <Label>Promotion badge (e.g. Hot product, 20% off)</Label>
              <Input
                value={draft.promo_label}
                placeholder="Hot product"
                onChange={(e) => set({ promo_label: e.target.value })}
              />
            </div>
          </>
        ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {draft.variants.map((variant, i) => {
              const state = stockState(Number(variant.stock) || 0);
              return (
                <div
                  key={variant.id}
                  className="space-y-2 rounded-xl border border-primary/20 bg-background/45 p-3"
                >
                  <div className="grid gap-2 md:grid-cols-[1.3fr_1fr_1fr_1fr_0.8fr_auto_auto]">
                    <div>
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        {draft.catalogue_section === "range" ? "Vial size" : "Option name"}
                      </span>
                      <Input
                        value={variant.label}
                        placeholder={draft.catalogue_section === "range" ? "5mg, 10mg, 20mg…" : "5mm 31g Pen Needles"}
                        aria-label="Vial size"
                        onChange={(e) =>
                          setVariant(i, {
                            label: e.target.value,
                            id: variant.id || safeVariantId(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        {draft.catalogue_section === "range" ? "Single price" : "Price per pack"}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        value={variant.price}
                        placeholder="Single price"
                        aria-label="Single vial price"
                        onChange={(e) =>
                          setVariant(i, { price: e.target.value })
                        }
                      />
                    </div>
                    {draft.catalogue_section === "equipment" ? (
                    <div>
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        Items per pack
                      </span>
                      <Input
                        type="number"
                        min={1}
                        max={1000}
                        step={1}
                        value={variant.packSize ?? "1"}
                        aria-label="Items per pack"
                        aria-invalid={!isValidPackSizeInput(variant.packSize ?? "1")}
                        onChange={(e) => setVariant(i, { packSize: e.target.value })}
                      />
                    </div>
                    ) : null}
                    <div>
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        {draft.catalogue_section === "equipment" ? "Cost per pack" : "Cost each"}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        value={variant.cost}
                        placeholder="What you pay"
                        aria-label="Cost price for this size"
                        onChange={(e) =>
                          setVariant(i, { cost: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        {draft.catalogue_section === "equipment" ? "Stock (packs)" : "Stock"}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        value={variant.stock}
                        disabled={draft.unlimited_stock}
                        title={draft.unlimited_stock ? "Unlimited stock — quantity is not tracked" : undefined}
                        placeholder="0"
                        aria-label="Stock on hand for this size"
                        onChange={(e) =>
                          setVariant(i, { stock: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap border border-input px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-foreground">
                        <input
                          type="checkbox"
                          checked={variant.comingSoon}
                          onChange={(e) =>
                            setVariant(i, { comingSoon: e.target.checked })
                          }
                          aria-label="This size is coming soon"
                        />
                        Coming soon
                      </label>
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="destructive"
                        size="icon"
                        aria-label="Remove size"
                        onClick={() =>
                          set({
                            variants: draft.variants.filter(
                              (_, idx) => idx !== i,
                            ),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p
                    className={
                      state === "out"
                        ? "text-xs font-bold uppercase tracking-[0.14em] text-destructive"
                        : state === "low"
                          ? "text-xs font-bold uppercase tracking-[0.14em] text-accent-foreground"
                          : "text-xs uppercase tracking-[0.14em] text-muted-foreground"
                    }
                  >
                    {draft.unlimited_stock
                      ? "Unlimited stock — quantity not tracked"
                      : state === "out"
                      ? "Out of stock — customers cannot order this size"
                      : state === "low"
                        ? `Low stock — only ${Number(variant.stock) || 0} left`
                        : `${Number(variant.stock) || 0}${draft.catalogue_section === "equipment" ? " packs" : ""} in stock`}
                    {draft.catalogue_section === "equipment" && Number(variant.packSize) > 1 ? ` · each pack = ${Number(variant.packSize)} items, sold and stocked as one pack` : ""}
                  </p>
                  <div className="grid gap-3 rounded-lg border border-accent/30 bg-background/40 p-3 sm:grid-cols-3">
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input type="checkbox" checked={Boolean(variant.hotProduct)} aria-label={`Hot product: ${variant.label || "this size"}`}
                        onChange={(e) => set({ variants: draft.variants.map((v, idx) => ({ ...v, hotProduct: idx === i ? e.target.checked : Boolean(v.hotProduct) })) })} />
                      Hot product — this size only
                    </label>
                    <div><Label>Sale price for this size (AUD)</Label><Input type="number" min="0.01" step="0.01" value={variant.salePrice ?? ""} placeholder="No sale" onChange={(e) => setVariant(i, { salePrice: e.target.value })} /></div>
                    <div><Label>Promotion label for this size</Label><Input value={variant.promoLabel ?? ""} placeholder="e.g. Special offer" onChange={(e) => setVariant(i, { promoLabel: e.target.value })} /></div>
                    <p className="text-xs text-muted-foreground sm:col-span-3">Applies only to {variant.label || "this size"}. Regular prices and promotions for other sizes stay separate.</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <Label>Photo for {variant.label || "this option"} (optional)</Label>
                    <p className="mt-1 text-xs text-muted-foreground">Shown when a customer picks this option. Leave empty to use the main product photo.</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {variant.image ? (
                        <img src={variant.image} alt={`Preview for ${variant.label || "this option"}`} className="h-16 w-16 rounded-md border border-border object-cover" />
                      ) : null}
                      <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-3 py-2 text-xs font-bold uppercase text-foreground hover:bg-accent focus-within:ring-2 focus-within:ring-ring">
                        <Upload className="h-4 w-4" />
                        {variantUploading === i ? "Uploading…" : variant.image ? "Replace photo" : "Upload photo"}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={variantUploading !== null}
                          aria-label={`Upload photo for ${variant.label || "this option"}`}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadVariantImage(i, f).catch(() => undefined);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {variant.image ? (
                        <Button type="button" variant="outline" size="sm" aria-label={`Remove photo for ${variant.label || "this option"}`} onClick={() => setVariant(i, { image: "" })}>
                          Remove photo
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div id={`variant-includes-${variant.id}`}>
                    <BundleEditor
                      items={variant.contents}
                      onChange={(contents) => {
                        setDraft({
                          ...draft,
                          // Equipment bundles sell as one tracked pack; Range/Pens inclusions are display-only.
                          unlimited_stock:
                            draft.catalogue_section === "equipment" && contents.length > 0
                              ? true
                              : draft.unlimited_stock,
                          variants: draft.variants.map((v, idx) => (idx === i ? { ...v, contents } : v)),
                        });
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3 sm:col-span-2 rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Product photo (required)</Label>
            {!draft.image_url ? (
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-destructive">
                No photo yet
              </span>
            ) : null}
          </div>
          {draft.image_url ? (
            <img
              src={draft.image_url}
              alt={draft.alt || draft.name || "Product preview"}
              className="h-28 w-28 rounded-lg border border-border object-cover"
            />
          ) : null}
          <div>
            <Label className="text-xs text-muted-foreground">Upload a photo</Label>
            <Input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file).catch(() => undefined);
              }}
            />
          </div>
          <ProductImageGenerator
            productName={draft.name}
            disabled={uploading}
            onUse={async (blob) => {
              const file = new File([blob], "generated.png", { type: "image/png" });
              await uploadImage(file);
            }}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Image description (for accessibility)</Label>
          <Input
            value={draft.alt}
            onChange={(e) => set({ alt: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Full description</Label>
          <Textarea
            rows={6}
            value={draft.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Key points (one per line)</Label>
          <Textarea
            rows={3}
            value={draft.details}
            onChange={(e) => set({ details: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>How to use this product (dosage notes)</Label>
          <Textarea
            rows={5}
            value={draft.protocol}
            placeholder="Storage and suggested research protocol for this product…"
            onChange={(e) => set({ protocol: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label>Categories (tick as many as apply)</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const on = draft.categories.includes(c);
            return (
              <Button
                key={c}
                type="button"
                variant={on ? "default" : "outline"}
                className="font-bold uppercase tracking-wide"
                onClick={() => toggleCategory(c)}
              >
                {c}
              </Button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>
          Links for this product (Certificates of Authenticity, guides…)
        </Label>
        <p className="mt-2 text-sm text-muted-foreground">Choose Certificate of Analysis (COA), then upload or paste the report. Saved COAs on visible products automatically appear on the Product Certificates page. Select a product option or enter its strength; add a batch only if shown on the report.</p>
        <div className="mt-2 space-y-2">
          {draft.links.map((l, i) => (
            <div key={i} className="flex flex-wrap gap-2 rounded-md border border-border p-3">
              <select aria-label={`Document type ${i+1}`} className="h-10 rounded-md border border-input bg-background px-2" value={l.kind ?? "legacy"} onChange={e=>setLink(i,{kind:e.target.value === "legacy" ? undefined : e.target.value as "coa" | "document"})}>
                <option value="legacy">Existing / auto-detect</option><option value="coa">Certificate of Analysis (COA)</option><option value="document">Other document / guide</option>
              </select>
              <Input aria-label={`COA strength ${i+1}`} className="max-w-[160px]" placeholder="Strength, e.g. 20mg" value={l.strength ?? ""} onChange={e=>setLink(i,{strength:e.target.value})}/>
              <Input aria-label={`COA batch ${i+1}`} className="max-w-[180px]" placeholder="Batch (optional)" value={l.batch ?? ""} onChange={e=>setLink(i,{batch:e.target.value})}/>
              <Input
                className="max-w-[220px]"
                value={l.label}
                placeholder="Certificate of Authenticity"
                onChange={(e) => setLink(i, { label: e.target.value })}
              />
              <Input
                className="flex-1"
                value={l.url}
                placeholder="https://… or upload a file"
                onChange={(e) => setLink(i, { url: e.target.value })}
              />
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-3 text-sm font-bold uppercase text-foreground hover:bg-accent focus-within:ring-2 focus-within:ring-ring">
                <Upload className="h-4 w-4" />
                {linkUploading === i ? "Uploading…" : "Upload file"}
                <input
                  type="file"
                  className="sr-only"
                  disabled={linkUploading !== null}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void uploadLinkFile(i, f);
                  }}
                />
              </label>
              <Button
                variant="destructive"
                size="icon"
                aria-label="Remove link"
                onClick={() =>
                  set({ links: draft.links.filter((_, idx) => idx !== i) })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            className="font-bold uppercase"
            onClick={() =>
              set({ links: [...draft.links, { label: "", url: "", kind: "coa" }] })
            }
          >
            Add link
          </Button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => set({ active: e.target.checked })}
        />
        Show this product on the website
      </label>

      <div className="flex gap-3">
        <Button
          className="font-bold uppercase"
          disabled={saving || uploading || linkUploading !== null || !draft.name.trim() || !draft.image_url.trim()}
          onClick={onSave}
        >
          {uploading ? (
            <>
              <Upload className="mr-2 h-4 w-4" /> Uploading
            </>
          ) : (
            "Save product"
          )}
        </Button>
        {onCancel ? (
          <Button
            variant="outline"
            className="font-bold uppercase"
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function AdminProducts() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [category, setCategory] = useState("All");
  const [section, setSection] = useState<"all" | CatalogueSection>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name-asc");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => adminListProducts({}),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    void queryClient.invalidateQueries({ queryKey: ["catalog-products"] });
  };

  const save = useMutation({
    mutationFn: (d: Draft) =>
      adminSaveProduct({ data: draftToPayload(d) as any }),
    onSuccess: () => {
      toast.success("Product saved");
      setDraft(null);
      refresh();
    },
    onError: (e: any) =>
      toast.error(e?.message ?? "Could not save the product"),
  });

  const flags = useMutation({
    mutationFn: (d: { id: string; active?: boolean; coming_soon?: boolean }) =>
      adminSetProductFlags({ data: d }),
    onSuccess: () => {
      toast.success("Product updated");
      refresh();
    },
    onError: () => toast.error("Could not update the product"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteProduct({ data: { id } }),
    onSuccess: () => {
      toast.success("Product removed");
      refresh();
    },
    onError: () => toast.error("Could not remove the product"),
  });

  if (draft) {
    return (
      <ProductEditor
        draft={draft}
        setDraft={setDraft}
        saving={save.isPending}
        onSave={() => save.mutate(draft)}
        onCancel={() => setDraft(null)}
      />
    );
  }

  const missingPhotos = (data ?? []).filter((p) => !p.image_url?.trim()).length;
  const term = search.trim().toLowerCase();
  const visibleProducts = (data ?? [])
    .filter((product) => {
      if (section !== "all" && normalizeCatalogueSection(product.catalogue_section) !== section)
        return false;
      const inCategory =
        category === "All" || (product.categories ?? []).includes(category);
      if (!inCategory) return false;
      if (!term) return true;
      return [product.name, product.description, ...(product.categories ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(term);
    })
    .sort((a, b) => {
      const basePrice = (product: AdminProduct) => {
        const variantPrices = (product.product_variants ?? [])
          .map((variant) => Number(variant.price))
          .filter((price) => price > 0);
        if (variantPrices.length > 0) return Math.min(...variantPrices);
        return product.sale_price != null && Number(product.sale_price) > 0
          ? Number(product.sale_price)
          : Number(product.price);
      };
      if (sort === "price-asc") return basePrice(a) - basePrice(b);
      if (sort === "price-desc") return basePrice(b) - basePrice(a);
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          className="font-bold uppercase"
          onClick={() => setDraft({ ...emptyDraft })}
        >
          Add product
        </Button>
      </div>

      {missingPhotos > 0 ? (
        <p className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm font-bold text-destructive">
          {missingPhotos} product{missingPhotos === 1 ? " is" : "s are"} missing a photo — edit to upload or generate one.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by catalogue section">
        {(["all", ...CATALOGUE_SECTIONS] as const).map((item) => (
          <Button
            key={item}
            type="button"
            variant={section === item ? "default" : "outline"}
            className="px-5 text-xs font-bold uppercase tracking-[0.15em]"
            onClick={() => setSection(item)}
          >
            {item === "all" ? "All sections" : CATALOGUE_SECTION_LABELS[item]}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {["All", ...CATEGORIES].map((item) => (
          <Button
            key={item}
            type="button"
            variant={category === item ? "default" : "outline"}
            className="rounded-full px-5 text-xs font-bold uppercase tracking-[0.15em]"
            onClick={() => setCategory(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products…"
          aria-label="Search products"
          className="sm:flex-1"
        />
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          aria-label="Sort products"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground sm:w-56"
        >
          <option value="name-asc">Name: A to Z</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading products…</p>
      ) : visibleProducts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No products match your search — try another word or category.
        </p>
      ) : (
        visibleProducts.map((p) => (
          <article
            key={p.id}
            className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-5"
          >
            <div className="flex gap-4">
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt={p.alt}
                  className="h-16 w-16 rounded object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded border border-destructive bg-destructive/10 text-center text-[10px] font-bold uppercase text-destructive">
                  No photo
                </span>
              )}
              <div className="text-sm text-muted-foreground">
                <p className="text-base font-extrabold uppercase text-foreground">
                  {p.name}
                </p>
                <p>
                  {p.sale_price != null ? (
                    <>
                      <span className="line-through">
                        {formatPrice(Number(p.price))}
                      </span>{" "}
                      <span className="font-bold text-accent">
                        {formatPrice(Number(p.sale_price))}
                      </span>
                    </>
                  ) : (
                    Number(p.price) > 0 ? formatPrice(Number(p.price)) : "Price not set"
                  )}{" "}
                  · {CATALOGUE_SECTION_LABELS[normalizeCatalogueSection(p.catalogue_section)]}
                  {" "}· {p.active ? "Visible" : "Hidden"}
                  {p.coming_soon ? " · Coming soon" : ""}
                  {p.promo_label ? ` · ${p.promo_label}` : ""}
                </p>
                <p className="max-w-md">
                  {(p.product_variants ?? []).length > 0
                    ? `${p.product_variants.length} vial size${p.product_variants.length === 1 ? "" : "s"}`
                    : "No vial sizes set"}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(p.product_variants ?? []).length > 0 ? (
                    (p.product_variants ?? []).map((v) => {
                      const qty = Math.max(
                        0,
                        Math.trunc(Number(v.stock ?? 0)) || 0,
                      );
                      const state = isUnlimitedStock(p) ? "ok" : stockState(qty);
                      return (
                        <span
                          key={v.id || v.label}
                          className={
                            state === "out"
                              ? "inline-flex border border-destructive bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-destructive"
                              : state === "low"
                                ? "inline-flex border border-accent bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-foreground"
                                : "inline-flex border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
                          }
                        >
                          {v.label || "Size"}:{" "}
                          {isUnlimitedStock(p) ? "Unlimited" : state === "out" ? "Out of stock" : `${qty} in stock`}
                          {v.price ? ` · ${formatPrice(Number(v.price))}` : ""}
                        </span>
                      );
                    })
                  ) : (
                    <span className="inline-flex border border-destructive bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-destructive">
                      Add a vial size
                    </span>
                  )}
                </div>
                {(p.categories ?? []).length > 0 ? (
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-accent">
                    {(p.categories ?? []).join(" · ")}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <HomeCategoryPhotoButton product={p} />
              <Button
                variant="outline"
                className="font-bold uppercase"
                onClick={() => setDraft(toDraft(p))}
              >
                Edit
              </Button>
              <Button
                variant={p.active ? "outline" : "default"}
                className="font-bold uppercase"
                disabled={flags.isPending}
                onClick={() => flags.mutate({ id: p.id, active: !p.active })}
              >
                {p.active ? "Hide" : "Show"}
              </Button>
              <Button
                variant={p.coming_soon ? "default" : "outline"}
                className="font-bold uppercase"
                disabled={flags.isPending}
                onClick={() =>
                  flags.mutate({ id: p.id, coming_soon: !p.coming_soon })
                }
              >
                {p.coming_soon ? "Coming soon ✓" : "Coming soon"}
              </Button>
              <Button
                variant="destructive"
                className="font-bold uppercase"
                disabled={remove.isPending}
                onClick={() => {
                  if (confirm(`Remove ${p.name} from the website?`))
                    remove.mutate(p.id);
                }}
              >
                Remove
              </Button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}

