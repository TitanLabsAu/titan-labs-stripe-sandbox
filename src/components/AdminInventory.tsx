import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowUpDown, Download, PackageSearch, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CATALOGUE_SECTION_LABELS, CATALOGUE_SECTIONS } from "@/lib/catalogue-sections";
import { formatPrice } from "@/lib/products";
import {
  filterSkus, lowStockAlerts, previewAdjustment, skusToCsv, sortSkus, summarize,
  type AdjustKind, type InventoryFilters, type InventorySku, type SortKey,
} from "@/lib/inventory";
import {
  adminAdjustInventory, adminInventory, adminInventoryHistory, adminSetReorderThreshold,
} from "@/lib/inventory.functions";

const STATUS_LABEL = { out: "Out of stock", low: "Low", ok: "In stock", untracked: "Untracked" } as const;
const statusClass = {
  out: "border-destructive/40 bg-destructive/10 text-destructive",
  low: "border-primary/40 bg-primary/10 text-primary",
  ok: "border-border bg-muted text-muted-foreground",
  untracked: "border-dashed border-border bg-transparent text-muted-foreground",
} as const;
const selectClass = "h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground";
const KIND_LABEL: Record<string, string> = { receive: "Received", remove: "Removed", count: "Count correction", editor: "Edited elsewhere", system: "Automated" };

