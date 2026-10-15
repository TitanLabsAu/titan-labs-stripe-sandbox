import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Crown } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ClubEditor } from "@/components/AdminTitanClub";
import { clubBenefitText } from "@/components/TitanClubBadge";
import { adminGetTitanClub, adminSetTitanClub, type AdminTitanClub, type ClubAssignInput } from "@/lib/titan-club.functions";
import {
  clubConfirmText, draftFromMember, draftToInput, isClubDraftDirty, newClubDraft, validateClubDraft, type ClubDraft,
} from "@/lib/titan-club-draft";

type MemberRef = { userId: string; name: string; email: string | null };

/** Presentational per-member Titan Club card. Mount with key={userId} so drafts never leak between members. */
export function AdminMemberTitanClubView({ member, data, onSave, pending, initialDraft = null }: {
  member: MemberRef;
  data: AdminTitanClub;
  onSave: (i: ClubAssignInput) => Promise<unknown>;
  pending?: boolean;
  initialDraft?: ClubDraft | null;
}) {
  const existing = data.members.find((m) => m.userId === member.userId) ?? null;
  const [draft, setDraft] = useState<ClubDraft | null>(initialDraft);
  const shownActive = draft ? draft.active : Boolean(existing?.active);
  const dirty = draft ? isClubDraftDirty(draft, existing) : false;

  const toggle = (on: boolean) => {
    const base = draft ?? (existing ? draftFromMember(existing) : newClubDraft(member, data.siteCapPercent));
    const next = { ...base, active: on };
    // Turning back to the saved state with no other edits simply closes the editor.
    if (existing && !isClubDraftDirty(next, existing) && !on) return setDraft(null);
    if (!existing && !on) return setDraft(null);
    setDraft(next);
  };

  const save = () => {
    if (!draft) return;
    const err = draft.active || existing ? validateClubDraft(draft, data.siteCapPercent, existing) : null;
    if (err) return void toast.error(err);
    if (!window.confirm(clubConfirmText(draft, data.siteCapPercent, existing))) return;
    // Draft is kept until the server confirms; a failed save leaves every field as entered.
    onSave(draftToInput(draft)).then(() => setDraft(null), () => undefined);
  };

  const status = !data.installed
    ? "Club setup not installed"
    : existing?.active
      ? `${clubBenefitText(existing)} · max ${existing.maxCapPercent}%${existing.freeShipping ? " · free shipping" : ""}${data.enabled ? "" : " · programme paused"}`
      : existing
        ? `Revoked${existing.revokedAt ? ` ${new Date(existing.revokedAt).toLocaleDateString("en-AU")}` : ""} · ${clubBenefitText(existing)} kept on file`
        : "Not a Titan Club member";

  return (
    <section className="rounded-xl border border-border bg-card p-6" aria-label="Titan Club membership">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Crown className="h-5 w-5 text-primary" />
          <div>
            <p className="font-bold uppercase text-foreground">Titan Club</p>
            <p className="text-sm text-muted-foreground">{status}</p>
          </div>
        </div>
        <Switch aria-label="Titan Club member" checked={shownActive} disabled={!data.installed || pending} onCheckedChange={toggle} />
      </div>
      {existing?.active && !data.enabled ? (
        <p className="mt-3 text-xs text-muted-foreground">Programme is switched off in Discounts → Titan Club, so this benefit isn't applied at checkout yet.</p>
      ) : null}
      {existing && !draft ? (
        <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => setDraft(draftFromMember(existing))}>Edit Titan Club details</Button>
      ) : null}
      {draft ? (
        <div className="mt-4 border-t border-border pt-4">
          {draft.active ? (
            <ClubEditor compact stackingInstalled={data.stackingInstalled} freeShippingInstalled={data.freeShippingInstalled} draft={draft} siteCap={data.siteCapPercent} onChange={setDraft} onSave={save} onCancel={() => setDraft(null)}
              pending={Boolean(pending)} saveDisabled={!dirty} saveLabel="Save Titan Club details" />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Saving will revoke this member's Titan Club benefit for future checkouts. Existing orders are unchanged; the note and history are kept.</p>
              <div className="flex gap-2">
                <Button type="button" disabled={pending || !dirty} onClick={save}>{pending ? "Saving…" : "Save Titan Club details"}</Button>
                <Button type="button" variant="outline" disabled={pending} onClick={() => setDraft(null)}>Cancel</Button>
              </div>
            </div>
          )}
          {dirty ? <p className="mt-2 text-xs font-bold text-primary">Unsaved changes</p> : null}
        </div>
      ) : null}
    </section>
  );
}

export function AdminMemberTitanClub({ member }: { member: MemberRef }) {
  const qc = useQueryClient();
  const getIt = useServerFn(adminGetTitanClub);
  const saveFn = useServerFn(adminSetTitanClub);
  const { data, error, refetch, isFetching } = useQuery({ queryKey: ["admin-titan-club"], queryFn: () => getIt() });
  const save = useMutation({
    mutationFn: (i: ClubAssignInput) => saveFn({ data: i }),
    onSuccess: (r) => {
      toast.success(r.changed ? "Titan Club updated" : "No changes to save");
      void qc.invalidateQueries({ queryKey: ["admin-titan-club"] });
      void qc.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });
  if (error)
    return (
      <section role="alert" className="rounded-xl border border-destructive/40 bg-card p-6 text-sm">
        <p className="font-bold text-destructive">Titan Club couldn't be loaded.</p>
        <Button type="button" size="sm" variant="outline" className="mt-3" disabled={isFetching} onClick={() => void refetch()}>{isFetching ? "Retrying…" : "Retry"}</Button>
      </section>
    );
  if (!data) return <section className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground" aria-busy="true">Loading Titan Club…</section>;
  return <AdminMemberTitanClubView key={member.userId} member={member} data={data} onSave={(i) => save.mutateAsync(i)} pending={save.isPending} />;
}
