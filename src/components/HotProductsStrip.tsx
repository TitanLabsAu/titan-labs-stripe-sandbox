import { useEffect, useState } from "react";
import { Flame, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { RichText } from "@/components/RichText";
import { homeValue } from "@/lib/homeContent";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/products";

export function HotProductsStrip({ products, content }: { products: Product[]; content: Record<string, string> | undefined }) {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update(); mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  if (!products.length) return null;
  const animate = !reduced;
  // Repeat short selections so a desktop viewport stays filled throughout the loop.
  const selection = animate ? Array.from({ length: Math.max(1, Math.ceil(4 / products.length)) }, () => products).flat() : products;
  return <section aria-labelledby="hot-products-heading" className="hot-products-band py-14">
    <div className="page-shell flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="discovery-eyebrow mb-3"><Flame aria-hidden="true" className="h-5 w-5" />Selected // Current</p>
        <h2 id="hot-products-heading" className="font-display text-3xl font-bold uppercase"><RichText inline text={homeValue(content, "home_featured_title")} /></h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"><RichText inline text={homeValue(content, "home_featured_note")} /></p>
      </div>
      {animate ? <Button variant="outline" size="sm" onClick={() => setPaused(v => !v)} aria-label={paused ? "Play hot products" : "Pause hot products"} aria-pressed={paused}>{paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}{paused ? "Play" : "Pause"}</Button> : null}
    </div>
    <div className={cn("review-viewport mt-8", animate ? "overflow-hidden" : "overflow-x-auto")}>
      <div className={cn("review-track flex w-max gap-5 px-4", animate && "review-track--animate", paused && "review-track--paused")} style={animate ? { animationDuration: `${Math.max(40, selection.length * 12)}s` } : undefined}>
        {selection.map((p, i) => <div key={`${p.slug}-${i}`} className="w-[min(26rem,calc(100vw-2rem))] shrink-0"><ProductCard product={p} /></div>)}
        {animate ? <div aria-hidden="true" inert className="flex gap-5">{selection.map((p, i) => <div key={`clone-${p.slug}-${i}`} className="w-[min(26rem,calc(100vw-2rem))] shrink-0"><ProductCard product={p} /></div>)}</div> : null}
      </div>
    </div>
  </section>;
}
