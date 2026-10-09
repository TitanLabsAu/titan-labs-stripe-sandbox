import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isUnlimitedStock } from "@/lib/products";
import { validatePurchasePayload } from "@/lib/purchase";

export type Expense = {
  id: string;
  occurred_on: string;
  category: string;
  supplier: string;
  description: string;
  amount: number;
  product_slug: string | null;
  variant_label: string | null;
  quantity: number | null;
  restocked: boolean;
  other_costs_cents?: number;
  discount_cents?: number;
  items?: ExpenseItem[];
};

export type ExpenseItem = {
  id: string;
  line_no: number;
  product_name: string;
  variant_label: string | null;
  quantity: number;
  line_cost_cents: number;
  untracked: boolean;
  stock_applied: boolean;
};

export type FinanceProductRow = {
  key: string;
  name: string;
  variant: string;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
};

export type FinanceSummary = {
  from: string;
  to: string;
  orders: number;
  units: number;
  revenue: number;
  shipping: number;
  productRevenue: number;
  cogs: number;
  grossProfit: number;
  stockSpend: number;
  otherSpend: number;
  totalSpend: number;
  netProfit: number;
  averageOrder: number;
  missingCosts: number;
  spendByCategory: { category: string; amount: number }[];
  products: FinanceProductRow[];
  inventoryUnits: number;
  inventoryCost: number;
  inventoryRetail: number;
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const adminListExpenses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Expense[]> => {
    await assertAdmin(context as any);
    const { data, error } = await context.supabase
      .from("expenses")
      .select(
        "id, occurred_on, category, supplier, description, amount, product_slug, variant_label, quantity, restocked, other_costs_cents, discount_cents, expense_items(id, line_no, product_name, variant_label, quantity, line_cost_cents, untracked, stock_applied)",
      )
      .order("occurred_on", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []).map(({ expense_items, ...e }: any) => ({
      ...e,
      amount: num(e.amount),
      items: ((expense_items ?? []) as ExpenseItem[]).sort((a, b) => a.line_no - b.line_no),
    })) as Expense[];
  });

export const adminSaveExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      occurred_on: string;
      category: string;
      supplier?: string;
      description?: string;
      amount: number;
      product_slug?: string | null;
      variant_label?: string | null;
      quantity?: number | null;
      addToStock?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);

    const qty =
      data.quantity == null || !Number.isFinite(Number(data.quantity))
        ? null
        : Math.max(0, Math.trunc(Number(data.quantity)));
    const slug = data.product_slug?.trim() || null;
    const variantLabel = data.variant_label?.trim() || null;
    let shouldRestock = Boolean(data.addToStock && slug && qty && qty > 0 && !data.id);
    if (shouldRestock && slug) {
      // Unlimited Equipment is untracked: record the expense but never move stock.
      const { data: target } = await context.supabase
        .from("products")
        .select("catalogue_section, unlimited_stock")
        .eq("slug", slug)
        .maybeSingle();
      if (target && isUnlimitedStock(target as any)) shouldRestock = false;
    }

    if (shouldRestock && slug && qty) {
      // One database transaction: expense + exact-size stock receipt + ledger entry.
      // Unknown/missing sizes are rejected (nothing saved) instead of falling back to the first size.
      const { error } = await (context.supabase as any).rpc("record_restock_expense", {
        _occurred_on: data.occurred_on,
        _category: data.category || "stock",
        _supplier: data.supplier ?? "",
        _description: data.description ?? "",
        _amount: num(data.amount),
        _product_slug: slug,
        _variant_label: variantLabel ?? "",
        _quantity: qty,
      });
      if (error) throw new Error(error.message);
      return { ok: true, restocked: true };
    }

    const row = {
      occurred_on: data.occurred_on,
      category: data.category || "stock",
      supplier: (data.supplier ?? "").trim(),
      description: (data.description ?? "").trim(),
      amount: num(data.amount),
      product_slug: slug,
      variant_label: variantLabel,
      quantity: qty,
      restocked: false,
      created_by: context.userId,
    };

    if (data.id) {
      // Editing never re-applies stock; keep the original restocked flag.
      const { restocked: _r, created_by: _c, ...patch } = row;
      const { error } = await context.supabase.from("expenses").update(patch).eq("id", data.id);
      if (error) throw error;
    } else {
      const { error } = await context.supabase.from("expenses").insert(row);
      if (error) throw error;
    }

    return { ok: true, restocked: false };
  });

// One supplier purchase = one expense header + child items (+ optional stock receipts) in one transaction.
export const adminRecordStockPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      requestId: string;
      occurredOn: string;
      supplier?: string;
      description?: string;
      otherCostsCents: number;
      discountCents: number;
      applyStock: boolean;
      items: { productId: string; variantId: string | null; quantity: number; lineCostCents: number }[];
    }) => ({ ...validatePurchasePayload(input), supplier: String(input.supplier ?? ""), description: String(input.description ?? ""), applyStock: input.applyStock === true }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { data: result, error } = await (context.supabase as any).rpc("record_stock_purchase", {
      _request_id: data.requestId,
      _occurred_on: data.occurredOn,
      _supplier: data.supplier,
      _description: data.description,
      _other_costs_cents: data.otherCostsCents,
      _discount_cents: data.discountCents,
      _apply_stock: data.applyStock,
      _items: data.items.map((i) => ({
        product_id: i.productId,
        variant_id: i.variantId,
        quantity: i.quantity,
        line_cost_cents: i.lineCostCents,
      })),
    });
    if (error) throw new Error(error.message);
    return result as { expense_id: string; duplicate: boolean; total_cents?: number; stock_lines?: number };
  });

