import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Settings2, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/products";
import { AdminMilestones } from "@/components/AdminMilestones";
import { AdminTitanClub } from "@/components/AdminTitanClub";
import {
  adminDeleteDiscountCode,
  adminListDiscountCodes,
  adminListMembers,
  adminToggleDiscountCode,
  type AdminDiscountCode,
} from "@/lib/admin.functions";
import {
  adminCodeUsage,
  adminSaveCode,
  adminSaveReferralSettings,
  getReferralSettings,
} from "@/lib/referrals.functions";
import { settingsFromRow } from "@/lib/order-pricing";

function randomCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  let out = "";
  for (let i = 0; i < 2; i++) out += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 2; i++) out += digits[Math.floor(Math.random() * digits.length)];
  for (let i = 0; i < 2; i++) out += letters[Math.floor(Math.random() * letters.length)];
  return `TITAN-${out}`;
}

type Form = {
  id?: string;
  code: string;
  code_kind: "referral" | "member";
  discount_type: "percent" | "fixed";
  value: string;
  maxUses: string;
  expires: string;
  userId: string;
  note: string;
  minSpend: string;
  combine_multibuy: boolean;
  combine_crypto: boolean;
  combine_credit: boolean;
};

const EMPTY: Form = {
  code: "",
  code_kind: "referral",
  discount_type: "percent",
  value: "10",
  maxUses: "",
  expires: "",
  userId: "",
  note: "",
  minSpend: "",
  combine_multibuy: true,
  combine_crypto: true,
  combine_credit: true,
};

