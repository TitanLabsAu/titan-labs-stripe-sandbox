import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "titan_pending_ack_id";

/**
 * Records the customer's Research Use & Terms acknowledgement before any
 * payment or order submission. The database sets the user and timestamp.
 * Throws if it cannot be recorded, so checkout cannot proceed without it.
 */
export async function recordAcknowledgement(version: string) {
  const { data, error } = await supabase
    .from("order_acknowledgements")
    .insert({ version, accepted: true })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error("We could not record your acknowledgement. Please try again.");
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, data.id);
  } catch {
    /* storage unavailable — linking falls back to the admin time match */
  }
  return data.id as string;
}

/** Links the pending acknowledgement to the confirmed order (owner-only, server-checked). */
export async function linkAcknowledgement(orderId: string) {
  let ackId: string | null = null;
  try {
    ackId = window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    ackId = null;
  }
  if (!ackId) return false;
  const { data, error } = await supabase.rpc("link_order_acknowledgement", {
    _ack_id: ackId,
    _order_id: orderId,
  });
  if (error) {
    console.warn("Acknowledgement link failed", error.message);
    return false;
  }
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return Boolean(data);
}
