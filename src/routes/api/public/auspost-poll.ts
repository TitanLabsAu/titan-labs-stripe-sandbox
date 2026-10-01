import { createFileRoute } from "@tanstack/react-router";
import { retryOrderEmails } from "@/lib/order-email-retry.server";

// Compatibility for the previous schedule URL; performs email retries only.
export const Route = createFileRoute("/api/public/auspost-poll")({
  server: { handlers: { POST: ({ request }) => retryOrderEmails(request) } },
});
