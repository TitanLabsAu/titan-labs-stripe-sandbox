import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminSaveStorefrontSection } from "@/lib/admin.functions";
import { useSiteContent } from "@/lib/useCatalog";
import {
  CMS_GROUPS,
  CMS_SECTIONS,
  cmsKey,
  cmsValues,
  isSafeUrl,
  parseOverrides,
  sectionSchema,
  type CmsField,
  type CmsGroup,
  type CmsSection,
  type ListItemField,
} from "@/lib/storefrontContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Ask the Admin page to switch to another management tab. */
export function openAdminTab(tab: string) {
  window.dispatchEvent(new CustomEvent("titan-admin-tab", { detail: tab }));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function AdminStorefrontContent() {
  const [group, setGroup] = useState<CmsGroup>("Homepage");
  const sections = CMS_SECTIONS.filter((s) => s.group === group);
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Edit storefront wording, links and pictures. Prices, stock, discounts, reviews and products are still managed in their own tabs.
      </p>
      <div role="tablist" aria-label="Content groups" className="flex gap-2 overflow-x-auto pb-1">
        {CMS_GROUPS.map((g) => (
          <Button key={g} role="tab" aria-selected={g === group} size="sm" variant={g === group ? "default" : "outline"} className="shrink-0" onClick={() => setGroup(g)}>
            {g}
          </Button>
        ))}
      </div>
      {sections.map((s) => (
        <SectionEditor key={s.id} section={s} />
      ))}
    </div>
  );
}

function SectionEditor({ section }: { section: CmsSection }) {
  const { data: content } = useSiteContent();
  const qc = useQueryClient();
  const saved = useMemo(() => cmsValues(content, section.id), [content, section.id]);
  const usingDefaults = Object.keys(parseOverrides(content?.[cmsKey(section.id)])).length === 0;
  const [draft, setDraft] = useState<Record<string, any>>(saved);
  // `base` = the saved values this draft started from; used for conflict checks.
  const [base, setBase] = useState<Record<string, any>>(saved);
  const savedJson = JSON.stringify(saved);
  const dirty = JSON.stringify(draft) !== JSON.stringify(base);
  const stale = dirty && savedJson !== JSON.stringify(base);
  useEffect(() => {
    // Adopt fresh saved values only when there are no unsaved edits here.
    if (!dirty) {
      setDraft(saved);
      setBase(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedJson]);
  const check = sectionSchema(section).safeParse(draft);
  const errors = new Map<string, string>();
  if (!check.success) for (const i of check.error.issues) errors.set(String(i.path[0]), i.message);

  const baseRef = base;
  const save = useMutation({
    mutationFn: (input: { reset?: boolean }) => {
      const baseValues = input.reset ? {} : (baseRef as Record<string, any>);
      const changes: Record<string, unknown> = {};
      const base: Record<string, unknown> = {};
      for (const k of Object.keys(draft)) {
        if (JSON.stringify(draft[k]) !== JSON.stringify(baseValues[k])) {
          changes[k] = draft[k];
          base[k] = baseValues[k];
        }
      }
      return adminSaveStorefrontSection({ data: { id: section.id, reset: input.reset === true, changes, base } });
    },
    onSuccess: async (_d, input) => {
      const next = input.reset ? (section.defaults as Record<string, any>) : draft;
      setDraft(next);
      setBase(next);
      await qc.invalidateQueries({ queryKey: ["site-content"] });
      toast.success(input.reset ? `${section.title} reset to default` : `${section.title} saved`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6" aria-labelledby={`cms-${section.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`cms-${section.id}`} className="font-display text-lg font-bold uppercase">{section.title}</h3>
          {section.description ? <p className="mt-1 text-sm text-muted-foreground">{section.description}</p> : null}
          <p className="mt-1 text-xs font-bold uppercase text-accent">
            {stale ? "Unsaved changes · newer content was saved elsewhere" : dirty ? "Unsaved changes" : usingDefaults ? "Using default content" : "Custom content saved"}
          </p>
        </div>
        {section.shortcut ? (
          <Button size="sm" variant="outline" onClick={() => openAdminTab(section.shortcut!.tab)}>
            {section.shortcut.label} <ExternalLink aria-hidden />
          </Button>
        ) : null}
      </div>
      <div className="mt-5 grid gap-5">
        {section.fields.map((f) => (
          <FieldEditor key={f.key} field={f} value={draft[f.key]} error={errors.get(f.key)} sectionId={section.id} onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))} />
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button disabled={!dirty || !check.success || save.isPending} onClick={() => save.mutate({})}>
          {save.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null} Save
        </Button>
        <Button variant="outline" disabled={!dirty || save.isPending} onClick={() => { setDraft(saved); setBase(saved); }}>Discard changes</Button>
        <Button
          variant="ghost"
          disabled={usingDefaults || save.isPending}
          onClick={() => window.confirm(`Reset "${section.title}" to its default content?`) && save.mutate({ reset: true })}
        >
          <RotateCcw aria-hidden /> Reset to default
        </Button>
      </div>
      {!check.success ? <p role="alert" className="mt-2 text-sm text-destructive">Fix the highlighted fields before saving.</p> : null}
    </section>
  );
}

function FieldEditor({ field, value, error, sectionId, onChange }: { field: CmsField; value: any; error?: string | undefined; sectionId: string; onChange: (v: any) => void }) {
  const id = `cms-${sectionId}-${field.key}`;
  const help = field.help ? <p className="text-xs text-muted-foreground">{field.help}</p> : null;
  const err = error ? <p className="text-xs text-destructive">{error}</p> : null;
  if (field.type === "toggle")
    return (
      <div className="flex items-center gap-3">
        <Switch id={id} checked={Boolean(value)} onCheckedChange={onChange} />
        <Label htmlFor={id}>{field.label}</Label>
      </div>
    );
  if (field.type === "list") return <ListEditor field={field} value={Array.isArray(value) ? value : []} error={error} onChange={onChange} />;
  if (field.type === "image") return <ImageField id={id} label={field.label} value={value ?? ""} sectionId={sectionId} onChange={onChange} help={help} err={err} />;
  const max = "max" in field ? field.max : 500;
  const len = String(value ?? "").length;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{field.label}</Label>
      {field.type === "textarea" ? (
        <Textarea id={id} rows={4} value={value ?? ""} maxLength={max} aria-invalid={Boolean(error)} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input id={id} value={value ?? ""} maxLength={max} type={field.type === "url" ? "url" : "text"} inputMode={field.type === "url" ? "url" : undefined} aria-invalid={Boolean(error)} onChange={(e) => onChange(e.target.value)} />
      )}
      <div className="flex justify-between gap-2">
        <div>{help}{err}{field.type === "url" && !error && value && !isSafeUrl(value) ? <p className="text-xs text-destructive">Unsafe link</p> : null}</div>
        {field.type !== "url" ? <span className="text-xs text-muted-foreground">{len}/{max}{len === 0 ? " · will show nothing" : ""}</span> : null}
      </div>
    </div>
  );
}

function ImageField({ id, label, value, sectionId, onChange, help, err }: { id: string; label: string; value: string; sectionId: string; onChange: (v: string) => void; help: React.ReactNode; err: React.ReactNode }) {
  const [busy, setBusy] = useState(false);
  async function upload(file: File): Promise<void> {
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8MB");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `page-content/cms-${sectionId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
      if (error) throw error;
      onChange(`/api/public/product-image?path=${encodeURIComponent(path)}`);
      toast.success("Image uploaded — remember to save");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {value ? <img src={value} alt="" className="h-32 w-32 rounded-md border border-border object-cover" /> : <p className="text-xs text-muted-foreground">Using the built-in image.</p>}
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline" disabled={busy}>
          <label htmlFor={id} className="cursor-pointer">
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />} Upload image
          </label>
        </Button>
        <input id={id} type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f); }} />
        {value ? <Button size="sm" variant="ghost" onClick={() => onChange("")}>Use built-in image</Button> : null}
      </div>
      {help}{err}
    </div>
  );
}

