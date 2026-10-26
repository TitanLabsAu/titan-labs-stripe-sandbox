import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Pause, Play, Quote } from "lucide-react";
import { listPublishedReviews } from "@/lib/reviews.functions";
import { featuredReviews, reviewDateLabel, type CustomerReview } from "@/lib/reviews";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import { ReviewPhotos } from "@/components/ReviewPhotos";

export function usePublishedReviews() {
  return useQuery({ queryKey: ["published-reviews"], queryFn: () => listPublishedReviews(), staleTime: 30_000, refetchInterval: 30_000 });
}

export function ReviewCard({ review, className }: { review: CustomerReview; className?: string }) {
  return (
    <figure className={cn("review-card min-w-0 flex flex-col justify-between rounded-2xl border p-6", className)}>
      <div>
        <Quote className="h-6 w-6 text-[color:var(--review-gold)]" aria-hidden />
        <blockquote className="mt-3 break-words whitespace-pre-wrap text-sm leading-6">“{review.review_text}”</blockquote>
        <ReviewPhotos photos={review.photos} name={review.reviewer_name} />
      </div>
      <figcaption className="mt-5 border-t border-[color:var(--review-line)] pt-4">
        <p className="font-display break-words text-sm font-black uppercase tracking-wide">{review.reviewer_name}</p>
        {review.location ? <p className="text-xs text-[color:var(--review-muted)]">{review.location}</p> : null}
        {review.product_name ? <p className="mt-1 break-words text-xs text-[color:var(--review-muted)]">{review.product_name}</p> : null}
        {review.review_date ? <time dateTime={review.review_date} className="mt-1 block text-xs text-[color:var(--review-muted)]">{reviewDateLabel(review.review_date)}</time> : null}
      </figcaption>
    </figure>
  );
}

export function ReviewsStrip() {
  const { data } = usePublishedReviews();
  const allReviews = data ?? [];
  const reviews = featuredReviews(allReviews);
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
  const submission=cmsValues(useSiteContent().data,"review_submission");
  if (!c.visible) return null;
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
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/reviews" hash="leave-review" className="inline-flex min-h-11 items-center rounded-md border border-primary bg-primary px-5 text-sm font-bold uppercase text-primary-foreground">{submission.cta_label}</Link>
            {animate ? (
              <Button variant="outline" type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play reviews" : "Pause reviews"} aria-pressed={paused} className="inline-flex items-center gap-2 rounded-full border border-[color:var(--review-line)] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em]">
                {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                {paused ? c.play_label : c.pause_label}
              </Button>
            ) : null}
            {c.cta_label && allReviews.length > 0 ? <Link to="/reviews" className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--review-blue)] hover:underline">{c.cta_label}</Link> : null}
          </div>
        </div>
      </div>
      <div className={cn("review-viewport mt-8", animate ? "overflow-hidden" : "overflow-x-auto")}>
        <div className={cn("review-track flex w-max gap-5 px-4", animate && "review-track--animate", paused && "review-track--paused")} style={animate ? { animationDuration: `${Math.max(c.speed === "normal" ? 30 : c.speed === "slow" ? 45 : 20, reviews.length * perCard)}s` } : undefined}>
          {reviews.map((r) => <ReviewCard key={r.id} review={r} className="w-[min(19rem,calc(100vw-2rem))] sm:w-[22rem]" />)}
          {animate ? (
            <div aria-hidden="true" className="flex gap-5" inert>
              {reviews.map((r) => <ReviewCard key={`dup-${r.id}`} review={r} className="w-[min(19rem,calc(100vw-2rem))] sm:w-[22rem]" />)}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
