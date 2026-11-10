import { MarkupTextEditor } from "./MarkupTextEditor";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { adminListProducts } from "@/lib/admin.functions";
import { adminGetEquipmentGifts, adminSaveEquipmentGifts } from "@/lib/equipment-gifts.functions";
import { giftOfferSubtext, type EquipmentGiftRule } from "@/lib/equipment-gifts";

export function EquipmentFreeGiftEditor({ id, slug }: { id?: string | undefined; slug: string }) {
  const client = useQueryClient();
  const settings = useQuery({ queryKey: ["admin-equipment-gifts"], queryFn: () => adminGetEquipmentGifts({}), enabled: Boolean(id) });
  const catalogue = useQuery({ queryKey: ["admin-products"], queryFn: () => adminListProducts({}), enabled: Boolean(id) });
  const [rules, setRules] = useState<EquipmentGiftRule[]>([]);
  const [expectedRaw, setExpectedRaw] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (settings.data && !loaded) {
      setRules(settings.data.rules.filter(rule => rule.giftSlug === slug));
      setExpectedRaw(settings.data.raw);
      setLoaded(true);
    }
  }, [settings.data, loaded, slug]);
  const save = useMutation({
    mutationFn: () => adminSaveEquipmentGifts({ data: { productSlug: slug, rules, expectedRaw } }),
    onSuccess: result => {
      setExpectedRaw(result.raw);
      client.setQueryData(["admin-equipment-gifts"], result);
      void client.invalidateQueries({ queryKey: ["site-content"] });
      void client.invalidateQueries({ queryKey: ["cart-member-quote"] });
      void client.invalidateQueries({ queryKey: ["checkout-quote"] });
      toast.success("Free gift offers saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  if (!id) return <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">Save this product first to configure free gift offers.</p>;
  const product = catalogue.data?.find(p => p.slug === slug);
  const options = product?.product_variants?.length ? product.product_variants.map(v => ({ id: v.id, label: v.label })) : [{ id: null, label: "Single item" }];
  const update = (rule: EquipmentGiftRule, patch: Partial<EquipmentGiftRule>) => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, ...patch } : r));
  const error = settings.error || catalogue.error;
  return <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
    <h3 className="font-bold uppercase tracking-wide">Offer this product free</h3>
    <p className="mt-2 text-sm text-muted-foreground">Pair each saved option with any catalogue products, sizes or whole sections. Quantities across your selected qualifying items combine. Gifts never count towards another gift. Each offer applies once per order, while stock lasts, and customers can deselect it. Leave this product inactive to offer it as a gift without listing it for sale.</p>
    <p className="mt-2 text-xs text-muted-foreground">Save product or option changes first. These offers have their own Save button.</p>
    {error ? <div role="alert" className="mt-3 text-sm text-destructive">{error.message}<Button type="button" variant="outline" onClick={async () => { const result = await settings.refetch(); await catalogue.refetch(); if (result.data) { setRules(result.data.rules.filter(r => r.giftSlug === slug)); setExpectedRaw(result.data.raw); setLoaded(true); } }}>Reload offers</Button></div> : null}
    {!loaded || catalogue.isLoading ? <p className="mt-3 text-sm">Loading saved offers…</p> : <>
      <label className="mt-4 block text-sm">Search qualifying products<input className="mt-1 w-full rounded border border-input bg-background p-2" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search catalogue…" /></label>
      {options.map(option => {
        const rule = rules.find(r => r.giftVariantId === option.id);
        return <fieldset key={option.id || "base"} className="mt-4 space-y-3 rounded-lg border border-border p-4">
          <legend className="px-2 font-semibold">{option.label}</legend>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(rule?.enabled)} onChange={e => {
            if (rule) update(rule, { enabled: e.target.checked });
            else setRules(prev => [...prev, { id: `gift:${slug}:${option.id || "base"}`, giftSlug: slug, giftVariantId: option.id, enabled: true, membersOnly: true, minimumQuantity: 1, giftQuantity: 1, sections: [], targets: [], message: `Free ${product?.name || "item"} with a qualifying purchase` }]);
          }} />Offer this option as a free gift</label>
          {rule ? <>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rule.membersOnly} onChange={e => update(rule, { membersOnly: e.target.checked })} />Members only (untick to include guests)</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Qualifying quantity required<input type="number" min={1} max={99} className="mt-1 w-full rounded border border-input bg-background p-2" value={rule.minimumQuantity} onChange={e => update(rule, { minimumQuantity: Number(e.target.value) })} /></label>
              <label className="text-sm">Free quantity per order<input type="number" min={1} max={99} className="mt-1 w-full rounded border border-input bg-background p-2" value={rule.giftQuantity} onChange={e => update(rule, { giftQuantity: Number(e.target.value) })} /></label>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">{(["range", "pens", "equipment"] as const).map(section => <label key={section} className="flex items-center gap-2"><input type="checkbox" checked={rule.sections.includes(section)} onChange={e => update(rule, { sections: e.target.checked ? [...rule.sections, section] : rule.sections.filter(s => s !== section) })} />All {section === "range" ? "Range vials" : section === "pens" ? "Pens" : "Equipment"}</label>)}</div>
            <p className="text-xs text-muted-foreground">Or choose specific products/options below. Any selected section or product qualifies.</p>
            <div className="max-h-60 overflow-y-auto rounded border border-border p-2">
              {(catalogue.data ?? []).filter(p => `${p.name} ${p.slug}`.toLowerCase().includes(search.toLowerCase())).map(p => <div key={p.slug} className="mb-2 text-sm">
                {[{ id: null, label: `${p.name} — all options` }, ...(p.product_variants ?? []).map(v => ({ id: v.id, label: `${p.name} — ${v.label}` }))].map(target => {
                  const checked = rule.targets.some(t => t.slug === p.slug && t.variantId === target.id);
                  return <label key={target.id || "all"} className="flex items-start gap-2 py-1"><input type="checkbox" checked={checked} onChange={e => update(rule, { targets: e.target.checked ? [...rule.targets, { slug: p.slug, variantId: target.id }] : rule.targets.filter(t => !(t.slug === p.slug && t.variantId === target.id)) })} /><span>{target.label}</span></label>;
                })}
              </div>)}
            </div>
            <label className="block text-sm">Offer headline (shown on product cards and product pages)<input maxLength={240} className="mt-1 w-full rounded border border-input bg-background p-2" value={rule.message} onChange={e => update(rule, { message: e.target.value })} /></label>
            <MarkupTextEditor id={`gift-subtext-${rule.id}`} label="Offer subtext" mode="plain" rows={3} max={600} value={giftOfferSubtext(rule)} onChange={subtext => update(rule, { subtext })} placeholder="Add your own smaller text beneath the headline" />
            <p className="text-xs text-muted-foreground">Write your own subtext or leave it blank to hide the smaller line. Headline and subtext are display text; the quantity and membership settings above control eligibility.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setRules(prev => prev.map(r => { if (r.id !== rule.id) return r; const { subtext, ...automatic } = r; return automatic; }))}>Use automatic subtext</Button>
          </> : null}
        </fieldset>;
      })}
      {rules.filter(rule => !options.some(o => o.id === rule.giftVariantId)).map(rule => <label key={rule.id} className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={rule.enabled} onChange={e => update(rule, { enabled: e.target.checked })} />Retired option {rule.giftVariantId || "Single item"}: offer enabled</label>)}
      <div className="mt-4 flex flex-wrap gap-3"><Button type="button" disabled={save.isPending || Boolean(error)} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save free gift offers"}</Button><Button type="button" variant="outline" onClick={async () => { const result = await settings.refetch(); if (result.data) { setRules(result.data.rules.filter(r => r.giftSlug === slug)); setExpectedRaw(result.data.raw); } }}>Reload saved offers</Button></div>
    </>}
  </section>;
}

