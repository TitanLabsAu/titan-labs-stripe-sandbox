import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminRecordStockPurchase } from "@/lib/finance.functions";
import { centsToAud, checkPurchase, type CostMode, type DraftLine, type PurchaseProduct } from "@/lib/purchase";

const selectCls = "mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const newLine = (): DraftLine => ({ key: crypto.randomUUID(), productId: "", variantId: null, quantity: "", cost: "" });

export function StockPurchaseForm({
  occurredOn,
  supplier,
  description,
  products,
  onSaved,
  onPendingChange,
}: {
  occurredOn: string;
  supplier: string;
  description: string;
  products: PurchaseProduct[];
  onSaved: () => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const [lines, setLines] = useState<DraftLine[]>(() => [{ ...newLine(), key: "line-initial" }]);
  const [mode, setMode] = useState<CostMode>("line");
  const [other, setOther] = useState("");
  const [discount, setDiscount] = useState("");
  const [applyStock, setApplyStock] = useState(true);
  const [showErrors, setShowErrors] = useState(false);
  // One request id per attempt; reused on retry so a lost response can never save twice.
  const requestId = useRef<string>(crypto.randomUUID());

  const result = useMemo(
    () => checkPurchase(lines, products, { mode, other, discount, applyStock }),
    [lines, products, mode, other, discount, applyStock],
  );
  const patch = (key: string, p: Partial<DraftLine>) => {
    requestId.current = crypto.randomUUID();
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));
  };

  const save = useMutation({
    mutationFn: () =>
      adminRecordStockPurchase({
        data: {
          requestId: requestId.current,
          occurredOn,
          supplier,
          description,
          otherCostsCents: result.otherCents,
          discountCents: result.discountCents,
          applyStock,
          items: lines.map((l, i) => ({
            productId: l.productId,
            variantId: l.variantId,
            quantity: result.checks[i]!.qty ?? 0,
            lineCostCents: result.checks[i]!.lineCents ?? 0,
          })),
        },
      }),
    onSuccess: (res) => {
      toast.success(
        res.duplicate
          ? "This purchase was already saved — nothing added twice."
          : res.stock_lines
            ? `Purchase saved; stock increased on ${res.stock_lines} line(s).`
            : "Purchase saved.",
      );
      requestId.current = crypto.randomUUID();
      setLines([newLine()]);
      setOther("");
      setDiscount("");
      setShowErrors(false);
      onSaved();
    },
    // Keep everything entered so the admin can fix and retry.
    // Keep the same request id so a retry of an uncertain save can never create a second purchase.
    onError: (e: unknown) =>
      toast.error(`Purchase not saved: ${e instanceof Error ? e.message : "unknown error"}. Your entries are kept; pressing Save again safely retries.`),
  });

  const locked = save.isPending;
  useEffect(() => { onPendingChange?.(locked); }, [locked, onPendingChange]);

  const stockChanges = result.checks.filter((c) => !c.error && c.after != null);
  const untrackedLines = result.checks.filter((c) => !c.error && c.untracked);

  return (
    <div className="space-y-4" data-testid="stock-purchase-form">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Cost entered per line is:</span>
        <Button size="sm" disabled={locked} variant={mode === "line" ? "default" : "outline"} onClick={() => setMode("line")}>
          Total for the line
        </Button>
        <Button size="sm" disabled={locked} variant={mode === "unit" ? "default" : "outline"} onClick={() => setMode("unit")}>
          Cost each (× qty)
        </Button>
      </div>

      <ol className="space-y-3">
        {lines.map((l, i) => {
          const p = products.find((x) => x.id === l.productId);
          const variants = p?.product_variants ?? [];
          const c = result.checks[i]!;
          const n = i + 1;
          return (
            <li key={l.key} className="rounded-xl border border-primary/20 bg-card/70 p-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1.2fr_0.8fr_1fr_1fr_auto] lg:items-end">
                <div>
                  <Label htmlFor={`pl-prod-${l.key}`}>Item {n} product</Label>
                  <select disabled={locked} id={`pl-prod-${l.key}`} className={selectCls} value={l.productId}
                    onChange={(e) => patch(l.key, { productId: e.target.value, variantId: null })}>
                    <option value="">Choose product</option>
                    {products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor={`pl-size-${l.key}`}>Item {n} size</Label>
                  <select id={`pl-size-${l.key}`} className={selectCls} value={l.variantId ?? ""}
                    disabled={locked || !p || variants.length === 0}
                    onChange={(e) => patch(l.key, { variantId: e.target.value || null })}>
                    <option value="">{p && variants.length === 0 ? "Single size" : "Choose size"}</option>
                    {variants.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor={`pl-qty-${l.key}`}>Item {n} quantity</Label>
                  <Input disabled={locked} id={`pl-qty-${l.key}`} inputMode="numeric" placeholder="0" value={l.quantity}
                    onChange={(e) => patch(l.key, { quantity: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor={`pl-cost-${l.key}`}>Item {n} {mode === "unit" ? "cost each" : "line total"} (AUD)</Label>
                  <Input disabled={locked} id={`pl-cost-${l.key}`} inputMode="decimal" placeholder="0.00" value={l.cost}
                    onChange={(e) => patch(l.key, { cost: e.target.value })} />
                </div>
                <div className="text-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Line total</p>
                  <p className="mt-2 font-black tabular-nums">{c.lineCents == null ? "—" : centsToAud(c.lineCents)}</p>
                </div>
                <Button variant="outline" size="icon" aria-label={`Remove item ${n}`} disabled={locked || lines.length === 1}
                  onClick={() => { requestId.current = crypto.randomUUID(); setLines((ls) => ls.filter((x) => x.key !== l.key)); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {c.untracked && <p className="mt-2 text-xs text-muted-foreground">Unlimited item — cost recorded, stock not tracked.</p>}
              {showErrors && c.error && <p role="alert" className="mt-2 text-xs font-semibold text-destructive">{c.error}</p>}
            </li>
          );
        })}
      </ol>

      <Button variant="outline" className="font-bold uppercase tracking-wide" disabled={locked || lines.length >= 100}
        onClick={() => { requestId.current = crypto.randomUUID(); setLines((ls) => [...ls, newLine()]); }}>
        <Plus className="mr-1 h-4 w-4" /> Add item
      </Button>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="pl-other">Delivery / other costs (AUD, optional)</Label>
          <Input disabled={locked} id="pl-other" inputMode="decimal" placeholder="0.00" value={other} onChange={(e) => { requestId.current = crypto.randomUUID(); setOther(e.target.value); }} />
        </div>
        <div>
          <Label htmlFor="pl-discount">Invoice discount (AUD, optional)</Label>
          <Input disabled={locked} id="pl-discount" inputMode="decimal" placeholder="0.00" value={discount} onChange={(e) => { requestId.current = crypto.randomUUID(); setDiscount(e.target.value); }} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background/60 p-3 text-sm" aria-live="polite">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span><b className="tabular-nums">{result.itemCount}</b> item(s)</span>
          <span><b className="tabular-nums">{result.unitCount}</b> unit(s)</span>
          <span>Lines {centsToAud(result.linesCents)}</span>
          <span>+ other {centsToAud(result.otherCents)}</span>
          <span>− discount {centsToAud(result.discountCents)}</span>
          <span className="font-black">Purchase total {centsToAud(result.totalCents)} AUD</span>
        </div>
        {showErrors && result.errors.map((e) => <p key={e} role="alert" className="mt-1 text-xs font-semibold text-destructive">{e}</p>)}
      </div>

      <div className="rounded-xl border border-border p-3 text-sm">
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" disabled={locked} className="h-4 w-4" checked={applyStock} onChange={(e) => { requestId.current = crypto.randomUUID(); setApplyStock(e.target.checked); }} />
          Add these quantities to stock
        </label>
        {applyStock ? (
          stockChanges.length || untrackedLines.length ? (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {stockChanges.map((c) => <li key={c.key}>{c.label}: {c.before} → <b className="text-foreground">{c.after}</b></li>)}
              {untrackedLines.map((c) => <li key={c.key}>{c.label}: unlimited, not changed</li>)}
            </ul>
          ) : <p className="mt-2 text-xs text-muted-foreground">Complete the item lines to see stock changes.</p>
        ) : <p className="mt-2 text-xs text-muted-foreground">Stock will not change; only the cost is recorded.</p>}
      </div>

      <Button className="font-bold uppercase tracking-wide" disabled={save.isPending}
        onClick={() => { setShowErrors(true); if (result.ok) save.mutate(); }}>
        {save.isPending ? "Saving…" : `Save purchase (${centsToAud(result.totalCents)})`}
      </Button>
    </div>
  );
}
