import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Crown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TitanClubPill, clubBenefitText } from "@/components/TitanClubBadge";
import {
  adminGetTitanClub,
  adminSearchClubCandidates,
  adminSetTitanClub,
  adminSetTitanClubEnabled,
  validateClubInput,
  type AdminClubMember,
  type AdminTitanClub,
  type ClubAssignInput,
} from "@/lib/titan-club.functions";

type Candidate = { userId: string; name: string; email: string | null };
const fmt = (d: string) => new Date(d).toLocaleString("en-AU", { timeZone: "Australia/Melbourne", dateStyle: "medium", timeStyle: "short" });
const shortId = (id: string) => id.slice(0, 8);

type Draft = { userId: string; name: string; email: string | null; type: "percent" | "fixed"; amount: string; maxCap: string; note: string; active: boolean; isNew: boolean };

function confirmText(d: Draft, siteCap: number) {
  const benefit = d.type === "percent" ? `${d.amount}% off` : `$${Number(d.amount).toFixed(2)} off`;
  const lines = [
    `${d.isNew ? "Add" : "Update"} ${d.name} (${d.email ?? "no email"}, id ${shortId(d.userId)}) in The Titan Club?`,
    `Benefit: ${benefit} every purchase. Personal maximum combined discount: ${d.maxCap}%.`,
  ];
  if (Number(d.maxCap) > siteCap)
    lines.push(`WARNING: ${d.maxCap}% is ABOVE the website cap of ${siteCap}%. This member's total product discounts can reach ${d.maxCap}%.`);
  return lines.join("\n\n");
}

