import { useSiteContent, useSiteLinks } from "@/lib/useCatalog";
import { homeValue } from "@/lib/homeContent";

export function SiteFooter() {
  const { data: siteLinks } = useSiteLinks();
  const { data: content } = useSiteContent();

  return (
    <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
      {siteLinks && siteLinks.length > 0 ? (
        <p className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
          {siteLinks.map((l) => (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-accent underline underline-offset-4"
            >
              {l.label}
            </a>
          ))}
        </p>
      ) : null}
      <p>{homeValue(content, "home_footer_text")}</p>
      <p className="mt-2">Research use only. Not for human consumption.</p>
    </footer>
  );
}
