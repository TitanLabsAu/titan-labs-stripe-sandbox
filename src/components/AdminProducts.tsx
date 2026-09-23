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
import { formatPrice, kitPriceFor, LOW_STOCK_THRESHOLD, stockState } from "@/lib/products";
import {
  adminDeleteProduct,
  adminListProducts,
  adminSaveProduct,
  type AdminProduct,
  type AdminProductLink,
} from "@/lib/admin.functions";

export type DraftVariant = {
  id: string;
  label: string;
  price: string;
  kitPrice: string;
  stock: string;
  reconVialMg: string;
  reconWaterMl: string;
  reconDoseMg: string;
  reconNotes: string;
};

export type Draft = {
  id?: string;
  slug: string;
  name: string;
  price: string;
  sale_price: string;
  promo_label: string;
  kit_price: string;
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
};

const emptyDraft: Draft = {
  slug: "",
  name: "",
  price: "",
  sale_price: "",
  promo_label: "",
  kit_price: "",
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
};

function safeVariantId(label: string) {
  const base = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return base || crypto.randomUUID();
}

function storagePathFor(file: File, draft: Draft) {
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const base = (draft.slug || draft.name || "product")
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
    price: String(p.price),
    sale_price: p.sale_price == null ? "" : String(p.sale_price),
    promo_label: p.promo_label ?? "",
    kit_price: p.kit_price == null ? "" : String(p.kit_price),
    variants: (p.product_variants ?? []).map((v) => ({
      id: v.id,
      label: v.label,
      price: String(v.price),
      kitPrice: v.kitPrice == null ? "" : String(v.kitPrice),
      stock: String(v.stock ?? 0),
      reconVialMg: v.reconVialMg == null ? "" : String(v.reconVialMg),
      reconWaterMl: v.reconWaterMl == null ? "" : String(v.reconWaterMl),
      reconDoseMg: v.reconDoseMg == null ? "" : String(v.reconDoseMg),
      reconNotes: v.reconNotes ?? "",
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
  };
}

export function draftToPayload(d: Draft) {
  const num = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));
  const variants = d.variants
    .map((v) => ({
      id: v.id || safeVariantId(v.label),
      label: v.label.trim(),
      price: Number(v.price) || 0,
      kitPrice: num(v.kitPrice),
      stock: Math.max(0, Math.trunc(Number(v.stock)) || 0),
      reconVialMg: num(v.reconVialMg),
      reconWaterMl: num(v.reconWaterMl),
      reconDoseMg: num(v.reconDoseMg),
      reconNotes: v.reconNotes,
    }))
    .filter((v) => v.label && v.price > 0);
  const variantPrices = variants.map((v) => v.price).filter((p) => p > 0);
  return {
    ...(d.id ? { id: d.id } : {}),
    slug: d.slug || d.name,
    name: d.name,
    price: variantPrices.length > 0 ? Math.min(...variantPrices) : Number(d.price) || 0,
    sale_price: num(d.sale_price),
    promo_label: d.promo_label,
    kit_price: num(d.kit_price),
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
      .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
      .filter((l) => l.url),
    active: d.active,
    sort_order: Number(d.sort_order) || 0,
    stock_quantity:
      variants.length > 0
        ? variants.reduce((sum, v) => sum + v.stock, 0)
        : Math.max(0, Math.trunc(Number(d.stock_quantity)) || 0),
  };
}