function toForm(c: AdminDiscountCode): Form {
  return {
    id: c.id,
    code: c.code,
    code_kind: c.code_kind ?? "referral",
    discount_type: c.discount_type,
    value: String(Number(c.value)),
    maxUses: c.max_uses >= 1000000 ? "" : String(c.max_uses),
    expires: c.expires_at ? new Date(c.expires_at).toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" }) : "",
    userId: c.user_id ?? "",
    note: c.note ?? "",
    minSpend: c.min_spend_cents ? String(c.min_spend_cents / 100) : "",
    combine_multibuy: c.combine_multibuy ?? true,
    combine_crypto: c.combine_crypto ?? true,
    combine_credit: c.combine_credit ?? true,
  };
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-foreground">
      <input type="checkbox" className="h-4 w-4 accent-primary" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function ProgramSettings() {
  const queryClient = useQueryClient();
  const { data: raw } = useQuery({ queryKey: ["referral-settings"], queryFn: () => getReferralSettings() });
  const s = settingsFromRow(raw);
  const [f, setF] = useState<any>(null);
  useEffect(() => {
    if (raw && !f)
      setF({
        tiers: s.multibuyTiers.map((t) => `${t.units}:${t.percent}`).join(", "),
        crypto: String(s.cryptoPercent),
        cap: String(s.combinedCapPercent),
        unit: String(s.creditUnitCents / 100),
        maxUnits: String(s.maxCreditUnits),
        rewardPercent: String(s.rewardPercent),
        rewardEvery: String(s.rewardEvery),
        rewardExpiry: String(s.rewardExpiryDays),
        allowMultibuyCrypto: s.allowMultibuyCrypto,
        allowCodeMultibuy: s.allowCodeMultibuy,
        allowCodeCrypto: s.allowCodeCrypto,
        allowCreditCode: s.allowCreditCode,
        allowCreditDiscounts: s.allowCreditDiscounts,
        enabled: s.programEnabled,
        foEnabled: s.firstOffer.enabled,
        foPercent: String(s.firstOffer.percent),
        foMultibuy: s.firstOffer.combineMultibuy,
        foCrypto: s.firstOffer.combineCrypto,
        foCode: s.firstOffer.combineCode,
        foCredit: s.firstOffer.combineCredit,
      });
  }, [raw, f, s]);

  const save = useMutation({
    mutationFn: () =>
      adminSaveReferralSettings({
        data: {
          multibuy_tiers: String(f.tiers)
            .split(",")
            .map((p: string) => p.split(":").map((x) => Number(x.trim())))
            .filter(([u, p]: number[]) => u! > 0 && p! >= 0)
            .map(([units, percent]: number[]) => ({ units, percent })),
          crypto_percent: Number(f.crypto),
          combined_cap_percent: Number(f.cap),
          max_credit_units: Number(f.maxUnits),
          reward_percent: Number(f.rewardPercent),
          reward_every_referrals: Number(f.rewardEvery),
          reward_expiry_days: Number(f.rewardExpiry),
          allow_multibuy_crypto: f.allowMultibuyCrypto,
          allow_code_multibuy: f.allowCodeMultibuy,
          allow_code_crypto: f.allowCodeCrypto,
          allow_credit_code: f.allowCreditCode,
          allow_credit_discounts: f.allowCreditDiscounts,
          program_enabled: f.enabled,
          first_offer_enabled: f.foEnabled,
          first_offer_percent: Number(f.foPercent),
          first_offer_combine_multibuy: f.foMultibuy,
          first_offer_combine_crypto: f.foCrypto,
          first_offer_combine_code: f.foCode,
          first_offer_combine_credit: f.foCredit,
        },
      }),
    onSuccess: () => {
      toast.success("Settings saved — they apply to new orders only");
      void queryClient.invalidateQueries({ queryKey: ["referral-settings"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save settings"),
  });

  if (!f) return null;
  const set = (k: string) => (v: any) => setF((x: any) => ({ ...x, [k]: v }));
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="flex items-center gap-2 text-lg font-extrabold uppercase text-foreground">
        <Settings2 className="h-5 w-5 text-accent" /> Discount &amp; referral rules
      </h3>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Changes apply to future orders. Past orders keep the discounts they were charged.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Label>Multi-buy tiers (units:percent)</Label>
          <Input className="mt-2" value={f.tiers} onChange={(e) => set("tiers")(e.target.value)} placeholder="2:10, 3:15, 4:20" />
        </div>
        <div>
          <Label>Crypto discount (%)</Label>
          <Input className="mt-2" type="number" min={0} max={100} value={f.crypto} onChange={(e) => set("crypto")(e.target.value)} />
        </div>
        <div>
          <Label>Combined cap — all discounts incl. rewards (%)</Label>
          <Input className="mt-2" type="number" min={0} max={100} value={f.cap} onChange={(e) => set("cap")(e.target.value)} />
        </div>
        <div>
          <Label>Reward size (% off next purchase)</Label>
          <Input className="mt-2" type="number" min={0} max={50} value={f.rewardPercent} onChange={(e) => set("rewardPercent")(e.target.value)} />
        </div>
        <div>
          <Label>Max rewards per order</Label>
          <Input className="mt-2" type="number" min={0} max={20} value={f.maxUnits} onChange={(e) => set("maxUnits")(e.target.value)} />
        </div>
        <div>
          <Label>Paid referrals per reward</Label>
          <Input className="mt-2" type="number" min={1} max={100} value={f.rewardEvery} onChange={(e) => set("rewardEvery")(e.target.value)} />
        </div>
        <div>
          <Label>Reward expires after (days)</Label>
          <Input className="mt-2" type="number" min={1} max={3650} value={f.rewardExpiry} onChange={(e) => set("rewardExpiry")(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Check label="Referral rewards switched on" checked={f.enabled} onChange={set("enabled")} />
        <Check label="Multi-buy stacks with crypto (within cap)" checked={f.allowMultibuyCrypto} onChange={set("allowMultibuyCrypto")} />
        <Check label="Codes stack with multi-buy" checked={f.allowCodeMultibuy} onChange={set("allowCodeMultibuy")} />
        <Check label="Codes stack with crypto" checked={f.allowCodeCrypto} onChange={set("allowCodeCrypto")} />
        <Check label="Referral rewards stack with codes" checked={f.allowCreditCode} onChange={set("allowCreditCode")} />
        <Check label="Referral rewards stack with multi-buy / crypto" checked={f.allowCreditDiscounts} onChange={set("allowCreditDiscounts")} />
      </div>
      <div className="mt-6 border-t border-border pt-5">
        <p className="technical-label text-foreground">New-member first purchase offer</p>
        <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
          Verified members with no earlier order (by account or email, including guest orders) get this off their first order's products, not shipping. By default the better of this offer or multi-buy / crypto / code is used. It counts toward the combined cap.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Offer percentage (%)</Label>
            <Input className="mt-2" type="number" min={0} max={50} value={f.foPercent} onChange={(e) => set("foPercent")(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Check label="First purchase offer switched on" checked={f.foEnabled} onChange={set("foEnabled")} />
          <Check label="Offer stacks with multi-buy (within cap)" checked={f.foMultibuy} onChange={set("foMultibuy")} />
          <Check label="Offer stacks with crypto (within cap)" checked={f.foCrypto} onChange={set("foCrypto")} />
          <Check label="Offer stacks with codes" checked={f.foCode} onChange={set("foCode")} />
          <Check label="Offer stacks with referral rewards" checked={f.foCredit} onChange={set("foCredit")} />
        </div>
      </div>
      <Button className="mt-5 font-bold uppercase" disabled={save.isPending} onClick={() => save.mutate()}>
        Save rules
      </Button>
    </div>
  );
}

export function AdminDiscounts({ initialCode, editorOnly = false, onDone }: { initialCode?: AdminDiscountCode; editorOnly?: boolean; onDone?: () => void } = {}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(() => initialCode ? toForm(initialCode) : EMPTY);
  const set = <K extends keyof Form>(k: K) => (v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const { data, isLoading } = useQuery({ queryKey: ["admin-discounts"], queryFn: () => adminListDiscountCodes({}) });
  const { data: members } = useQuery({ queryKey: ["admin-members"], queryFn: () => adminListMembers({}) });
  const { data: usage } = useQuery({ queryKey: ["admin-code-usage"], queryFn: () => adminCodeUsage({}) });
  const memberName = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of members ?? []) {
      const n = [p.first_name, p.last_name].filter(Boolean).join(" ");
      m.set(p.id, n ? `${n} (${p.email ?? ""})` : (p.email ?? p.id));
    }
    return m;
  }, [members]);

  const refresh = () => Promise.all(["admin-discounts", "admin-member-rewards", "my-rewards", "admin-code-usage", "checkout-quote"].map(key => queryClient.invalidateQueries({ queryKey: [key] })));

  const save = useMutation({
    mutationFn: () =>
      adminSaveCode({
        data: {
          ...(form.id ? { id: form.id } : {}),
          code: form.code,
          code_kind: form.code_kind,
          discount_type: form.discount_type,
          value: Number(form.value) || 0,
          maxUses: form.maxUses.trim() ? Number(form.maxUses) : null,
          expiresAt: form.expires || null,
          ...(initialCode && form.expires === toForm(initialCode).expires ? { expiresAtISO: initialCode.expires_at } : {}),
          userId: form.userId || null,
          note: form.note || null,
          min_spend: Number(form.minSpend) || 0,
          combine_multibuy: form.combine_multibuy,
          combine_crypto: form.combine_crypto,
          combine_credit: form.combine_credit,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Code ${res.code} ${form.id ? "updated" : "created"}`);
      setForm(EMPTY);
      void refresh();
      onDone?.();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save the code"),
  });

  const toggle = useMutation({
    mutationFn: (input: { id: string; active: boolean }) => adminToggleDiscountCode({ data: input }),
    onSuccess: () => refresh(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteDiscountCode({ data: { id } }),
    onSuccess: () => {
      toast.success("Code deleted");
      void refresh();
    },
  });

  const codes = data ?? [];
  const selectCls = "mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";

  return (
    <div className="space-y-6">
      {!editorOnly ? <><ProgramSettings /><AdminMilestones /><AdminTitanClub /></> : null}

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="flex items-center gap-2 text-lg font-extrabold uppercase text-foreground">
          <Tag className="h-5 w-5 text-accent" /> {form.id ? `Edit ${form.code}` : "Create a code"}
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Referral codes start at 10% off, subject to saved code settings, allowed combinations and caps. Admin custom values remain editable. Each specific referral code is usable once per member on successful payment, signed in (matched by account and normalized email, including historical paid uses of that code).
          Existing members may use an unused code. EMMA10 use blocks only EMMA10, not DAVE10; own codes are blocked. Failed or unpaid attempts do not consume a use.
          When linked to a member, every 5 eligible paid orders (discounted or not) earn that member a 10% reward.
          Unlinked referral codes still give the customer discount but earn nobody rewards until you link a member.
          Member-only reward vouchers work only for the linked member and keep their separate rules. Per-code global limits still apply.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="code-input">Code</Label>
            <div className="mt-2 flex gap-2">
              <Input id="code-input" value={form.code} placeholder="EMMA10" onChange={(e) => set("code")(e.target.value.toUpperCase())} />
              {!form.id ? (
                <Button type="button" variant="outline" className="font-bold uppercase" onClick={() => set("code")(randomCode())}>
                  Generate
                </Button>
              ) : null}
            </div>
          </div>
          <div>
            <Label>Code type</Label>
            <select className={selectCls} value={form.code_kind} onChange={(e) => set("code_kind")(e.target.value as Form["code_kind"])}>
              <option value="referral">Referral (shareable)</option>
              <option value="member">Member-only reward</option>
            </select>
          </div>
          <div>
            <Label>Linked member {form.code_kind === "member" ? "(required)" : "(optional — earns rewards)"}</Label>
            <select className={selectCls} value={form.userId} onChange={(e) => set("userId")(e.target.value)}>
              <option value="">Not linked yet</option>
              {(members ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {memberName.get(m.id)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Customer discount type</Label>
            <select className={selectCls} value={form.discount_type} onChange={(e) => set("discount_type")(e.target.value as Form["discount_type"])}>
              <option value="percent">Percentage off</option>
              <option value="fixed">Dollar amount off</option>
            </select>
          </div>
          <div>
            <Label>{form.discount_type === "fixed" ? "Dollars off (AUD)" : "Percentage off (%)"} — 0 for none</Label>
            <Input className="mt-2" type="number" min={0} value={form.value} onChange={(e) => set("value")(e.target.value)} />
          </div>
          <div>
            <Label>Minimum spend (AUD, optional)</Label>
            <Input className="mt-2" type="number" min={0} value={form.minSpend} placeholder="None" onChange={(e) => set("minSpend")(e.target.value)} />
          </div>
          <div>
            <Label>Max uses (optional)</Label>
            <Input className="mt-2" type="number" min={1} value={form.maxUses} placeholder="Ongoing" onChange={(e) => set("maxUses")(e.target.value)} />
          </div>
          <div>
            <Label>Expires (optional)</Label>
            <Input className="mt-2" type="date" value={form.expires} onChange={(e) => set("expires")(e.target.value)} />
          </div>
          <div>
            <Label>Note</Label>
            <Input className="mt-2" value={form.note} placeholder="Who is this for?" onChange={(e) => set("note")(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <Check label="Can stack with multi-buy" checked={form.combine_multibuy} onChange={set("combine_multibuy")} />
          <Check label="Can stack with crypto" checked={form.combine_crypto} onChange={set("combine_crypto")} />
          <Check label="Can stack with referral rewards" checked={form.combine_credit} onChange={set("combine_credit")} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Global rules above must also allow a combination for it to apply.</p>

        <div className="mt-5 flex gap-2">
          <Button className="font-bold uppercase" disabled={save.isPending || !form.code.trim()} onClick={() => save.mutate()}>
            {form.id ? "Save changes" : "Create code"}
          </Button>
          {form.id ? (
            <Button variant="outline" className="font-bold uppercase" onClick={() => { setForm(EMPTY); onDone?.(); }}>
              Cancel
            </Button>
          ) : null}
        </div>
      </div>

      {!editorOnly ? <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">All codes ({codes.length})</h3>
        {isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading codes…</p>
        ) : codes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No codes yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {codes.map((c) => {
              const uses = c.max_uses >= 1000000 ? `${c.times_used} paid uses` : `${c.times_used}/${c.max_uses} paid uses`;
              const u = usage?.[c.id];
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
                  <div className="text-sm text-muted-foreground">
                    <p className="text-base font-extrabold uppercase tracking-wide text-foreground">
                      {c.code}{" "}
                      <span className="ml-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-bold tracking-[0.14em] text-muted-foreground">
                        {c.code_kind === "member" ? "Member-only" : "Referral"}
                      </span>
                    </p>
                    <p>
                      {Number(c.value) === 0
                        ? "No customer discount"
                        : c.discount_type === "percent"
                          ? `${Number(c.value)}% off`
                          : `${formatPrice(Number(c.value))} off`}
                      {" · "}
                      {uses}
                      {u?.pending ? ` · ${u.pending} awaiting payment` : ""}
                      {c.expires_at ? ` · expires ${new Date(c.expires_at).toLocaleDateString("en-AU")}` : ""}
                      {c.min_spend_cents ? ` · min ${formatPrice(c.min_spend_cents / 100)}` : ""}
                      {c.active ? "" : " · disabled"}
                    </p>
                    <p className="text-xs">
                      {c.user_id ? `Linked: ${memberName.get(c.user_id) ?? "member"}` : "Not linked to a member"}
                      {c.note ? ` · ${c.note}` : ""}
                      {c.milestone ? ` · milestone reward at ${c.milestone} orders` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" aria-label={`Edit ${c.code}`} onClick={() => { setForm(toForm(c)); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" className="font-bold uppercase" onClick={() => toggle.mutate({ id: c.id, active: !c.active })}>
                      {c.active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      aria-label={`Delete ${c.code}`}
                      onClick={() => {
                        if (window.confirm(`Delete ${c.code}? Past orders keep their record. Deactivating is usually safer.`)) remove.mutate(c.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div> : null}
    </div>
  );
}
