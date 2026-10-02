import { TitanPageHeading } from "@/components/TitanPageHeading";
import { LogIn } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/auth/")({
  head: () => ({
    meta: [
      { title: "Log In | Titan Labs Aus" },
      {
        name: "description",
        content:
          "Log in to your Titan Labs Aus account to access premium research peptides and wellness products.",
      },
      { property: "og:title", content: "Log In | Titan Labs Aus" },
      {
        property: "og:description",
        content:
          "Access your Titan Labs Aus account to browse and order premium research products.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleForgotPassword() {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error(
        "Enter your email address above, then click Forgot password.",
      );
      return;
    }
    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent — check your inbox.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not send the reset email.",
      );
    } finally {
      setResetting(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: safeRedirect() as "/", replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("type=signup") || hash.includes("type=email")) {
      toast.success("Email confirmed — you can now log in.");
    }
    if (hash.includes("error_description")) {
      toast.error("That confirmation link is invalid or has expired.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error(
        "Enter a valid email and a password of at least 6 characters.",
      );
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      navigate({ to: safeRedirect() as "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-8 sm:py-12">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-border bg-card p-5 sm:p-8">
            <TitanPageHeading
              as="h1"
              icon={LogIn}
              eyebrow="Titan member access"
              title="Member log in"
            />
            <p className="mt-2 text-left text-sm text-muted-foreground">
              Welcome back to Titan Labs Aus.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  maxLength={255}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  maxLength={72}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full font-bold uppercase"
                disabled={loading}
              >
                {loading ? "Please wait…" : "Log in"}
              </Button>
            </form>

            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetting}
              className="mt-4 block w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-accent hover:underline disabled:opacity-60"
            >
              {resetting ? "Sending reset email…" : "Forgot password?"}
            </button>

            <Link
              to="/auth/signup"
              className="mt-6 block w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-accent hover:underline"
            >
              No account yet? Create one
            </Link>
          </div>

          <Link
            to="/"
            className="mt-6 block text-center text-sm text-muted-foreground underline-offset-4 hover:text-accent hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** Same-origin path from ?redirect= (e.g. back to checkout with the saved cart). */
function safeRedirect(): string {
  if (typeof window === "undefined") return "/";
  const r = new URLSearchParams(window.location.search).get("redirect") ?? "";
  return r.startsWith("/") && !r.startsWith("//") && !r.includes("\\") ? r : "/";
}
