import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/products";
import {
  adminDeleteProduct,
  adminListProducts,
  adminSaveProduct,
  type AdminProduct,
} from "@/lib/admin.functions";

type Draft = {
  id?: string;
  slug: string;
  name: string;
  price: string;
  image_url: string;
  alt: string;
  blurb: string;
  description: string;
  details: string;
  active: boolean;
  sort_order: string;
};

const emptyDraft: Draft = {
  slug: "",
  name: "",
  price: "",
  image_url: "",
  alt: "",
  blurb: "",
  description: "",
  details: "",
  active: true,
  sort_order: "0",
};

function toDraft(p: AdminProduct): Draft {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: String(p.price),
    image_url: p.image_url,
    alt: p.alt,
    blurb: p.blurb,
    description: p.description,
    details: (p.details ?? []).join("\n"),
    active: p.active,
    sort_order: String(p.sort_order),
  };
}

export function AdminProducts() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => adminListProducts({}),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    void queryClient.invalidateQueries({ queryKey: ["catalog-products"] });
  };

  const save = useMutation({
    mutationFn: (d: Draft) =>
      adminSaveProduct({
        data: {
          ...(d.id ? { id: d.id } : {}),
          slug: d.slug || d.name,
          name: d.name,
          price: Number(d.price) || 0,
          image_url: d.image_url,
          alt: d.alt || d.name,
          blurb: d.blurb,
          description: d.description,
          details: d.details
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          active: d.active,
          sort_order: Number(d.sort_order) || 0,
        },
      }),
    onSuccess: () => {
      toast.success("Product saved");
      setDraft(null);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save the product"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteProduct({ data: { id } }),
    onSuccess: () => {
      toast.success("Product removed");
      refresh();
    },
    onError: () => toast.error("Could not remove the product"),
  });

  if (draft) {
    const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
    return (
      <div className="space-y-5 rounded-xl border border-border bg-card/80 p-6">
        <h3 className="text-lg font-extrabold uppercase text-foreground">
          {draft.id ? "Edit product" : "New product"}
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Product name</Label>
            <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div>
            <Label>Price (AUD)</Label>
            <Input
              type="number"
              min={0}
              value={draft.price}
              onChange={(e) => set({ price: e.target.value })}
            />
          </div>
          <div>
            <Label>Web address name (slug)</Label>
            <Input
              value={draft.slug}
              placeholder="klow-80mg"
              onChange={(e) => set({ slug: e.target.value })}
            />
          </div>
          <div>
            <Label>Display order</Label>
            <Input
              type="number"
              value={draft.sort_order}
              onChange={(e) => set({ sort_order: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Image link</Label>
            <Input
              value={draft.image_url}
              placeholder="https://…"
              onChange={(e) => set({ image_url: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Image description (for accessibility)</Label>
            <Input value={draft.alt} onChange={(e) => set({ alt: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Short blurb</Label>
            <Textarea
              rows={2}
              value={draft.blurb}
              onChange={(e) => set({ blurb: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Full description</Label>
            <Textarea
              rows={5}
              value={draft.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Key points (one per line)</Label>
            <Textarea
              rows={3}
              value={draft.details}
              onChange={(e) => set({ details: e.target.value })}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => set({ active: e.target.checked })}
          />
          Show this product on the website
        </label>

        <div className="flex gap-3">
          <Button
            className="font-bold uppercase"
            disabled={save.isPending || !draft.name.trim()}
            onClick={() => save.mutate(draft)}
          >
            Save product
          </Button>
          <Button variant="outline" className="font-bold uppercase" onClick={() => setDraft(null)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="font-bold uppercase" onClick={() => setDraft({ ...emptyDraft })}>
          Add product
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading products…</p>
      ) : (
        (data ?? []).map((p) => (
          <article
            key={p.id}
            className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card/80 p-5"
          >
            <div className="flex gap-4">
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt={p.alt}
                  className="h-16 w-16 rounded object-cover"
                  loading="lazy"
                />
              ) : null}
              <div className="text-sm text-muted-foreground">
                <p className="text-base font-extrabold uppercase text-foreground">{p.name}</p>
                <p>
                  {formatPrice(Number(p.price))} · {p.active ? "Visible" : "Hidden"}
                </p>
                <p className="max-w-md">{p.blurb}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="font-bold uppercase"
                onClick={() => setDraft(toDraft(p))}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                className="font-bold uppercase"
                disabled={remove.isPending}
                onClick={() => {
                  if (confirm(`Remove ${p.name} from the website?`)) remove.mutate(p.id);
                }}
              >
                Remove
              </Button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
