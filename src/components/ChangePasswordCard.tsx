import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z
      .string()
      .min(6, "New password must be at least 6 characters")
      .max(72),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    message: "New passwords do not match",
    path: ["confirm"],
  });

export function ChangePasswordCard() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "Please check your passwords.",
      );
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) throw new Error("Your session expired. Please log in again.");

      // Verify the current password before allowing the change.
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: parsed.data.current,
      });
      if (verifyError) throw new Error("Your current password is incorrect.");

      const { error } = await supabase.auth.updateUser({
        password: parsed.data.next,
      });
      if (error) throw error;
      setForm({ current: "", next: "", confirm: "" });
      toast.success("Password updated.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update your password.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-7 rounded-xl border border-border bg-card p-6 sm:p-8">
      <div className="border-b border-primary/20 pb-5">
        <h2 className="technical-label text-foreground">
          Security &amp; password
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Change the password you use to log in to your account.
        </p>
      </div>
      <form onSubmit={handleSave} className="mt-7 max-w-md space-y-5">
        <div className="space-y-2">
          <Label htmlFor="current_password">Current password</Label>
          <Input
            id="current_password"
            type="password"
            autoComplete="current-password"
            value={form.current}
            maxLength={72}
            onChange={(e) => setForm({ ...form, current: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new_password">New password</Label>
          <Input
            id="new_password"
            type="password"
            autoComplete="new-password"
            value={form.next}
            maxLength={72}
            onChange={(e) => setForm({ ...form, next: e.target.value })}
            required
          />
          <p className="text-xs text-muted-foreground">
            At least 6 characters.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirm new password</Label>
          <Input
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            maxLength={72}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            required
          />
        </div>
        <Button type="submit" className="sm:w-auto" disabled={saving}>
          {saving ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
