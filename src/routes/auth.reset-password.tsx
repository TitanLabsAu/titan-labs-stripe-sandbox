import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password | Titan Labs Aus" },
      {
        name: "description",
        content: "Set a new password for your Titan Labs Aus member account.",
      },
      { property: "og:title", content: "Reset Password | Titan Labs Aus" },
      {
        property: "og:description",
        content: "Set a new password for your Titan Labs Aus member account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  // null = still verifying the recovery link, true = verified, false = invalid/expired
  const [verified, setVerified] = useState<boolean | null>(null);
  const verifiedRef = useRef<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const mark = (ok: boolean) => {
      if (cancelled) return;
      verifiedRef.current = ok;
      setVerified(ok);
    };

    async function verifyLink() {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      // Explicit error in the link (expired, already used, etc.)
      if (hash.get("error") || url.searchParams.get("error")) {
        mark(false);
        return;
      }

      // PKCE flow: ?code=...
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        mark(!error);
        return;
      }

      // token_hash flow: ?token_hash=...&type=recovery
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");
      if (tokenHash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        mark(!error);
        return;
      }

      // Implicit flow: #access_token=...&type=recovery
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken && hash.get("type") === "recovery") {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        mark(!error);
        return;
      }

      // No credentials in the URL — maybe a session already exists (e.g. the
      // client auto-detected the hash), otherwise the link is unusable.
      const { data } = await supabase.auth.getSession();
      mark(Boolean(data.session));
    }

    void verifyLink();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    if (verifiedRef.current !== true) {
      toast.error("This reset link is invalid or has expired. Request a new one.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated — you're logged in.");
      navigate({ to: "/account", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update your password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-12">
        <div className="w-full max-w-md">
          <div className="border border-border bg-card p-8 shadow-sm">
            <h1 className="text-left text-3xl font-medium uppercase text-foreground">
              Reset Password
            </h1>
            <p className="mt-2 text-left text-sm text-muted-foreground">
              Choose a new password for your account.
            </p>

            {verified === false ? (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  This reset link is invalid or has expired. Reset links can only be
                  used once and expire after a short time.
                </p>
                <Link to="/auth" className="block">
                  <Button type="button" className="w-full font-bold uppercase">
                    Request a new link
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new_password">New password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    maxLength={72}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm new password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    maxLength={72}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full font-bold uppercase"
                  disabled={saving || verified !== true}
                >
                  {saving
                    ? "Saving…"
                    : verified === null
                      ? "Verifying your link…"
                      : "Save new password"}
                </Button>
              </form>
            )}
          </div>

          <Link
            to="/auth"
            className="mt-6 block text-center text-sm text-muted-foreground underline-offset-4 hover:text-accent hover:underline"
          >
            ← Back to log in
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
