import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { validateReviewInput, type CustomerReview, type ReviewInput } from "@/lib/reviews";

const COLS = "id, reviewer_name, review_text, location, rating, published, sort_order, created_at";

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
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      console.error("listPublishedReviews", error);
      return [];
    }
    return (data ?? []) as CustomerReview[];
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
    return (data ?? []) as CustomerReview[];
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
