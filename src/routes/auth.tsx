import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import titanLogo from "@/assets/titan-logo.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In or Create Account | Titan Labs Aus" },
      {
        name: "description",
        content:
          "Log in to your Titan Labs Aus account or create one to access premium research peptides and wellness products.",
      },
      { property: "og:title", content: "Sign In or Create Account | Titan Labs Aus" },
      {
        property: "og:description",
        content: "Access your Titan Labs Aus account to browse and order premium research products.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/account", replace: true });
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
      toast.error("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        navigate({ to: "/account" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-hero flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex justify-center">
          <img src={titanLogo.url} alt="Titan Labs Aus logo" className="h-24 w-auto" />
        </Link>

        <div className="shadow-glow rounded-xl border border-border bg-card/80 p-8 backdrop-blur">
          {sent ? (
            <div className="space-y-4 text-center">
              <h1 className="text-2xl font-extrabold tracking-tight text-steel">Check your email</h1>
              <p className="text-sm text-muted-foreground">
                We've sent a confirmation link to <span className="text-foreground">{email}</span>.
                Click it to confirm your account, then log in here.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSent(false);
                  setMode("login");
                }}
              >
                Back to log in
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-center text-3xl font-extrabold uppercase tracking-tight text-steel">
                {mode === "login" ? "Member Log In" : "Create Account"}
              </h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {mode === "login"
                  ? "Welcome back to Titan Labs Aus."
                  : "Confirm your email to unlock ordering."}
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
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    maxLength={72}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full font-bold uppercase" disabled={loading}>
                  {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="mt-6 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-accent hover:underline"
              >
                {mode === "login"
                  ? "No account yet? Create one"
                  : "Already have an account? Log in"}
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Research use only. Not for human consumption.
        </p>
      </div>
    </main>
  );
}
