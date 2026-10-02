import type { Product } from "./products";
import type { ResearchEntry } from "./research";

/** Conservative compound-name match; links never create or publish research claims. */
export function researchProducts(
  entry: Pick<ResearchEntry, "slug" | "title" | "synonyms">,
  products: Product[],
): Product[] {
  const norm = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const names = [entry.title, ...entry.synonyms].map(norm).filter((n) => n.length >= 3);
  return products.filter(
    (p) =>
      p.catalogueSection !== "equipment" &&
      (p.slug === entry.slug ||
        names.some((n) => norm(p.name) === n || norm(p.name).startsWith(`${n} `))),
  );
}
