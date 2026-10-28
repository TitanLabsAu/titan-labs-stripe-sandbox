import { useSiteContent } from "@/lib/useCatalog";
import { useLocation } from "@tanstack/react-router";
import { allowsChristmas } from "@/lib/christmas";
import {
  parseWebsitePromotion,
  WEBSITE_PROMOTION_KEY,
} from "@/lib/website-promotion";
export function WebsitePromotionNotice() {
  const { data } = useSiteContent();
  const { pathname } = useLocation();
  const sale = parseWebsitePromotion(data?.[WEBSITE_PROMOTION_KEY]);
  if (!sale.enabled || !allowsChristmas(pathname)) return null;
  return (
    <aside
      aria-label="Website promotion"
      className="border-b border-accent/40 bg-accent/10 px-4 py-3 text-center text-sm text-foreground"
    >
      <strong className="font-display uppercase tracking-wide">
        {sale.title}
      </strong>
      <span>
        {" "}
        · {sale.percent}% off eligible products. Prices shown include the sale
        discount.
      </span>
    </aside>
  );
}
