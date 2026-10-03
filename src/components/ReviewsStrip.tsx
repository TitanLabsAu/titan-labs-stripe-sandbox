import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Pause, Play, Quote, Star } from "lucide-react";
import { listPublishedReviews } from "@/lib/reviews.functions";
import type { CustomerReview } from "@/lib/reviews";
import { cn } from "@/lib/utils";
import { cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";

export function usePublishedReviews() {
  return useQuery({ queryKey: ["published-reviews"], queryFn: () => listPublishedReviews(), staleTime: 60_000 });
}

export function ReviewCard({ review, className }: { review: CustomerReview; className?: string }) {
  return (
    <figure className={cn("review-card flex flex-col justify-between rounded-2xl border p-6", className)}>
      <div>
        <Quote className="h-6 w-6 text-[color:var(--review-gold)]" aria-hidden />
        {review.rating ? (
          <p className="mt-3 flex gap-0.5" aria-label={`${review.rating} out of 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} aria-hidden className={cn("h-4 w-4", i < review.rating! ? "fill-[color:var(--review-gold)] text-[color:var(--review-gold)]" : "text-[color:var(--review-muted)]")} />
            ))}
          </p>
        ) : null}
        <blockquote className="mt-3 whitespace-pre-wrap text-sm leading-6">“{review.review_text}”</blockquote>
      </div>
      <figcaption className="mt-5 border-t border-[color:var(--review-line)] pt-4">
        <p className="font-display text-sm font-black uppercase tracking-wide">{review.reviewer_name}</p>
        {review.location ? <p className="text-xs text-[color:var(--review-muted)]">{review.location}</p> : null}
      </figcaption>
    </figure>
  );
}

export function ReviewsStrip() {
  const { data } = usePublishedReviews();
  const reviews = data ?? [];
  const c = cmsValues(useSiteContent().data, "home_reviews");
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  if (!c.visible || reviews.length === 0) return null;
  const animate = c.autoplay === true && reviews.length > 1 && !reduced;
  const perCard = c.speed === "slow" ? 13 : c.speed === "fast" ? 6 : 9;

  return (
    <section aria-labelledby="community-reviews" className="review-band py-14">
      <div className="page-shell">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="technical-label text-[color:var(--review-blue)]">{c.eyebrow}</p>
            <h2 id="community-reviews" className="font-display mt-2 text-2xl font-black uppercase sm:text-3xl">{c.title}</h2>
          </div>
          <div className="flex items-center gap-3">
            {animate ? (
              <button type="button" onClick={() => setPaused((p) => !p)} aria-pressed={paused} className="inline-flex items-center gap-2 rounded-full border border-[color:var(--review-line)] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em]">
                {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                {paused ? c.play_label : c.pause_label}
              </button>
            ) : null}
            {c.cta_label ? <Link to="/reviews" className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--review-blue)] hover:underline">{c.cta_label}</Link> : null}
          </div>
        </div>
      </div>
      <div className={cn("review-viewport mt-8", animate ? "overflow-hidden" : "overflow-x-auto")}>
        <div className={cn("review-track flex w-max gap-5 px-4", animate && "review-track--animate", paused && "review-track--paused")} style={animate ? { animationDuration: `${Math.max(c.speed === "normal" ? 30 : c.speed === "slow" ? 45 : 20, reviews.length * perCard)}s` } : undefined}>
          {reviews.map((r) => <ReviewCard key={r.id} review={r} className="w-[19rem] sm:w-[22rem]" />)}
          {animate ? (
            <div aria-hidden="true" className="flex gap-5" inert>
              {reviews.map((r) => <ReviewCard key={`dup-${r.id}`} review={r} className="w-[19rem] sm:w-[22rem]" />)}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
