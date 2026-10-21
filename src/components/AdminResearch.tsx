import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowDown,
  ArrowUp,
  CheckCheck,
  Eye,
  EyeOff,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { ResearchReferenceFieldsEditor } from "@/components/ResearchReferenceFieldsEditor";
import { isResearchReferenceSection } from "@/lib/research-reference-fields";
import {
  CLAIM_FIELDS,
  CLAIM_STATES,
  EVIDENCE_STATUSES,
  EVIDENCE_TYPES,
  VERIFICATION_STATUSES,
  label,
  slugify,
  toResearchEntry,
  type ClaimChecks,
  type EvidenceStatus,
  type ResearchEntry,
  type ResearchReference,
  type ResearchSection,
  type VerificationStatus,
} from "@/lib/research";

type Draft = {
  id: string | null;
  title: string;
  slug: string;
  category: string;
  tags: string;
  at_a_glance: string;
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
  evidence_status: EvidenceStatus;
  verification_status: VerificationStatus;
  claim_checks: ClaimChecks;
  blend_notice: boolean;
};

const emptyRef = (): ResearchReference => ({
  title: "",
  authors: "",
  source: "",
  year: "",
  pmid: "",
  doi: "",
  url: "",
  evidence_type: "",
  note: "",
});

const emptyDraft = (sort = 0): Draft => ({
  id: null,
  title: "",
  slug: "",
  category: "",
  tags: "",
  at_a_glance: "",
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
  evidence_status: "not_reviewed",
  verification_status: "unverified",
  claim_checks: {},
  blend_notice: false,
});

const toDraft = (e: ResearchEntry): Draft => ({
  id: e.id,
  title: e.title,
  slug: e.slug,
  category: e.category,
  tags: e.tags.join(", "),
  at_a_glance: e.at_a_glance,
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
  evidence_status: e.evidence_status,
  verification_status: e.verification_status,
  claim_checks: e.claim_checks,
  blend_notice: e.blend_notice,
});

const list = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const opt = (v: string) => (v.trim() ? v.trim() : null);

const PUBLISH_BLOCKED =
  "The database publication rule needs updating before this entry can be published.";

function confirmPublication(status: VerificationStatus): boolean {
  return status === "verified" || window.confirm(
    "This entry is not fully verified. Publish it with its current verification status?",
  );
}
const isPublishBlock = (e: any) =>
  String(e?.message ?? "").includes("Only entries with Verification Status");

function payload(d: Draft, published: boolean, wasPublishedAt: string | null) {
  return {
    title: d.title.trim(),
    slug: slugify(d.slug || d.title),
    category: d.category.trim(),
    tags: list(d.tags),
    at_a_glance: d.at_a_glance.trim(),
    summary: d.summary.trim(),
    synonyms: list(d.synonyms),
    molecular_formula: opt(d.molecular_formula),
    sequence: opt(d.sequence),
    cas_number: opt(d.cas_number),
    pubchem_cid: opt(d.pubchem_cid),
    sort_order: Math.trunc(Number(d.sort_order) || 0),
    research_findings: d.findings
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    content: d.content
      .map((s) => ({ heading: s.heading.trim(), body: s.body.trim() }))
      .filter((s) => s.heading || s.body),
    source_references: d.references
      .map((r) => ({
        title: r.title.trim(),
        authors: r.authors.trim(),
        source: r.source.trim(),
        year: r.year.trim(),
        pmid: r.pmid.trim(),
        doi: r.doi.trim(),
        url: r.url.trim(),
        evidence_type: r.evidence_type,
        note: r.note.trim(),
      }))
      .filter((r) => r.title || r.url || r.pmid || r.doi),
    evidence_status: d.evidence_status,
    verification_status: d.verification_status,
    claim_checks: d.claim_checks,
    blend_notice: d.blend_notice,
    published,
    published_at: published
      ? (wasPublishedAt ?? new Date().toISOString())
      : null,
  };
}

