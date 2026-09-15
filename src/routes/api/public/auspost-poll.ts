import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/auspost-poll")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = await authenticateCronRequest(request);
        if (unauthorized) return unauthorized;

        try {
          const { syncAustraliaPostTracking } = await import("@/lib/auspost.server");
          const summary = await syncAustraliaPostTracking();
          return Response.json({ ok: true, ...summary });
        } catch (error) {
          console.error("[auspost-poll]", error);
          return Response.json({ ok: false, error: "Tracking sync failed" }, { status: 500 });
        }
      },
    },
  },
});
