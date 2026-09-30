import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  slugify,
  toResearchEntry,
  type ResearchEntry,
  type ResearchReference,
  type ResearchSection,
} from "@/lib/research";

type Draft = {
  id: string | null;
  title: string;
  slug: string;
  category: string;
  tags: string;
  summary: string;
  synonyms: string;
  molecular_formula: string;
  sequence: string;
  cas_number: string;
  pubchem_cid: string;
  sort_order: string;
  findings: string;
  content: ResearchSection[];
  references: ResearchReference[];
  published: boolean;
};

const emptyDraft = (sort = 0): Draft => ({
  id: null,
  title: "",
  slug: "",
  category: "",
  tags: "",
  summary: "",
  synonyms: "",
  molecular_formula: "",
  sequence: "",
  cas_number: "",
  pubchem_cid: "",
  sort_order: String(sort),
  findings: "",
  content: [{ heading: "Overview", body: "" }],
  references: [],
  published: false,
});

const toDraft = (e: ResearchEntry): Draft => ({
  id: e.id,
  title: e.title,
  slug: e.slug,
  category: e.category,
  tags: e.tags.join(", "),
  summary: e.summary,
  synonyms: e.synonyms.join(", "),
  molecular_formula: e.molecular_formula ?? "",
  sequence: e.sequence ?? "",
  cas_number: e.cas_number ?? "",
  pubchem_cid: e.pubchem_cid ?? "",
  sort_order: String(e.sort_order),
  findings: e.research_findings.join("\n"),
  content: e.content.length ? e.content : [{ heading: "", body: "" }],
  references: e.source_references,
  published: e.published,
});

const list = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);
const opt = (v: string) => (v.trim() ? v.trim() : null);

function payload(d: Draft, published: boolean, wasPublishedAt: string | null) {
  return {
    title: d.title.trim(),
    slug: slugify(d.slug || d.title),
    category: d.category.trim(),
    tags: list(d.tags),
    summary: d.summary.trim(),
    synonyms: list(d.synonyms),
    molecular_formula: opt(d.molecular_formula),
    sequence: opt(d.sequence),
    cas_number: opt(d.cas_number),
    pubchem_cid: opt(d.pubchem_cid),
    sort_order: Math.trunc(Number(d.sort_order) || 0),
    research_findings: d.findings.split("\n").map((s) => s.trim()).filter(Boolean),
    content: d.content
      .map((s) => ({ heading: s.heading.trim(), body: s.body.trim() }))
      .filter((s) => s.heading || s.body),
    source_references: d.references
      .map((r) => ({ title: r.title.trim(), url: r.url.trim(), source: r.source.trim(), year: r.year.trim() }))
      .filter((r) => r.title || r.url),
    published,
    published_at: published ? wasPublishedAt ?? new Date().toISOString() : null,
  };
}

