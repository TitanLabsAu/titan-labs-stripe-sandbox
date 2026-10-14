import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { adminGetMemberFoundation, adminSetMemberFoundation } from "@/lib/foundation.functions";

export function AdminMemberFoundation({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const key = ["admin-member-foundation", userId];
  const { data } = useQuery({ queryKey: key, queryFn: () => adminGetMemberFoundation({ data: { userId } }) });
  const m = useMutation({
    mutationFn: (enabled: boolean) => adminSetMemberFoundation({ data: { userId, enabled } }),
    onSuccess: (r) => {
      toast.success(r.memberNumber ? `Now Foundation Member #${String(r.memberNumber).padStart(2, "0")}` : "Foundation status removed");
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: ["admin-foundation"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });
  const on = data?.memberNumber != null;
  return (
    <section className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <p className="font-bold uppercase text-foreground">Foundation Member</p>
          <p className="text-sm text-muted-foreground">
            {data === undefined ? "Loading…" : on ? `Member #${String(data.memberNumber).padStart(2, "0")} of 50 · permanent 5% benefit` : "Not a Foundation Member"}
          </p>
        </div>
      </div>
      <Switch
        aria-label="Foundation Member"
        checked={on}
        disabled={data === undefined || m.isPending}
        onCheckedChange={(v) => {
          const msg = v ? "Make this member a Foundation Member? They take the next free number (max 50)." : "Remove Foundation Member status? Their number will be freed.";
          if (window.confirm(msg)) m.mutate(v);
        }}
      />
    </section>
  );
}