export const adminDeleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await context.supabase.from("expenses").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminFinanceSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { from: string; to: string }) => input)
  .handler(async ({ data, context }): Promise<FinanceSummary> => {
    await assertAdmin(context as any);

    const fromIso = new Date(`${data.from}T00:00:00`).toISOString();
    const toIso = new Date(`${data.to}T23:59:59.999`).toISOString();

    const [{ data: orders, error: ordersError }, { data: products }, { data: expenses }] =
      await Promise.all([
        context.supabase
          .from("orders")
          .select(
            "id, status, subtotal, shipping, total, created_at, order_items(product_slug, product_name, variant_label, unit_price, quantity)",
          )
          .neq("status", "cancelled")
          .gte("created_at", fromIso)
          .lte("created_at", toIso),
        context.supabase.from("products").select("slug, name, price, product_variants, stock_quantity, catalogue_section, unlimited_stock"),
        context.supabase
          .from("expenses")
          .select("category, amount, occurred_on")
          .gte("occurred_on", data.from)
          .lte("occurred_on", data.to),
      ]);
    if (ordersError) throw ordersError;

    const costOf = new Map<string, number>();
    const nameOf = new Map<string, string>();
    let inventoryUnits = 0;
    let inventoryCost = 0;
    let inventoryRetail = 0;

    for (const p of (products ?? []) as any[]) {
      nameOf.set(p.slug, p.name);
      const variants = (p.product_variants ?? []) as any[];
      const untracked = isUnlimitedStock(p);
      if (untracked) {
        // Keep costs for COGS, but exclude untracked units from inventory valuation.
        for (const v of variants) {
          const cost = num(v.cost);
          costOf.set(`${p.slug}|${String(v.label ?? "")}`, cost);
          if (!costOf.has(`${p.slug}|`)) costOf.set(`${p.slug}|`, cost);
        }
        continue;
      }
      if (variants.length === 0) {
        inventoryUnits += Math.max(0, Math.trunc(num(p.stock_quantity)));
        inventoryRetail += Math.max(0, Math.trunc(num(p.stock_quantity))) * num(p.price);
        continue;
      }
      for (const v of variants) {
        const cost = num(v.cost);
        costOf.set(`${p.slug}|${String(v.label ?? "")}`, cost);
        if (!costOf.has(`${p.slug}|`)) costOf.set(`${p.slug}|`, cost);
        const stock = Math.max(0, Math.trunc(num(v.stock)));
        inventoryUnits += stock;
        inventoryCost += stock * cost;
        inventoryRetail += stock * num(v.price);
      }
    }

    let revenue = 0;
    let shipping = 0;
    let productRevenue = 0;
    let cogs = 0;
    let units = 0;
    let missingCosts = 0;
    const byProduct = new Map<string, FinanceProductRow>();

    const orderRows = (orders ?? []) as any[];
    for (const o of orderRows) {
      revenue += num(o.total);
      shipping += num(o.shipping);
      for (const item of (o.order_items ?? []) as any[]) {
        const qty = Math.max(0, Math.trunc(num(item.quantity)));
        const line = num(item.unit_price) * qty;
        const label = String(item.variant_label ?? "");
        const unitCost =
          costOf.get(`${item.product_slug}|${label}`) ?? costOf.get(`${item.product_slug}|`) ?? 0;
        if (unitCost <= 0) missingCosts += qty;
        const lineCost = unitCost * qty;
        units += qty;
        productRevenue += line;
        cogs += lineCost;

        const key = `${item.product_slug}|${label}`;
        const row =
          byProduct.get(key) ??
          ({
            key,
            name: nameOf.get(item.product_slug) ?? item.product_name,
            variant: label,
            units: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
          } as FinanceProductRow);
        row.units += qty;
        row.revenue += line;
        row.cost += lineCost;
        row.profit = row.revenue - row.cost;
        byProduct.set(key, row);
      }
    }

    const spendMap = new Map<string, number>();
    let stockSpend = 0;
    let otherSpend = 0;
    for (const e of (expenses ?? []) as any[]) {
      const amount = num(e.amount);
      const category = String(e.category ?? "other");
      spendMap.set(category, (spendMap.get(category) ?? 0) + amount);
      if (category === "stock") stockSpend += amount;
      else otherSpend += amount;
    }

    const grossProfit = productRevenue - cogs;

    return {
      from: data.from,
      to: data.to,
      orders: orderRows.length,
      units,
      revenue,
      shipping,
      productRevenue,
      cogs,
      grossProfit,
      stockSpend,
      otherSpend,
      totalSpend: stockSpend + otherSpend,
      netProfit: grossProfit + shipping - otherSpend,
      averageOrder: orderRows.length > 0 ? revenue / orderRows.length : 0,
      missingCosts,
      spendByCategory: [...spendMap.entries()]
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
      products: [...byProduct.values()].sort((a, b) => b.profit - a.profit),
      inventoryUnits,
      inventoryCost,
      inventoryRetail,
    };
  });
