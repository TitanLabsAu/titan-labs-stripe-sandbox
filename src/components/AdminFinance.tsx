import { useMemo, useState } from "react";
import { StockPurchaseForm } from "@/components/StockPurchaseForm";
import { centsToAud, type PurchaseProduct } from "@/lib/purchase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/products";
import { adminListProducts } from "@/lib/admin.functions";
import {
  adminDeleteExpense,
  adminFinanceSummary,
  adminListExpenses,
  adminSaveExpense,
} from "@/lib/finance.functions";

const CATEGORIES = [
  { key: "stock", label: "Stock purchase" },
  { key: "shipping", label: "Postage & packaging" },
  { key: "marketing", label: "Marketing" },
  { key: "fees", label: "Fees & charges" },
  { key: "other", label: "Other" },
];

function categoryLabel(key: string) {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function rangeFor(preset: string) {
  const now = new Date();
  const to = isoDay(now);
  if (preset === "month")
    return { from: isoDay(new Date(now.getFullYear(), now.getMonth(), 1)), to };
  if (preset === "quarter") {
    const start = new Date(now);
    start.setDate(start.getDate() - 89);
    return { from: isoDay(start), to };
  }
  if (preset === "year")
    return { from: isoDay(new Date(now.getFullYear(), 0, 1)), to };
  return { from: "2020-01-01", to };
}

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-primary/20 bg-card/70 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p
        className={
          "mt-1 text-2xl font-black tabular-nums " +
          (tone === "good"
            ? "text-emerald-500"
            : tone === "bad"
              ? "text-destructive"
              : "")
        }
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function AdminFinance() {
  const queryClient = useQueryClient();
  const [preset, setPreset] = useState("month");
  const [range, setRange] = useState(() => rangeFor("month"));

  const summaryQuery = useQuery({
    queryKey: ["admin-finance", range.from, range.to],
    queryFn: () => adminFinanceSummary({ data: range }),
  });
  const expensesQuery = useQuery({
    queryKey: ["admin-expenses"],
    queryFn: () => adminListExpenses({}),
  });
  const productsQuery = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => adminListProducts({}),
  });

  const [form, setForm] = useState({
    occurred_on: isoDay(new Date()),
    category: "stock",
    supplier: "",
    description: "",
    amount: "",
    product_slug: "",
    variant_label: "",
    quantity: "",
    addToStock: true,
  });

  const products = productsQuery.data ?? [];
  const selectedProduct = products.find((p) => p.slug === form.product_slug);
  const variants = selectedProduct?.product_variants ?? [];

  const save = useMutation({
    mutationFn: () =>
      adminSaveExpense({
        data: {
          occurred_on: form.occurred_on,
          category: form.category,
          supplier: form.supplier,
          description: form.description,
          amount: Number(form.amount) || 0,
          product_slug: form.product_slug || null,
          variant_label: form.variant_label || null,
          quantity: form.quantity === "" ? null : Number(form.quantity),
          addToStock: form.addToStock,
        },
      }),
    onSuccess: (res) => {
      toast.success(
        res.restocked ? "Spend saved and stock topped up." : "Spend saved.",
      );
      setForm((f) => ({
        ...f,
        supplier: "",
        description: "",
        amount: "",
        quantity: "",
      }));
      void queryClient.invalidateQueries({ queryKey: ["admin-expenses"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-finance"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: () => toast.error("Could not save that spend."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteExpense({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-expenses"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-finance"] });
    },
    onError: () => toast.error("Could not remove that spend."),
  });

  const s = summaryQuery.data;
  const inRange = useMemo(
    () =>
      (expensesQuery.data ?? []).filter(
        (e) => e.occurred_on >= range.from && e.occurred_on <= range.to,
      ),
    [expensesQuery.data, range],
  );

  const applyPreset = (key: string) => {
    setPreset(key);
    if (key !== "custom") setRange(rangeFor(key));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "month", label: "This month" },
            { key: "quarter", label: "Last 90 days" },
            { key: "year", label: "This year" },
            { key: "all", label: "All time" },
            { key: "custom", label: "Custom" },
          ].map((p) => (
            <Button
              key={p.key}
              variant={preset === p.key ? "default" : "outline"}
              className="font-bold uppercase tracking-wide"
              onClick={() => applyPreset(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        {preset === "custom" ? (
          <div className="flex flex-wrap gap-3">
            <div>
              <Label>From</Label>
              <Input
                type="date"
                value={range.from}
                onChange={(e) => setRange({ ...range, from: e.target.value })}
              />
            </div>
            <div>
              <Label>To</Label>
              <Input
                type="date"
                value={range.to}
                onChange={(e) => setRange({ ...range, to: e.target.value })}
              />
            </div>
          </div>
        ) : null}
      </div>

      {s ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Sales"
              value={formatPrice(s.revenue)}
              hint={`${s.orders} order(s)`}
            />
            <Stat
              label="Items sold"
              value={String(s.units)}
              hint={`Avg order ${formatPrice(s.averageOrder)}`}
            />
            <Stat
              label="Gross profit"
              value={formatPrice(s.grossProfit)}
              tone={s.grossProfit >= 0 ? "good" : "bad"}
              hint={`Product cost ${formatPrice(s.cogs)}`}
            />
            <Stat
              label="Net profit / loss"
              value={formatPrice(s.netProfit)}
              tone={s.netProfit >= 0 ? "good" : "bad"}
              hint={`After ${formatPrice(s.otherSpend)} of running costs`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Spent on stock" value={formatPrice(s.stockSpend)} />
            <Stat label="Other spending" value={formatPrice(s.otherSpend)} />
            <Stat
              label="Stock on hand"
              value={`${s.inventoryUnits} vials`}
              hint={`Cost ${formatPrice(s.inventoryCost)}`}
            />
            <Stat
              label="Stock sale value"
              value={formatPrice(s.inventoryRetail)}
            />
          </div>

          {s.missingCosts > 0 ? (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              {s.missingCosts} item(s) sold have no cost price set yet, so
              profit is overstated. Add a “Cost each” for those vial sizes in
              Products.
            </p>
          ) : null}

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-black uppercase tracking-[0.18em]">
              Profit by product
            </h3>
            {s.products.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sales in this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      <th className="py-2">Product</th>
                      <th className="py-2">Size</th>
                      <th className="py-2 text-right">Sold</th>
                      <th className="py-2 text-right">Sales</th>
                      <th className="py-2 text-right">Cost</th>
                      <th className="py-2 text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.products.map((p) => (
                      <tr key={p.key} className="border-t border-border/60">
                        <td className="py-2 font-semibold">{p.name}</td>
                        <td className="py-2 text-muted-foreground">
                          {p.variant || "—"}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {p.units}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {formatPrice(p.revenue)}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {formatPrice(p.cost)}
                        </td>
                        <td
                          className={
                            "py-2 text-right font-bold tabular-nums " +
                            (p.profit >= 0
                              ? "text-emerald-500"
                              : "text-destructive")
                          }
                        >
                          {formatPrice(p.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Loading figures…</p>
      )}

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.18em]">
            Record money spent
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Stock purchases can top up the vial size you bought, so your counts
            stay right.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={form.occurred_on}
              onChange={(e) =>
                setForm({ ...form, occurred_on: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Type</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Supplier</Label>
            <Input
              value={form.supplier}
              placeholder="Who you paid"
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
            />
          </div>
          {form.category !== "stock" ? <div>
            <Label>Amount paid (AUD)</Label>
            <Input
              type="number"
              min={0}
              value={form.amount}
              placeholder="0.00"
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div> : null}
        </div>

        <div>
          <Label>Note</Label>
          <Input
            value={form.description}
            placeholder="What this was for"
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {form.category === "stock" ? (
          <StockPurchaseForm
            occurredOn={form.occurred_on}
            supplier={form.supplier}
            description={form.description}
            products={products as unknown as PurchaseProduct[]}
            onSaved={() => {
              setForm((f) => ({ ...f, supplier: "", description: "" }));
              for (const k of ["admin-expenses", "admin-finance", "admin-products", "admin-inventory"])
                void queryClient.invalidateQueries({ queryKey: [k] });
            }}
          />
        ) : (
          <Button
            className="font-bold uppercase tracking-wide"
            disabled={save.isPending || !form.amount}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Saving…" : "Save spend"}
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-black uppercase tracking-[0.18em]">
          Spending in this period
        </h3>
        {inRange.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing recorded for these dates yet.
          </p>
        ) : (
          <div className="space-y-2">
            {inRange.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-card/70 p-3"
              >
                <div>
                  <p className="font-semibold">
                    {categoryLabel(e.category)}
                    {e.supplier ? ` — ${e.supplier}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.occurred_on}
                    {e.description ? ` · ${e.description}` : ""}
                    {e.product_slug
                      ? ` · ${e.quantity ?? 0} × ${e.product_slug}${e.variant_label ? ` ${e.variant_label}` : ""}`
                      : ""}
                    {e.restocked ? " · added to stock" : ""}
                  </p>
                  {e.items && e.items.length > 0 ? (
                    <details className="mt-2 text-sm">
                      <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-bold uppercase tracking-wide text-primary">
                        <ChevronDown className="h-3 w-3" /> {e.items.length} item(s) · {e.items.reduce((n, i) => n + i.quantity, 0)} unit(s)
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {e.items.map((i) => (
                          <li key={i.id} className="flex flex-wrap justify-between gap-2 text-xs">
                            <span>
                              {i.quantity} × {i.product_name}{i.variant_label ? ` ${i.variant_label}` : ""}
                              <span className="text-muted-foreground">{i.untracked ? " · unlimited" : i.stock_applied ? " · stocked" : " · stock unchanged"}</span>
                            </span>
                            <span className="tabular-nums">{centsToAud(i.line_cost_cents)}</span>
                          </li>
                        ))}
                        {e.other_costs_cents ? <li className="flex justify-between text-xs text-muted-foreground"><span>Delivery / other</span><span>{centsToAud(e.other_costs_cents)}</span></li> : null}
                        {e.discount_cents ? <li className="flex justify-between text-xs text-muted-foreground"><span>Discount</span><span>−{centsToAud(e.discount_cents)}</span></li> : null}
                      </ul>
                    </details>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black tabular-nums">
                    {formatPrice(e.amount)}
                  </span>
                  <Button
                    variant="destructive"
                    size="icon"
                    aria-label="Remove spend"
                    onClick={() => remove.mutate(e.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
