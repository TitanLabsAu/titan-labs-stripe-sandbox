import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { adminSaveWebsitePromotion } from "@/lib/website-promotion.functions";
import {
  WEBSITE_PROMOTION_KEY,
  parseWebsitePromotion,
  validateWebsitePromotion,
} from "@/lib/website-promotion";
import { useSiteContent } from "@/lib/useCatalog";
import { setCmsDirty } from "@/lib/cmsDirtyGuard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function useRefreshSale() {
  const qc = useQueryClient();
  return async (raw: string) => {
    qc.setQueryData<Record<string, string>>(["site-content"], (old) => ({
      ...old,
      [WEBSITE_PROMOTION_KEY]: raw,
    }));
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["site-content"] }),
      qc.invalidateQueries({ queryKey: ["catalog-products"] }),
    ]);
  };
}
export function WebsitePromotionEditor({
  content,
}: {
  content: Record<string, string> | undefined;
}) {
  const raw = content?.[WEBSITE_PROMOTION_KEY];
  const [draft, setDraft] = useState(() => parseWebsitePromotion(raw));
  const [base, setBase] = useState(raw);
  const [dirty, setDirty] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const refresh = useRefreshSale();
  useEffect(() => {
    if (!dirty) {
      setDraft(parseWebsitePromotion(raw));
      setBase(raw);
    }
  }, [raw, dirty]);
  useEffect(() => {
    setCmsDirty(WEBSITE_PROMOTION_KEY, dirty);
    return () => setCmsDirty(WEBSITE_PROMOTION_KEY, false);
  }, [dirty]);
  async function save() {
    setSaving(true);
    setError("");
    try {
      const settings = validateWebsitePromotion(draft);
      const result = await adminSaveWebsitePromotion({
        data: { settings, expectedRaw: base },
      });
      setBase(result.raw);
      setDirty(false);
      await refresh(result.raw);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save website sale.");
    } finally {
      setSaving(false);
    }
  }
  const example = ((40 * (100 - draft.percent)) / 100).toFixed(2);
  return (
    <section
      aria-labelledby="website-promotion-heading"
      className="mt-6 space-y-4 rounded-xl border border-primary/30 bg-background/40 p-5"
    >
      <h3
        id="website-promotion-heading"
        className="font-display text-lg font-bold uppercase"
      >
        Website Promotion
      </h3>
      <p className="text-sm text-muted-foreground">
        Run a sale across Range, Pens and Equipment. Sale pricing works
        independently of Christmas decorations and light/dark mode.
      </p>
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="website-sale-enabled">Enable website sale</Label>
        <Switch
          id="website-sale-enabled"
          checked={draft.enabled}
          disabled={saving}
          onCheckedChange={(enabled) => {
            setDraft((d) => ({ ...d, enabled }));
            setDirty(true);
          }}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="website-sale-title">Sale name</Label>
          <Input
            id="website-sale-title"
            maxLength={80}
            disabled={saving}
            value={draft.title}
            onChange={(e) => {
              setDraft((d) => ({ ...d, title: e.target.value }));
              setDirty(true);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website-sale-percent">Discount (%)</Label>
          <Input
            id="website-sale-percent"
            type="number"
            min={1}
            max={90}
            step={1}
            disabled={saving}
            value={Number.isNaN(draft.percent) ? "" : draft.percent}
            onChange={(e) => {
              setDraft((d) => ({ ...d, percent: e.target.valueAsNumber }));
              setDirty(true);
            }}
          />
        </div>
      </div>
      <p className="text-sm">
        Example: $40.00 → ${example}.{" "}
        {parseWebsitePromotion(raw).excludedProductIds.length} product(s)
        excluded.
      </p>
      <p className="text-xs text-muted-foreground">
        The lower of the website sale price and each item's own sale price wins;
        those two discounts are not added together. Existing checkout offers
        retain their current rules. Switch off to restore saved prices. Exclude
        products in Admin → Products → Edit → Website sale.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        disabled={!dirty || saving || !content}
        onClick={save}
      >
        {saving ? "Saving…" : "Save website promotion"}
      </Button>
    </section>
  );
}
export function WebsiteSaleProductToggle({ id }: { id: string | undefined }) {
  const { data: content, isLoading } = useSiteContent();
  const raw = content?.[WEBSITE_PROMOTION_KEY];
  const settings = parseWebsitePromotion(raw);
  const [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const refresh = useRefreshSale();
  async function update(included: boolean) {
    if (!id) return;
    setSaving(true);
    setError("");
    try {
      const result = await adminSaveWebsitePromotion({
        data: { eligibility: { id, included }, expectedRaw: raw },
      });
      await refresh(result.raw);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not change sale eligibility.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="my-4 space-y-2 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={`website-sale-product-${id || "new"}`}>
          Website sale — include this product
        </Label>
        <Switch
          id={`website-sale-product-${id || "new"}`}
          checked={!id || !settings.excludedProductIds.includes(id)}
          disabled={!id || saving || isLoading}
          onCheckedChange={update}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {id
          ? "Saved immediately. Applies to every size/colour and catalogue listing of this product. Turning this off excludes it from the website sale; its individual sale price remains available."
          : "Save this new product first to edit sale eligibility. New products are included by default."}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
