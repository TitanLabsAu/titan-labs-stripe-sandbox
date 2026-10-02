/** Rewards stay reserved whenever an already-created intent might still be paid. */
export async function cancelUnboundIntent(stripe: { paymentIntents: {
  cancel: (id: string) => Promise<{ status: string }>;
  retrieve: (id: string) => Promise<{ status: string }>;
} }, intentId: string | null): Promise<boolean> {
  if (!intentId) return true;
  try { return (await stripe.paymentIntents.cancel(intentId)).status === "canceled"; }
  catch {
    try { return (await stripe.paymentIntents.retrieve(intentId)).status === "canceled"; }
    catch { return false; }
  }
}
