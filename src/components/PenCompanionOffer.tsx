import { useId, useState } from "react";
import { PenTool } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { useProducts, useSiteContent } from "@/lib/useCatalog";
import { flowCaseLine, flowPenLine, kitOfferSource, penCaseSource, penCompanionSource } from "@/lib/pen-companion";
import { RANGE_STARTER_KIT_SLUG, PEN_STARTER_KIT_SLUG } from "@/lib/starter-kits";
import { formatPrice } from "@/lib/products";
import { normalizeCatalogueSection } from "@/lib/catalogue-sections";
import { PEN_CASES_KEY, canChooseColour, canChoosePenColour, caseForLine, caseFromPrice, parsePenCases, resolvePenCases, type ResolvedPenCase } from "@/lib/pen-cases";
import type { Product } from "@/lib/products";

/**
 * Range products: "Add V2 Reusable Pen" with a two-step chooser — case first
 * (Admin-configured, mapped to real catalogue products), then colour. The pen
 * line is flow-owned (source marker + distinct cart key), so changing case or
 * colour replaces only this line and manually added pens are untouched. While
 * a pen is selected the offer's Range Starter Kit becomes the Pen Starter Kit,
 * and pen-only add-ons are removed again when the pen is removed.
 */
export function PenCompanionOffer({ product, variantId }: { product: Product; variantId?: string | null | undefined }) {
  const { products } = useProducts();
  const content = useSiteContent().data;
  const { items, addItem, removeItem } = useCart();
  const baseId = useId();
  const [open, setOpen] = useState(false);
  const [pendingCase, setPendingCase] = useState<string | null>(null);
  const [pick, setPick] = useState<{ pen: string; case: string }>({ pen: "", case: "" });

  if (normalizeCatalogueSection(product.catalogueSection) !== "range") return null;
  if (product.v2PenOfferEnabled === false) return null;
  const cases = resolvePenCases(parsePenCases(content?.[PEN_CASES_KEY]), products);
  if (!cases.some((c) => c.available)) return null;

  const source = penCompanionSource(product.slug, variantId);
  const offerSource = kitOfferSource(product.slug, variantId);
  const current = flowPenLine(items, product.slug, variantId);
  const currentCaseLine = flowCaseLine(items, product.slug, variantId);
  const currentCase = current ? caseForLine(cases, current.slug, current.variantId) : null;
  const expanded = open || Boolean(current);
  const selectedCase =
    cases.find((c) => c.id === pendingCase && c.available) ?? currentCase ?? cases.find((c) => c.available) ?? null;
  const penOnly = new Set((product.optionalEquipment ?? []).filter((e) => e.whenPen).map((e) => e.slug));

  const swapFlowKit = (fromSlug: string, toSlug: string | null) => {
    const kitLine = items.find((i) => i.source === offerSource && i.slug === fromSlug);
    if (!kitLine) return;
    removeItem(kitLine.key);
    const kit = toSlug ? products.find((p) => p.slug === toSlug) : null;
    if (kit) addItem(kit.slug, kitLine.quantity, { variantId: null, variantLabel: kit.name, pack: "single", source: offerSource });
  };

  const chooseColour = (colourId: string) => {
    if (!selectedCase?.product || !canChooseColour(selectedCase, colourId)) return;
    const pen = selectedCase.product;
    const colour = selectedCase.colours.find((v) => v.id === colourId)!;
    if (current) removeItem(current.key);
    addItem(pen.slug, 1, { variantId: colour.id, variantLabel: colour.label, pack: "single", source });
    setOpen(false);
    setPendingCase(null);
    if (!current) swapFlowKit(RANGE_STARTER_KIT_SLUG, PEN_STARTER_KIT_SLUG);
    toast.success(`${selectedCase.name} — ${colour.label} added to cart`);
  };

  // Paired case (separate pen + case products): two linked exact-variant lines.
  const commitPair = (c: ResolvedPenCase, penId: string, caseId: string) => {
    if (!c.pen || !c.product || !canChoosePenColour(c, penId) || !canChooseColour(c, caseId)) return;
    const penColour = c.pen.colours.find((v) => v.id === penId)!;
    const caseColour = c.colours.find((v) => v.id === caseId)!;
    const qty = current?.quantity ?? 1;
    if (current) removeItem(current.key);
    addItem(c.pen.product.slug, qty, { variantId: penColour.id, variantLabel: penColour.label, pack: "single", source });
    addItem(c.product.slug, qty, { variantId: caseColour.id, variantLabel: caseColour.label, pack: "single", source: penCaseSource(product.slug, variantId) });
    setOpen(false);
    setPendingCase(null);
    setPick({ pen: "", case: "" });
    if (!current) swapFlowKit(RANGE_STARTER_KIT_SLUG, PEN_STARTER_KIT_SLUG);
    toast.success(`${c.name} — ${penColour.label} pen, ${caseColour.label} case added to cart`);
  };
  const pairedCurrent = Boolean(current && currentCase && selectedCase?.id === currentCase.id && selectedCase.paired);
  const penValue = pick.pen || (pairedCurrent ? current?.variantId ?? "" : "");
  const caseValue = pick.case || (pairedCurrent ? currentCaseLine?.variantId ?? "" : "");
  const choosePair = (kind: "pen" | "case", id: string) => {
    if (!selectedCase) return;
    const next = { pen: kind === "pen" ? id : penValue, case: kind === "case" ? id : caseValue };
    setPick(next);
    if (next.pen && next.case) commitPair(selectedCase, next.pen, next.case);
  };

  const turnOff = () => {
    if (current) removeItem(current.key);
    swapFlowKit(PEN_STARTER_KIT_SLUG, RANGE_STARTER_KIT_SLUG);
    for (const line of items) if (line.source === offerSource && penOnly.has(line.slug)) removeItem(line.key);
    setOpen(false);
    setPendingCase(null);
  };

  const colourValue = current && currentCase && selectedCase?.id === currentCase.id ? current.variantId ?? "" : "";

  return (
    <div className="titan-pen-companion mt-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`${baseId}-panel`}
        onClick={() => (expanded ? turnOff() : setOpen(true))}
        className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${
          current
            ? "border-accent bg-accent/10 text-foreground shadow-[inset_0_0_0_1px_var(--accent)]"
            : "border-primary/30 text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <span className="inline-flex items-center gap-2">
          <PenTool aria-hidden="true" className="h-4 w-4" />
          {current ? "V2 Reusable Pen added" : "Add V2 Reusable Pen"}
        </span>
        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      {expanded ? (
        <div id={`${baseId}-panel`} className="space-y-3 pt-3">
          <fieldset>
            <legend className="block text-xs font-bold uppercase tracking-[0.16em] text-accent">1. Select case</legend>
            <div className="mt-2 grid gap-2">
              {cases.map((c) => {
                const selected = selectedCase?.id === c.id;
                const from = caseFromPrice(c);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={!c.available}
                    onClick={() => { setPendingCase(c.id); setPick({ pen: "", case: "" }); }}
                    className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                      selected ? "border-accent bg-accent/10 text-foreground" : "border-input bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {c.status === "pending-setup" ? "Not yet available" : c.status === "sold-out" ? "Sold out" : from != null ? formatPrice(from) : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          {selectedCase?.available && selectedCase.pen ? (
            <div className="grid gap-2">
              {([
                ["pen", "2. Select pen colour", selectedCase.pen.colours, penValue],
                ["case", "3. Select case colour", selectedCase.colours, caseValue],
              ] as const).map(([kind, label, colours, value]) => (
                <div key={kind}>
                  <label htmlFor={`${baseId}-${kind}`} className="block text-xs font-bold uppercase tracking-[0.16em] text-accent">{label}</label>
                  <select
                    id={`${baseId}-${kind}`}
                    className="mt-2 h-11 w-full rounded-md border border-input bg-background px-2 text-[11px] font-semibold text-foreground"
                    value={value}
                    onChange={(e) => choosePair(kind, e.target.value)}
                  >
                    <option value="" disabled>Choose a colour…</option>
                    {colours.map((v) => (
                      <option key={v.id} value={v.id} disabled={v.soldOut || v.comingSoon}>
                        {v.label} — {formatPrice(v.price)}
                        {v.comingSoon ? " · Coming soon" : v.soldOut ? " · Sold out" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <p className="text-[11px] leading-4 text-muted-foreground">
                Pen and case are added together as two linked cart items.
              </p>
            </div>
          ) : selectedCase?.available ? (
            <div>
              <label htmlFor={`${baseId}-colour`} className="block text-xs font-bold uppercase tracking-[0.16em] text-accent">
                2. Select colour
              </label>
              <select
                id={`${baseId}-colour`}
                className="mt-2 h-11 w-full rounded-md border border-input bg-background px-2 text-[11px] font-semibold text-foreground"
                value={colourValue}
                onChange={(e) => chooseColour(e.target.value)}
              >
                <option value="" disabled>Choose a colour…</option>
                {selectedCase.colours.map((v) => (
                  <option key={v.id} value={v.id} disabled={v.soldOut || v.comingSoon}>
                    {v.label} — {formatPrice(v.price)}
                    {v.comingSoon ? " · Coming soon" : v.soldOut ? " · Sold out" : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {current ? (
            <p className="text-[11px] leading-4 text-muted-foreground">
              {currentCase ? `${currentCase.name} — ` : ""}{current.variantLabel}{currentCase?.paired && currentCaseLine ? ` pen, ${currentCaseLine.variantLabel} case` : ""} added to your cart. Choose another case or colour to change your selection.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
