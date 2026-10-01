import { createFileRoute } from "@tanstack/react-router";
import { retryOrderEmails } from "@/lib/order-email-retry.server";

export const Route = createFileRoute("/api/public/order-email-retry")({
  server: { handlers: { POST: ({ request }) => retryOrderEmails(request) } },
});
