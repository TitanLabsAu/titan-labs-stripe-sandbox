import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProducts } from "@/lib/useCatalog";
import { normalizeCatalogueSection } from "@/lib/catalogue-sections";
import { formatPrice } from "@/lib/products";
import { caseFromPrice, penCaseSettingsSchema, resolvePenCases, type PenCase, type PenCaseSettings } from "@/lib/pen-cases";

/**
 * Admin editor for the V2 pen case choices on Range products. Each case maps
 * to a real Pens/Equipment catalogue product and its colour variants; price,
 * stock and photos are edited on that product itself.
 */
export function PenCaseEditor({ settings, onSave }: { settings: PenCaseSettings; onSave: (s: PenCaseSettings) => Promise<void> }) {
  const { products } = useProducts();
  const [cases, setCases] = useState<PenCase[]>(settings.cases);
  const [saving, setSaving] = useState(false);
  const savedJson = JSON.stringify(settings.cases);
  useEffect(() => setCases(JSON.parse(savedJson)), [savedJson]);
  const candidates = products.filter((p) => {
    const s = normalizeCatalogueSection(p.catalogueSection);
    return (s === "pens" || s === "equipment") && (p.variants ?? []).length > 0;
  });
  const resolved = resolvePenCases({ cases: cases.map((c) => ({ ...c, active: true })) }, products);
  const patch = (i: number, p: Partial<PenCase>) => setCases(cases.map((c, k) => (k === i ? { ...c, ...p } : c)));
  const move = (i: number, d: -1 | 1) => { const n = [...cases]; [n[i], n[i + d]] = [n[i + d]!, n[i]!]; setCases(n); };

  const save = async () => {
    const parsed = penCaseSettingsSchema.safeParse({ cases });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check the case details"); return; }
    setSaving(true);
    try { await onSave(parsed.data); toast.success("Pen case options saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not save pen case options"); }
    finally { setSaving(false); }
  };

  return (
    <section aria-labelledby="pen-case-editor" className="mt-6 rounded-md border border-input p-3 text-xs">
      <h3 id="pen-case-editor" className="font-bold uppercase tracking-[0.14em] text-muted-foreground">V2 pen case options</h3>
      <p className="mt-1 text-muted-foreground">
        Shown in order on Range products under “Add V2 Reusable Pen”. Each case uses a real catalogue product; edit its price,
        stock and photos on that product. A case without a valid product shows as “Not yet available”.
      </p>
      {cases.map((c, i) => {
        const product = products.find((p) => p.slug === c.productSlug);
        const allColours = product?.variants ?? [];
        const r = resolved[i];
        return (
          <div key={c.id} className="mt-2 space-y-2 rounded-md border border-input p-2">
            <div className="flex items-center gap-1">
              <Input aria-label={`Case name ${i + 1}`} value={c.name} maxLength={60} onChange={(e) => patch(i, { name: e.target.value })} className="h-8 text-xs" />
              <Button type="button" variant="ghost" size="icon" aria-label={`Move ${c.name} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" aria-label={`Move ${c.name} down`} disabled={i === cases.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${c.name}`} disabled={cases.length <= 1} onClick={() => setCases(cases.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select aria-label={`Catalogue product for ${c.name}`} className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2"
                value={c.productSlug ?? ""} onChange={(e) => patch(i, { productSlug: e.target.value || null, variantIds: null })}>
                <option value="">No product yet (not available)</option>
                {candidates.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </select>
              <select aria-label={`Separate pen product for ${c.name}`} className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2"
                value={c.penSlug ?? ""} onChange={(e) => patch(i, { penSlug: e.target.value || null, penVariantIds: null })}>
                <option value="">Case product is the pen (no separate pen)</option>
                {candidates.filter((p) => normalizeCatalogueSection(p.catalogueSection) === "pens" && p.slug !== c.productSlug)
                  .map((p) => <option key={p.slug} value={p.slug}>+ pen: {p.name}</option>)}
              </select>
              <label className="flex items-center gap-1"><input type="checkbox" checked={c.active} onChange={(e) => patch(i, { active: e.target.checked })} />Visible</label>
            </div>
            {allColours.length ? (
              <fieldset>
                <legend className="text-muted-foreground">Colours offered</legend>
                <div className="flex flex-wrap gap-x-3">
                  {allColours.map((v) => {
                    const on = (c.variantIds ?? allColours.map((x) => x.id)).includes(v.id);
                    return (
                      <label key={v.id} className="flex items-center gap-1">
                        <input type="checkbox" checked={on} onChange={() => {
                          const cur = c.variantIds ?? (r?.colours.map((x) => x.id) ?? allColours.map((x) => x.id));
                          const next = on ? cur.filter((x) => x !== v.id) : [...cur, v.id];
                          if (!next.length) return;
                          patch(i, { variantIds: next });
                        }} />
                        {v.label} · {formatPrice(v.price)}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}
            {(() => {
              const pen = products.find((p) => p.slug === c.penSlug);
              const penColours = pen?.variants ?? [];
              if (!c.penSlug || !penColours.length) return null;
              return (
                <fieldset>
                  <legend className="text-muted-foreground">Pen colours offered</legend>
                  <div className="flex flex-wrap gap-x-3">
                    {penColours.map((v) => {
                      const cur = c.penVariantIds ?? penColours.map((x) => x.id);
                      const on = cur.includes(v.id);
                      return (
                        <label key={v.id} className="flex items-center gap-1">
                          <input type="checkbox" checked={on} onChange={() => {
                            const next = on ? cur.filter((x) => x !== v.id) : [...cur, v.id];
                            if (next.length) patch(i, { penVariantIds: next });
                          }} />
                          {v.label} · {formatPrice(v.price)}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })()}
            <p className="text-muted-foreground">
              {c.penSlug ? "Pen + case pair: customers choose pen and case colours separately. " : ""}Customer sees: {r?.status === "available" ? `available — ${(r.pen ? `pen ${r.pen.colours.map((v) => v.label).join("/")}, case ${r.colours.map((v) => v.label).join("/")}` : r.colours.map((v) => v.label).join(", "))}${r.colours.length ? ` from ${formatPrice(caseFromPrice(r) ?? 0)}` : ""}` : r?.status === "sold-out" ? "sold out" : "Not yet available"}
            </p>
          </div>
        );
      })}
      <div className="mt-2 flex gap-2">
        <Button type="button" size="sm" variant="outline" disabled={cases.length >= 6}
          onClick={() => setCases([...cases, { id: `case-${Date.now().toString(36)}`, name: "New case", productSlug: null, variantIds: null, active: false }])}>
          <Plus className="mr-1 h-4 w-4" />Add case
        </Button>
        <Button type="button" size="sm" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save pen cases"}</Button>
      </div>
    </section>
  );
}
