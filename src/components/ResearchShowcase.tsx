import type { ResearchEntry } from "@/lib/research";
import { researchShowcaseDescriptor, researchShowcaseStats } from "@/lib/research-showcase";

/** Deliberately schematic: no claim to represent any compound's real structure. */
export function ResearchShowcase({ entry, entries }: { entry: ResearchEntry; entries: ResearchEntry[] }) {
  const stats = researchShowcaseStats(entry, entries);
  const descriptor = researchShowcaseDescriptor(entry, entries);
  return <div className="research-showcase" aria-label={`${entry.title} reference card`}>
    <div className="research-showcase-top"><span className="research-reference-tag">REFERENCE</span><span className="research-mono">{entry.category || "Research"}</span></div>
    <figure className="research-concept">
      <svg viewBox="0 0 360 160" role="img" aria-label="Conceptual atom illustration, not an actual verified molecular structure">
        <g className="research-orbits" fill="none" strokeWidth="1.5">
          <ellipse cx="180" cy="76" rx="96" ry="32" />
          <ellipse cx="180" cy="76" rx="96" ry="32" transform="rotate(60 180 76)" />
          <ellipse cx="180" cy="76" rx="96" ry="32" transform="rotate(-60 180 76)" />
        </g>
        <circle className="research-nucleus" cx="180" cy="76" r="14" />
        <g className="research-electrons"><circle cx="91" cy="64" r="5"/><circle cx="224" cy="137" r="5"/><circle cx="221" cy="18" r="5"/></g>
      </svg>
      <figcaption>Conceptual illustration · not actual verified structure</figcaption>
    </figure>
    <h2>{entry.title}</h2>
    {descriptor ? <p className="research-formula research-mono">
      <span className="sr-only">{descriptor.kind === "formula" ? "Formula: " : "Compound descriptor: "}</span>{descriptor.text}
    </p> : null}
    {stats.length ? <dl className="research-showcase-stats" aria-label="Editorial opinion scores out of 100">
      {stats.map(stat => <div key={stat.fullLabel}><dd>{stat.val}</dd><dt><abbr title={stat.fullLabel} aria-label={stat.fullLabel}>{stat.label}</abbr></dt></div>)}
    </dl> : null}
    {stats.length ? <p className="research-showcase-note">Editorial opinion scores out of 100; not clinical measurements or safety guidance.</p> : null}
    <div className="research-showcase-footer research-mono"><span>TITAN LABS <span>// AUS</span></span><span>RESEARCH LIBRARY</span></div>
  </div>;
}
