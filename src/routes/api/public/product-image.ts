import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/product-image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const path = url.searchParams.get("path") ?? "";
        if (!path || path.includes("..") || path.startsWith("/")) {
          return new Response("Image not found", { status: 404 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage
          .from("product-images")
          .createSignedUrl(path, 60 * 60);

        if (error || !data?.signedUrl) {
          return new Response("Image not found", { status: 404 });
        }

        // Public catalogue photos: let browsers/CDN reuse the redirect (well
        // inside the 60-minute signature) so colour switches don't re-sign
        // and re-download a fresh unique URL every time.
        return new Response(null, {
          status: 302,
          headers: { Location: data.signedUrl, "Cache-Control": "public, max-age=1800" },
        });
      },
    },
  },
});
