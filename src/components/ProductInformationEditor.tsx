import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSiteContent } from "@/lib/useCatalog";
import { cmsKey, cmsValues } from "@/lib/storefrontContent";
import { adminSaveStorefrontSection } from "@/lib/admin.functions";
import { setCmsDirty } from "@/lib/cmsDirtyGuard";
import type { ProductInformationEntry } from "@/lib/product-information";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
const fields = [
  ["details", "Product details"],
  ["included", "What's included"],
  ["care", "Compatibility & care"],
  ["shipping", "Shipping & returns"],
] as const;
type Values = Omit<ProductInformationEntry, "product">;
export function ProductInformationEditor({
  id,
  defaults,
}: {
  id: string | undefined;
  defaults: Values;
}) {
  const { data: content } = useSiteContent();
  const qc = useQueryClient();
  const [values, setValues] = useState(defaults);
  const [base, setBase] = useState<ProductInformationEntry[]>([]);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (dirty) return;
    const items = (cmsValues(content, "product_information").items ||
      []) as ProductInformationEntry[];
    const row = items.find((r) => r.product === id);
    setValues(row || defaults);
    setBase(items);
  }, [
    content,
    id,
    dirty,
    defaults.details,
    defaults.included,
    defaults.care,
    defaults.shipping,
  ]);
  useEffect(() => {
    const key = `product-information:${id || "new"}`;
    setCmsDirty(key, dirty);
    return () => setCmsDirty(key, false);
  }, [id, dirty]);
  async function save() {
    if (!id) return;
    setPending(true);
    setError("");
    try {
      const items = [
        ...base.filter((e) => e.product !== id),
        {
          product: id,
          ...Object.fromEntries(
            fields.map(([key]) => [key, values[key].trim()]),
          ),
        } as ProductInformationEntry,
      ];
      await adminSaveStorefrontSection({
        data: {
          id: "product_information",
          changes: { items },
          base: { items: base },
        },
      });
      qc.setQueryData<Record<string, string>>(["site-content"], (old) => ({
        ...old,
        [cmsKey("product_information")]: JSON.stringify({ items }),
      }));
      setBase(items);
      setDirty(false);
      await qc.invalidateQueries({ queryKey: ["site-content"] });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save product panels.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section
      className="space-y-4 rounded-xl border border-border p-4"
      aria-label="Product information panels"
    >
      <h4 className="font-display font-bold uppercase">
        Product information panels
      </h4>
      <p className="text-xs text-muted-foreground">
        These are the expandable panels on the product page. A saved blank field
        hides its panel. Documents & certificates use the document links further
        below and are hidden when none are saved. Save the product first before
        editing these panels; these settings have their own Save button. Saved panel text takes precedence over the original description and care fields below.
      </p>
      {fields.map(([key, label]) => (
        <div key={key} className="space-y-1">
          <Label htmlFor={`product-panel-${id}-${key}`}>{label}</Label>
          <Textarea
            id={`product-panel-${id}-${key}`}
            rows={4}
            maxLength={key === "shipping" ? 6000 : 12000}
            value={values[key]}
            placeholder="Leave blank to hide this panel"
            disabled={!id || pending}
            onChange={(e) => {
              setValues((v) => ({ ...v, [key]: e.target.value }));
              setDirty(true);
            }}
          />
          <p className="text-xs text-muted-foreground">
            {values[key].trim()
              ? "Displayed on product page"
              : "Hidden on product page"}
          </p>
        </div>
      ))}
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
        {pending ? "Saving…" : "Save information panels"}
      </Button>
    </section>
  );
}
