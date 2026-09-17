import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AdminLinks } from "@/components/AdminLinks";
import { ProductEditor, draftToPayload, toDraft, type Draft } from "@/components/AdminProducts";
import { adminListProducts, adminSaveContent, adminSaveProduct } from "@/lib/admin.functions";
import { getSiteContent } from "@/lib/catalog.functions";
import { HOME_FIELDS, RANGE_FIELDS, featuredSlugs } from "@/lib/homeContent";
import { formatPrice } from "@/lib/products";

export function AdminEdits() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["site-content"], queryFn: () => getSiteContent() });
  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => adminListProducts({}),
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [featured, setFeatured] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (data && !loaded) {
      const next: Record<string, string> = {};
      for (const f of HOME_FIELDS) next[f.key] = data[f.key] ?? f.fallback;
      for (const f of RANGE_FIELDS) next[f.key] = data[f.key] ?? f.fallback;
      setValues(next);
      setFeatured(featuredSlugs(data));
      setLoaded(true);
    }
  }, [data, loaded]);

  const refreshContent = () => {
    void queryClient.invalidateQueries({ queryKey: ["site-content"] });
  };
  const refreshProducts = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    void queryClient.invalidateQueries({ queryKey: ["catalog-products"] });
  };

  const saveHome = useMutation({
    mutationFn: async () => {
      for (const f of HOME_FIELDS) {
        await adminSaveContent({ data: { key: f.key, body: values[f.key] ?? "" } });
      }
    },
    onSuccess: () => {
      toast.success("Home page updated");
      refreshContent();
    },
    onError: () => toast.error("Could not save your changes"),
  });

  const saveRange = useMutation({
    mutationFn: async () => {
      for (const f of RANGE_FIELDS) {
        await adminSaveContent({ data: { key: f.key, body: values[f.key] ?? "" } });
      }
    },
    onSuccess: () => {
      toast.success("View the Range page updated");
      refreshContent();
    },
    onError: () => toast.error("Could not save your range page changes"),
  });

  const saveFeatured = useMutation({
    mutationFn: (slugs: string[]) =>
      adminSaveContent({ data: { key: "home_featured", body: slugs.join(",") } }),
    onSuccess: () => {
      toast.success("Home page products updated");
      refreshContent();
    },
    onError: () => toast.error("Could not update the home page products"),
  });

  const saveProduct = useMutation({
    mutationFn: (d: Draft) => adminSaveProduct({ data: draftToPayload(d) as any }),
    onSuccess: () => {
      toast.success("Product updated across the website");
      setDraft(null);
      refreshProducts();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save the product"),
  });

  const removeFeatured = useMutation({
    mutationFn: async (p: NonNullable<typeof products>[number]) => {
      const slugs = featured.filter((s) => s !== p.slug);
      setFeatured(slugs);
      await adminSaveContent({ data: { key: "home_featured", body: slugs.join(",") } });
      if (p.sale_price != null || (p.promo_label ?? "") !== "") {
        await adminSaveProduct({
          data: draftToPayload({ ...toDraft(p), sale_price: "", promo_label: "", active: true }) as any,
        });
      }
    },
    onSuccess: () => {
      toast.success("Removed from the home page and reverted to its normal price");
      refreshContent();
      refreshProducts();
    },
    onError: () => toast.error("Could not remove that product"),
  });

  const list = products ?? [];
  const featuredProducts = featured
    .map((s) => list.find((p) => p.slug === s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const addable = list.filter((p) => !featured.includes(p.slug));

  const setFeaturedAndSave = (slugs: string[]) => {
    setFeatured(slugs);
    saveFeatured.mutate(slugs);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="home">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="home" className="font-bold uppercase">
            Home
          </TabsTrigger>
          <TabsTrigger value="range" className="font-bold uppercase">
            View the Range
          </TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="mt-6 space-y-6">
          <div className="rounded-xl border border-border bg-card/80 p-6">
            <h3 className="text-lg font-extrabold uppercase text-foreground">
              Hot products on the home page
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick the products you want on the front page. Anything you change here — price, sale
              price, badge, wording — updates that product everywhere on the website.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                value=""
                onChange={(e) => {
                  if (e.target.value) setFeaturedAndSave([...featured, e.target.value]);
                }}
              >
                <option value="">Add a product…</option>
                {addable.map((p) => (
                  <option key={p.id} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
              {addable.length === 0 && list.length > 0 ? (
                <span className="text-xs text-muted-foreground">Every product is already shown.</span>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              {featuredProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No products on the home page yet — customers still see everything under View the
                  Range.
                </p>
              ) : (
                featuredProducts.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/40 p-4"
                  >
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.alt}
                          className="h-12 w-12 rounded object-cover"
                          loading="lazy"
                        />
                      ) : null}
                      <div>
                        <p className="font-extrabold uppercase text-foreground">{p.name}</p>
                        <p>
                          {p.sale_price != null ? (
                            <>
                              <span className="line-through">{formatPrice(Number(p.price))}</span>{" "}
                              <span className="font-bold text-accent">
                                {formatPrice(Number(p.sale_price))}
                              </span>
                            </>
                          ) : (
                            formatPrice(Number(p.price))
                          )}
                          {p.promo_label ? ` · ${p.promo_label}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="font-bold uppercase"
                        disabled={i === 0}
                        onClick={() => {
                          const next = [...featured];
                          const j = next.indexOf(p.slug);
                          if (j <= 0) return;
                          const current = next[j];
                          const previous = next[j - 1];
                          if (!current || !previous) return;
                          next[j - 1] = current;
                          next[j] = previous;
                          setFeaturedAndSave(next);
                        }}
                      >
                        Move up
                      </Button>
                      <Button
                        variant="outline"
                        className="font-bold uppercase"
                        onClick={() => setDraft(toDraft(p))}
                      >
                        Edit details
                      </Button>
                      <Button
                        variant="destructive"
                        className="font-bold uppercase"
                        disabled={removeFeatured.isPending}
                        onClick={() => removeFeatured.mutate(p)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {draft ? (
              <div className="mt-5">
                <ProductEditor
                  draft={draft}
                  setDraft={setDraft}
                  saving={saveProduct.isPending}
                  title={`Edit ${draft.name}`}
                  onSave={() => saveProduct.mutate(draft)}
                  onCancel={() => setDraft(null)}
                />
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-card/80 p-6">
            <h3 className="text-lg font-extrabold uppercase text-foreground">Home page wording</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Change any wording on your home page here. Leave a box empty to use the standard wording.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {HOME_FIELDS.map((f) => (
                <div key={f.key} className={f.multiline ? "sm:col-span-2" : ""}>
                  <Label>{f.label}</Label>
                  {f.multiline ? (
                    <Textarea
                      rows={3}
                      className="mt-2"
                      value={values[f.key] ?? ""}
                      placeholder={f.fallback}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    />
                  ) : (
                    <Input
                      className="mt-2"
                      value={values[f.key] ?? ""}
                      placeholder={f.fallback}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>

            <Button
              className="mt-5 font-bold uppercase"
              disabled={saveHome.isPending}
              onClick={() => saveHome.mutate()}
            >
              Save home page
            </Button>
          </div>

          <AdminLinks />
        </TabsContent>

        <TabsContent value="range" className="mt-6">
          <div className="rounded-xl border border-border bg-card/80 p-6">
            <h3 className="text-lg font-extrabold uppercase text-foreground">
              View the Range wording
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Change the heading, text under The Range, bottom note and research disclaimer.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {RANGE_FIELDS.map((f) => (
                <div key={f.key} className={f.multiline ? "sm:col-span-2" : ""}>
                  <Label>{f.label}</Label>
                  {f.multiline ? (
                    <Textarea
                      rows={f.key === "range_disclaimer" ? 5 : 3}
                      className="mt-2"
                      value={values[f.key] ?? ""}
                      placeholder={f.fallback}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    />
                  ) : (
                    <Input
                      className="mt-2"
                      value={values[f.key] ?? ""}
                      placeholder={f.fallback}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>

            <Button
              className="mt-5 font-bold uppercase"
              disabled={saveRange.isPending}
              onClick={() => saveRange.mutate()}
            >
              Save View the Range
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
