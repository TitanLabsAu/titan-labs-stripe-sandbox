import { useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/lib/useCatalog";
import { normalizeCatalogueSection } from "@/lib/catalogue-sections";
import { formatPrice } from "@/lib/products";
import { MAX_OPTIONAL_EQUIPMENT, defaultOptionalEquipmentList, type OptionalEquipmentEntry } from "@/lib/optional-equipment";
import type { Draft } from "@/components/AdminProducts";

/** Starting list that reproduces the built-in default exactly. */
export function defaultEquipmentList(draft: Pick<Draft, "catalogue_section" | "starter_kit_enabled"> & {slug?:string}): OptionalEquipmentEntry[] {
  return defaultOptionalEquipmentList(draft.catalogue_section, draft.starter_kit_enabled, draft.slug);
}

function toggle(list: string[] | null, all: string[], id: string): string[] | null {
  const current = list ?? all;
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  return next.length === all.length ? null : next;
}

export function OptionalEquipmentEditor({ draft, set }: { draft: Draft; set: (patch: Partial<Draft>) => void }) {
  const { products } = useProducts();
  const [pick, setPick] = useState("");
  const equipment = products.filter((p) => normalizeCatalogueSection(p.catalogueSection) === "equipment");
  const list = draft.optional_equipment;
  const parentOptions = draft.variants.filter((v) => v.id && v.label.trim());
  const update = (next: OptionalEquipmentEntry[]) => set({ optional_equipment: next });

  if (list === null) {
    return (
      <div className="my-3 rounded-md border border-dashed border-input p-3 text-xs">
        <p className="font-bold uppercase tracking-[0.14em] text-muted-foreground">Optional equipment add-ons</p>
        <p className="mt-1 text-muted-foreground">Using the standard equipment offer. Customise to choose and order several Equipment products.</p>
        <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => update(defaultEquipmentList(draft))}>
          Customise add-ons
        </Button>
      </div>
    );
  }

  return (
    <div className="my-3 rounded-md border border-dashed border-input p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold uppercase tracking-[0.14em] text-muted-foreground">Optional equipment add-ons</p>
        <Button type="button" size="sm" variant="ghost" onClick={() => set({ optional_equipment: null })}>
          Use standard offer
        </Button>
      </div>
      <p className="mt-1 text-muted-foreground">Each add-on is a separate cart line at its saved Equipment price and stock. An empty list offers no add-ons.</p>
      {list.map((entry, i) => {
        const kit = equipment.find((p) => p.slug === entry.slug);
        const kitVariants = kit?.variants ?? [];
        return (
          <div key={entry.slug} className="mt-2 rounded-md border border-input p-2">
            <div className="flex items-center gap-1">
              <span className="min-w-0 flex-1 truncate font-semibold">
                {kit ? `${kit.name} · ${formatPrice(kit.price)}` : `${entry.slug} (not available)`}
              </span>
              <Button type="button" variant="ghost" size="icon" aria-label={`Move ${kit?.name ?? entry.slug} up`} disabled={i === 0}
                onClick={() => { const n = [...list]; [n[i - 1], n[i]] = [n[i]!, n[i - 1]!]; update(n); }}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label={`Move ${kit?.name ?? entry.slug} down`} disabled={i === list.length - 1}
                onClick={() => { const n = [...list]; [n[i + 1], n[i]] = [n[i]!, n[i + 1]!]; update(n); }}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${kit?.name ?? entry.slug}`}
                onClick={() => update(list.filter((_, k) => k !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {kitVariants.length > 1 ? (
              <fieldset className="mt-1">
                <legend className="text-muted-foreground">Equipment options offered</legend>
                <div className="flex flex-wrap gap-x-3">
                  {kitVariants.map((v) => (
                    <label key={v.id} className="flex items-center gap-1">
                      <input type="checkbox" checked={(entry.variantIds ?? kitVariants.map((x) => x.id)).includes(v.id)}
                        onChange={() => {
                          const next = toggle(entry.variantIds, kitVariants.map((x) => x.id), v.id);
                          if (next && next.length === 0) return;
                          update(list.map((e, k) => (k === i ? { ...e, variantIds: next } : e)));
                        }} />
                      {v.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
            {draft.catalogue_section === "range" ? (
              <label className="mt-1 flex items-center gap-1">
                <input type="checkbox" checked={entry.whenPen === true}
                  onChange={(e) => update(list.map((x, k) => (k === i ? (e.target.checked ? { ...x, whenPen: true } : { slug: x.slug, variantIds: x.variantIds, parentVariantIds: x.parentVariantIds }) : x)))} />
                Only while a V2 pen case is selected
              </label>
            ) : null}
            {parentOptions.length > 1 ? (
              <fieldset className="mt-1">
                <legend className="text-muted-foreground">Show with this product's options</legend>
                <div className="flex flex-wrap gap-x-3">
                  {parentOptions.map((v) => (
                    <label key={v.id} className="flex items-center gap-1">
                      <input type="checkbox" checked={(entry.parentVariantIds ?? parentOptions.map((x) => x.id)).includes(v.id)}
                        onChange={() => {
                          const next = toggle(entry.parentVariantIds, parentOptions.map((x) => x.id), v.id);
                          if (next && next.length === 0) return;
                          update(list.map((e, k) => (k === i ? { ...e, parentVariantIds: next } : e)));
                        }} />
                      {v.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
          </div>
        );
      })}
      <div className="mt-2 flex gap-2">
        <select className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs" value={pick}
          aria-label="Choose an Equipment product to offer" onChange={(e) => setPick(e.target.value)}>
          <option value="">Choose Equipment product…</option>
          {equipment.filter((p) => !list.some((e) => e.slug === p.slug)).map((p) => (
            <option key={p.slug} value={p.slug}>{p.name}</option>
          ))}
        </select>
        <Button type="button" size="sm" variant="outline" disabled={!pick || list.length >= MAX_OPTIONAL_EQUIPMENT}
          onClick={() => { update([...list, { slug: pick, variantIds: null, parentVariantIds: null }]); setPick(""); }}>
          Add
        </Button>
      </div>
    </div>
  );
}

