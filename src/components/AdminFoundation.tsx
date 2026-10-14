import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminGetFoundation, adminSetFoundationEnrolment } from "@/lib/foundation.functions";

type Data = Awaited<ReturnType<typeof adminGetFoundation>>;
const fmt = (d: string) => new Date(d).toLocaleString("en-AU", { timeZone: "Australia/Melbourne", dateStyle: "medium", timeStyle: "short" });

export function AdminFoundationView({ data, onToggle, pending }: { data: Data; onToggle: (enabled: boolean) => void; pending?: boolean }) {
  const remaining = Math.max(0, data.capacity - data.awards.length);
  const state = !data.launchedAt ? "Not launched (OFF)" : data.enrolmentEnabled ? (remaining ? "Enrolment open" : "Full") : "Enrolment paused";
  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 text-lg font-extrabold uppercase text-foreground">
        <ShieldCheck className="h-5 w-5 text-primary" /> Foundation Members
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Status", state], ["Capacity", String(data.capacity)], ["Awarded", String(data.awards.length)], ["Remaining", String(remaining)]].map(([l, v]) => (
          <div key={l} className="rounded border border-border p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{l}</p>
            <p className="text-lg font-extrabold text-foreground">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        {data.launchedAt
          ? `Launch cutoff: ${fmt(data.launchedAt)}. Only member orders created after this and then paid can qualify.`
          : "Opening enrolment fixes the launch cutoff to that moment. Orders created before it never qualify, and the cutoff never resets."}{" "}
        The first paid order of each signed-in member earns the next number; awards are permanent and the {data.benefitPercent}% benefit applies to later purchases within the 20% combined cap. Pausing stops new awards only.
      </p>
      <Button
        className="mt-4"
        variant={data.enrolmentEnabled ? "outline" : "default"}
        disabled={pending}
        onClick={() => {
          const msg = data.enrolmentEnabled
            ? "Pause Foundation enrolment? Existing members keep their benefit."
            : data.launchedAt
              ? "Re-open Foundation enrolment?"
              : "Launch the Foundation Member programme now? The cutoff will be fixed to this moment.";
          if (window.confirm(msg)) onToggle(!data.enrolmentEnabled);
        }}
      >
        {data.enrolmentEnabled ? "Pause enrolment" : data.launchedAt ? "Re-open enrolment" : "Launch programme"}
      </Button>
      <div className="mt-6 overflow-x-auto">
        {data.awards.length ? (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2">#</th><th>Member</th><th>Qualifying order</th><th>Awarded</th></tr></thead>
            <tbody>
              {data.awards.map((a) => (
                <tr key={a.memberNumber} className="border-t border-border">
                  <td className="py-2 font-bold">{String(a.memberNumber).padStart(2, "0")}</td><td>{a.name}</td><td>{a.order}</td><td>{fmt(a.awardedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-sm text-muted-foreground">No Foundation Members yet.</p>}
      </div>
    </section>
  );
}

export function AdminFoundation() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-foundation"], queryFn: () => adminGetFoundation() });
  const m = useMutation({
    mutationFn: (enabled: boolean) => adminSetFoundationEnrolment({ data: { enabled } }),
    onSuccess: () => { toast.success("Foundation programme updated"); void qc.invalidateQueries({ queryKey: ["admin-foundation"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });
  return data ? <AdminFoundationView data={data} onToggle={(v) => m.mutate(v)} pending={m.isPending} /> : null;
}
