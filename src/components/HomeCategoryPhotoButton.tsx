import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteContent } from "@/lib/useCatalog";
import { cmsKey, cmsValues } from "@/lib/storefrontContent";
import { CATALOGUE_SECTION_LABELS, normalizeCatalogueSection } from "@/lib/catalogue-sections";
import { adminSaveStorefrontSection, type AdminProduct } from "@/lib/admin.functions";

export function HomeCategoryPhotoButton({ product }: { product: AdminProduct }) {
  const qc = useQueryClient();
  const { data: content, isLoading, isError } = useSiteContent();
  const section = normalizeCatalogueSection(product.catalogue_section);
  const label = CATALOGUE_SECTION_LABELS[section];
  const key = `${section}_slug`;
  const current = cmsValues(content, "home_category_photos")[key] as string;
  const selected = current === product.slug;
  const save = useMutation({
    mutationFn: () => adminSaveStorefrontSection({ data: {
      id: "home_category_photos", reset: false,
      changes: { [key]: selected ? "" : product.slug }, base: { [key]: current },
    } }),
    onSuccess: async result => {
      const raw = (result as { raw: string }).raw;
      qc.setQueryData(["site-content"], (old: Record<string, string> | undefined) => old ? { ...old, [cmsKey("home_category_photos")]: raw } : old);
      await qc.invalidateQueries({ queryKey: ["site-content"] });
      toast.success(`${label} homepage tile photo updated`);
    },
    onError: e => toast.error(e instanceof Error ? e.message : "Could not update tile photo"),
  });
  const eligible = product.active && Boolean(product.image_url?.trim());
  return <Button variant="outline" aria-pressed={selected} disabled={isLoading || isError || !content || save.isPending || (!selected && !eligible)}
    className={selected ? "border-accent bg-accent/10 font-bold uppercase text-accent" : "font-bold uppercase"}
    title={selected ? "Click to return this tile to its automatic photo" : eligible ? `Use this photo for the homepage ${label} tile, replacing its previous selection` : "A visible product with a photo is required"}
    onClick={() => save.mutate()}><Image aria-hidden="true" className="h-4 w-4" />{save.isPending ? "Saving…" : selected ? `${label} tile photo ✓` : `Use as ${label} tile photo`}</Button>;
}
