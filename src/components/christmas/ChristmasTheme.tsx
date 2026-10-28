import { ThemedArt } from "@/components/ThemedImage";
import { SantaFlight } from "./SantaFlight";
import {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "@tanstack/react-router";
import { useSiteContent } from "@/lib/useCatalog";
import {
  CHRISTMAS_KEY,
  CHRISTMAS_DEFAULTS,
  allowsChristmas,
  parseChristmas,
  type ChristmasSettings,
} from "@/lib/christmas";
import {
  Wreath,
  OrganicCorners,
  OrganicGarland,
  OrganicArrangement,
} from "./ChristmasArt";

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
      {s.greenery && s.density === "full" ? (
        <OrganicArrangement className="christmas-card-pine" />
      ) : null}
    </span>
  );
}
export function ChristmasHeroDecor() {
  const s = useContext(ChristmasContext);
  if (!s.enabled) return null;
  return (
    <div className="christmas-hero-decor" aria-hidden="true">
      {s.greenery ? (
        <OrganicArrangement className="christmas-hero-pine" />
      ) : null}
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
  const [nearTop, setNearTop] = useState(true);
  useEffect(() => {
    if (!s.enabled) return undefined;
    const onScroll = () => setNearTop(window.scrollY <= 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [s.enabled]);
  if (!s.enabled) return null;
  return (
    <div
      className={`christmas-chrome christmas-${s.density}`}
      data-scrolled={!nearTop}
      aria-hidden="true"
    >
      {s.lights ? <OrganicGarland greenery={s.greenery} /> : null}
      {s.greenery ? <OrganicCorners /> : null}
    </div>
  );
}

/** The hat is composited into matching seasonal photos, so its perspective/shadow cannot drift on resize. */
export function ChristmasWelcomeArt({
  dark,
  light,
  builtin,
}: {
  dark: string;
  light: string;
  builtin: boolean;
}) {
  const s = useContext(ChristmasContext);
  const seasonal = s.enabled && s.hats && builtin;
  return (
    <ThemedArt
      className="discovery-art"
      dark={seasonal ? "/christmas/hero-dark-organic-v3.webp" : dark}
      light={seasonal ? "/christmas/hero-light-organic-v3.webp" : light}
      sizes="100vw"
      alt=""
      width={1672}
      height={941}
      priority
    />
  );
}
