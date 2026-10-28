import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSiteContent } from "@/lib/useCatalog";
import { cmsKey, cmsValues } from "@/lib/storefrontContent";
import { adminSaveStorefrontSection } from "@/lib/admin.functions";
import { setCmsDirty } from "@/lib/cmsDirtyGuard";
import {
  productLightPhoto,
  productDarkPhoto,
  samePhoto,
  type PhotoPair,
  type ProductPhotoPair,
  type VariantPhotoPair,
} from "@/lib/theme-image-rules";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
export function ProductThemePhotoEditor({
  id,
  slug,
  image,
  variants,
  upload,
}: {
  id: string | undefined;
  slug: string;
  image: string;
  variants: { id: string; label: string; image?: string }[];
  upload: (file: File) => Promise<string>;
}) {
  const { data: content } = useSiteContent();
  const qc = useQueryClient();
  const [selected, setSelected] = useState("");
  const [light, setLight] = useState("");
  const [base, setBase] = useState<PhotoPair[]>([]);
  const [loadedSource, setLoadedSource] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const variant = variants.find((v) => v.id === selected);
  const source = variant?.image || image;
  const values = cmsValues(content, "theme_artwork");
  const resolved = productLightPhoto(
    slug,
    source,
    variant?.image ? variant.id : undefined,
    values.products as ProductPhotoPair[],
    values.variants as VariantPhotoPair[],
    values.images as PhotoPair[],
  );
  useEffect(() => {
    if (dirty) return;
    const pairs = (cmsValues(content, "theme_artwork").images ||
      []) as PhotoPair[];
    setBase(pairs);
    setLoadedSource(source);
    setLight(
      pairs.find((p) => p.source && samePhoto(p.source, source))?.image || "",
    );
  }, [content, source, dirty]);
  useEffect(() => {
    const key = `product-theme:${id || "new"}`;
    setCmsDirty(key, dirty);
    return () => setCmsDirty(key, false);
  }, [id, dirty]);
  async function save() {
    if (!samePhoto(source, loadedSource)) {
      setError(
        "The product photo changed. Discard this edit and assign the matching light photo to the new source.",
      );
      return;
    }
    setPending(true);
    setError("");
    try {
      const images = base.filter(
        (p) => !p.source || !samePhoto(p.source, source),
      );
      if (light.trim()) images.push({ source, image: light.trim() });
      await adminSaveStorefrontSection({
        data: {
          id: "theme_artwork",
          changes: { images },
          base: { images: base },
        },
      });
      qc.setQueryData<Record<string, string>>(["site-content"], (old) => ({
        ...old,
        [cmsKey("theme_artwork")]: JSON.stringify({
          ...cmsValues(old, "theme_artwork"),
          images,
        }),
      }));
      setBase(images);
      setDirty(false);
      await qc.invalidateQueries({ queryKey: ["site-content"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save theme photo.");
    } finally {
      setPending(false);
    }
  }
  return (
    <section
      className="space-y-3 rounded-xl border border-border p-4"
      aria-label="Product dark and light photos"
    >
      <h4 className="font-display font-bold uppercase">
        Dark & light product photos
      </h4>
      <p className="text-xs text-muted-foreground">
        Prepared image pairs automatically show the correct dark and light
        artwork. Assign a matching light photo for the catalogue, product page
        and colour selection. A new main photo or colour upload needs its own
        matching light photo.
      </p>
      <Label htmlFor={`theme-photo-variant-${id}`}>Photo option</Label>
      <select
        id={`theme-photo-variant-${id}`}
        className="h-11 w-full rounded border border-input bg-background px-3"
        value={selected}
        disabled={dirty || pending}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">Main product</option>
        {variants
          .filter((v) => v.image)
          .map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
      </select>
      <p className="text-xs text-muted-foreground">
        {resolved
          ? "Matching light photo available"
          : "Same photo in both modes — matching light photo not assigned"}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs">Current / dark photo</p>
          {source ? (
            <img
              src={productDarkPhoto(slug, source)}
              alt="Current product photo"
              className="aspect-square w-full rounded border object-contain"
            />
          ) : null}
        </div>
        <div>
          <p className="text-xs">Light photo</p>
          {light || resolved ? (
            <img
              src={light || resolved!}
              alt="Matching light product photo"
              className="aspect-square w-full rounded border bg-white object-contain"
            />
          ) : null}
        </div>
      </div>
      <Label htmlFor={`theme-photo-light-${id}`}>Matching light photo</Label>
      <Input
        id={`theme-photo-light-${id}`}
        value={light}
        placeholder="Light photo URL"
        disabled={!id || pending}
        onChange={(e) => {
          setLight(e.target.value);
          setDirty(true);
        }}
      />
      <input
        type="file"
        accept="image/*"
        aria-label="Upload matching light product photo"
        disabled={!id || pending}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setPending(true);
          setError("");
          try {
            setLight(await upload(file));
            setDirty(true);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
          } finally {
            setPending(false);
            e.target.value = "";
          }
        }}
      />
      {dirty && !samePhoto(source, loadedSource) ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDirty(false);
            setError("");
          }}
        >
          Discard photo edit and reload
        </Button>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={!id || !source || !dirty || pending || !content}
        onClick={save}
      >
        {pending ? "Saving…" : "Save matching light photo"}
      </Button>
    </section>
  );
}
