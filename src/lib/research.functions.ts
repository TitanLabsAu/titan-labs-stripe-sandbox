import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { toResearchEntry, type ResearchEntry } from "@/lib/research";

const PUBLIC_COLS =
  "id, slug, title, category, tags, summary, content, synonyms, molecular_formula, sequence, cas_number, pubchem_cid, research_findings, source_references, published, published_at, sort_order, created_at, updated_at, evidence_status, verification_status, blend_notice";

/** Strip admin-only metadata (claim checks, reference notes) before sending to the public. */
function toPublic(row: any): ResearchEntry {
  const e = toResearchEntry(row);
  return { ...e, claim_checks: {}, source_references: e.source_references.map((r) => ({ ...r, note: "" })) };
}

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

/** Published Research Lab entries only (anonymous read, RLS enforced). */
export const listPublishedResearch = createServerFn({ method: "GET" }).handler(
  async (): Promise<ResearchEntry[]> => {
    const { data, error } = await publicClient()
      .from("research_entries")
      .select(PUBLIC_COLS)
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });
    if (error) {
      console.error("listPublishedResearch", error.message);
      return [];
    }
    return (data ?? []).map(toResearchEntry);
  },
);

export const getPublishedResearch = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }): Promise<ResearchEntry | null> => {
    const { data: row, error } = await publicClient()
      .from("research_entries")
      .select(PUBLIC_COLS)
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) {
      console.error("getPublishedResearch", error.message);
      return null;
    }
    return row ? toResearchEntry(row) : null;
  });
