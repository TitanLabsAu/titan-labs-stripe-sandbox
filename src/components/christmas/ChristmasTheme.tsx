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
import { SantaHat, PineSprig, Wreath } from "./ChristmasArt";

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
      <ChristmasChrome />
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
function ChristmasChrome() {
  const s = useContext(ChristmasContext);
  if (!s.enabled) return null;
  return (
    <div
      className={`christmas-chrome christmas-${s.density}`}
      aria-hidden="true"
    >
      {s.lights ? (
        <svg
          className="christmas-lights"
          viewBox="0 0 1200 32"
          preserveAspectRatio="none"
          focusable="false"
        >
          <path
            d="M0 5Q60 30 120 5T240 5T360 5T480 5T600 5T720 5T840 5T960 5T1080 5T1200 5"
            fill="none"
            stroke="#a98945"
            strokeWidth="1.5"
          />
          {Array.from({ length: 31 }, (_, i) => (
            <g key={i}>
              <ellipse
                cx={i * 40}
                cy={i % 3 === 0 ? 9 : 19}
                rx="8"
                ry="10"
                fill="#e6bb5f"
                opacity=".18"
              />
              <ellipse
                cx={i * 40}
                cy={i % 3 === 0 ? 9 : 19}
                rx="2.5"
                ry="4"
                fill="#fff0b9"
              />
            </g>
          ))}
        </svg>
      ) : null}
      {s.greenery ? (
        <>
          <PineSprig className="christmas-corner christmas-corner-left" />
          <PineSprig className="christmas-corner christmas-corner-right" />
        </>
      ) : null}
    </div>
  );
}
