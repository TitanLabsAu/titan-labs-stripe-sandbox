import { cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
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
  const c = cmsValues(useSiteContent().data, "page_reviews");
  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell pb-20 pt-8 sm:pt-12">
        <TitanPageHeading icon={MessageSquareQuote} eyebrow={c.eyebrow} title={c.title} />
        {isLoading ? (
          <p className="py-10 text-sm text-muted-foreground">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
            <p className="font-bold uppercase">{c.empty_title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{c.empty_body}</p>
            <Link to="/range" className="mt-4 inline-block text-sm font-bold uppercase text-primary hover:underline">{c.empty_cta}</Link>
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
