import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function fmt(value: string) {
  return new Date(value).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Admin-only: shows the Research Use & Terms acknowledgement recorded for an order. */
export function OrderAcknowledgementInfo({ orderId, userId, createdAt }: { orderId: string; userId: string; createdAt: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["order-ack", orderId],
    queryFn: async () => {
      const linked = await supabase
        .from("order_acknowledgements")
        .select("accepted, version, accepted_at")
        .eq("order_id", orderId)
        .maybeSingle();
      if (linked.data) return { ...linked.data, linked: true };
      // Orders finalised without the browser returning (e.g. webhook) may have
      // an unlinked acknowledgement made by the same customer just before.
      const since = new Date(new Date(createdAt).getTime() - 2 * 60 * 60 * 1000).toISOString();
      const nearby = await supabase
        .from("order_acknowledgements")
        .select("accepted, version, accepted_at")
        .eq("user_id", userId)
        .is("order_id", null)
        .gte("accepted_at", since)
        .lte("accepted_at", createdAt)
        .order("accepted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return nearby.data ? { ...nearby.data, linked: false } : null;
    },
  });

  return (
    <div className="mt-4 border border-border bg-background p-3 text-xs">
      <p className="technical-label text-foreground">Research Use &amp; Terms</p>
      {isLoading ? (
        <p className="mt-1 text-muted-foreground">Checking…</p>
      ) : data?.accepted ? (
        <dl className="mt-1 grid gap-0.5 text-muted-foreground">
          <div>Acknowledged: <span className="font-bold text-primary">✓ Yes</span></div>
          <div>Version: <span className="font-bold text-foreground">{data.version}</span></div>
          <div>Accepted: <span className="font-bold text-foreground">{fmt(data.accepted_at)}</span></div>
          {!data.linked ? <div className="text-accent">Matched by customer and time (not directly linked)</div> : null}
        </dl>
      ) : (
        <p className="mt-1 text-muted-foreground">No acknowledgement recorded (orders placed before this feature).</p>
      )}
    </div>
  );
}
