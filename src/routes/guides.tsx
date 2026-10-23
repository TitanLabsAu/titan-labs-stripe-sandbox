import { createFileRoute, redirect } from "@tanstack/react-router";

// Short alias for Titan Guides; the original /pen-guide URL stays the canonical page.
export const Route = createFileRoute("/guides")({
  beforeLoad: () => { throw redirect({ to: "/pen-guide", statusCode: 301 }); },
});
