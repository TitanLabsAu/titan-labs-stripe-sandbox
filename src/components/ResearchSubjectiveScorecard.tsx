import { researchSubjectiveRatings } from "@/lib/research-subjective-ratings";
import type { ResearchEntry } from "@/lib/research";

export function ResearchSubjectiveScorecard({ entry, entries }: { entry: ResearchEntry; entries: ResearchEntry[] }) {
  const ratings = researchSubjectiveRatings(entry, entries);
  if (!ratings) return null;
  return <section className="research-subjective-scorecard" aria-labelledby="research-opinion-title" data-subjective-ratings>
    <p className="research-section-eyebrow research-mono">01 · THE SCORECARD</p>
    <h2 id="research-opinion-title">How it rates</h2>
    <p className="research-opinion-notice">Our totally-for-fun rating across the metrics beginners actually care about.</p>
    <div className="research-opinion-layout">
      <dl className="research-opinion-metrics">{ratings.metrics.map(metric => <div className="research-opinion-row" key={metric.label} data-score={metric.value}>
        <dt>{metric.label}</dt><dd className="research-mono research-opinion-value">{metric.value} / 100</dd>
        <dd className="research-opinion-track" aria-hidden="true"><span className="research-opinion-fill" style={{ width: `${metric.value}%` }} /></dd>
      </div>)}</dl>
      <div className="research-opinion-grade"><div className="research-opinion-circle" aria-hidden="true">{ratings.overall}</div><h3>Overall Grade</h3><p className="research-mono">SCORE {ratings.overall}/100</p></div>
    </div>
  </section>;
}
