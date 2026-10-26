import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { adminListProducts } from "@/lib/admin.functions";
import {
  adminDeleteReview,
  adminListReviews,
  adminSaveReview,
  adminSetReviewPublished,
  adminSetReviewFlags,
} from "@/lib/reviews.functions";
import type { CustomerReview } from "@/lib/reviews";
import { ReviewPhotos } from "@/components/ReviewPhotos";

type Draft = { id?: string; reviewer_name: string; review_text: string; location: string; rating: string; published: boolean; sort_order: string; featured: boolean; archived: boolean; review_date: string; product_slug: string };
const empty: Draft = { reviewer_name: "", review_text: "", location: "", rating: "", published: false, sort_order: "0", featured: false, archived: false, review_date: "", product_slug: "" };

export function AdminReviews() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-reviews"], queryFn: () => adminListReviews() });
  const { data: products, error: productError } = useQuery({ queryKey: ["admin-review-products"], queryFn: () => adminListProducts() });
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
          featured: d.featured,
          archived: d.archived,
          review_date: d.review_date || null,
          product_slug: d.product_slug || null,
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
  const flags = useMutation({
    mutationFn: (d: { id: string; featured?: boolean; archived?: boolean }) => adminSetReviewFlags({ data: d }),
    onSuccess: refresh,
    onError: err,
  });
  const busy = flags.isPending || publish.isPending || remove.isPending;

  if (draft) {
    const set = (p: Partial<Draft>) => setDraft({ ...draft, ...p });
    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-extrabold uppercase">{draft.id ? "Edit review" : "Add review"}</h3>
        <p className="text-sm text-muted-foreground">Only add genuine reviews you have permission to share.</p>
        <ReviewPhotos photos={data?.find(r => r.id === draft.id)?.photos} name={draft.reviewer_name} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="review-name">Customer name</Label><Input id="review-name" value={draft.reviewer_name} maxLength={120} onChange={(e) => set({ reviewer_name: e.target.value })} /></div>
          <div><Label>Location (optional)</Label><Input value={draft.location} maxLength={120} placeholder="e.g. Melbourne, VIC" onChange={(e) => set({ location: e.target.value })} /></div>
          <div><Label htmlFor="review-order">Featured display order</Label><Input id="review-order" type="number" step="1" value={draft.sort_order} onChange={(e) => set({ sort_order: e.target.value })} /></div>
          <div><Label htmlFor="review-date">Review date</Label><Input id="review-date" type="date" value={draft.review_date} onChange={(e) => set({ review_date: e.target.value })} /></div>
          <div>
            <Label htmlFor="review-product">Product purchased (optional)</Label>
            <select id="review-product" value={draft.product_slug} onChange={(e) => set({ product_slug: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">No product</option>
              {draft.product_slug && !products?.some((p) => p.slug === draft.product_slug) ? <option value={draft.product_slug}>{draft.product_slug}</option> : null}
              {(products ?? []).map((p) => <option key={p.slug} value={p.slug}>{p.name}{p.active ? "" : " (hidden)"}</option>)}
            </select>
            {productError ? <p className="mt-1 text-sm text-destructive">Products could not be loaded. Your current selection is retained.</p> : null}
          </div>
          <div className="sm:col-span-2"><Label htmlFor="review-text">Review text</Label><Textarea id="review-text" rows={5} maxLength={2000} value={draft.review_text} onChange={(e) => set({ review_text: e.target.value })} /></div>
          <div className="flex items-center gap-2"><Switch id="review-featured" checked={draft.featured} onCheckedChange={(featured) => set({ featured })} /><Label htmlFor="review-featured">Featured Review</Label></div>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={draft.published} onChange={(e) => set({ published: e.target.checked })} /> Published</label>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={draft.archived} onChange={(e) => set({ archived: e.target.checked })} /> Archived</label>
        </div>
        <div className="flex gap-2">
          <Button className="font-bold uppercase" disabled={save.isPending || !draft.reviewer_name.trim() || !draft.review_text.trim()} onClick={() => save.mutate(draft)}>Save review</Button>
          <Button variant="outline" className="font-bold uppercase" disabled={save.isPending} onClick={() => setDraft(null)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Customer submissions arrive unpublished and unfeatured. Review them here, then choose Publish; enable Featured to include them in the homepage selection.</p>
      <div className="flex justify-end"><Button className="font-bold uppercase" onClick={() => setDraft({ ...empty })}>Add review</Button></div>
      {error ? <p role="alert" className="text-sm text-destructive">Reviews could not be loaded. Please try again.</p> : isLoading ? <p className="text-sm text-muted-foreground">Loading reviews…</p> : (data ?? []).length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">No reviews yet. Add genuine customer reviews here; published ones appear on the home and Reviews pages.</p>
      ) : (data ?? []).map((r) => (
        <article key={r.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-5">
          <div className="max-w-2xl text-sm">
            <p className="font-extrabold uppercase">{r.reviewer_name}{r.location ? <span className="font-normal normal-case text-muted-foreground"> · {r.location}</span> : null}</p>
            <p className="mt-1 break-words whitespace-pre-wrap text-muted-foreground">{r.review_text}</p>
            <ReviewPhotos photos={r.photos} name={r.reviewer_name} />
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-accent">{r.archived ? "Archived" : r.published ? "Published" : "Pending approval"}{r.featured ? " · Featured" : ""} · Order {r.sort_order}</p>
            {r.review_date ? <p className="mt-1 text-xs text-muted-foreground">{r.review_date}</p> : null}
            {r.product_slug ? <p className="mt-1 text-xs text-muted-foreground">{products?.find((p) => p.slug === r.product_slug)?.name ?? r.product_slug}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="font-bold uppercase" disabled={busy} onClick={() => setDraft({ id: r.id, reviewer_name: r.reviewer_name, review_text: r.review_text, location: r.location ?? "", rating: r.rating ? String(r.rating) : "", published: r.published, sort_order: String(r.sort_order), featured: r.featured, archived: r.archived, review_date: r.review_date ?? "", product_slug: r.product_slug ?? "" })}>Edit</Button>
            <div className="flex items-center gap-2"><Switch checked={r.featured} disabled={busy} aria-label={`Featured Review: ${r.reviewer_name}`} onCheckedChange={(featured) => flags.mutate({ id: r.id, featured })} /><span className="text-xs font-bold uppercase">Featured</span></div>
            <Button variant={r.published ? "outline" : "default"} className="font-bold uppercase" disabled={busy} onClick={() => publish.mutate(r)}>{r.published ? "Unpublish" : "Publish"}</Button>
            <Button variant="outline" className="font-bold uppercase" disabled={busy} onClick={() => flags.mutate({ id: r.id, archived: !r.archived })}>{r.archived ? "Restore" : "Archive"}</Button>
            <Button variant="destructive" className="font-bold uppercase" disabled={busy} onClick={() => { if (confirm(`Delete the review from ${r.reviewer_name}?`)) remove.mutate(r.id); }}>Delete</Button>
          </div>
        </article>
      ))}
    </div>
  );
}
