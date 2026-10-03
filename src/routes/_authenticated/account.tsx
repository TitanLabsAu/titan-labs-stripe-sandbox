import { cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import { TitanPageHeading } from "@/components/TitanPageHeading";
import { UserRound } from "lucide-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AddressFields, combineAddress } from "@/components/AddressFields";
import { ProfileMenu } from "@/components/ProfileMenu";
import { ChangePasswordCard } from "@/components/ChangePasswordCard";
import { MyRewardsCard } from "@/components/MyRewardsCard";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Your Profile | Titan Labs Aus" },
      {
        name: "description",
        content:
          "Complete your Titan Labs Aus member profile with your contact and delivery details.",
      },
      { property: "og:title", content: "Your Profile | Titan Labs Aus" },
      {
        property: "og:description",
        content:
          "Manage your Titan Labs Aus member details and delivery address.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

const profileSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(254),
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
    .regex(
      /^[0-9+()\s-]+$/,
      "Phone number can only contain digits and + ( ) -",
    ),
});

function AccountPage() {
  const intro = cmsValues(useSiteContent().data, "page_intros");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
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
      return data
        ? { ...data, email: userData.user?.email ?? data.email }
        : null;
    },
  });

  useEffect(() => {
    if (profile) {
      setForm({
        email: profile.email ?? "",
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
      toast.error(
        parsed.error.issues[0]?.message ?? "Please check your details.",
      );
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Your session expired. Please log in again.");
      const emailChanged =
        parsed.data.email.toLowerCase() !== (user.email ?? "").toLowerCase();
      if (emailChanged) {
        const { error: emailError } = await supabase.auth.updateUser(
          { email: parsed.data.email },
          { emailRedirectTo: `${window.location.origin}/account` },
        );
        if (emailError) throw emailError;
      }
      const { email: _requestedEmail, ...profileDetails } = parsed.data;
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email ?? null,
        ...profileDetails,
        postal_address: combineAddress(profileDetails),
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(
        emailChanged
          ? "Details saved. Check your new email address to confirm the change."
          : "Profile saved.",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save your profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-8 sm:py-12">
        <TitanPageHeading
          as="h1"
          icon={UserRound}
          eyebrow={intro.account_eyebrow}
          title={intro.account_title}
        />
        {intro.account_intro ? <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm text-muted-foreground">{intro.account_intro}</p> : null}
        <div className="h-7" />
        <ProfileMenu email={profile?.email} />
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <div className="border-b border-primary/20 pb-5">
            <h2 className="technical-label text-foreground">My details</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {complete
                ? "Your details are on file. Update them any time."
                : "Complete your details so we can process and ship your orders."}
            </p>
          </div>
          {isLoading ? (
            <p className="mt-8 text-sm text-muted-foreground">
              Loading your details…
            </p>
          ) : (
            <form onSubmit={handleSave} className="mt-7 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  maxLength={254}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Changing your email requires confirmation from the new
                  address.
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First name</Label>
                  <Input
                    id="first_name"
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
                <Label htmlFor="phone_number">Phone number</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={form.phone_number}
                  maxLength={25}
                  onChange={(e) =>
                    setForm({ ...form, phone_number: e.target.value })
                  }
                  required
                />
              </div>

              <Button type="submit" className="sm:w-auto" disabled={saving}>
                {saving ? "Saving…" : "Update details"}
              </Button>
            </form>
          )}
        </div>
        <MyRewardsCard />
        <ChangePasswordCard />
      </main>
      <SiteFooter />
    </div>
  );
}
