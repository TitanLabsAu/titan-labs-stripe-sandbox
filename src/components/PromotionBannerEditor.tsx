import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PromotionRibbon } from "@/components/PromotionRibbon";
import { bannerOptions, bannerSettingsSchema, contrastRatio, resolveBanner, type BannerOption, type BannerSettings } from "@/lib/promotion-banners";

export type BannerSelection = { key: string; name: string; label?: string | undefined; sale?: boolean | undefined; hot?: boolean | undefined };
export function PromotionBannerEditor({ settings, selections, onSave }: {
  settings: BannerSettings; selections: BannerSelection[]; onSave: (s: BannerSettings) => Promise<void>;
}) {
  const [draft, setDraft] = useState(settings);
  const [editing, setEditing] = useState<BannerOption | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const savedJson = JSON.stringify(settings);
  useEffect(() => { setDraft(JSON.parse(savedJson)); }, [savedJson]);
  const options = bannerOptions(draft);
  const check = bannerSettingsSchema.safeParse(draft);
  const dirty = JSON.stringify(settings) !== JSON.stringify(draft);
  const add = () => { setError(""); setEditing({ id: `custom-${crypto.randomUUID()}`, label: "", background: "#006DA8", text: "#FFFFFF" }); };
  const applyOption = () => {
    if (!editing) return;
    const next = { ...draft, options: [...draft.options.filter(o => o.id !== editing.id), editing] };
    const result = bannerSettingsSchema.safeParse(next);
    if (!result.success) { setError(result.error.issues[0]?.message ?? "Check this banner"); return; }
    setDraft(result.data); setEditing(null); setError("");
  };
  return <section aria-label="Promotion banners" className="mt-5 space-y-4 border-t border-border pt-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="font-display text-lg font-bold uppercase">Promotion banners</h4>
      <Button type="button" size="sm" variant="outline" onClick={add} disabled={busy || draft.options.length >= 30}><Plus aria-hidden /> Add new option</Button></div>
    <div className="grid gap-3">
      {selections.map(item => {
        const banner = resolveBanner(draft, item.key, item.label, item.sale, item.hot);
        const savedId = draft.assignments[item.key];
        return <div key={item.key} className="grid min-w-0 gap-2 border-b border-border pb-3 sm:grid-cols-[minmax(0,1fr)_14rem_12rem] sm:items-center">
          <Label htmlFor={`banner-${item.key}`} className="min-w-0 break-words">{item.name}</Label>
          <select id={`banner-${item.key}`} aria-label={`Promotion banner: ${item.name}`} disabled={busy} value={options.some(o => o.id === savedId) ? savedId : ""}
            className="h-10 min-w-0 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
            onChange={e => { if (e.target.value === "+") { add(); return; } const assignments = { ...draft.assignments }; if (e.target.value) assignments[item.key] = e.target.value; else delete assignments[item.key]; setDraft({ ...draft, assignments }); }}>
            <option value="">Automatic{banner ? ` · ${banner.label}` : " · no banner"}</option>
            {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}<option value="+">+ Add new option</option>
          </select>
          <div className="promotion-banner-sample">{banner ? <PromotionRibbon banner={banner} preview /> : null}</div>
        </div>;
      })}
    </div>
    {draft.options.length ? <div className="space-y-2">{draft.options.map(o => <div key={o.id} className="flex flex-wrap items-center gap-2">
      <div className="promotion-banner-sample flex-1"><PromotionRibbon banner={o} preview /></div>
      {o.removed ? <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setDraft({ ...draft, options: draft.options.map(v => v.id === o.id ? { ...v, removed: false } : v) })}><RotateCcw aria-hidden /> Restore {o.label}</Button> : <>
        <Button type="button" size="icon" variant="ghost" aria-label={`Edit ${o.label}`} title={`Edit ${o.label}`} disabled={busy} onClick={() => { setEditing(o); setError(""); }}><Pencil /></Button>
        <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${o.label}`} title={`Remove ${o.label}`} disabled={busy} onClick={() => setDraft({ ...draft, options: draft.options.map(v => v.id === o.id ? { ...v, removed: true } : v) })}><Trash2 /></Button></>}
    </div>)}</div> : null}
    {editing ? <fieldset disabled={busy} className="grid gap-3 border border-border p-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><Label htmlFor="banner-label">Banner label</Label><Input id="banner-label" maxLength={24} value={editing.label} onChange={e => setEditing({ ...editing, label: e.target.value })} /></div>
      <div><Label htmlFor="banner-background">Background colour</Label><Input id="banner-background" type="color" value={editing.background} onChange={e => setEditing({ ...editing, background: e.target.value })} /></div>
      <div><Label htmlFor="banner-text">Text colour</Label><Input id="banner-text" type="color" value={editing.text} onChange={e => setEditing({ ...editing, text: e.target.value })} /></div>
      <div className="promotion-banner-sample"><PromotionRibbon banner={editing} preview /></div>
      <p className="text-xs text-muted-foreground">Contrast {contrastRatio(editing.background, editing.text).toFixed(1)}:1 · minimum 4.5:1</p>
      <div className="flex gap-2 sm:col-span-2"><Button type="button" onClick={applyOption}>Use option</Button><Button type="button" variant="outline" onClick={() => { setEditing(null); setError(""); }}>Cancel</Button></div>
    </fieldset> : null}
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    <div className="flex flex-wrap gap-2"><Button type="button" disabled={!dirty || !check.success || busy || Boolean(editing)} onClick={async () => {
      setBusy(true); setError(""); try { await onSave(bannerSettingsSchema.parse(draft)); } catch (e) { setError(e instanceof Error ? e.message : "Could not save banners"); } finally { setBusy(false); }
    }}>{busy ? "Saving…" : "Save banners"}</Button><Button type="button" variant="outline" disabled={!dirty || busy} onClick={() => { setDraft(settings); setEditing(null); setError(""); }}>Discard changes</Button></div>
  </section>;
}