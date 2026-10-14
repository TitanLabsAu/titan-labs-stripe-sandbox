import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type Milestone = {
  id: string;
  order_count: number;
  reward_type: "code" | "alert";
  discount_percent: number;
  active: boolean;
  note: string;
};
type Form = { id?: string; order_count: string; reward_type: "code" | "alert"; discount_percent: string; active: boolean; note: string };
const EMPTY: Form = { order_count: "", reward_type: "code", discount_percent: "", active: true, note: "" };

export function AdminMilestones() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(EMPTY);
  const sb = supabase as any;
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-order-milestones"],
    queryFn: async () => {
      const { data, error } = await sb.from("order_milestones").select("*").order("order_count");
      if (error) throw error;
      return data as Milestone[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-order-milestones"] });

  const save = useMutation({
    mutationFn: async () => {
      const count = Math.floor(Number(form.order_count));
      if (!count || count < 1 || count > 10000) throw new Error("Enter a number of orders between 1 and 10000.");
      const pct = form.reward_type === "code" ? Number(form.discount_percent) : 0;
      if (form.reward_type === "code" && (!(pct > 0) || pct > 100)) throw new Error("Enter a discount between 1 and 100%.");
      const row = { order_count: count, reward_type: form.reward_type, discount_percent: pct, active: form.active, note: form.note.slice(0, 200) };
      const res = form.id
        ? await sb.from("order_milestones").update(row).eq("id", form.id)
        : await sb.from("order_milestones").insert(row);
      if (res.error) {
        if (String(res.error.code) === "23505") throw new Error(`A milestone at ${count} orders already exists.`);
        throw res.error;
      }
    },
    onSuccess: () => {
      toast.success(form.id ? "Milestone updated" : "Milestone created");
      setForm(EMPTY);
      void refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save milestone"),
  });

  const toggle = useMutation({
    mutationFn: async (m: Milestone) => {
      const { error } = await sb.from("order_milestones").update({ active: !m.active }).eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => refresh(),
    onError: (e: any) => toast.error(e?.message ?? "Could not update"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("order_milestones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Milestone removed");
      void refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not remove"),
  });

  const selectCls = "mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="flex items-center gap-2 text-lg font-extrabold uppercase text-foreground">
        <Trophy className="h-5 w-5 text-primary" /> Order milestones
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        When a member places their Nth order, they automatically get a one-off personal discount code, or you get an alert email.
        Changes apply to future orders only; members never get the same milestone twice.
      </p>

      <form
        className="mt-5 grid gap-4 sm:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div>
          <Label>Orders placed</Label>
          <Input className="mt-2" type="number" min={1} value={form.order_count} onChange={(e) => setForm({ ...form, order_count: e.target.value })} placeholder="e.g. 5" />
        </div>
        <div>
          <Label>Reward</Label>
          <select className={selectCls} value={form.reward_type} onChange={(e) => setForm({ ...form, reward_type: e.target.value as Form["reward_type"] })}>
            <option value="code">Discount code for member</option>
            <option value="alert">Alert email to me</option>
          </select>
        </div>
        <div>
          <Label>Discount %</Label>
          <Input className="mt-2" type="number" min={1} max={100} step="0.5" disabled={form.reward_type !== "code"} value={form.reward_type === "code" ? form.discount_percent : ""} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
        </div>
        <div>
          <Label>Note (optional)</Label>
          <Input className="mt-2" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" disabled={save.isPending}>{form.id ? "Save" : "Add"}</Button>
          {form.id && <Button type="button" variant="outline" onClick={() => setForm(EMPTY)}>Cancel</Button>}
        </div>
      </form>

      <div className="mt-6 divide-y divide-border rounded-lg border border-border">
        {isLoading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && data.length === 0 && <p className="p-4 text-sm text-muted-foreground">No milestones yet.</p>}
        {data.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold text-foreground">
                {m.order_count} orders —{" "}
                {m.reward_type === "code" ? `${Number(m.discount_percent)}% one-off code` : "Alert email to you"}
                {!m.active && <span className="ml-2 text-xs uppercase text-muted-foreground">(paused)</span>}
              </p>
              {m.note && <p className="text-sm text-muted-foreground">{m.note}</p>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toggle.mutate(m)}>{m.active ? "Pause" : "Resume"}</Button>
              <Button size="sm" variant="outline" aria-label="Edit" onClick={() => setForm({ id: m.id, order_count: String(m.order_count), reward_type: m.reward_type, discount_percent: String(m.discount_percent), active: m.active, note: m.note })}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" aria-label="Remove" onClick={() => { if (confirm(`Remove the ${m.order_count}-order milestone?`)) remove.mutate(m.id); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
