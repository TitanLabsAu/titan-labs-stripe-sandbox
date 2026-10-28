import { z } from "zod";
import { promotedPrice } from "./variant-promotions";
export const WEBSITE_PROMOTION_KEY = "website_promotion";
export const websitePromotionSchema = z
  .object({
    enabled: z.boolean().default(false),
    title: z.string().trim().min(1).max(80).default("Christmas Sale"),
    percent: z.number().int().min(1).max(90).default(10),
    excludedProductIds: z.array(z.string().uuid()).max(2000).default([]),
  })
  .strict();
export type WebsitePromotion = z.infer<typeof websitePromotionSchema>;
export function validateWebsitePromotion(value: unknown) {
  return websitePromotionSchema.parse(value);
}
export function parseWebsitePromotion(
  raw: string | undefined | null,
): WebsitePromotion {
  try {
    return validateWebsitePromotion(raw ? JSON.parse(raw) : {});
  } catch {
    return validateWebsitePromotion({});
  }
}
/** Best price wins: never compound an individual sale with the website discount. Round once to cents. */
export function websiteSalePrice(
  regular: number,
  individualSale: number | null | undefined,
  id: string | undefined,
  promotion: WebsitePromotion,
): number {
  const current = promotedPrice(regular, individualSale);
  if (!promotion.enabled || !id || promotion.excludedProductIds.includes(id))
    return current;
  const sitePrice =
    Math.max(
      1,
      Math.round((Math.round(regular * 100) * (100 - promotion.percent)) / 100),
    ) / 100;
  return Math.min(current, sitePrice);
}
export async function readWebsitePromotion(
  client: any,
): Promise<WebsitePromotion> {
  const { data, error } = await client
    .from("site_content")
    .select("body")
    .eq("key", WEBSITE_PROMOTION_KEY)
    .maybeSingle();
  if (error)
    throw new Error(
      "We couldn't confirm website sale prices. Please try again.",
    );
  if (!data?.body) return parseWebsitePromotion(undefined);
  try {
    return validateWebsitePromotion(JSON.parse(data.body));
  } catch {
    throw new Error(
      "Website sale configuration is invalid. Please try again later.",
    );
  }
}
