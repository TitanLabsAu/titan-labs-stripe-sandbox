import { createServerFn } from "@tanstack/react-start";
import { resolveStripePublicConfig } from "@/lib/stripe-config";

/** Returns only the publishable key and its mode; the secret key is used solely for mode comparison. */
export const getStripePublicConfig = createServerFn({ method: "GET" }).handler(async () => {
  return resolveStripePublicConfig({
    runtimeKey: process.env["STRIPE_PUBLISHABLE_KEY"],
    buildKey: import.meta.env["VITE_STRIPE_PUBLISHABLE_KEY"] as string | undefined,
    secretKey: process.env["STRIPE_SECRET_KEY"],
  });
});