function StatusBadge({ s }: { s: InventorySku["status"] }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass[s]}`}>{STATUS_LABEL[s]}</span>;
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function AdminInventory() {
  const qc = useQueryClient();
  const inv = useQuery({ queryKey: ["admin-inventory"], queryFn: () => adminInventory() });
  const [filters, setFilters] = useState<InventoryFilters>({ search: "", section: "all", status: "all", visibility: "all" });
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "status", dir: "asc" });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const skus = inv.data?.skus ?? [];
  const overview = useMemo(() => summarize(skus), [skus]);
  const visible = useMemo(() => sortSkus(filterSkus(skus, filters), sort.key, sort.dir), [skus, filters, sort]);
  const alerts = useMemo(() => lowStockAlerts(skus), [skus]);
  const selected = skus.find((s) => s.key === selectedKey) ?? null;

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const exportCsv = () => {
    const blob = new Blob([skusToCsv(visible)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `titan-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (inv.isLoading)
    return <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">Loading inventory…</div>;
  if (inv.error)
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
        Couldn't load inventory: {(inv.error as Error).message}
        <Button size="sm" variant="outline" className="ml-3" onClick={() => inv.refetch()}>Try again</Button>
      </div>
    );

  const valued = overview.trackedSkus - overview.unpricedSkus;
  return (
    <div className="space-y-6" data-testid="admin-inventory">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Inventory</h2>
          <p className="text-xs text-muted-foreground">
            Last refreshed {inv.data ? new Date(inv.data.fetchedAt).toLocaleString("en-AU") : "—"}
            {inv.isFetching ? " · refreshing…" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => inv.refetch()} disabled={inv.isFetching}>
            <RefreshCw className={`mr-1 h-4 w-4 ${inv.isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={visible.length === 0}>
            <Download className="mr-1 h-4 w-4" /> Export CSV ({visible.length})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Tracked units" value={overview.trackedUnits.toLocaleString()} hint={`${overview.trackedSkus} tracked sizes`} />
        <Kpi label="Stocked sizes" value={String(overview.stockedSkus)} hint={`${overview.untrackedSkus} unlimited, not counted`} />
        <Kpi label="Low stock" value={String(overview.lowCount)} />
        <Kpi label="Out of stock" value={String(overview.outCount)} />
        <Kpi
          label="Stock value at cost"
          value={valued > 0 ? formatPrice(overview.value) : "No costs set"}
          hint={`${valued} of ${overview.trackedSkus} sizes costed · ${overview.unpricedSkus} without a cost`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {CATALOGUE_SECTIONS.map((s) => {
          const b = overview.bySection[s];
          return (
            <button key={s} type="button" onClick={() => setFilters({ ...filters, section: filters.section === s ? "all" : s })}
              className={`rounded-xl border p-4 text-left transition-colors ${filters.section === s ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}>
              <p className="font-medium text-foreground">{CATALOGUE_SECTION_LABELS[s]}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {b.units.toLocaleString()} units · {b.skus} sizes · {b.low} low · {b.out} out{b.untracked ? ` · ${b.untracked} unlimited` : ""}
              </p>
            </button>
          );
        })}
      </div>

      {alerts.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-card p-4">
          <p className="mb-3 flex items-center gap-2 font-medium text-foreground"><AlertTriangle className="h-4 w-4 text-primary" /> Needs restocking ({alerts.length})</p>
          <ul className="divide-y divide-border">
            {alerts.slice(0, 8).map((a) => (
              <li key={a.key} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <button type="button" className="text-left text-foreground hover:underline" onClick={() => setSelectedKey(a.key)}>
                  {a.name}{a.size ? ` · ${a.size}` : ""}
                </button>
                <span className="flex items-center gap-2 text-muted-foreground">
                  {a.quantity} on hand / threshold {a.threshold} · add <strong className="text-foreground">{a.replenish}</strong> <StatusBadge s={a.status} />
                </span>
              </li>
            ))}
          </ul>
          {alerts.length > 8 && <p className="pt-2 text-xs text-muted-foreground">+{alerts.length - 8} more — filter by "Needs attention".</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Input aria-label="Search inventory" placeholder="Search product or size" className="h-9 w-full sm:w-64"
          value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        <select aria-label="Section" className={selectClass} value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value as any })}>
          <option value="all">All sections</option>
          {CATALOGUE_SECTIONS.map((s) => <option key={s} value={s}>{CATALOGUE_SECTION_LABELS[s]}</option>)}
        </select>
        <select aria-label="Status" className={selectClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}>
          <option value="all">All statuses</option>
          <option value="attention">Needs attention</option>
          <option value="out">Out of stock</option>
          <option value="low">Low</option>
          <option value="ok">In stock</option>
          <option value="untracked">Unlimited</option>
        </select>
        <select aria-label="Visibility" className={selectClass} value={filters.visibility} onChange={(e) => setFilters({ ...filters, visibility: e.target.value as any })}>
          <option value="all">All visibility</option>
          <option value="active">Active</option>
          <option value="hidden">Hidden</option>
          <option value="coming_soon">Coming soon</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          <PackageSearch className="mx-auto mb-2 h-6 w-6" />
          {skus.length === 0 ? "No products yet." : "Nothing matches these filters."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {([["name", "Product"], ["section", "Section"], ["quantity", "Qty"], ["status", "Status"]] as const).map(([k, l]) => (
                  <th key={k} className="px-3 py-2"><button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort(k)}>{l}<ArrowUpDown className="h-3 w-3" /></button></th>
                ))}
                <th className="px-3 py-2">Labels</th>
                <th className="px-3 py-2 text-right">Unit cost</th>
                <th className="px-3 py-2 text-right"><button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("value")}>Value<ArrowUpDown className="h-3 w-3" /></button></th>
                <th className="px-3 py-2 text-right">Reorder at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((r) => (
                <tr key={r.key} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedKey(r.key)}>
                  <td className="px-3 py-2 text-foreground"><span className="font-medium">{r.name}</span>{r.size && <span className="text-muted-foreground"> · {r.size}</span>}</td>
                  <td className="px-3 py-2 text-muted-foreground">{CATALOGUE_SECTION_LABELS[r.section]}</td>
                  <td className="px-3 py-2 font-medium text-foreground">{r.quantity ?? "∞"}</td>
                  <td className="px-3 py-2"><StatusBadge s={r.status} /></td>
                  <td className="px-3 py-2"><div className="flex flex-wrap gap-1">
                    {!r.active && <Badge variant="outline">Hidden</Badge>}
                    {r.comingSoon && <Badge variant="outline">Coming soon</Badge>}
                    {r.unlimited && <Badge variant="outline">Unlimited</Badge>}
                    {r.supportsKit && <Badge variant="outline">10x kit</Badge>}
                  </div></td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{r.unitCost != null ? formatPrice(r.unitCost) : "—"}</td>
                  <td className="px-3 py-2 text-right text-foreground">{r.value != null ? formatPrice(r.value) : "—"}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{r.unlimited ? "—" : r.threshold}{r.thresholdCustom ? "" : "*"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">* default threshold. Range 10x kits draw 10 units from the same size; starter kits are their own Equipment item.</p>
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedKey(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && <SkuDrawer sku={selected} trackingSince={inv.data?.trackingSince ?? null} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-inventory"] })} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SkuDrawer({ sku, trackingSince, onSaved }: { sku: InventorySku; trackingSince: string | null; onSaved: () => void }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<AdjustKind>("receive");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [threshold, setThreshold] = useState(String(sku.threshold));
  const history = useQuery({
    queryKey: ["inventory-history", sku.key],
    queryFn: () => adminInventoryHistory({ data: { productId: sku.productId, variantId: sku.variantId } }),
  });
  const preview = sku.quantity === null ? null : previewAdjustment(sku.quantity, kind, qty, reason);

  const save = useMutation({
    mutationFn: () => {
      if (!preview?.ok || sku.quantity === null) throw new Error("Check the adjustment first");
      return adminAdjustInventory({ data: { productId: sku.productId, variantId: sku.variantId, kind, quantity: preview.qty, expectedBefore: sku.quantity, reason, reference } });
    },
    onSuccess: (r) => {
      toast.success(`Stock is now ${r.after}`);
      setQty(""); setReason(""); setReference("");
      onSaved();
      qc.invalidateQueries({ queryKey: ["inventory-history", sku.key] });
    },
    onError: (e: Error) => { toast.error(e.message); onSaved(); },
  });
  const saveThreshold = useMutation({
    mutationFn: () => {
      const t = threshold.trim();
      if (!/^\d+$/.test(t)) throw new Error("Threshold must be a whole number");
      return adminSetReorderThreshold({ data: { productId: sku.productId, variantId: sku.variantId, threshold: Number(t) } });
    },
    onSuccess: () => { toast.success("Reorder threshold saved"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6" data-testid="inventory-drawer">
      <SheetHeader>
        <SheetTitle>{sku.name}{sku.size ? ` · ${sku.size}` : ""}</SheetTitle>
        <SheetDescription>{CATALOGUE_SECTION_LABELS[sku.section]}{sku.active ? "" : " · Hidden"}{sku.comingSoon ? " · Coming soon" : ""}</SheetDescription>
      </SheetHeader>

      <div className="grid grid-cols-3 gap-2">
        <Kpi label="On hand" value={sku.quantity === null ? "∞" : String(sku.quantity)} />
        <Kpi label="Unit cost" value={sku.unitCost != null ? formatPrice(sku.unitCost) : "Not set"} />
        <Kpi label="Value" value={sku.value != null ? formatPrice(sku.value) : "—"} />
      </div>
      {sku.supportsKit && sku.quantity !== null && (
        <p className="text-xs text-muted-foreground">Enough for {Math.floor(sku.quantity / 10)} 10x kit(s) from this same stock.</p>
      )}

      {sku.quantity === null ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">Unlimited item — quantity isn't tracked, so there's nothing to adjust.</p>
      ) : (
        <div className="space-y-3 rounded-xl border border-border p-4">
          <p className="font-medium text-foreground">Adjust stock</p>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {(["receive", "remove", "count"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)}
                className={`rounded-md px-2 py-1.5 text-sm ${kind === k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
                {k === "receive" ? "Receive" : k === "remove" ? "Remove" : "Physical count"}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="inv-qty">{kind === "count" ? "Counted units" : "Units"}</Label>
              <Input id="inv-qty" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
            <div><Label htmlFor="inv-ref">Reference (optional)</Label>
              <Input id="inv-ref" maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Invoice, batch…" /></div>
          </div>
          <div><Label htmlFor="inv-reason">Reason</Label>
            <Input id="inv-reason" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Supplier delivery, damaged vial" /></div>
          {qty.trim() && preview && (
            preview.ok ? (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-foreground" data-testid="inventory-preview">
                {preview.before} → <strong>{preview.after}</strong> ({preview.delta > 0 ? "+" : ""}{preview.delta})
              </p>
            ) : <p className="text-sm text-destructive" data-testid="inventory-preview-error">{preview.error}</p>
          )}
          <Button className="w-full" disabled={!preview?.ok || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save adjustment"}
          </Button>
        </div>
      )}

      {sku.quantity !== null && (
        <div className="flex items-end gap-2">
          <div className="flex-1"><Label htmlFor="inv-threshold">Reorder threshold</Label>
            <Input id="inv-threshold" inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value)} /></div>
          <Button variant="outline" disabled={saveThreshold.isPending} onClick={() => saveThreshold.mutate()}>Save</Button>
        </div>
      )}

      <div>
        <p className="mb-2 font-medium text-foreground">Movement history</p>
        <p className="mb-2 text-xs text-muted-foreground">
          History is recorded from when Inventory tracking was added{trackingSince ? ` (first entry ${new Date(trackingSince).toLocaleDateString("en-AU")})` : ""}. Earlier changes and order sales aren't shown.
        </p>
        {history.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
          : history.error ? <p className="text-sm text-destructive">Couldn't load history.</p>
          : (history.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No movements recorded yet.</p>
          : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {history.data!.map((m) => (
                <li key={m.id} className="px-3 py-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-foreground">{KIND_LABEL[m.kind] ?? m.kind} {m.delta > 0 ? "+" : ""}{m.delta}</span>
                    <span className="text-muted-foreground">{m.before_qty} → {m.after_qty}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("en-AU")} · {m.reason}{m.reference ? ` · ${m.reference}` : ""}</p>
                </li>
              ))}
            </ul>
          )}
      </div>
    </div>
  );
}
