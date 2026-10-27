import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminBulkOptionalEquipment } from "@/lib/admin.functions";
import { normalizeCatalogueSection } from "@/lib/catalogue-sections";
import type { BulkPlanRow } from "@/lib/optional-equipment";

type Row = BulkPlanRow & { updatedAt: string; result?: "applied" | "conflict" };
type Item = { slug: string; name: string; catalogue_section: unknown; product_variants?: unknown };

const ACTION_LABEL: Record<Row["action"], string> = {
  add: "Will add",
  "already-offered": "Already offered — unchanged",
  limit: "Add-on limit reached — unchanged",
  "not-eligible": "Not a Range/Pen product — unchanged",
};

/**
 * Admin bulk tool: pick one Equipment item and a target group, review the
 * exact per-product result, then apply additively. Individual product
 * add-on editing is unchanged afterwards.
 */
export function BulkOptionalEquipment({ products, onDone }: { products: Item[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [variantIds, setVariantIds] = useState<string[] | null>(null);
  const [target, setTarget] = useState<"pens" | "range" | "selected">("pens");
  const [selected, setSelected] = useState<string[]>([]);
  const [plan, setPlan] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);

  const equipment = products.filter((p) => normalizeCatalogueSection(p.catalogue_section) === "equipment");
  const parents = products.filter((p) => ["range", "pens"].includes(normalizeCatalogueSection(p.catalogue_section)));
  const kit = equipment.find((p) => p.slug === slug);
  const kitVariants = (Array.isArray(kit?.product_variants) ? kit!.product_variants : []) as { id: string; label: string }[];
  const reset = () => setPlan(null);

  const run = async (apply: boolean) => {
    if (!slug) { toast.error("Choose an equipment item"); return; }
    setBusy(true);
    try {
      const expected = Object.fromEntries((plan ?? []).filter((r) => r.action === "add").map((r) => [r.id, r.updatedAt]));
      const res = await adminBulkOptionalEquipment({ data: { equipmentSlug: slug, variantIds, target, slugs: selected, apply, expected } });
      setPlan(res.rows);
      if (apply) {
        const applied = res.rows.filter((r) => r.result === "applied").length;
        const conflicts = res.rows.filter((r) => r.result === "conflict").length;
        toast.success(`Added to ${applied} product${applied === 1 ? "" : "s"}${conflicts ? ` · ${conflicts} changed since review, left untouched` : ""}`);
        onDone();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not prepare the bulk update");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return <Button type="button" variant="outline" onClick={() => setOpen(true)}>Bulk add optional equipment</Button>;
  }
  const adds = plan?.filter((r) => r.action === "add" && !r.result).length ?? 0;

  return (
    <section aria-labelledby="bulk-oe" className="space-y-3 rounded-lg border border-input p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 id="bulk-oe" className="font-bold uppercase tracking-[0.12em]">Bulk add optional equipment</h3>
        <Button type="button" size="sm" variant="ghost" onClick={() => { setOpen(false); reset(); }}>Close</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Adds one Equipment item to each product’s add-on list. Existing add-ons, their order and per-product settings are kept; products already offering it are skipped. You can still edit each product afterwards.
      </p>
      <label className="block text-xs font-semibold">1. Equipment item
        <select aria-label="Equipment item" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2"
          value={slug} onChange={(e) => { setSlug(e.target.value); setVariantIds(null); reset(); }}>
          <option value="">Choose…</option>
          {equipment.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
        </select>
      </label>
      {kitVariants.length > 1 ? (
        <fieldset className="text-xs">
          <legend className="font-semibold">Options offered</legend>
          <div className="flex flex-wrap gap-x-3">
            {kitVariants.map((v) => {
              const cur = variantIds ?? kitVariants.map((x) => x.id);
              const on = cur.includes(v.id);
              return (
                <label key={v.id} className="flex items-center gap-1">
                  <input type="checkbox" checked={on} onChange={() => {
                    const next = on ? cur.filter((x) => x !== v.id) : [...cur, v.id];
                    if (!next.length) return;
                    setVariantIds(next.length === kitVariants.length ? null : next); reset();
                  }} />{v.label}
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}
      <fieldset className="text-xs">
        <legend className="font-semibold">2. Products</legend>
        <div className="flex flex-wrap gap-x-4">
          {([["pens", "All disposable pens"], ["range", "All Range products"], ["selected", "Selected products"]] as const).map(([v, l]) => (
            <label key={v} className="flex items-center gap-1">
              <input type="radio" name="bulk-target" checked={target === v} onChange={() => { setTarget(v); reset(); }} />{l}
            </label>
          ))}
        </div>
        {target === "selected" ? (
          <div className="mt-2 grid max-h-48 gap-1 overflow-auto rounded-md border border-input p-2 sm:grid-cols-2">
            {parents.map((p) => (
              <label key={p.slug} className="flex items-center gap-1">
                <input type="checkbox" checked={selected.includes(p.slug)}
                  onChange={(e) => { setSelected(e.target.checked ? [...selected, p.slug] : selected.filter((x) => x !== p.slug)); reset(); }} />
                {p.name}
              </label>
            ))}
          </div>
        ) : null}
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={busy || !slug} onClick={() => run(false)}>3. Review changes</Button>
        <Button type="button" size="sm" disabled={busy || !plan || adds === 0} onClick={() => run(true)}>
          {busy ? "Working…" : `Apply to ${adds} product${adds === 1 ? "" : "s"}`}
        </Button>
      </div>
      {plan ? (
        <ul aria-label="Review of bulk changes" className="divide-y divide-border rounded-md border border-input text-xs">
          {plan.length === 0 ? <li className="p-2 text-muted-foreground">No matching products.</li> : null}
          {plan.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2 p-2">
              <span className="font-semibold">{r.name}</span>
              <span className="text-muted-foreground">
                {r.result === "applied" ? "Added" : r.result === "conflict" ? "Changed since review — untouched" : ACTION_LABEL[r.action]}
                {" · "}{r.after.length} add-on{r.after.length === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
