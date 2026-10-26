import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { validateReviewInput, validatePublicReview, type CustomerReview, type ReviewInput } from "@/lib/reviews";

const COLS = "id, reviewer_name, review_text, location, rating, published, sort_order, created_at, featured, archived, review_date, product_slug";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

/** Public: published reviews only (also enforced by RLS). */
export const listPublishedReviews = createServerFn({ method: "GET" }).handler(
  async (): Promise<CustomerReview[]> => {
    const { data, error } = await publicClient()
      .from("customer_reviews")
      .select(COLS)
      .eq("published", true)
      .eq("archived", false)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      console.error("listPublishedReviews", error);
      return [];
    }
    const rows = (data ?? []) as CustomerReview[];
    const { data: photos } = await publicClient().from("review_photo_uploads").select("id,review_id").eq("ready", true).in("review_id", rows.map(r => r.id));
    for (const row of rows) row.photos = (photos ?? []).filter(p => p.review_id === row.id).map(p => ({ id: p.id, url: `/api/public/review-photo?id=${p.id}` }));
    const slugs = [...new Set(rows.flatMap((r) => r.product_slug ? [r.product_slug] : []))];
    if (!slugs.length) return rows;
    const { data: products } = await publicClient().from("products").select("slug, name").eq("active", true).in("slug", slugs);
    return rows.map((r) => ({ ...r, product_name: products?.find((p) => p.slug === r.product_slug)?.name ?? null }));
  },
);

export const adminListReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CustomerReview[]> => {
    await assertAdmin(context as any);
    const { data, error } = await context.supabase
      .from("customer_reviews")
      .select(COLS)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as CustomerReview[];
    const { data: photos, error: photoError } = await context.supabase.from("review_photo_uploads").select("id,review_id,storage_path").eq("ready", true).in("review_id", rows.map(r => r.id));
    if (photoError) throw photoError;
    for (const row of rows) {
      row.photos = await Promise.all((photos ?? []).filter(p => p.review_id === row.id).map(async p => {
        const { data: signed } = await context.supabase.storage.from("review-photos").createSignedUrl(p.storage_path, 300);
        return { id: p.id, url: signed?.signedUrl ?? "" };
      }));
    }
    return rows;
  });

export const adminSaveReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ReviewInput) => ({ id: input?.id, ...validateReviewInput(input) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { id, ...row } = data;
    const q = id
      ? context.supabase.from("customer_reviews").update(row).eq("id", id)
      : context.supabase.from("customer_reviews").insert(row);
    const { error } = await q;
    if (error) throw error;
    return { ok: true };
  });

export const adminSetReviewPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; published: boolean }) => ({
    id: String(input.id),
    published: Boolean(input.published),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await context.supabase
      .from("customer_reviews")
      .update({ published: data.published })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminDeleteReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await context.supabase.from("customer_reviews").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminSetReviewFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; featured?: boolean; archived?: boolean }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input.id)) throw new Error("Invalid review");
    const flags: { featured?: boolean; archived?: boolean } = {};
    if (typeof input.featured === "boolean") flags.featured = input.featured;
    if (typeof input.archived === "boolean") flags.archived = input.archived;
    if (!Object.keys(flags).length) throw new Error("Choose a review setting");
    return { id: input.id, flags };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await context.supabase.from("customer_reviews").update(data.flags).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Anonymous visitors may submit for moderation. Existing admin-only RLS is unchanged. */
export const submitCustomerReview = createServerFn({method:"POST"})
  .inputValidator(validatePublicReview)
  .handler(async ({data}) => {
    // Import only inside the server handler: never bundle the service key.
    const {supabaseAdmin} = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now()-60*60*1000).toISOString();
    const {count,error:limitError} = await supabaseAdmin.from("customer_reviews").select("id",{count:"exact",head:true}).eq("published",false).gte("created_at",since);
    if (limitError) throw new Error("Reviews are temporarily unavailable. Please try again later.");
    if ((count ?? 0) >= 50) throw new Error("We are receiving many reviews. Please try again later.");
    const {count:nameCount,error:nameError} = await supabaseAdmin.from("customer_reviews").select("id",{count:"exact",head:true}).eq("reviewer_name",data.reviewer_name).gte("created_at",since);
    if (nameError) throw new Error("Reviews are temporarily unavailable. Please try again later.");
    if ((nameCount ?? 0) >= 3) throw new Error("Please wait before submitting another review.");
    // Retried submissions should not create duplicate moderation entries.
    const {data:duplicates,error:duplicateError} = await supabaseAdmin.from("customer_reviews").select("id").eq("reviewer_name",data.reviewer_name).eq("review_text",data.review_text).gte("created_at",new Date(Date.now()-24*60*60*1000).toISOString()).limit(1);
    if (duplicateError) throw new Error("Reviews are temporarily unavailable. Please try again later.");
    if (duplicates?.length) return {ok:true};
    const {error} = await supabaseAdmin.from("customer_reviews").insert(data);
    if (error) throw new Error("Your review could not be saved. Please try again.");
    return {ok:true};
  });
