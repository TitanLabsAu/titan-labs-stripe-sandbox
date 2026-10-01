/** Titan's Research Lab — shared, browser-safe types and helpers. */

export type ResearchSection = { heading: string; body: string };

export const EVIDENCE_TYPES = [
  ["in_vitro", "In vitro"],
  ["animal", "Animal / preclinical"],
  ["human_observational", "Human observational"],
  ["human_trial", "Human clinical trial"],
  ["rct", "Randomised controlled trial"],
  ["review", "Systematic review / meta-analysis"],
  ["regulatory", "Regulatory / official"],
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number][0] | "";

export type ResearchReference = {
  title: string;
  authors: string;
  source: string; // journal / authority
  year: string;
  pmid: string;
  doi: string;
  url: string;
  evidence_type: EvidenceType;
  note: string; // admin-only
};

export const EVIDENCE_STATUSES = [
  ["not_reviewed", "Not reviewed"],
  ["preclinical", "Preclinical evidence"],
  ["limited_human", "Limited human evidence"],
  ["human_clinical", "Human clinical evidence"],
  ["established_clinical", "Established clinical literature"],
  ["mixed", "Mixed / conflicting evidence"],
  ["insufficient", "Insufficient evidence"],
] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number][0];

export const VERIFICATION_STATUSES = [
  ["unverified", "Unverified"],
  ["partially_verified", "Partially verified"],
  ["verified", "Verified"],
  ["needs_correction", "Needs correction"],
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number][0];

export const CLAIM_FIELDS = [
  ["summary", "Summary"],
  ["context", "Research context"],
  ["mechanism", "Reported mechanism"],
  ["findings", "Areas studied / research findings"],
  ["identifiers", "Composition / identifiers"],
] as const;
export type ClaimField = (typeof CLAIM_FIELDS)[number][0];

export const CLAIM_STATES = [
  ["not_checked", "Not yet checked"],
  ["verified", "Verified"],
  ["needs_qualification", "Needs qualification"],
  ["unsupported", "Unsupported"],
] as const;
export type ClaimState = (typeof CLAIM_STATES)[number][0];
export type ClaimChecks = Partial<Record<ClaimField, ClaimState>>;

export const BLEND_NOTICE =
  "Evidence relating to the individual ingredients of this blend does not establish the effects of the combined formulation. No direct published research on this specific combination is referenced here unless listed below.";

export const label = (list: readonly (readonly [string, string])[], v: string) =>
  list.find(([k]) => k === v)?.[1] ?? v;

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
  evidence_status: EvidenceStatus;
  verification_status: VerificationStatus;
  claim_checks: ClaimChecks;
  blend_notice: boolean;
};

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const evTypes = EVIDENCE_TYPES.map(([k]) => k as string);

export function toReference(r: any): ResearchReference {
  const t = str(r?.evidence_type);
  return {
    title: str(r?.title),
    authors: str(r?.authors),
    source: str(r?.source),
    year: str(r?.year),
    pmid: str(r?.pmid),
    doi: str(r?.doi),
    url: str(r?.url),
    evidence_type: (evTypes.includes(t) ? t : "") as EvidenceType,
    note: str(r?.note),
  };
}

export function toResearchEntry(row: any): ResearchEntry {
  const sections = Array.isArray(row?.content) ? row.content : [];
  const findings = Array.isArray(row?.research_findings) ? row.research_findings : [];
  const refs = Array.isArray(row?.source_references) ? row.source_references : [];
  const checks = row?.claim_checks && typeof row.claim_checks === "object" ? row.claim_checks : {};
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
    source_references: refs.map(toReference).filter((r: ResearchReference) => r.title || r.url || r.pmid || r.doi),
    published: Boolean(row.published),
    published_at: row.published_at ?? null,
    sort_order: Number(row.sort_order ?? 0),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
    evidence_status: (row.evidence_status ?? "not_reviewed") as EvidenceStatus,
    verification_status: (row.verification_status ?? "unverified") as VerificationStatus,
    claim_checks: checks as ClaimChecks,
    blend_notice: Boolean(row.blend_notice),
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

export function pubmedUrl(pmid: string) {
  const c = pmid.trim();
  return /^\d+$/.test(c) ? `https://pubmed.ncbi.nlm.nih.gov/${c}/` : null;
}

export function doiUrl(doi: string) {
  const c = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  return /^10\.\S+\/\S+$/.test(c) ? `https://doi.org/${c}` : null;
}
