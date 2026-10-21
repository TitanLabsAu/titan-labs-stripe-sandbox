import type { ResearchEntry } from "@/lib/research";
import { researchSourceDescription } from "@/lib/research-source-descriptions";

/** Attributed quotation, deliberately separate from the saved scientific content. */
export function ResearchSourceDescription({ entry, entries, prominent = false }: {
  entry: ResearchEntry | undefined;
  entries: ResearchEntry[];
  prominent?: boolean;
}) {
  const source = researchSourceDescription(entry, entries);
  if (!source) return null;
  return (
    <div data-research-source-description className={`mt-4 border-l-2 border-primary pl-3 ${prominent ? "py-2 sm:pl-5" : "py-1"}`}>
      <p className="text-xs font-semibold leading-5 text-muted-foreground">Donny Optimize source description</p>
      <p className={`mt-1 font-display font-bold text-foreground ${prominent ? "text-2xl" : "text-base"}`}>{source.nick}</p>
      <blockquote className={`mt-2 break-words text-foreground ${prominent ? "text-base leading-7" : "text-sm leading-6"}`}>{source.one}</blockquote>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">Source quotation, not a verified Titan finding or endorsement of efficacy, safety or medical approval. Existing research notes provide qualifications.</p>
    </div>
  );
}