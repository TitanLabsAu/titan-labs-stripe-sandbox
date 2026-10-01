import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/auspost-poll")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env["AUSPOST_CRON_SECRET"];
        const bearer = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
        const ownSecretMatches = Boolean(cronSecret && bearer && bearer === cronSecret);

        if (!ownSecretMatches) {
          const unauthorized = await authenticateCronRequest(request);
          if (unauthorized) return unauthorized;
        }


        try {
          try {
            const { sendPendingOrderConfirmations } = await import("@/lib/order-confirmation.server");
            await sendPendingOrderConfirmations();
          } catch (error) {
            console.error("[order-confirmation] retry failed", error);
          }
          const { syncAustraliaPostTracking } = await import("@/lib/auspost.server");
          const summary = await syncAustraliaPostTracking();
          let milestoneEmails = 0;
          try {
            const { sendPendingMilestoneEmails } = await import("@/lib/milestone-email.server");
            milestoneEmails = (await sendPendingMilestoneEmails()).sent;
          } catch (e) {
            console.error("[milestone-email]", e);
          }
          return Response.json({ ok: true, ...summary, milestoneEmails });
        } catch (error) {
          console.error("[auspost-poll]", error);
          return Response.json({ ok: false, error: "Tracking sync failed" }, { status: 500 });
        }
      },
    },
  },
});

