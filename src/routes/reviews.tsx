import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquareQuote } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TitanPageHeading } from "@/components/TitanPageHeading";
import { ReviewCard, usePublishedReviews } from "@/components/ReviewsStrip";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Customer Reviews | Titan Labs Aus" },
      { name: "description", content: "Read genuine reviews from the Titan Labs Aus community." },
      { property: "og:title", content: "Customer Reviews | Titan Labs Aus" },
      { property: "og:description", content: "Genuine feedback from the Titan Labs Aus community." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const { data, isLoading } = usePublishedReviews();
  const reviews = data ?? [];
  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell pb-20 pt-8 sm:pt-12">
        <TitanPageHeading icon={MessageSquareQuote} eyebrow="Community" title="Customer reviews" />
        {isLoading ? (
          <p className="py-10 text-sm text-muted-foreground">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
            <p className="font-bold uppercase">No reviews published yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Check back soon. In the meantime, browse the catalogue.</p>
            <Link to="/range" className="mt-4 inline-block text-sm font-bold uppercase text-primary hover:underline">View catalogue</Link>
          </div>
        ) : (
          <div className="review-band mt-8 grid gap-5 rounded-2xl p-5 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
