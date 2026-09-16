import klow80 from "@/assets/klow80.asset.json";
import wolverine from "@/assets/wolverine.asset.json";
import nad1000 from "@/assets/nad1000.asset.json";

export type ProductLink = { label: string; url: string };

export type Product = {
  slug: string;
  name: string;
  /** Price the customer pays (already the sale price when one is set). */
  price: number;
  /** Original price, present only when the product is on sale. */
  wasPrice?: number | null;
  promoLabel?: string;
  image: string;
  alt: string;
  blurb: string;
  description?: string;
  details: string[];
  categories?: string[];
  protocol?: string;
  reconVialMg?: number | null;
  reconWaterMl?: number | null;
  reconDoseMcg?: number | null;
  reconNotes?: string;
  links?: ProductLink[];
};

export const products: Product[] = [
  {
    slug: "klow-80mg",
    name: "KLOW 80mg",
    price: 140,
    image: klow80.url,
    alt: "KLOW 80mg vials by Titan Labs",
    blurb:
      "A premium blended 80mg vial, batch tested for purity and shipped discreetly across Australia.",
    details: ["80mg per vial", "Lab tested for purity", "Express, insured shipping"],
  },
  {
    slug: "nad-1000mg",
    name: "NAD+ 1000mg",
    price: 120,
    image: nad1000.url,
    alt: "NAD+ 1000mg vials by Titan Labs",
    blurb: "High strength 1000mg NAD+ for wellness research protocols.",
    details: ["1000mg per vial", "Lab tested for purity", "Express, insured shipping"],
  },
  {
    slug: "wolverine-20mg",
    name: "Wolverine 20mg",
    price: 120,
    image: wolverine.url,
    alt: "Wolverine 20mg vials by Titan Labs",
    blurb: "Our recovery favourite. 20mg per vial, pure form, research use only.",
    details: ["20mg per vial", "Lab tested for purity", "Express, insured shipping"],
  },
];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);
}
