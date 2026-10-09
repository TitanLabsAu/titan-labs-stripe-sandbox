/** Responsive candidates generated from the existing shipped art (no new artwork). CMS uploads keep their own URL. */
const ART_SETS: Record<string, string> = {
  "/images/titan-discovery.webp": "/images/titan-discovery-960.webp 960w, /images/titan-discovery.webp 1672w",
  "/images/titan-discovery-light.webp": "/images/titan-discovery-light-960.webp 960w, /images/titan-discovery-light.webp 1672w",
  "/images/titan-membership-card.webp": "/images/titan-membership-card-960.webp 960w, /images/titan-membership-card.webp 1672w",
  "/images/titan-membership-card-light.webp": "/images/titan-membership-card-light-960.webp 960w, /images/titan-membership-card-light.webp 1672w",
  "/images/titan-catalogue-banner.webp": "/images/titan-catalogue-banner-960.webp 960w, /images/titan-catalogue-banner.webp 2172w",
  "/images/titan-pen-guide-banner-light.webp": "/images/titan-pen-guide-banner-light-960.webp 960w, /images/titan-pen-guide-banner-light.webp 1920w",
  "/images/titan-testing-laboratory.webp": "/images/titan-testing-laboratory-480.webp 480w, /images/titan-testing-laboratory-960.webp 960w, /images/titan-testing-laboratory.webp 1254w",
  "/images/product-light/testing-laboratory-light.webp": "/images/product-light/testing-laboratory-light-480.webp 480w, /images/product-light/testing-laboratory-light.webp 1024w",
};

export function artDelivery(src: string, sizes: string): { srcSet?: string; sizes?: string } {
  const set = ART_SETS[src];
  return set ? { srcSet: set, sizes } : {};
}

/* ---------- alternate-theme preload / decode cache ---------- */
const decoded = new Map<string, Promise<void>>();

function keyOf(img: HTMLImageElement) {
  return `${img.getAttribute("src") ?? ""}|${img.getAttribute("srcset") ?? ""}|${img.getAttribute("sizes") ?? ""}`;
}

/** Decodes the exact responsive candidate the browser would choose for this <img>; deduped, low priority. */
export function decodeLike(img: HTMLImageElement): Promise<void> {
  const key = keyOf(img);
  const hit = decoded.get(key);
  if (hit) return hit;
  const probe = new Image();
  probe.decoding = "async";
  try { (probe as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "low"; } catch { /* unsupported */ }
  const sizes = img.getAttribute("sizes");
  const srcset = img.getAttribute("srcset");
  if (sizes) probe.sizes = sizes;
  if (srcset) probe.srcset = srcset;
  probe.src = img.getAttribute("src") ?? "";
  const p = probe.decode().catch(() => { decoded.delete(key); });
  decoded.set(key, p);
  return p;
}

export function constrainedNetwork(): boolean {
  if (typeof navigator === "undefined") return true;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return Boolean(c?.saveData || (c?.effectiveType && /(^|-)2g$/.test(c.effectiveType)));
}

function pairOf(img: HTMLImageElement, theme: "dark" | "light") {
  const sib = [img.previousElementSibling, img.nextElementSibling].find(
    (el) => el instanceof HTMLImageElement && el.dataset["themeVariant"] === theme,
  );
  return (sib as HTMLImageElement | undefined) ?? null;
}

/**
 * Watches visible themed images and, when idle, decodes only their alternate-theme partner.
 * Returns a cleanup function.
 */
export function watchAlternates(getTheme: () => "dark" | "light"): () => void {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined" || constrainedNetwork()) return () => {};
  const idle = (cb: () => void) =>
    "requestIdleCallback" in window ? (window as Window & { requestIdleCallback: (c: () => void, o?: object) => number }).requestIdleCallback(cb, { timeout: 3000 }) : globalThis.setTimeout(cb, 1200);
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const img = e.target as HTMLImageElement;
      const other = getTheme() === "light" ? "dark" : "light";
      const alt = pairOf(img, other);
      if (alt) idle(() => { void decodeLike(alt); });
    }
  }, { rootMargin: "100px" });
  const scan = () => {
    const theme = getTheme();
    document.querySelectorAll<HTMLImageElement>(`img[data-theme-variant="${theme}"]`).forEach((i) => io.observe(i));
  };
  let timer = 0;
  const mo = new MutationObserver(() => { window.clearTimeout(timer); timer = window.setTimeout(scan, 400); });
  const start = () => { scan(); mo.observe(document.body, { childList: true, subtree: true }); };
  if (document.readyState === "complete") idle(start);
  else window.addEventListener("load", () => idle(start), { once: true });
  return () => { io.disconnect(); mo.disconnect(); window.clearTimeout(timer); };
}

/** Before a switch: decode incoming art for on-screen pairs (max ~600ms) so outgoing art stays until ready. */
export function prepareSwitch(next: "dark" | "light"): Promise<unknown> {
  if (typeof document === "undefined") return Promise.resolve();
  const vh = window.innerHeight;
  const targets = [...document.querySelectorAll<HTMLImageElement>(`img[data-theme-variant="${next}"]`)].filter((img) => {
    const partner = pairOf(img, next === "light" ? "dark" : "light");
    const r = partner?.getBoundingClientRect();
    return r && r.width > 0 && r.bottom > 0 && r.top < vh;
  }).slice(0, 12);
  if (!targets.length) return Promise.resolve();
  return Promise.race([Promise.all(targets.map(decodeLike)), new Promise((r) => setTimeout(r, 600))]);
}
