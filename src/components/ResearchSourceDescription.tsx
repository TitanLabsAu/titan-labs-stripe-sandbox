import type { ResearchEntry } from "@/lib/research";
import { researchSourceDescription } from "@/lib/research-source-descriptions";

/** One page-level explanation of borrowed source wording, so cards stay compact. */
export const SOURCE_ATTRIBUTION_NOTE =
  "Quotations marked “Source: Donny Optimize” are third-party opinion wording shown for context. They are not Titan research findings or endorsements of efficacy, safety or medical approval; each entry's research notes provide the qualifications.";

export function SourceAttributionNote({ className = "" }: { className?: string }) {
  return <p className={`text-xs leading-5 text-muted-foreground ${className}`} data-source-attribution-note>{SOURCE_ATTRIBUTION_NOTE}</p>;
}

/** Compact credit placed directly beside borrowed wording. */
export function SourceCite() {
  return <cite className="research-source-cite">Source: <b>Donny Optimize</b></cite>;
}

/** Attributed quotation, deliberately separate from the saved scientific content. */
export function ResearchSourceDescription({ entry, entries, prominent = false }: {
  entry: ResearchEntry | undefined;
  entries: ResearchEntry[];
  prominent?: boolean;
}) {
  const source = researchSourceDescription(entry, entries);
  if (!source) return null;
  return (
    <figure data-research-source-description className={`mt-4 border-l-2 border-border pl-3 ${prominent ? "py-2 sm:pl-5" : "py-1"}`}>
      <p className={`font-display font-bold text-foreground ${prominent ? "text-2xl" : "text-base"}`}>“{source.nick}”</p>
      <blockquote className={`mt-1 break-words italic text-foreground/90 ${prominent ? "text-base leading-7" : "text-sm leading-6"}`}>{source.one}</blockquote>
      <figcaption><SourceCite /></figcaption>
    </figure>
  );
}
