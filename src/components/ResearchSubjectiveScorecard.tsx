import { researchSubjectiveRatings } from "@/lib/research-subjective-ratings";
import type { ResearchEntry } from "@/lib/research";

export function ResearchSubjectiveScorecard({ entry, entries }: { entry: ResearchEntry; entries: ResearchEntry[] }) {
  const ratings = researchSubjectiveRatings(entry, entries);
  if (!ratings) return null;
  return <section className="research-subjective-scorecard" aria-labelledby="research-opinion-title" data-subjective-ratings>
    <h3 id="research-opinion-title">How it rates</h3>
    <p className="research-opinion-notice">Editorial opinion scores out of 100; not clinical measurements or safety guidance.</p>
    <div className="research-score-grid">
      <dl className="research-score-rows">{ratings.metrics.map(metric => <div key={metric.label}><dt>{metric.label}</dt><dd className="research-mono">{metric.value} / 100</dd></div>)}</dl>
      <div className="research-rating-panel"><h4>Overall editorial opinion</h4><p className="research-mono">{ratings.overall} / 100</p></div>
    </div>
  </section>;
}
