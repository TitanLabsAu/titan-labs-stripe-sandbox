import { SantaFlight } from "./SantaFlight";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { useSiteContent } from "@/lib/useCatalog";
import {
  CHRISTMAS_KEY,
  CHRISTMAS_DEFAULTS,
  allowsChristmas,
  parseChristmas,
  type ChristmasSettings,
} from "@/lib/christmas";
import { SantaHat, PineSprig, Wreath, FairyLights } from "./ChristmasArt";

const ChristmasContext = createContext<ChristmasSettings>({
  ...CHRISTMAS_DEFAULTS,
});
export function ChristmasProvider({ children }: { children: ReactNode }) {
  const { data } = useSiteContent();
  const { pathname } = useLocation();
  const raw = data?.[CHRISTMAS_KEY];
  const settings = useMemo(() => {
    const value = parseChristmas(raw);
    return allowsChristmas(pathname) ? value : { ...value, enabled: false };
  }, [raw, pathname]);
  return (
    <ChristmasContext.Provider value={settings}>
      {children}
      <SantaFlight settings={settings} />
    </ChristmasContext.Provider>
  );
}
export function ProductChristmasDecor() {
  const s = useContext(ChristmasContext);
  if (!s.enabled) return null;
  return (
    <span className="christmas-product-decor" aria-hidden="true">
      {s.hats ? <SantaHat className="christmas-card-hat" /> : null}
      {s.greenery && s.density === "full" ? (
        <PineSprig className="christmas-card-pine" />
      ) : null}
    </span>
  );
}
export function ChristmasHeroDecor({
  helmetVisible = true,
}: {
  helmetVisible?: boolean;
}) {
  const s = useContext(ChristmasContext);
  if (!s.enabled) return null;
  return (
    <div className="christmas-hero-decor" aria-hidden="true">
      {s.hats && helmetVisible ? (
        <SantaHat className="christmas-helmet-hat" />
      ) : null}
      {s.greenery ? <PineSprig className="christmas-hero-pine" /> : null}
    </div>
  );
}
export function ChristmasCatalogueWreath() {
  const s = useContext(ChristmasContext);
  return s.enabled && s.wreaths ? (
    <Wreath className="christmas-catalogue-wreath" />
  ) : null;
}
export function ChristmasHeaderDecor() {
  const s = useContext(ChristmasContext);
  if (!s.enabled) return null;
  return (
    <div
      className={`christmas-chrome christmas-${s.density}`}
      aria-hidden="true"
    >
      {s.lights ? <FairyLights className="christmas-lights" /> : null}
      {s.greenery ? (
        <>
          <PineSprig className="christmas-corner christmas-corner-left" />
          <PineSprig className="christmas-corner christmas-corner-right" />
        </>
      ) : null}
    </div>
  );
}
