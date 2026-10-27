import { useId } from "react";
import { Link } from "@tanstack/react-router";
import { PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useProducts, useSiteContent } from "@/lib/useCatalog";
import { cmsValues } from "@/lib/storefrontContent";
import { useCart } from "@/lib/cart";
import { bundleSummary, formatPrice, getProductOption, type Product } from "@/lib/products";
import { kitOfferSource } from "@/lib/pen-companion";
import { PEN_STARTER_KIT_SLUG, RANGE_STARTER_KIT_SLUG } from "@/lib/starter-kits";
import {
  equipmentOptionAvailability,
  optionalEquipmentFor,
  ownedEquipmentLine,
  type ResolvedEquipmentOption,
} from "@/lib/optional-equipment";

/**
 * Optional equipment add-ons for a Range/Pen product option. Each add-on is a
 * separate offer-owned cart line (parent slug + parent option + exact variant);
 * prices and stock always come from the Equipment product itself.
 */
export function StarterKitOffer({ product, variantId }: { product: Product; variantId?: string | null | undefined }) {
  const { products } = useProducts();
  const { items } = useCart();
  const c = cmsValues(useSiteContent().data, "starter_kit");
  const options = optionalEquipmentFor(product, products, items, variantId);
  if (!options.length) return null;
  const single = options.length === 1 ? options[0]!.product : null;
  return (
    <details
      className="titan-kit-offer mt-3 rounded-lg border border-primary/25 bg-primary/5 p-3"
      aria-label={single ? `${single.name} add-on` : "Optional equipment add-ons"}
    >
      <summary className="cursor-pointer font-display text-sm font-bold text-foreground">
        {single ? `${single.name} · ${formatPrice(single.price)}` : `Add equipment (${options.length})`}
      </summary>
      <ul className="space-y-3 pt-3">
        {options.map((o) => (
          <EquipmentRow key={o.product.slug} option={o} parent={product} parentVariantId={variantId ?? null} labels={c} />
        ))}
      </ul>
    </details>
  );
}

function EquipmentRow({
  option,
  parent,
  parentVariantId,
  labels,
}: {
  option: ResolvedEquipmentOption;
  parent: Product;
  parentVariantId: string | null;
  labels: Record<string, string>;
}) {
  const { items, addItem, removeItem } = useCart();
  const selectId = useId();
  const kit = option.product;
  const owned = ownedEquipmentLine(items, parent.slug, parentVariantId, kit.slug);
  const source = kitOfferSource(parent.slug, parentVariantId);
  const hasVariants = option.variantIds.length > 0;
  const firstAvailable =
    option.variantIds.find((id) => equipmentOptionAvailability(kit, id, items).canAdd) ?? option.variantIds[0] ?? null;
  const chosen = hasVariants ? (owned?.variantId && option.variantIds.includes(owned.variantId) ? owned.variantId : firstAvailable) : null;
  const opt = getProductOption(kit, chosen, "single");
  const variant = (kit.variants ?? []).find((v) => v.id === chosen);
  const contents = bundleSummary(variant?.contents) || kit.details.join(" · ");
  const state = equipmentOptionAvailability(kit, chosen, items);
  const isStarterKit = kit.slug === RANGE_STARTER_KIT_SLUG || kit.slug === PEN_STARTER_KIT_SLUG;

  const add = (vid: string | null) => {
    const v = (kit.variants ?? []).find((x) => x.id === vid);
    addItem(kit.slug, 1, { variantId: vid, variantLabel: v?.label ?? kit.name, pack: "single", source });
  };
  const switchVariant = (vid: string) => {
    if (!option.variantIds.includes(vid)) return;
    if (!owned) return;
    if (!equipmentOptionAvailability(kit, vid, items).canAdd) return;
    removeItem(owned.key);
    add(vid);
  };

  return (
    <li className="border-t border-primary/15 pt-3 first:border-t-0 first:pt-0">
      <Link to="/product/$slug" params={{ slug: kit.slug }} className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline">
        <PackagePlus className="h-4 w-4" aria-hidden="true" />
        {kit.name} · {formatPrice(opt.unitPrice)}
      </Link>
      {contents ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{contents}</p> : null}
      {option.variantIds.length > 1 ? (
        <>
          <label htmlFor={selectId} className="sr-only">{`${kit.name} option`}</label>
          <select
            id={selectId}
            className="mt-2 h-9 w-full rounded-md border border-input bg-background px-2 text-[11px] font-semibold text-foreground"
            value={chosen ?? ""}
            disabled={!owned}
            onChange={(e) => switchVariant(e.target.value)}
          >
            {option.variantIds.map((id) => {
              const v = (kit.variants ?? []).find((x) => x.id === id)!;
              const s = equipmentOptionAvailability(kit, id, items);
              return (
                <option key={id} value={id} disabled={!s.canAdd && owned?.variantId !== id}>
                  {v.label} — {formatPrice(getProductOption(kit, id, "single").unitPrice)}
                  {s.comingSoon ? " · Coming soon" : s.soldOut ? " · Sold out" : ""}
                </option>
              );
            })}
          </select>
        </>
      ) : null}
      {owned ? (
        <Button type="button" size="sm" variant="outline" className="mt-2 w-full border-accent" onClick={() => removeItem(owned.key)}
          aria-label={`Remove ${kit.name} from cart`}>
          Added · Remove
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2 w-full"
          disabled={!state.canAdd}
          onClick={() => {
            if (!state.canAdd) return;
            add(chosen);
            toast.success(`${kit.name}${variant ? ` — ${variant.label}` : ""} added to cart`);
          }}
        >
          {isStarterKit
            ? state.canAdd ? labels.add_label : state.comingSoon ? labels.coming_soon_label : labels.unavailable_label
            : state.canAdd ? `Add ${kit.name}` : state.comingSoon ? "Coming soon" : "Sold out"}
        </Button>
      )}
    </li>
  );
}
