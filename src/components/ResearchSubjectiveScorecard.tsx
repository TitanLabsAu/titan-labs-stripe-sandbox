import { researchSubjectiveRatings } from "@/lib/research-subjective-ratings";
import type { ResearchEntry } from "@/lib/research";

export function ResearchSubjectiveScorecard({ entry, entries }: { entry: ResearchEntry; entries: ResearchEntry[] }) {
  const ratings = researchSubjectiveRatings(entry, entries);
  if (!ratings) return null;
  return <section className="research-subjective-scorecard" aria-labelledby="research-opinion-title" data-subjective-ratings>
    <h3 id="research-opinion-title">Source opinion ratings</h3>
    <p className="research-mono mt-2 text-muted-foreground">Donny Optimize · scores out of 100</p>
    <p className="research-opinion-notice">Third-party opinion scores, not clinical measurements, efficacy percentages, safety guidance or Titan results.</p>
    <div className="research-score-grid">
      <dl className="research-score-rows">{ratings.metrics.map(metric => <div key={metric.label}><dt>{metric.label}</dt><dd className="research-mono">{metric.value} / 100</dd></div>)}</dl>
      <div className="research-rating-panel"><span className="research-rating-ring">{ratings.overall}</span><h4>Overall source opinion</h4><p className="research-mono">{ratings.overall} / 100</p></div>
    </div>
  </section>;
}
