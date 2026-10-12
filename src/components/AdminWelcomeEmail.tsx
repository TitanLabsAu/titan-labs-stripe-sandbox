import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { adminSetWelcomeEnabled, adminWelcomePreview, adminWelcomeStatus } from "@/lib/welcome-admin.functions";

export function AdminWelcomeEmail() {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ["admin-welcome-status"], queryFn: () => adminWelcomeStatus() });
  const [preview, setPreview] = useState<{ html: string; productCount: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const s = status.data;

  async function toggle(next: boolean) {
    if (next && !confirm("Turn on welcome emails? Only members who sign up and confirm from now on will receive one. Existing members are never emailed.")) return;
    setBusy(true);
    try { await adminSetWelcomeEnabled({ data: { enabled: next } }); await qc.invalidateQueries({ queryKey: ["admin-welcome-status"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); }
    finally { setBusy(false); }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">New member welcome email</h2>
          <p className="text-sm text-muted-foreground">Sent once, after a new member confirms their email. Off by default.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Switch checked={Boolean(s?.enabled)} disabled={!s || busy} onCheckedChange={toggle} aria-label="Welcome emails on" />
          {s?.enabled ? "On" : "Off"}
        </label>
      </div>
      {s ? (
        <p className="text-xs text-muted-foreground">
          {s.activatedAt ? `Applies to members created after ${new Date(s.activatedAt).toLocaleString("en-AU")}. ` : "Never switched on. "}
          {Object.entries(s.counts).map(([k, v]) => `${k}: ${v}`).join(" · ") || "No emails queued."}
        </p>
      ) : null}
      <Button variant="outline" size="sm" onClick={async () => { try { setPreview(await adminWelcomePreview()); } catch (e) { toast.error(e instanceof Error ? e.message : "Preview failed"); } }}>
        Preview email (demo data)
      </Button>
      {preview ? (
        <div className="space-y-2">
          {preview.productCount < 4 ? <p className="text-xs text-destructive">Only {preview.productCount} Hot Product{preview.productCount === 1 ? "" : "s"} selected — the email shows just these.</p> : null}
          <iframe title="Welcome email preview" sandbox="" srcDoc={preview.html} className="h-[900px] w-full max-w-[640px] rounded-md border border-border bg-background" />
        </div>
      ) : null}
    </section>
  );
}
