/** Match completed statuses, never failures or "out for delivery". */
export function isCompletedDelivery(status: string | null): boolean {
  return ["delivered", "delivered in full", "item delivered"].includes(
    (status ?? "").trim().toLowerCase(),
  );
}
