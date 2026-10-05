import { SITE_ORIGIN } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { useSiteContent } from "@/lib/useCatalog";
import { contentAlign, homeValue } from "@/lib/homeContent";

export const Route = createFileRoute("/privacy")({
  head: () => ({ links: [{rel:"canonical",href:`${SITE_ORIGIN}/privacy`}],
    meta: [
      { title: "Privacy Policy | Titan Labs Australia" },
      { name: "description", content: "How Titan Labs Australia collects, uses and protects your personal information." },
      { property: "og:title", content: "Privacy Policy | Titan Labs Australia" },
      { property: "og:description", content: "How Titan Labs Australia handles your personal information." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { data: content } = useSiteContent();
  return (
    <LegalPage eyebrow="Your information" title="Privacy Policy">
      <LegalSection heading="Privacy Policy" text={homeValue(content, "legal_privacy")} align={contentAlign(content, "legal_privacy")} />
    </LegalPage>
  );
}

