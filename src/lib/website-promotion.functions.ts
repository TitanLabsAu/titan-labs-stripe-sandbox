import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  WEBSITE_PROMOTION_KEY,
  parseWebsitePromotion,
  validateWebsitePromotion,
  type WebsitePromotion,
} from "./website-promotion";
const conflict =
  "Website promotion changed while you were editing. Reload before saving.";
export const adminSaveWebsitePromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      settings?: WebsitePromotion;
      eligibility?: { id: string; included: boolean };
      expectedRaw: string | undefined;
    }) => {
      if (Boolean(input.settings) === Boolean(input.eligibility))
        throw new Error("Choose settings or product eligibility.");
      const settings = input.settings
        ? validateWebsitePromotion(input.settings)
        : undefined;
      const eligibility = input.eligibility;
      if (
        eligibility &&
        (typeof eligibility.included !== "boolean" ||
          !/^[0-9a-f-]{36}$/i.test(eligibility.id))
      )
        throw new Error("Invalid product eligibility.");
      return { settings, eligibility, expectedRaw: input.expectedRaw };
    },
  )
  .handler(async ({ data, context }) => {
    const { data: allowed, error: authError } = await context.supabase.rpc(
      "has_role",
      { _user_id: context.userId, _role: "admin" },
    );
    if (authError || !allowed) throw new Error("Forbidden");
    const { data: row, error: readError } = await context.supabase
      .from("site_content")
      .select("body")
      .eq("key", WEBSITE_PROMOTION_KEY)
      .maybeSingle();
    if (readError) throw readError;
    const current = row?.body as string | undefined;
    if (current !== data.expectedRaw) throw new Error(conflict);
    let settings = data.settings || parseWebsitePromotion(current);
    if (data.eligibility) {
      const { data: product, error } = await context.supabase
        .from("products")
        .select("id")
        .eq("id", data.eligibility.id)
        .maybeSingle();
      if (error || !product)
        throw new Error("Save this product before changing sale eligibility.");
      const excluded = new Set(settings.excludedProductIds);
      if (data.eligibility.included) excluded.delete(data.eligibility.id);
      else excluded.add(data.eligibility.id);
      settings = validateWebsitePromotion({
        ...settings,
        excludedProductIds: [...excluded],
      });
    } else {
      // The global panel cannot overwrite exclusions changed by a product editor.
      settings = {
        ...settings,
        excludedProductIds: parseWebsitePromotion(current).excludedProductIds,
      };
    }
    const body = JSON.stringify(settings);
    if (row) {
      const { data: updated, error } = await context.supabase
        .from("site_content")
        .update({ body })
        .eq("key", WEBSITE_PROMOTION_KEY)
        .eq("body", current!)
        .select("key");
      if (error) throw error;
      if (!updated || updated.length !== 1) throw new Error(conflict);
    } else {
      const { error } = await context.supabase
        .from("site_content")
        .insert({ key: WEBSITE_PROMOTION_KEY, body });
      if (error)
        throw new Error(
          (error as any).code === "23505"
            ? conflict
            : "Could not save website promotion.",
        );
    }
    return { raw: body };
  });
