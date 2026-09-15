import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import titanLogo from "@/assets/titan-logo.asset.json";
import { AddressFields, combineAddress } from "@/components/AddressFields";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Your Profile | Titan Labs Aus" },
      {
        name: "description",
        content: "Complete your Titan Labs Aus member profile with your contact and delivery details.",
      },
      { property: "og:title", content: "Your Profile | Titan Labs Aus" },
      {
        property: "og:description",
        content: "Manage your Titan Labs Aus member details and delivery address.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountPage,
});

const profileSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(60),
  last_name: z.string().trim().min(1, "Last name is required").max(60),
  address_line: z.string().trim().min(3, "Address is required").max(200),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(1, "State is required").max(40),
  postcode: z.string().trim().min(3, "Post code is required").max(10),
  phone_number: z
    .string()
    .trim()
    .min(6, "Phone number is required")
    .max(25)
    .regex(/^[0-9+()\s-]+$/, "Phone number can only contain digits and + ( ) -"),
});

function AccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    address_line: "",
    city: "",
    state: "",
    postcode: "",
    phone_number: "",
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        address_line: profile.address_line ?? "",
        city: profile.city ?? "",
        state: profile.state ?? "",
        postcode: profile.postcode ?? "",
        phone_number: profile.phone_number ?? "",
      });
    }
  }, [profile]);

  const complete = Boolean(
    profile?.first_name &&
      profile?.last_name &&
      profile?.address_line &&
      profile?.city &&
      profile?.state &&
      profile?.postcode &&
      profile?.phone_number,
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Your session expired. Please log in again.");
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email ?? null,
          ...parsed.data,
          postal_address: combineAddress(parsed.data),
        });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="bg-hero min-h-screen px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <img src={titanLogo.url} alt="Titan Labs Aus logo" className="h-14 w-auto" />
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </header>

        <div className="shadow-glow rounded-xl border border-border bg-card/80 p-8 backdrop-blur">
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-steel">
            Your profile
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {complete
              ? "Your details are on file. Update them any time."
              : "Complete your details so we can process and ship your orders."}
          </p>

          {isLoading ? (
            <p className="mt-8 text-sm text-muted-foreground">Loading your details…</p>
          ) : (
            <form onSubmit={handleSave} className="mt-8 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First name</Label>
                  <Input
                    id="first_name"
                    value={form.first_name}
                    maxLength={60}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last name</Label>
                  <Input
                    id="last_name"
                    value={form.last_name}
                    maxLength={60}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
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
                <Label htmlFor="phone_number">Phone number</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={form.phone_number}
                  maxLength={25}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                  required
                />
              </div>

              <Button type="submit" className="w-full font-bold uppercase" disabled={saving}>
                {saving ? "Saving…" : "Save profile"}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Research use only. Not for human consumption.
        </p>
      </div>
    </main>
  );
}