export function ClubEditor({ draft, siteCap, onChange, onSave, onCancel, pending }: {
  draft: Draft; siteCap: number; onChange: (d: Draft) => void; onSave: () => void; onCancel: () => void; pending?: boolean;
}) {
  const above = Number(draft.maxCap) > siteCap;
  return (
    <div className="mt-4 space-y-3 rounded-lg border border-primary/60 p-4">
      <p className="text-sm font-bold text-foreground">
        {draft.isNew ? "Add" : "Edit"}: {draft.name} <span className="font-normal text-muted-foreground">· {draft.email ?? "no email"} · id {shortId(draft.userId)}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {(["percent", "fixed"] as const).map((t) => (
          <Button key={t} type="button" size="sm" variant={draft.type === t ? "default" : "outline"} onClick={() => onChange({ ...draft, type: t })}>
            {t === "percent" ? "Percent off" : "Fixed AUD off"}
          </Button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs uppercase tracking-wide text-muted-foreground">
          {draft.type === "percent" ? "Benefit percent (0.01–100)" : "Benefit AUD per purchase (0.01–1000)"}
          <Input inputMode="decimal" aria-label="Benefit amount" value={draft.amount} onChange={(e) => onChange({ ...draft, amount: e.target.value })} />
        </label>
        <label className="text-xs uppercase tracking-wide text-muted-foreground">
          Personal maximum combined discount % (site cap {siteCap}%)
          <Input inputMode="decimal" aria-label="Maximum combined discount" value={draft.maxCap} onChange={(e) => onChange({ ...draft, maxCap: e.target.value })} />
        </label>
      </div>
      {above ? (
        <p role="alert" className="rounded border border-destructive/60 p-2 text-xs font-bold text-destructive">
          Above the website cap of {siteCap}%: this member's total product discounts can reach {draft.maxCap}%.
        </p>
      ) : null}
      <label className="block text-xs uppercase tracking-wide text-muted-foreground">
        Private admin note (never shown to the member)
        <Input aria-label="Private admin note" maxLength={500} value={draft.note} onChange={(e) => onChange({ ...draft, note: e.target.value })} />
      </label>
      <p className="text-xs text-muted-foreground">
        Applies to future checkouts only; paid and pending-payment orders keep their amounts. The benefit is products-only and
        shares the member's personal maximum with all other savings.
      </p>
      <div className="flex gap-2">
        <Button type="button" disabled={pending} onClick={onSave}>{pending ? "Saving…" : draft.isNew ? "Add to Titan Club" : "Save changes"}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export function AdminTitanClubView({ data, search, onSave, onToggle, pending, initialDraft = null }: {
  data: AdminTitanClub;
  search: (q: string) => Promise<Candidate[]>;
  onSave: (i: ClubAssignInput) => Promise<unknown> | void;
  onToggle: (enabled: boolean) => void;
  pending?: boolean;
  initialDraft?: Draft | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [draft, setDraft] = useState<Draft | null>(initialDraft);
  const active = data.members.filter((m) => m.active);
  const startEdit = (m: AdminClubMember) =>
    setDraft({ userId: m.userId, name: m.name, email: m.email, type: m.type, amount: m.type === "percent" ? String(m.percent) : (m.fixedCents / 100).toFixed(2), maxCap: String(m.maxCapPercent), note: m.note, active: m.active, isNew: false });
  const toInput = (d: Draft, activeOverride?: boolean): ClubAssignInput => ({
    userId: d.userId, type: d.type, maxCapPercent: Number(d.maxCap), active: activeOverride ?? d.active, note: d.note,
    ...(d.type === "percent" ? { percent: Number(d.amount) } : { fixedDollars: Number(d.amount) }),
  });
  const save = () => {
    if (!draft) return;
    const input = toInput(draft);
    const err = draft.amount.trim() === "" || draft.maxCap.trim() === "" ? "Enter the benefit and maximum discount." : validateClubInput(input);
    if (err) return void toast.error(err);
    if (window.confirm(confirmText(draft, data.siteCapPercent))) {
      // Keep the draft (benefit, note) until the save is confirmed; a failed save leaves it editable.
      void Promise.resolve(onSave(input)).then(() => setDraft(null), () => undefined);
    }
  };
  const setStatus = (m: AdminClubMember, on: boolean) => {
    const msg = on
      ? `Reactivate ${m.name} (${m.email ?? "no email"}) in The Titan Club with ${clubBenefitText(m)} and ${m.maxCapPercent}% maximum?`
      : `Revoke ${m.name}'s Titan Club benefit? Future checkouts use the standard ${data.siteCapPercent}% cap; existing orders are unchanged.`;
    if (window.confirm(msg))
      void Promise.resolve(onSave({ userId: m.userId, type: m.type, maxCapPercent: m.maxCapPercent, active: on, note: m.note, ...(m.type === "percent" ? { percent: m.percent } : { fixedDollars: m.fixedCents / 100 }) })).catch(() => undefined);
  };

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-6" aria-label="The Titan Club manager">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-extrabold uppercase text-foreground">
          <Crown className="h-5 w-5 text-primary" /> The Titan Club
        </h2>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Benefits {data.enabled ? "ON" : "OFF"}
          <Switch
            aria-label="Titan Club benefits enabled"
            checked={data.enabled}
            disabled={!data.installed || pending}
            onCheckedChange={(v) => {
              if (window.confirm(v ? "Switch Titan Club benefits ON at checkout for all active Club members?" : "Switch Titan Club benefits OFF? Members keep their assignment but get no Club benefit until switched back on."))
                onToggle(v);
            }}
          />
        </label>
      </div>
      {!data.installed ? (
        <p className="mt-3 rounded border border-border p-3 text-sm text-muted-foreground">
          Draft only: the Titan Club database setup is awaiting your approval, so members can't be assigned yet.
        </p>
      ) : null}
      <p className="mt-3 text-sm text-muted-foreground">
        Admin-assigned, permanent while active. No expiry, payments or self-enrolment. Independent of Foundation Members.
        {` ${active.length} active member${active.length === 1 ? "" : "s"}.`}
      </p>

      <div className="mt-4 flex gap-2">
        <Input aria-label="Search members" placeholder="Search member by name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Button type="button" variant="outline" disabled={!data.installed || query.trim().length < 2} onClick={async () => {
          try { setResults(await search(query)); } catch (e: any) { toast.error(e?.message ?? "Search failed"); }
        }}>Search</Button>
      </div>
      {results.length ? (
        <ul className="mt-2 divide-y divide-border rounded border border-border">
          {results.map((c) => {
            const existing = data.members.find((m) => m.userId === c.userId);
            return (
              <li key={c.userId} className="flex items-center justify-between gap-3 p-2 text-sm">
                <span><strong className="text-foreground">{c.name}</strong> <span className="text-muted-foreground">· {c.email ?? "no email"} · id {shortId(c.userId)}</span></span>
                <Button type="button" size="sm" variant="outline" onClick={() => {
                  setResults([]);
                  if (existing) startEdit(existing);
                  else setDraft({ ...c, type: "percent", amount: "", maxCap: String(data.siteCapPercent), note: "", active: true, isNew: true });
                }}>{existing ? "Edit" : "Select"}</Button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {draft ? <ClubEditor draft={draft} siteCap={data.siteCapPercent} onChange={setDraft} onSave={save} onCancel={() => setDraft(null)} pending={pending ?? false} /> : null}

      <div className="mt-6 overflow-x-auto">
        {data.members.length ? (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2">Member</th><th>Benefit</th><th>Max</th><th>Status</th><th>Note</th><th /></tr></thead>
            <tbody>
              {data.members.map((m) => (
                <tr key={m.userId} className="border-t border-border align-top">
                  <td className="py-2"><p className="font-bold text-foreground">{m.name}</p><p className="text-xs text-muted-foreground">{m.email ?? "no email"} · {shortId(m.userId)}</p></td>
                  <td>{clubBenefitText(m)}</td>
                  <td className={m.maxCapPercent > data.siteCapPercent ? "font-bold text-destructive" : ""}>{m.maxCapPercent}%</td>
                  <td>{m.active ? <TitanClubPill label="Active" /> : <span className="text-xs text-muted-foreground">Revoked {m.revokedAt ? fmt(m.revokedAt) : ""}</span>}</td>
                  <td className="max-w-[12rem] text-xs text-muted-foreground">{m.note || "—"}</td>
                  <td className="space-x-1 whitespace-nowrap py-2 text-right">
                    <Button type="button" size="sm" variant="outline" onClick={() => startEdit(m)}>Edit</Button>
                    <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setStatus(m, !m.active)}>{m.active ? "Revoke" : "Reactivate"}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-sm text-muted-foreground">No Titan Club members yet.</p>}
      </div>

      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-bold uppercase text-muted-foreground">Change history ({data.events.length})</summary>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {data.events.map((e) => (
            <li key={e.id}>
              {fmt(e.createdAt)} · <strong className="text-foreground">{e.action}</strong> · {e.name}
              {e.after?.benefit_type ? ` → ${e.after.benefit_type === "fixed" ? `$${(Number(e.after.fixed_cents) / 100).toFixed(2)}` : `${Number(e.after.percent)}%`} off, max ${Number(e.after.max_cap_percent)}%${e.after.note_changed ? ", note changed" : ""}` : ""}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

export function AdminTitanClub() {
  const qc = useQueryClient();
  const getIt = useServerFn(adminGetTitanClub);
  const searchFn = useServerFn(adminSearchClubCandidates);
  const saveFn = useServerFn(adminSetTitanClub);
  const toggleFn = useServerFn(adminSetTitanClubEnabled);
  const { data, isLoading, error, refetch, isFetching } = useQuery({ queryKey: ["admin-titan-club"], queryFn: () => getIt() });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin-titan-club"] });
  const save = useMutation({
    mutationFn: (i: ClubAssignInput) => saveFn({ data: i }),
    onSuccess: (r) => { toast.success(r.changed ? "Titan Club updated" : "No changes to save"); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => toggleFn({ data: { enabled } }),
    onSuccess: refresh,
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });
  if (isLoading) return <section className="mt-8 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground" aria-busy="true">Loading The Titan Club…</section>;
  if (error || !data)
    return (
      <section role="alert" className="mt-8 rounded-xl border border-destructive/40 bg-card p-6 text-sm">
        <p className="font-bold text-destructive">The Titan Club couldn't be loaded.</p>
        <p className="mt-1 text-muted-foreground">{(error as any)?.message ?? "Please try again."}</p>
        <button type="button" className="mt-3 rounded-md border border-border px-3 py-1.5 font-bold" onClick={() => void refetch()} disabled={isFetching}>{isFetching ? "Retrying…" : "Retry"}</button>
      </section>
    );
  return (
    <AdminTitanClubView
      data={data}
      search={(q) => searchFn({ data: { query: q } })}
      onSave={(i) => save.mutateAsync(i)}
      onToggle={(v) => toggle.mutate(v)}
      pending={save.isPending || toggle.isPending}
    />
  );
}

/** Active-member lookup for Admin member list/detail badges. */
export function useAdminClubMembers() {
  const getIt = useServerFn(adminGetTitanClub);
  const { data } = useQuery({ queryKey: ["admin-titan-club"], queryFn: () => getIt() });
  return new Map((data?.members ?? []).filter((m) => m.active).map((m) => [m.userId, m]));
}
