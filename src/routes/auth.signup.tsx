import { cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import { TitanPageHeading } from "@/components/TitanPageHeading";
import { UserPlus } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SignupSuccessNotice } from "@/components/SignupSuccessNotice";
import { signupNoticeFor, type SignupNotice } from "@/lib/signup-result";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AddressFields, combineAddress } from "@/components/AddressFields";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({
    meta: [
      { title: "Create Account | Titan Labs Aus" },
      {
        name: "description",
        content:
          "Create your Titan Labs Aus account with your name, postal address and email, then confirm your email to start ordering.",
      },
      { property: "og:title", content: "Create Account | Titan Labs Aus" },
      {
        property: "og:description",
        content:
          "Sign up to Titan Labs Aus with your details and confirm your email to unlock ordering.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignupPage,
});

const signupSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(60),
  last_name: z.string().trim().min(1, "Last name is required").max(60),
  address_line: z.string().trim().min(3, "Address is required").max(200),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(1, "State is required").max(40),
  postcode: z.string().trim().min(3, "Post code is required").max(10),
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

function SignupPage() {
  const intro = cmsValues(useSiteContent().data, "page_intros");
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    address_line: "",
    city: "",
    state: "",
    postcode: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<SignupNotice | null>(null);
  const signupStarted = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !signupStarted.current) navigate({ to: "/account", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "Please check your details.",
      );
      return;
    }
    signupStarted.current = true;
    setNotice(null);
    setLoading(true);
    try {
      const result = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth${window.location.search.includes("redirect=") ? window.location.search : ""}`,
          data: {
            first_name: parsed.data.first_name,
            last_name: parsed.data.last_name,
            address_line: parsed.data.address_line,
            city: parsed.data.city,
            state: parsed.data.state,
            postcode: parsed.data.postcode,
            postal_address: combineAddress(parsed.data),
          },
        },
      });
      if (result.error) throw result.error;
      setNotice(signupNoticeFor(parsed.data.email, result));
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
        <div className="w-full max-w-3xl">
          <div className="rounded-xl border border-border bg-card p-5 sm:p-8">
            {notice ? (
              <div className="space-y-4 text-center">
                <h1 className="font-display text-2xl font-black uppercase tracking-[0.08em] text-foreground">
                  {notice.kind === "confirmed" ? "Signup complete" : "Check your email"}
                </h1>
                <SignupSuccessNotice notice={notice} />
                {notice.kind === "confirmation" ? <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  We've sent a confirmation link to{" "}
                  <span className="text-foreground">{notice.email}</span>. Click
                  it to confirm your account, then log in here.
                </p> : null}
                <Button asChild variant="outline" className="w-full">
                  {notice.kind === "confirmed" ? <Link to="/account">Continue to account</Link> : <Link to="/auth">Back to log in</Link>}
                </Button>
              </div>
            ) : (
              <>
                <TitanPageHeading
                  as="h1"
                  icon={UserPlus}
                  eyebrow={intro.signup_eyebrow}
                  title={intro.signup_title}
                />
                {intro.signup_intro ? <p className="mt-2 whitespace-pre-wrap text-left text-sm text-muted-foreground">{intro.signup_intro}</p> : null}

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First name</Label>
                      <Input
                        id="first_name"
                        autoComplete="given-name"
                        value={form.first_name}
                        maxLength={60}
                        onChange={(e) =>
                          setForm({ ...form, first_name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last name</Label>
                      <Input
                        id="last_name"
                        autoComplete="family-name"
                        value={form.last_name}
                        maxLength={60}
                        onChange={(e) =>
                          setForm({ ...form, last_name: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <AddressFields
                    value={{
                      address_line: form.address_line,
                      city: form.city,
                      state: form.state,
                      postcode: form.postcode,
                    }}
                    onChange={(next) => setForm({ ...form, ...next })}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      maxLength={255}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      value={form.password}
                      maxLength={72}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full font-bold uppercase"
                    disabled={loading}
                  >
                    {loading ? "Please wait…" : "Create account"}
                  </Button>
                </form>

                <Link
                  to="/auth"
                  className="mt-6 block w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-accent hover:underline"
                >
                  Already have an account? Log in
                </Link>
              </>
            )}
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
