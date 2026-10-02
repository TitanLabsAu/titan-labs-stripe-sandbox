import { createFileRoute, redirect } from "@tanstack/react-router";
/** Preserve the prepared rollout URL while using the existing published-only Research Lab. */
export const Route = createFileRoute("/research-lab")({
  beforeLoad: () => {
    throw redirect({ to: "/research", replace: true });
  },
});
