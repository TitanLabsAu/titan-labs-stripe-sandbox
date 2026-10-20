import { supabase } from "@/integrations/supabase/client";
import type { OrderRow } from "@/components/OrderList";

export async function fetchOrders(statuses: OrderRow["status"][]): Promise<OrderRow[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, tracking_number, subtotal, shipping, total, created_at, delivered_at, payment_method, payment_confirmed, payment_confirmed_at, refunded_at, pricing_snapshot, discount_code, order_items(id, product_name, product_slug, variant_label, variant_id, unit_price, quantity)",
    )
    .eq("user_id", userId)
    .in("status", statuses)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as OrderRow[];
}