export function AdminResearch() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["admin-research"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("research_entries")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(toResearchEntry);
    },
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-research"] });
    void qc.invalidateQueries({ queryKey: ["research"] });
  };

  const save = useMutation({
    mutationFn: async ({ d, published }: { d: Draft; published: boolean }) => {
      if (!d.title.trim()) throw new Error("Add a title first");
      const existing = entries.find((e) => e.id === d.id);
      const body = payload(d, published, existing?.published_at ?? null);
      if (!body.slug) throw new Error("Add a title or web address");
      const res = d.id
        ? await supabase.from("research_entries").update(body).eq("id", d.id).select("*").single()
        : await supabase.from("research_entries").insert(body).select("*").single();
      if (res.error) {
        if (res.error.code === "23505") throw new Error("Another entry already uses that web address");
        throw res.error;
      }
      return toResearchEntry(res.data);
    },
    onSuccess: (entry, { published }) => {
      toast.success(published ? "Entry saved and published" : "Draft saved");
      setDraft(toDraft(entry));
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save the entry"),
  });

  const togglePublish = useMutation({
    mutationFn: async (e: ResearchEntry) => {
      const next = !e.published;
      const { error } = await supabase
        .from("research_entries")
        .update({ published: next, published_at: next ? e.published_at ?? new Date().toISOString() : null })
        .eq("id", e.id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      toast.success(next ? "Published" : "Moved back to drafts");
      refresh();
    },
    onError: () => toast.error("Could not change the status"),
  });

  const remove = useMutation({
    mutationFn: async (e: ResearchEntry) => {
      const { error } = await supabase.from("research_entries").delete().eq("id", e.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entry deleted");
      setDraft(null);
      refresh();
    },
    onError: () => toast.error("Could not delete the entry"),
  });

  const move = useMutation({
    mutationFn: async ({ index, dir }: { index: number; dir: -1 | 1 }) => {
      const reordered = [...entries];
      const target = index + dir;
      if (target < 0 || target >= reordered.length) return;
      const tmp = reordered[index]!;
      reordered[index] = reordered[target]!;
      reordered[target] = tmp;
      await Promise.all(
        reordered.map((e, i) =>
          e.sort_order === i ? null : supabase.from("research_entries").update({ sort_order: i }).eq("id", e.id),
        ),
      );
    },
    onSuccess: refresh,
    onError: () => toast.error("Could not change the order"),
  });

  if (draft) {
    const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });
    const existing = entries.find((e) => e.id === draft.id);
    return (
      <div className="rounded-xl border border-border bg-card/80 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold uppercase text-foreground">
              {draft.id ? "Edit research entry" : "New research entry"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Status: {existing?.published ? "Published" : "Draft"} · Research reference only. Do not add dosing,
              administration or treatment instructions.
            </p>
          </div>
          <Button variant="outline" className="font-bold uppercase" onClick={() => setDraft(null)}>
            Back to list
          </Button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Title">
            <Input value={draft.title} maxLength={160} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="Web address (/research/…)">
            <Input
              value={draft.slug}
              placeholder={slugify(draft.title) || "auto from title"}
              maxLength={80}
              onChange={(e) => set("slug", e.target.value)}
            />
          </Field>
          <Field label="Category">
            <Input value={draft.category} maxLength={80} onChange={(e) => set("category", e.target.value)} />
          </Field>
          <Field label="Tags (comma separated)">
            <Input value={draft.tags} onChange={(e) => set("tags", e.target.value)} />
          </Field>
          <Field label="Summary" wide>
            <Textarea rows={3} value={draft.summary} maxLength={1200} onChange={(e) => set("summary", e.target.value)} />
          </Field>
          <Field label="Synonyms / other names (comma separated)" wide>
            <Input value={draft.synonyms} onChange={(e) => set("synonyms", e.target.value)} />
          </Field>
          <Field label="Molecular formula">
            <Input value={draft.molecular_formula} onChange={(e) => set("molecular_formula", e.target.value)} />
          </Field>
          <Field label="CAS number">
            <Input value={draft.cas_number} onChange={(e) => set("cas_number", e.target.value)} />
          </Field>
          <Field label="PubChem CID">
            <Input value={draft.pubchem_cid} inputMode="numeric" onChange={(e) => set("pubchem_cid", e.target.value)} />
          </Field>
          <Field label="Display order">
            <Input type="number" value={draft.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
          </Field>
          <Field label="Sequence" wide>
            <Textarea rows={2} className="font-mono text-xs" value={draft.sequence} onChange={(e) => set("sequence", e.target.value)} />
          </Field>
          <Field label="Areas studied (one per line)" wide>
            <Textarea rows={5} value={draft.findings} onChange={(e) => set("findings", e.target.value)} />
          </Field>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="technical-label text-foreground">Content sections</p>
            <Button size="sm" variant="outline" onClick={() => set("content", [...draft.content, { heading: "", body: "" }])}>
              <Plus /> Section
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            {draft.content.map((s, i) => (
              <div key={i} className="grid gap-2 border border-border p-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Heading"
                    value={s.heading}
                    onChange={(e) => set("content", draft.content.map((x, j) => (j === i ? { ...x, heading: e.target.value } : x)))}
                  />
                  <Button size="icon" variant="outline" aria-label="Remove section" onClick={() => set("content", draft.content.filter((_, j) => j !== i))}>
                    <Trash2 />
                  </Button>
                </div>
                <Textarea
                  rows={4}
                  placeholder="Section text"
                  value={s.body}
                  onChange={(e) => set("content", draft.content.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="technical-label text-foreground">References / sources</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => set("references", [...draft.references, { title: "", url: "", source: "", year: "" }])}
            >
              <Plus /> Reference
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            {draft.references.map((r, i) => {
              const upd = (patch: Partial<ResearchReference>) =>
                set("references", draft.references.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={i} className="grid gap-2 border border-border p-3 sm:grid-cols-[2fr_1fr_80px_auto]">
                  <Input placeholder="Title" value={r.title} onChange={(e) => upd({ title: e.target.value })} />
                  <Input placeholder="Journal / source" value={r.source} onChange={(e) => upd({ source: e.target.value })} />
                  <Input placeholder="Year" value={r.year} onChange={(e) => upd({ year: e.target.value })} />
                  <Button size="icon" variant="outline" aria-label="Remove reference" onClick={() => set("references", draft.references.filter((_, j) => j !== i))}>
                    <Trash2 />
                  </Button>
                  <Input className="sm:col-span-4" placeholder="https://…" value={r.url} onChange={(e) => upd({ url: e.target.value })} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
          <Button variant="outline" className="font-bold uppercase" disabled={save.isPending} onClick={() => save.mutate({ d: draft, published: false })}>
            Save as draft
          </Button>
          <Button className="font-bold uppercase" disabled={save.isPending} onClick={() => save.mutate({ d: draft, published: true })}>
            Save &amp; publish
          </Button>
          {existing ? (
            <Button
              variant="outline"
              className="font-bold uppercase text-destructive"
              disabled={remove.isPending}
              onClick={() => {
                if (window.confirm(`Delete "${existing.title}"? This cannot be undone.`)) remove.mutate(existing);
              }}
            >
              <Trash2 /> Delete
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/80 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold uppercase text-foreground">Titan's Research Lab</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Research reference entries shown at /research. Only published entries are visible to customers. Entries
            are separate from the shop catalogue.
          </p>
        </div>
        <Button className="font-bold uppercase" onClick={() => setDraft(emptyDraft(entries.length))}>
          <Plus /> New entry
        </Button>
      </div>

      {isLoading ? (
        <p className="mt-5 text-sm text-muted-foreground">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">No research entries yet.</p>
      ) : (
        <ul className="mt-5 divide-y divide-border border border-border">
          {entries.map((e, i) => (
            <li key={e.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold uppercase text-foreground">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {e.category || "Uncategorised"} · /research/{e.slug} ·{" "}
                  <span className={e.published ? "font-bold text-primary" : "font-bold text-accent"}>
                    {e.published ? "Published" : "Draft"}
                  </span>
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button size="icon" variant="outline" aria-label="Move up" disabled={i === 0 || move.isPending} onClick={() => move.mutate({ index: i, dir: -1 })}>
                  <ArrowUp />
                </Button>
                <Button size="icon" variant="outline" aria-label="Move down" disabled={i === entries.length - 1 || move.isPending} onClick={() => move.mutate({ index: i, dir: 1 })}>
                  <ArrowDown />
                </Button>
                <Button size="sm" variant="outline" onClick={() => togglePublish.mutate(e)} disabled={togglePublish.isPending}>
                  {e.published ? <EyeOff /> : <Eye />} {e.published ? "Unpublish" : "Publish"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDraft(toDraft(e))}>
                  <Pencil /> Edit
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "space-y-2 sm:col-span-2" : "space-y-2"}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
