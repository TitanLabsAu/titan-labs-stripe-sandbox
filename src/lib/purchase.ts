// Pure helpers for multi-item stock purchases. All money is integer cents.

export const MAX_CENTS = 100_000_000;
export const MAX_QTY = 100_000;
export const MAX_LINES = 100;

/** Parse an AUD amount typed by a person ("12", "12.5", "12.34") into cents without floats. */
export function parseCents(input: string): number | null {
  const s = String(input ?? "").trim().replace(/^\$/, "").replace(/,/g, "");
  if (s === "") return 0;
  const m = /^(\d{1,9})(?:\.(\d{0,2}))?$/.exec(s);
  if (!m) return null;
  const cents = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || "0");
  return cents > MAX_CENTS ? null : cents;
}

export function parseQty(input: string): number | null {
  const s = String(input ?? "").trim();
  if (!/^\d{1,6}$/.test(s)) return null;
  const n = Number(s);
  return n >= 1 && n <= MAX_QTY ? n : null;
}

export function centsToAud(c: number) {
  const neg = c < 0;
  const a = Math.abs(Math.trunc(c));
  return `${neg ? "-" : ""}$${Math.floor(a / 100).toLocaleString("en-AU")}.${String(a % 100).padStart(2, "0")}`;
}

export type CostMode = "line" | "unit";
export type DraftLine = { key: string; productId: string; variantId: string | null; quantity: string; cost: string };
export type PurchaseProduct = {
  id: string;
  name: string;
  catalogue_section?: string | null;
  unlimited_stock?: boolean | null;
  stock_quantity?: number | null;
  product_variants?: { id: string; label: string; stock?: number | null }[] | null;
};

export type LineCheck = {
  key: string;
  error: string | null;
  qty: number | null;
  lineCents: number | null;
  untracked: boolean;
  before: number | null;
  after: number | null;
  label: string;
};

export function isUntracked(p: PurchaseProduct) {
  return p.catalogue_section === "equipment" && p.unlimited_stock === true;
}

export function checkPurchase(
  lines: DraftLine[],
  products: PurchaseProduct[],
  opts: { mode: CostMode; other: string; discount: string; applyStock: boolean },
) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const checks: LineCheck[] = lines.map((l) => {
    const p = byId.get(l.productId);
    const qty = parseQty(l.quantity);
    const costBlank = String(l.cost ?? "").trim() === "";
    const entered = costBlank ? null : parseCents(l.cost);
    const lineCents = qty == null || entered == null ? null : opts.mode === "unit" ? entered * qty : entered;
    let error: string | null = null;
    const variants = p?.product_variants ?? [];
    const v = variants.find((x) => x.id === l.variantId);
    if (!p) error = "Choose a product";
    else if (variants.length > 0 && !v) error = "Choose a size";
    else if (variants.length === 0 && l.variantId) error = "That size no longer exists";
    else if (qty == null) error = "Quantity must be a whole number from 1 to 100000";
    else if (costBlank) error = "Enter a cost for this item (type 0 if it was free)";
    else if (entered == null) error = "Cost must be zero or more, up to 2 decimals";
    else if (lineCents != null && lineCents > MAX_CENTS) error = "Line cost is too large";
    const k = `${l.productId}::${l.variantId ?? "base"}`;
    if (!error && seen.has(k)) error = "Same product and size is already listed — combine into one line";
    if (p) seen.add(k);
    const untracked = p ? isUntracked(p) : false;
    const before = !p || untracked ? null : v ? Math.max(0, Math.trunc(Number(v.stock ?? 0))) : variants.length ? null : Math.max(0, Math.trunc(Number(p.stock_quantity ?? 0)));
    const after = before != null && qty != null && opts.applyStock ? before + qty : null;
    return { key: l.key, error, qty, lineCents, untracked, before, after, label: p ? `${p.name}${v ? ` ${v.label}` : ""}` : "" };
  });
  const other = parseCents(opts.other);
  const discount = parseCents(opts.discount);
  const linesCents = checks.reduce((s, c) => s + (c.lineCents ?? 0), 0);
  const total = linesCents + (other ?? 0) - (discount ?? 0);
  const errors: string[] = [];
  if (lines.length === 0) errors.push("Add at least one item");
  if (lines.length > MAX_LINES) errors.push(`At most ${MAX_LINES} items per purchase`);
  if (other == null) errors.push("Delivery/other costs must be zero or more");
  if (discount == null) errors.push("Discount must be zero or more");
  if (total < 0) errors.push("Discount cannot be more than the purchase total");
  if (total > MAX_CENTS) errors.push("Purchase total is too large");
  const ok = errors.length === 0 && checks.every((c) => !c.error);
  return {
    ok,
    errors,
    checks,
    itemCount: lines.length,
    unitCount: checks.reduce((s, c) => s + (c.qty ?? 0), 0),
    linesCents,
    otherCents: other ?? 0,
    discountCents: discount ?? 0,
    totalCents: total,
  };
}

/** Server-side shape validation of the RPC payload (SQL re-validates everything). */
export function validatePurchasePayload(input: {
  requestId: string; occurredOn: string; otherCostsCents: number; discountCents: number;
  items: { productId: string; variantId: string | null; quantity: number; lineCostCents: number }[];
}) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const cents = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= MAX_CENTS;
  if (!uuid.test(String(input.requestId))) throw new Error("Missing request id");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.occurredOn))) throw new Error("Purchase date is required");
  if (!cents(input.otherCostsCents) || !cents(input.discountCents)) throw new Error("Other costs and discount must be whole cents of zero or more");
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > MAX_LINES) throw new Error("Add between 1 and 100 items");
  const seen = new Set<string>();
  let sum = 0;
  input.items.forEach((it, i) => {
    if (!uuid.test(String(it.productId))) throw new Error(`Item ${i + 1}: choose a product`);
    if (it.variantId != null && typeof it.variantId !== "string") throw new Error(`Item ${i + 1}: invalid size`);
    if (!Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > MAX_QTY) throw new Error(`Item ${i + 1}: quantity must be a whole number from 1 to 100000`);
    if (!cents(it.lineCostCents)) throw new Error(`Item ${i + 1}: line cost must be whole cents of zero or more`);
    const k = `${it.productId}::${it.variantId ?? "base"}`;
    if (seen.has(k)) throw new Error(`Item ${i + 1}: the same product and size appears twice. Combine them into one line.`);
    seen.add(k);
    sum += it.lineCostCents;
  });
  const total = sum + input.otherCostsCents - input.discountCents;
  if (total < 0) throw new Error("Discount cannot be more than the purchase total");
  if (total > MAX_CENTS) throw new Error("Purchase total is too large");
  return { ...input, totalCents: total };
}