function ListEditor({ field, value, error, onChange }: { field: Extract<CmsField, { type: "list" }>; value: Record<string, any>[]; error?: string | undefined; onChange: (v: any[]) => void }) {
  const blank = () => Object.fromEntries(field.itemFields.map((f) => [f.key, f.type === "toggle" ? true : ""]));
  const move = (i: number, d: number) => {
    const next = [...value];
    const [x] = next.splice(i, 1);
    if (x) next.splice(i + d, 0, x);
    onChange(next);
  };
  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium">{field.label}</legend>
      {value.length === 0 ? <p className="text-xs text-muted-foreground">No items — nothing will be shown.</p> : null}
      {value.map((item, i) => (
        <div key={i} className="grid gap-2 rounded-lg border border-border p-3">
          {field.itemFields.map((f) => (
            <ItemInput key={f.key} f={f} value={item[f.key]} onChange={(v) => onChange(value.map((it, j) => (j === i ? { ...it, [f.key]: v } : it)))} />
          ))}
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button>
            <Button size="icon" variant="ghost" aria-label="Move down" disabled={i === value.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button>
            <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 /></Button>
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" className="w-fit" disabled={value.length >= field.maxItems} onClick={() => onChange([...value, blank()])}>
        <Plus aria-hidden /> Add item
      </Button>
      {error ? <p className="text-xs text-destructive">Check each item: {error}</p> : null}
    </fieldset>
  );
}

function ItemInput({ f, value, onChange }: { f: ListItemField; value: any; onChange: (v: any) => void }) {
  if (f.type === "toggle")
    return (
      <label className="flex items-center gap-2 text-sm"><Switch checked={Boolean(value)} onCheckedChange={onChange} /> {f.label}</label>
    );
  const bad = f.type === "url" && value && !isSafeUrl(value);
  return (
    <label className="grid gap-1 text-xs">
      {f.label}
      {f.type === "textarea" ? (
        <Textarea rows={3} value={value ?? ""} maxLength={f.max} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input value={value ?? ""} maxLength={f.max ?? 500} className={cn(bad && "border-destructive")} onChange={(e) => onChange(e.target.value)} />
      )}
      {bad ? <span className="text-destructive">Use a link starting with / or https://</span> : null}
    </label>
  );
}
