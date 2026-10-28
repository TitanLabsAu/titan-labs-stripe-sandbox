import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSiteContent } from "@/lib/useCatalog";
import { cmsKey, cmsValues } from "@/lib/storefrontContent";
import { adminSaveStorefrontSection } from "@/lib/admin.functions";
import { setCmsDirty } from "@/lib/cmsDirtyGuard";
import type { GalleryEntry } from "@/lib/product-gallery";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
export function ProductGalleryEditor({
  id,
  variants,
  upload,
}: {
  id: string | undefined;
  variants: { id: string; label: string; image?: string }[];
  upload: (file: File) => Promise<string>;
}) {
  const { data: content } = useSiteContent();
  const qc = useQueryClient();
  const [variant, setVariant] = useState("");
  const [images, setImages] = useState(["", "", ""]);
  const [lights, setLights] = useState(["", "", ""]);
  const [base, setBase] = useState<GalleryEntry[]>([]);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const dirtyKey = `gallery:${id || "new"}:${variant}`;
  useEffect(() => {
    if (!dirty) {
      const items = (cmsValues(content, "product_galleries").items ||
        []) as GalleryEntry[];
      const row = items.find((r) => r.product === id && r.variant === variant);
      setImages([row?.image1 || "", row?.image2 || "", row?.image3 || ""]);
      setLights([row?.light1 || "", row?.light2 || "", row?.light3 || ""]);
      setBase(items);
    }
  }, [content, id, variant, dirty]);
  useEffect(() => {
    setCmsDirty(dirtyKey, dirty);
    return () => setCmsDirty(dirtyKey, false);
  }, [dirtyKey, dirty]);
  async function save() {
    if (!id) return;
    setPending(true);
    setError("");
    try {
      const rest = base.filter(
        (e) => !(e.product === id && e.variant === variant),
      );
      const items = [...images, ...lights].some(Boolean)
        ? [
            ...rest,
            {
              product: id,
              variant,
              image1: images[0]!,
              image2: images[1]!,
              image3: images[2]!,
              light1: lights[0]!,
              light2: lights[1]!,
              light3: lights[2]!,
            },
          ]
        : rest;
      await adminSaveStorefrontSection({
        data: {
          id: "product_galleries",
          changes: { items },
          base: { items: base },
        },
      });
      qc.setQueryData<Record<string, string>>(["site-content"], (old) => ({
        ...old,
        [cmsKey("product_galleries")]: JSON.stringify({ items }),
      }));
      setBase(items);
      setDirty(false);
      await qc.invalidateQueries({ queryKey: ["site-content"] });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save highlight gallery.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section
      className="space-y-3 rounded-xl border border-border p-4"
      aria-label="Three product highlight photos"
    >
      <h4 className="font-display font-bold uppercase">
        Three product highlight photos
      </h4>
      <p className="text-xs text-muted-foreground">
        V2 reusable pens only: full pen, dial close-up and logo close-up. Choose
        a colour below to edit its own photos. Empty slots use detail views of
        the selected pen photo. Matching light-mode photos are optional. These
        settings have their own Save button.
      </p>
      {variants.length ? (
        <div>
          <Label htmlFor={`gallery-variant-${id}`}>Gallery for</Label>
          <select
            id={`gallery-variant-${id}`}
            disabled={dirty || pending}
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Main product / non-colour options</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label || v.id}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        {["Full pen view", "Dial close-up", "Logo close-up"].map((label, i) => (
          <div key={i} className="space-y-2">
            <Label htmlFor={`gallery-photo-${id}-${i}`}>
              {i + 1}. {label}
            </Label>
            {images[i] ? (
              <img
                src={images[i]}
                alt={label}
                className="aspect-[4/3] w-full rounded border border-border object-contain"
              />
            ) : null}
            <Input
              id={`gallery-photo-${id}-${i}`}
              placeholder="Photo URL (optional)"
              value={images[i]}
              disabled={!id || pending}
              onChange={(e) => {
                setImages((a) =>
                  a.map((v, j) => (j === i ? e.target.value : v)),
                );
                setDirty(true);
              }}
            />
            <Label htmlFor={`gallery-light-${id}-${i}`}>
              Matching light-mode photo
            </Label>
            <Input
              id={`gallery-light-${id}-${i}`}
              value={lights[i]}
              disabled={!id || pending}
              placeholder="Light-mode photo URL (optional)"
              onChange={(e) => {
                setLights((a) =>
                  a.map((v, j) => (j === i ? e.target.value : v)),
                );
                setDirty(true);
              }}
            />
            <input
              type="file"
              accept="image/*"
              aria-label={`Upload light-mode ${label.toLowerCase()}`}
              disabled={!id || pending}
              className="max-w-full text-xs"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setPending(true);
                setError("");
                try {
                  const url = await upload(file);
                  setLights((a) => a.map((v, j) => (j === i ? url : v)));
                  setDirty(true);
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Upload failed",
                  );
                } finally {
                  setPending(false);
                  e.target.value = "";
                }
              }}
            />
            <input
              type="file"
              accept="image/*"
              aria-label={`Upload ${label.toLowerCase()}`}
              disabled={!id || pending}
              className="max-w-full text-xs"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setPending(true);
                setError("");
                try {
                  const url = await upload(file);
                  setImages((a) => a.map((v, j) => (j === i ? url : v)));
                  setDirty(true);
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Upload failed",
                  );
                } finally {
                  setPending(false);
                  e.target.value = "";
                }
              }}
            />
          </div>
        ))}
      </div>
      {!id ? (
        <p className="text-xs text-muted-foreground">
          Save the new product first to upload its gallery.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={!id || !dirty || pending || !content}
        onClick={save}
      >
        {pending ? "Saving / uploading…" : "Save highlight gallery"}
      </Button>
    </section>
  );
}
