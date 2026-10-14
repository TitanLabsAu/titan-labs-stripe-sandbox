import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminSaveContent } from "@/lib/admin.functions";
import { getSiteContent } from "@/lib/catalog.functions";

const KEY = "order_admin_email";

export function AdminNotificationEmail() {
  const qc = useQueryClient();
  const content = useQuery({ queryKey: ["site-content"], queryFn: () => getSiteContent() });
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const saved = content.data?.[KEY] ?? "";

  useEffect(() => { setValue(saved); }, [saved]);

  async function save() {
    const email = value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    setBusy(true);
    try {
      await adminSaveContent({ data: { key: KEY, body: email } });
      await qc.invalidateQueries({ queryKey: ["site-content"] });
      toast.success("Notification email updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">Admin notification email</h2>
        <p className="text-sm text-muted-foreground">
          Receives a copy of every customer order email and referral milestone alerts across the website.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1">
          <Label htmlFor="admin-notify-email">Email address</Label>
          <Input id="admin-notify-email" type="email" value={value} disabled={busy || content.isLoading} onChange={(e) => setValue(e.target.value)} />
        </div>
        <Button onClick={save} disabled={busy || content.isLoading || value.trim() === saved}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </section>
  );
}
