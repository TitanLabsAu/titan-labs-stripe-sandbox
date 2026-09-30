/** Titan's Research Lab — shared, browser-safe types and helpers. */

export type ResearchSection = { heading: string; body: string };
export type ResearchReference = { title: string; url: string; source: string; year: string };

export type ResearchEntry = {
  id: string;
  slug: string;
  title: string;
  category: string;
  tags: string[];
  summary: string;
  content: ResearchSection[];
  synonyms: string[];
  molecular_formula: string | null;
  sequence: string | null;
  cas_number: string | null;
  pubchem_cid: string | null;
  research_findings: string[];
  source_references: ResearchReference[];
  published: boolean;
  published_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

export function toResearchEntry(row: any): ResearchEntry {
  const sections = Array.isArray(row?.content) ? row.content : [];
  const findings = Array.isArray(row?.research_findings) ? row.research_findings : [];
  const refs = Array.isArray(row?.source_references) ? row.source_references : [];
  return {
    id: str(row.id),
    slug: str(row.slug),
    title: str(row.title),
    category: str(row.category),
    tags: Array.isArray(row.tags) ? row.tags.map(str).filter(Boolean) : [],
    summary: str(row.summary),
    content: sections
      .map((s: any) => ({ heading: str(s?.heading), body: str(s?.body) }))
      .filter((s: ResearchSection) => s.heading || s.body),
    synonyms: Array.isArray(row.synonyms) ? row.synonyms.map(str).filter(Boolean) : [],
    molecular_formula: row.molecular_formula ?? null,
    sequence: row.sequence ?? null,
    cas_number: row.cas_number ?? null,
    pubchem_cid: row.pubchem_cid ?? null,
    research_findings: findings.map(str).filter(Boolean),
    source_references: refs
      .map((r: any) => ({ title: str(r?.title), url: str(r?.url), source: str(r?.source), year: str(r?.year) }))
      .filter((r: ResearchReference) => r.title || r.url),
    published: Boolean(row.published),
    published_at: row.published_at ?? null,
    sort_order: Number(row.sort_order ?? 0),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
  };
}

/** Only allow http(s) links to be rendered as clickable references. */
export function safeUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function pubchemUrl(cid: string | null) {
  const clean = (cid ?? "").trim();
  return /^\d+$/.test(clean) ? `https://pubchem.ncbi.nlm.nih.gov/compound/${clean}` : null;
}
