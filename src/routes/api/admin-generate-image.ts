import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/** Admin-only AI product photo generation. Returns a preview; nothing is saved here. */
export const Route = createFileRoute("/api/admin-generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const json = (status: number, body: unknown) =>
          new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!token) return json(401, { error: "Please sign in again." });
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const sb = createClient(process.env["SUPABASE_URL"]!, key, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: userData, error: userErr } = await sb.auth.getUser(token);
        if (userErr || !userData.user) return json(401, { error: "Please sign in again." });
        const { data: isAdmin } = await sb.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
        if (!isAdmin) return json(403, { error: "Admins only." });

        let prompt = "";
        try {
          prompt = String((await request.json())?.prompt ?? "").trim();
        } catch {
          /* ignore */
        }
        if (prompt.length < 5 || prompt.length > 1000)
          return json(400, { error: "Describe the photo in 5–1000 characters." });

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json(500, { error: "Image generation is not configured." });
        const { generateProductImage } = await import("@/lib/image-gateway.server");
        const result = await generateProductImage(
          apiKey,
          `Professional e-commerce product photo, clean studio lighting, plain light background. ${prompt}`,
        );
        if (!result.ok) return json(result.status, { error: result.message });
        return json(200, { b64: result.b64 });
      },
    },
  },
});
