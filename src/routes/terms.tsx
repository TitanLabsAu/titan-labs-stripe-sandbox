import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { useSiteContent } from "@/lib/useCatalog";
import { homeValue, termsVersion } from "@/lib/homeContent";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions | Titan Labs Australia" },
      { name: "description", content: "Terms & Conditions, Research Use Notice and shipping information for Titan Labs Australia orders." },
      { property: "og:title", content: "Terms & Conditions | Titan Labs Australia" },
      { property: "og:description", content: "Terms, research-use notice and shipping information for Titan Labs Australia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { data: content } = useSiteContent();
  return (
    <LegalPage eyebrow={`Version ${termsVersion(content)}`} title="Terms & Conditions">
      <LegalSection id="terms" heading="Terms & Conditions" text={homeValue(content, "legal_terms")} />
      <LegalSection id="research-use" heading="Research Use Notice" text={homeValue(content, "legal_research_notice")} />
      <LegalSection id="shipping" heading="Shipping & Returns" text={homeValue(content, "legal_shipping")} />
    </LegalPage>
  );
}