export function ProductEditor({
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
  title,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSave: () => void;
  onCancel?: () => void;
  saving: boolean;
  title?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const toggleCategory = (c: string) =>
    set({
      categories: draft.categories.includes(c)
        ? draft.categories.filter((x) => x !== c)
        : [...draft.categories, c],
    });
  const setLink = (i: number, patch: Partial<AdminProductLink>) =>
    set({ links: draft.links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) });
  const setVariant = (i: number, patch: Partial<DraftVariant>) =>
    set({ variants: draft.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) });

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const path = storagePathFor(file, draft);
      const { error } = await supabase.storage.from("product-images").upload(path, file, {
        upsert: true,
        contentType: file.type || "application/octet-stream",
      });
      if (error) throw error;
      set({ image_url: `/api/public/product-image?path=${encodeURIComponent(path)}` });
      toast.success("Product image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload the image");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card/80 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-extrabold uppercase text-foreground">
          {title ?? (draft.id ? "Edit product" : "New product")}
        </h3>
        <div className="flex gap-3">
          <Button
            className="font-bold uppercase"
            disabled={saving || uploading || !draft.name.trim()}
            onClick={onSave}
          >
            {uploading ? "Uploading" : "Save product"}
          </Button>
          {onCancel ? (
            <Button variant="outline" className="font-bold uppercase" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
      </div>


      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Product name</Label>
          <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} />
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
          <Label>Stock on hand (units)</Label>
          <Input
            type="number"
            min={0}
            value={draft.stock_quantity}
            onChange={(e) => set({ stock_quantity: e.target.value })}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Under {LOW_STOCK_THRESHOLD} shows a low stock warning. 0 shows out of stock and blocks ordering.
          </p>
        </div>
        <div>
          <Label>Product picture</Label>
          <Input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadImage(file);
            }}
          />
        </div>
        {draft.image_url ? (
          <div className="sm:col-span-2">
            <img
              src={draft.image_url}
              alt={draft.alt || draft.name || "Product preview"}
              className="h-28 w-28 rounded-lg border border-border object-cover"
            />
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <Label>Image description (for accessibility)</Label>
          <Input value={draft.alt} onChange={(e) => set({ alt: e.target.value })} />
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

      <div className="space-y-3 rounded-lg border border-border bg-background/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Label>Vial sizes and prices</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Add every vial size you sell. Leave kit price blank to advertise the automatic 20% discount.
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
                    kitPrice: "",
                    reconVialMg: "",
                    reconWaterMl: "",
                    reconDoseMg: "",
                    reconNotes: "",
                  },
                ],
              })
            }
          >
            Add size
          </Button>
        </div>
        {draft.variants.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No extra sizes yet — customers will see the single vial price and 10x kit option.
          </p>
        ) : (
          <div className="space-y-2">
            {draft.variants.map((variant, i) => (
              <div
                key={variant.id}
                className="space-y-3 rounded-lg border border-border bg-card/60 p-3"
              >
                <div className="grid gap-2 md:grid-cols-[1.3fr_1fr_1fr_auto]">
                  <Input
                    value={variant.label}
                    placeholder="5mg, 10mg, 20mg…"
                    aria-label="Vial size"
                    onChange={(e) =>
                      setVariant(i, {
                        label: e.target.value,
                        id: variant.id || safeVariantId(e.target.value),
                      })
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    value={variant.price}
                    placeholder="Single price"
                    aria-label="Single vial price"
                    onChange={(e) => setVariant(i, { price: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    value={variant.kitPrice}
                    placeholder={variant.price ? formatPrice(kitPriceFor(Number(variant.price) || 0)) : "Kit price"}
                    aria-label="10x Kit price"
                    onChange={(e) => setVariant(i, { kitPrice: e.target.value })}
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    aria-label="Remove size"
                    onClick={() => set({ variants: draft.variants.filter((_, idx) => idx !== i) })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
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
        <Label>Links for this product (Certificates of Authenticity, guides…)</Label>
        <div className="mt-2 space-y-2">
          {draft.links.map((l, i) => (
            <div key={i} className="flex flex-wrap gap-2">
              <Input
                className="max-w-[220px]"
                value={l.label}
                placeholder="Certificate of Authenticity"
                onChange={(e) => setLink(i, { label: e.target.value })}
              />
              <Input
                className="flex-1"
                value={l.url}
                placeholder="https://…"
                onChange={(e) => setLink(i, { url: e.target.value })}
              />
              <Button
                variant="destructive"
                size="icon"
                aria-label="Remove link"
                onClick={() => set({ links: draft.links.filter((_, idx) => idx !== i) })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            className="font-bold uppercase"
            onClick={() => set({ links: [...draft.links, { label: "", url: "" }] })}
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
          disabled={saving || uploading || !draft.name.trim()}
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
          <Button variant="outline" className="font-bold uppercase" onClick={onCancel}>
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
    mutationFn: (d: Draft) => adminSaveProduct({ data: draftToPayload(d) as any }),
    onSuccess: () => {
      toast.success("Product saved");
      setDraft(null);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save the product"),
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

  const term = search.trim().toLowerCase();
  const visibleProducts = (data ?? [])
    .filter((product) => {
      const inCategory = category === "All" || (product.categories ?? []).includes(category);
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
        <Button className="font-bold uppercase" onClick={() => setDraft({ ...emptyDraft })}>
          Add product
        </Button>
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
            className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card/80 p-5"
          >
            <div className="flex gap-4">
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt={p.alt}
                  className="h-16 w-16 rounded object-cover"
                  loading="lazy"
                />
              ) : null}
              <div className="text-sm text-muted-foreground">
                <p className="text-base font-extrabold uppercase text-foreground">{p.name}</p>
                <p>
                  {p.sale_price != null ? (
                    <>
                      <span className="line-through">{formatPrice(Number(p.price))}</span>{" "}
                      <span className="font-bold text-accent">
                        {formatPrice(Number(p.sale_price))}
                      </span>
                    </>
                  ) : (
                    formatPrice(Number(p.price))
                  )}{" "}
                  · {p.active ? "Visible" : "Hidden"}
                  {p.promo_label ? ` · ${p.promo_label}` : ""}
                </p>
                <p className="max-w-md">
                  {(p.product_variants ?? []).length > 0
                    ? `${p.product_variants.length} size options`
                    : "Single size product"}
                  {p.kit_price ? ` · 10x Kit ${formatPrice(Number(p.kit_price))}` : " · 10x Kit auto 20% off"}
                </p>
                <p className="mt-1">
                  <span
                    className={
                      stockState(p.stock_quantity) === "out"
                        ? "inline-flex border border-destructive bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-destructive"
                        : stockState(p.stock_quantity) === "low"
                          ? "inline-flex border border-accent bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-foreground"
                          : "inline-flex border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
                    }
                  >
                    {stockState(p.stock_quantity) === "out"
                      ? "Out of stock"
                      : `${p.stock_quantity ?? 0} in stock`}
                  </span>
                </p>
                {(p.categories ?? []).length > 0 ? (
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-accent">
                    {(p.categories ?? []).join(" · ")}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="font-bold uppercase"
                onClick={() => setDraft(toDraft(p))}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                className="font-bold uppercase"
                disabled={remove.isPending}
                onClick={() => {
                  if (confirm(`Remove ${p.name} from the website?`)) remove.mutate(p.id);
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
