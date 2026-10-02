import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  adminDeleteReview,
  adminListReviews,
  adminSaveReview,
  adminSetReviewPublished,
} from "@/lib/reviews.functions";
import type { CustomerReview } from "@/lib/reviews";

type Draft = { id?: string; reviewer_name: string; review_text: string; location: string; rating: string; published: boolean; sort_order: string };
const empty: Draft = { reviewer_name: "", review_text: "", location: "", rating: "", published: false, sort_order: "0" };

export function AdminReviews() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["admin-reviews"], queryFn: () => adminListReviews() });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    void qc.invalidateQueries({ queryKey: ["published-reviews"] });
  };
  const err = (e: any) => toast.error(e?.message ?? "Something went wrong");
  const save = useMutation({
    mutationFn: (d: Draft) =>
      adminSaveReview({
        data: {
          id: d.id,
          reviewer_name: d.reviewer_name,
          review_text: d.review_text,
          location: d.location,
          rating: d.rating ? Number(d.rating) : null,
          published: d.published,
          sort_order: Number(d.sort_order) || 0,
        },
      }),
    onSuccess: () => { toast.success("Review saved"); setDraft(null); refresh(); },
    onError: err,
  });
  const publish = useMutation({
    mutationFn: (r: CustomerReview) => adminSetReviewPublished({ data: { id: r.id, published: !r.published } }),
    onSuccess: refresh,
    onError: err,
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteReview({ data: { id } }),
    onSuccess: () => { toast.success("Review deleted"); refresh(); },
    onError: err,
  });

  if (draft) {
    const set = (p: Partial<Draft>) => setDraft({ ...draft, ...p });
    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-extrabold uppercase">{draft.id ? "Edit review" : "Add review"}</h3>
        <p className="text-sm text-muted-foreground">Only add genuine reviews you have permission to share.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Reviewer name</Label><Input value={draft.reviewer_name} maxLength={120} onChange={(e) => set({ reviewer_name: e.target.value })} /></div>
          <div><Label>Location (optional)</Label><Input value={draft.location} maxLength={120} placeholder="e.g. Melbourne, VIC" onChange={(e) => set({ location: e.target.value })} /></div>
          <div>
            <Label>Rating (optional)</Label>
            <select value={draft.rating} onChange={(e) => set({ rating: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">No rating</option>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} / 5</option>)}
            </select>
          </div>
          <div><Label>Display order</Label><Input type="number" value={draft.sort_order} onChange={(e) => set({ sort_order: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Review text</Label><Textarea rows={5} maxLength={2000} value={draft.review_text} onChange={(e) => set({ review_text: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={draft.published} onChange={(e) => set({ published: e.target.checked })} /> Published</label>
        </div>
        <div className="flex gap-2">
          <Button className="font-bold uppercase" disabled={save.isPending || !draft.reviewer_name.trim() || !draft.review_text.trim()} onClick={() => save.mutate(draft)}>Save review</Button>
          <Button variant="outline" className="font-bold uppercase" onClick={() => setDraft(null)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button className="font-bold uppercase" onClick={() => setDraft({ ...empty })}>Add review</Button></div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading reviews…</p> : (data ?? []).length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">No reviews yet. Add genuine customer reviews here; published ones appear on the home and Reviews pages.</p>
      ) : (data ?? []).map((r) => (
        <article key={r.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-5">
          <div className="max-w-2xl text-sm">
            <p className="font-extrabold uppercase">{r.reviewer_name}{r.location ? <span className="font-normal normal-case text-muted-foreground"> · {r.location}</span> : null}</p>
            <p className="mt-1 text-muted-foreground">{r.review_text}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-accent">{r.published ? "Published" : "Draft"}{r.rating ? ` · ${r.rating}/5` : ""} · Order {r.sort_order}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="font-bold uppercase" onClick={() => setDraft({ id: r.id, reviewer_name: r.reviewer_name, review_text: r.review_text, location: r.location ?? "", rating: r.rating ? String(r.rating) : "", published: r.published, sort_order: String(r.sort_order) })}>Edit</Button>
            <Button variant={r.published ? "outline" : "default"} className="font-bold uppercase" disabled={publish.isPending} onClick={() => publish.mutate(r)}>{r.published ? "Unpublish" : "Publish"}</Button>
            <Button variant="destructive" className="font-bold uppercase" disabled={remove.isPending} onClick={() => { if (confirm(`Delete the review from ${r.reviewer_name}?`)) remove.mutate(r.id); }}>Delete</Button>
          </div>
        </article>
      ))}
    </div>
  );
}