export function AdminResearch() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [bulkAction, setBulkAction] = useState<"publish" | "unpublish" | null>(
    null,
  );

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
        ? await supabase
            .from("research_entries")
            .update(body)
            .eq("id", d.id)
            .select("*")
            .single()
        : await supabase
            .from("research_entries")
            .insert(body)
            .select("*")
            .single();
      if (res.error) {
        if (res.error.code === "23505")
          throw new Error("Another entry already uses that web address");
        if (isPublishBlock(res.error)) throw new Error(PUBLISH_BLOCKED);
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
        .update({
          published: next,
          published_at: next
            ? (e.published_at ?? new Date().toISOString())
            : null,
        })
        .eq("id", e.id);
      if (error)
        throw isPublishBlock(error) ? new Error(PUBLISH_BLOCKED) : error;
      return next;
    },
    onSuccess: (next) => {
      toast.success(next ? "Published" : "Moved back to drafts");
      refresh();
    },
    onError: (e: any) =>
      toast.error(e?.message ?? "Could not change the status"),
  });

  const remove = useMutation({
    mutationFn: async (e: ResearchEntry) => {
      const { error } = await supabase
        .from("research_entries")
        .delete()
        .eq("id", e.id);
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
          e.sort_order === i
            ? null
            : supabase
                .from("research_entries")
                .update({ sort_order: i })
                .eq("id", e.id),
        ),
      );
    },
    onSuccess: refresh,
    onError: () => toast.error("Could not change the order"),
  });

  const draftEntries = entries.filter((e) => !e.published);
  const verifiedDrafts = draftEntries.filter(
    (e) => e.verification_status === "verified",
  );
  const publishedEntries = entries.filter((e) => e.published);

  const bulkUpdate = useMutation({
    mutationFn: async ({
      action,
      ids,
    }: {
      action: "publish" | "unpublish";
      ids: string[];
    }) => {
      if (!ids.length) return { action, count: 0 };
      if (action === "publish") {
        const { data, error } = await supabase
          .from("research_entries")
          .update({ published: true, published_at: new Date().toISOString() })
          .in("id", ids)
          .eq("verification_status", "verified")
          .eq("published", false)
          .select("id");
        if (error) throw error;
        return { action, count: data?.length ?? 0 };
      }
      const { error } = await supabase
        .from("research_entries")
        .update({ published: false, published_at: null })
        .in("id", ids);
      if (error) throw error;
      return { action, count: ids.length };
    },
    onSuccess: ({ action, count }) => {
      toast.success(
        action === "publish"
          ? `${count} ${count === 1 ? "entry" : "entries"} published`
          : `Research Lab taken offline — ${count} ${count === 1 ? "entry" : "entries"} unpublished`,
      );
      setBulkAction(null);
      refresh();
    },
    onError: () => {
      toast.error(
        `Could not ${bulkAction === "publish" ? "publish" : "unpublish"} the entries`,
      );
      setBulkAction(null);
    },
  });

  if (draft) {
    const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
      setDraft({ ...draft, [k]: v });
    const existing = entries.find((e) => e.id === draft.id);
    return (
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold uppercase text-foreground">
              {draft.id ? "Edit research entry" : "New research entry"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Status: {existing?.published ? "Published" : "Draft"} · Research
              reference only.
            </p>
          </div>
          <Button
            variant="outline"
            className="font-bold uppercase"
            onClick={() => setDraft(null)}
          >
            Back to list
          </Button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Title">
            <Input
              value={draft.title}
              maxLength={160}
              onChange={(e) => set("title", e.target.value)}
            />
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
            <Input
              value={draft.category}
              maxLength={80}
              onChange={(e) => set("category", e.target.value)}
            />
          </Field>
          <Field label="Tags (comma separated)">
            <Input
              value={draft.tags}
              onChange={(e) => set("tags", e.target.value)}
            />
          </Field>
          <Field label="Summary" wide>
            <Textarea
              rows={3}
              value={draft.summary}
              maxLength={1200}
              onChange={(e) => set("summary", e.target.value)}
            />
          </Field>
          <Field
            label="At a glance (member-facing, derived only from verified content)"
            wide
          >
            <Textarea
              rows={4}
              value={draft.at_a_glance}
              maxLength={1200}
              onChange={(e) => set("at_a_glance", e.target.value)}
            />
          </Field>
          <Field label="Synonyms / other names (comma separated)" wide>
            <Input
              value={draft.synonyms}
              onChange={(e) => set("synonyms", e.target.value)}
            />
          </Field>
          <Field label="Molecular formula">
            <Input
              value={draft.molecular_formula}
              onChange={(e) => set("molecular_formula", e.target.value)}
            />
          </Field>
          <Field label="CAS number">
            <Input
              value={draft.cas_number}
              onChange={(e) => set("cas_number", e.target.value)}
            />
          </Field>
          <Field label="PubChem CID">
            <Input
              value={draft.pubchem_cid}
              inputMode="numeric"
              onChange={(e) => set("pubchem_cid", e.target.value)}
            />
          </Field>
          <Field label="Display order">
            <Input
              type="number"
              value={draft.sort_order}
              onChange={(e) => set("sort_order", e.target.value)}
            />
          </Field>
          <Field label="Sequence" wide>
            <Textarea
              rows={2}
              className="font-mono text-xs"
              value={draft.sequence}
              onChange={(e) => set("sequence", e.target.value)}
            />
          </Field>
          <Field label="Areas studied (one per line)" wide>
            <Textarea
              rows={5}
              value={draft.findings}
              onChange={(e) => set("findings", e.target.value)}
            />
          </Field>
        </div>

        <ResearchReferenceFieldsEditor content={draft.content} onChange={content => set("content", content)} />

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="technical-label text-foreground">Content sections</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                set("content", [...draft.content, { heading: "", body: "" }])
              }
            >
              <Plus /> Section
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            {draft.content.map((s, i) => isResearchReferenceSection(s) ? null : (
              <div key={i} className="grid gap-2 border border-border p-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Heading"
                    value={s.heading}
                    onChange={(e) =>
                      set(
                        "content",
                        draft.content.map((x, j) =>
                          j === i ? { ...x, heading: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="Remove section"
                    onClick={() =>
                      set(
                        "content",
                        draft.content.filter((_, j) => j !== i),
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
                <Textarea
                  rows={4}
                  placeholder="Section text"
                  value={s.body}
                  onChange={(e) =>
                    set(
                      "content",
                      draft.content.map((x, j) =>
                        j === i ? { ...x, body: e.target.value } : x,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="technical-label text-foreground">
              References / sources
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                set("references", [...draft.references, emptyRef()])
              }
            >
              <Plus /> Reference
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            {draft.references.map((r, i) => {
              const upd = (patch: Partial<ResearchReference>) =>
                set(
                  "references",
                  draft.references.map((x, j) =>
                    j === i ? { ...x, ...patch } : x,
                  ),
                );
              return (
                <div
                  key={i}
                  className="grid gap-2 border border-border p-3 sm:grid-cols-2"
                >
                  <div className="flex gap-2 sm:col-span-2">
                    <Input
                      placeholder="Source title"
                      value={r.title}
                      onChange={(e) => upd({ title: e.target.value })}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Remove reference"
                      onClick={() =>
                        set(
                          "references",
                          draft.references.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <Input
                    placeholder="Authors / organisation"
                    value={r.authors}
                    onChange={(e) => upd({ authors: e.target.value })}
                  />
                  <Input
                    placeholder="Journal / authority"
                    value={r.source}
                    onChange={(e) => upd({ source: e.target.value })}
                  />
                  <Input
                    placeholder="Publication year"
                    value={r.year}
                    onChange={(e) => upd({ year: e.target.value })}
                  />
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={r.evidence_type}
                    onChange={(e) =>
                      upd({
                        evidence_type: e.target
                          .value as ResearchReference["evidence_type"],
                      })
                    }
                  >
                    <option value="">Evidence type…</option>
                    {EVIDENCE_TYPES.map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="PMID"
                    inputMode="numeric"
                    value={r.pmid}
                    onChange={(e) => upd({ pmid: e.target.value })}
                  />
                  <Input
                    placeholder="DOI (10.xxxx/…)"
                    value={r.doi}
                    onChange={(e) => upd({ doi: e.target.value })}
                  />
                  <Input
                    className="sm:col-span-2"
                    placeholder="https://…"
                    value={r.url}
                    onChange={(e) => upd({ url: e.target.value })}
                  />
                  <Textarea
                    className="sm:col-span-2"
                    rows={2}
                    placeholder="Admin verification note (never shown publicly)"
                    value={r.note}
                    onChange={(e) => upd({ note: e.target.value })}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 border border-border p-3 sm:p-4">
          <p className="technical-label text-foreground">
            Scientific verification (admin only)
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Evidence status">
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={draft.evidence_status}
                onChange={(e) =>
                  set("evidence_status", e.target.value as EvidenceStatus)
                }
              >
                {EVIDENCE_STATUSES.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Verification status">
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={draft.verification_status}
                onChange={(e) =>
                  set(
                    "verification_status",
                    e.target.value as VerificationStatus,
                  )
                }
              >
                {VERIFICATION_STATUSES.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            {CLAIM_FIELDS.map(([k, l]) => (
              <Field key={k} label={l}>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={draft.claim_checks[k] ?? "not_checked"}
                  onChange={(e) =>
                    set("claim_checks", {
                      ...draft.claim_checks,
                      [k]: e.target.value as any,
                    })
                  }
                >
                  {CLAIM_STATES.map(([v, t]) => (
                    <option key={v} value={v}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
            <label className="flex items-start gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={draft.blend_notice}
                onChange={(e) => set("blend_notice", e.target.checked)}
              />
              <span>
                Show signature-blend notice (ingredient evidence does not
                establish effects of the combined formulation)
              </span>
            </label>
          </div>
          {draft.verification_status !== "verified" ? (
            <p className="mt-3 text-xs font-bold text-accent">
              Publishing does not mark this entry as verified. Current:{" "}
              {label(VERIFICATION_STATUSES, draft.verification_status)}.
            </p>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
          <Button
            variant="outline"
            className="font-bold uppercase"
            disabled={save.isPending}
            onClick={() => save.mutate({ d: draft, published: false })}
          >
            Save as draft
          </Button>
          <Button
            className="font-bold uppercase"
            disabled={save.isPending}
            onClick={() => {
              if (confirmPublication(draft.verification_status))
                save.mutate({ d: draft, published: true });
            }}
          >
            Save &amp; publish
          </Button>
          {existing ? (
            <Button variant="outline" asChild className="font-bold uppercase">
              <Link
                to="/research-preview/$slug"
                params={{ slug: existing.slug }}
                target="_blank"
              >
                <ExternalLink /> Member preview
              </Link>
            </Button>
          ) : null}
          {existing ? (
            <Button
              variant="outline"
              className="font-bold uppercase text-destructive"
              disabled={remove.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete "${existing.title}"? This cannot be undone.`,
                  )
                )
                  remove.mutate(existing);
              }}
            >
              <Trash2 /> Delete
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  const bulkTarget =
    bulkAction === "publish" ? verifiedDrafts : publishedEntries;
  const bulkCount = bulkTarget.length;

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold uppercase text-foreground">
            Titan's Research Lab
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Research reference entries shown at /research. Only published
            entries are visible to customers. Entries are separate from the shop
            catalogue.
          </p>
        </div>
        <Button
          className="font-bold uppercase"
          onClick={() => setDraft(emptyDraft(entries.length))}
        >
          <Plus /> New entry
        </Button>
        <Button variant="outline" asChild className="font-bold uppercase">
          <Link to="/research-preview" target="_blank">
            <ExternalLink /> Member preview
          </Link>
        </Button>
      </div>

      {entries.length > 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          {draftEntries.length} draft{draftEntries.length === 1 ? "" : "s"} ·{" "}
          {verifiedDrafts.length} verified and eligible for bulk publishing.
          Individual entries can be published with their current verification status.
        </p>
      ) : null}

      {entries.length > 0 &&
      (draftEntries.length > 0 || publishedEntries.length > 0) ? (
        <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Button
            className="h-11 w-full font-bold uppercase sm:h-10 sm:w-auto"
            disabled={bulkUpdate.isPending || verifiedDrafts.length === 0}
            onClick={() => setBulkAction("publish")}
          >
            <CheckCheck /> Publish verified drafts ({verifiedDrafts.length})
          </Button>
          <Button
            variant="outline"
            className="h-11 w-full font-bold uppercase text-destructive hover:text-destructive sm:h-10 sm:w-auto"
            disabled={bulkUpdate.isPending || publishedEntries.length === 0}
            onClick={() => setBulkAction("unpublish")}
          >
            <Undo2 /> Unpublish all ({publishedEntries.length})
          </Button>
        </div>
      ) : null}

      <AlertDialog
        open={bulkAction !== null}
        onOpenChange={(open) => !open && setBulkAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="uppercase">
              {bulkAction === "publish"
                ? "Publish all drafts?"
                : "Unpublish everything?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "publish"
                ? `${bulkCount} verified draft ${bulkCount === 1 ? "entry is" : "entries are"} eligible and will become publicly visible at /research immediately after you confirm. Unverified, partially verified and needs-correction drafts are excluded. No entry content will be changed.`
                : `All ${bulkCount} published ${bulkCount === 1 ? "entry" : "entries"} will be hidden from customers — the entire Research Lab will be taken offline. No entry content will be changed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 font-bold uppercase sm:h-10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={
                bulkAction === "publish"
                  ? "h-11 font-bold uppercase sm:h-10"
                  : "h-11 bg-destructive font-bold uppercase text-white hover:bg-destructive/90 sm:h-10"
              }
              disabled={bulkUpdate.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!bulkAction) return;
                bulkUpdate.mutate({
                  action: bulkAction,
                  ids: bulkTarget.map((t) => t.id),
                });
              }}
            >
              {bulkAction === "publish"
                ? `Publish ${bulkCount} ${bulkCount === 1 ? "entry" : "entries"}`
                : `Unpublish ${bulkCount} ${bulkCount === 1 ? "entry" : "entries"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading ? (
        <p className="mt-5 text-sm text-muted-foreground">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          No research entries yet.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-border border border-border">
          {entries.map((e, i) => (
            <li
              key={e.id}
              className="flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold uppercase text-foreground sm:truncate">
                  {e.title}
                </p>
                <p className="break-words text-xs text-muted-foreground">
                  {e.category || "Uncategorised"} · /research/{e.slug} ·{" "}
                  <span
                    className={
                      e.published
                        ? "font-bold text-primary"
                        : "font-bold text-accent"
                    }
                  >
                    {e.published ? "Published" : "Draft"}
                  </span>{" "}
                  · {label(VERIFICATION_STATUSES, e.verification_status)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Move up"
                  disabled={i === 0 || move.isPending}
                  onClick={() => move.mutate({ index: i, dir: -1 })}
                >
                  <ArrowUp />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Move down"
                  disabled={i === entries.length - 1 || move.isPending}
                  onClick={() => move.mutate({ index: i, dir: 1 })}
                >
                  <ArrowDown />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (e.published || confirmPublication(e.verification_status))
                      togglePublish.mutate(e);
                  }}
                  disabled={togglePublish.isPending}
                >
                  {e.published ? <EyeOff /> : <Eye />}{" "}
                  {e.published ? "Unpublish" : "Publish"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDraft(toDraft(e))}
                >
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

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? "space-y-2 sm:col-span-2" : "space-y-2"}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
