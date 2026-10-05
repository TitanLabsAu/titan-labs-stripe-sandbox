import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useProducts, useSiteContent } from "@/lib/useCatalog";
import { cmsKey, cmsValues } from "@/lib/storefrontContent";
import { adminSaveStorefrontSection } from "@/lib/admin.functions";

/** Same guarded CMS field as Edits > Homepage, accessible from the catalogue manager. */
export function HomeBannerProductPicker() {
  const qc = useQueryClient();
  const { data: content, isLoading, isError } = useSiteContent();
  const { products, isLoading: productsLoading } = useProducts();
  const current = cmsValues(content, "home_banner_product").product_slug as string;
  const [choice, setChoice] = useState<{ value: string; base: string } | null>(null);
  const value = choice?.value ?? current;
  const selected = products.find(p => p.slug === value);
  const save = useMutation({
    mutationFn: () => adminSaveStorefrontSection({ data: { id: "home_banner_product", reset: false, changes: { product_slug: value }, base: { product_slug: choice?.base ?? current } } }),
    onSuccess: async result => {
      const raw = (result as { raw: string }).raw;
      qc.setQueryData(["site-content"], (old: Record<string, string> | undefined) => old ? { ...old, [cmsKey("home_banner_product")]: raw } : old);
      setChoice(null);
      await qc.invalidateQueries({ queryKey: ["site-content"] });
      toast.success("Homepage banner product updated");
    },
    onError: e => toast.error(e instanceof Error ? e.message : "Could not update homepage banner"),
  });
  return <section aria-labelledby="banner-product-picker-heading" className="rounded-xl border border-accent/30 bg-card p-5">
    <h2 id="banner-product-picker-heading" className="font-display text-xl font-bold uppercase">Homepage banner product</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose a catalogue item for the main homepage banner. Its photo, name and product link stay in sync. Choose no product to keep your existing welcome artwork.</p>
    <div className="mt-4 flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><Label htmlFor="homepage-banner-product">Select catalogue product</Label><select id="homepage-banner-product" value={value} disabled={isLoading || productsLoading || isError || save.isPending} onChange={e => setChoice({ value: e.target.value, base: choice?.base ?? current })} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">No product — keep welcome artwork</option>{value && !selected ? <option value={value}>Unavailable product: {value}</option> : null}{products.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select></div><Button disabled={isLoading || productsLoading || isError || save.isPending || !choice || value === current} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save banner product"}</Button>{choice ? <Button variant="outline" disabled={save.isPending} onClick={() => setChoice(null)}>Cancel</Button> : null}</div>
    {isError ? <p role="alert" className="mt-3 text-sm text-destructive">Saved banner settings could not load. Editing is paused.</p> : null}
    {selected ? <p className="mt-3 text-sm text-accent">{value === current ? "Current banner: " : "Selected: "}{selected.name}</p> : null}
  </section>;
}
