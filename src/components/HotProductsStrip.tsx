import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Flame, Pause, Play } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { CartSheet } from "@/components/CartSheet";
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
  // Resolve the attached plugin, not the render's candidate: Embla can retain a different
  // instance with equivalent options after Fast Refresh. Unattached candidates have no API.
  // Re-check snaps synchronously because AutoScroll skips setup for <=1 snap on resize.
  const [scrollable, setScrollable] = useState(false);
  const [initCount, setInitCount] = useState(0);
  useEffect(() => {
    if (!carousel || !scrollable || carousel.scrollSnapList().length <= 1) return;
    const attached = carousel.plugins().autoScroll;
    if (!attached) return;
    if (paused || reduced || hovered || focused || dragging) attached.stop();
    else attached.play();
  }, [carousel, autoScroll, scrollable, initCount, paused, reduced, hovered, focused, dragging]);
  useEffect(() => {
    if (!carousel) return;
    const down = () => setDragging(true);
    const up = () => setDragging(false);
    const sync = () => { setScrollable(carousel.scrollSnapList().length > 1); setInitCount((n) => n + 1); };
    sync();
    carousel.on("pointerDown", down).on("pointerUp", up).on("reInit", sync);
    return () => { carousel.off("pointerDown", down).off("pointerUp", up).off("reInit", sync); };
  }, [carousel]);
  // Edge-hover scrolling: cursor near the left/right edge moves the strip, faster closer to the edge.
  const edgeSpeed = useRef(0);
  useEffect(() => {
    if (!carousel) return;
    let frame = 0;
    const tick = () => {
      if (edgeSpeed.current) carousel.internalEngine().scrollTo.distance(edgeSpeed.current, false);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [carousel]);
  const onEdgeMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const zone = Math.min(220, rect.width * 0.22);
    const x = event.clientX - rect.left;
    if (x < zone) edgeSpeed.current = 14 * (1 - x / zone);
    else if (x > rect.width - zone) edgeSpeed.current = -14 * (1 - (rect.width - x) / zone);
    else edgeSpeed.current = 0;
  };
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
    <div className="page-shell grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
      <div className="min-w-0">
        <p className="discovery-eyebrow mb-3"><Flame aria-hidden="true" className="h-5 w-5" />Selected // Current</p>
        <h2 id="hot-products-heading" className="font-display text-3xl font-bold uppercase"><RichText inline text={homeValue(content, "home_featured_title")} /></h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"><RichText inline text={homeValue(content, "home_featured_note")} /></p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {animate ? <Button variant="outline" size="sm" onClick={() => setPaused(v => !v)} aria-label={paused ? "Play hot products" : "Pause hot products"} aria-pressed={paused}>{paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}{paused ? "Play" : "Pause"}</Button> : null}
      </div>
    </div>
    <div ref={carouselRef} className="promotions-viewport mt-8 overflow-hidden" role="region" aria-label="Promotions" aria-roledescription="carousel"
      onMouseEnter={() => setHovered(true)} onMouseMove={onEdgeMove} onMouseLeave={() => { setHovered(false); edgeSpeed.current = 0; }}
      onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <div className="promotions-track touch-pan-y pinch-zoom cursor-grab active:cursor-grabbing">
        {selection.map((p, i) => <div key={`${p.slug}-${p.variants?.[0]?.id ?? "base"}-${i}`} className="promotions-slide min-w-0 pl-4"><ProductCard product={p} aligned /></div>)}
      </div>
    </div>
    <div className="page-shell mt-4 md:hidden"><CartSheet inline /></div>
  </section>;
}
