import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Flame, Pause, Play } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { RichText } from "@/components/RichText";
import { homeValue } from "@/lib/homeContent";
import type { Product } from "@/lib/products";

export function HotProductsStrip({ products, content }: { products: Product[]; content: Record<string, string> | undefined }) {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const autoScroll = useMemo(() => AutoScroll({ speed: 0.6, startDelay: 500, playOnInit: false, stopOnInteraction: true, stopOnMouseEnter: false, stopOnFocusIn: false }), []);
  const [carouselRef, carousel] = useEmblaCarousel({ loop: true, dragFree: true, align: "start" }, [autoScroll]);
  useEffect(() => {
    if (!carousel) return;
    if (paused || reduced || hovered || focused || dragging) autoScroll.stop();
    else autoScroll.play();
  }, [carousel, autoScroll, paused, reduced, hovered, focused, dragging]);
  useEffect(() => {
    if (!carousel) return;
    const down = () => setDragging(true);
    const up = () => setDragging(false);
    carousel.on("pointerDown", down).on("pointerUp", up);
    return () => { carousel.off("pointerDown", down).off("pointerUp", up); };
  }, [carousel]);
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
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => carousel?.scrollPrev()} aria-label="Previous promotion" title="Previous promotion"><ArrowLeft aria-hidden="true" /></Button>
        <Button variant="outline" size="icon" onClick={() => carousel?.scrollNext()} aria-label="Next promotion" title="Next promotion"><ArrowRight aria-hidden="true" /></Button>
        {animate ? <Button variant="outline" size="sm" onClick={() => setPaused(v => !v)} aria-label={paused ? "Play hot products" : "Pause hot products"} aria-pressed={paused}>{paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}{paused ? "Play" : "Pause"}</Button> : null}
      </div>
    </div>
    <div ref={carouselRef} className="promotions-viewport mt-8 overflow-hidden" role="region" aria-label="Promotions" aria-roledescription="carousel"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <div className="flex touch-pan-y pinch-zoom cursor-grab active:cursor-grabbing">
        {selection.map((p, i) => <div key={`${p.slug}-${p.variants?.[0]?.id ?? "base"}-${i}`} className="min-w-0 flex-[0_0_min(26rem,calc(100vw-2rem))] pl-5"><ProductCard product={p} /></div>)}
      </div>
    </div>
  </section>;
}
