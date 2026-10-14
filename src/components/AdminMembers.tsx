import { memberSpend } from "@/lib/manual-payment";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/products";
import {
  adminGetMemberOrders,
  adminListMembers,
  type AdminMember,
  type AdminOrder,
} from "@/lib/admin.functions";
import { orderReference } from "@/lib/order-reference";
import { AdminMemberRewards } from "@/components/AdminMemberRewards";
import { AdminMemberFoundation } from "@/components/AdminMemberFoundation";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function trackingUrl(tracking: string) {
  return `https://auspost.com.au/mypost/track/details/${encodeURIComponent(tracking)}`;
}

function memberName(m: AdminMember) {
  return (
    [m.first_name, m.last_name].filter(Boolean).join(" ") ||
    m.email ||
    "Unnamed member"
  );
}

function topProducts(orders: AdminOrder[]): { name: string; qty: number }[] {
  const tally = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.order_items) {
      tally.set(
        item.product_name,
        (tally.get(item.product_name) ?? 0) + item.quantity,
      );
    }
  }
  return [...tally.entries()]
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 3);
}

function MemberOrderCard({ order }: { order: AdminOrder }) {
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Order {orderReference(order)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed {formatDate(order.created_at)}
            {order.delivered_at
              ? ` · Delivered ${formatDate(order.delivered_at)}`
              : ""}
          </p>
        </div>
        <span className="rounded-full border border-accent/50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent">
          {order.status}
        </span>
      </header>

      <ul className="mt-3 divide-y divide-border">
        {order.order_items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-4 py-2 text-sm"
          >
            <div>
              <p className="font-bold uppercase text-foreground">
                {item.product_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.quantity} × {formatPrice(Number(item.unit_price))}
              </p>
            </div>
            <span className="font-extrabold text-accent">
              {formatPrice(Number(item.unit_price) * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatPrice(Number(order.subtotal))}</span>
        </div>
        <div className="flex justify-between">
          <span>Express shipping</span>
          <span>{formatPrice(Number(order.shipping))}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-bold uppercase text-foreground">Total</span>
          <span className="text-xl font-extrabold text-accent">
            {formatPrice(Number(order.total))}
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm">
        {order.tracking_number ? (
          <a
            href={trackingUrl(order.tracking_number)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-accent underline underline-offset-4"
          >
            Track {order.tracking_number}
          </a>
        ) : (
          <span className="text-muted-foreground">No tracking number yet.</span>
        )}
      </p>
    </article>
  );
}

function MemberDetail({
  member,
  onBack,
}: {
  member: AdminMember;
  onBack: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-member-orders", member.id],
    queryFn: () => adminGetMemberOrders({ data: { userId: member.id } }),
  });

  const orders = data ?? [];
  const live = orders.filter(
    (o) => o.status === "processing" || o.status === "shipped",
  );
  const closed = orders.filter(
    (o) => o.status === "delivered" || o.status === "cancelled",
  );

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        className="font-bold uppercase"
        onClick={onBack}
      >
        ← All members
      </Button>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-2xl font-extrabold uppercase text-foreground">
          {memberName(member)}
        </h2>
        <div className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
          <p>{member.email ?? "No email"}</p>
          <p>{member.phone_number ?? "No phone number"}</p>
          <p className="sm:col-span-2">
            {[member.address_line, member.city, member.state, member.postcode]
              .filter(Boolean)
              .join(", ") ||
              member.postal_address ||
              "No address on file"}
          </p>
          <p className="sm:col-span-2">
            Member since {formatDate(member.created_at)} · {member.order_count}{" "}
            order(s) · {formatPrice(member.total_spent)} spent
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading orders…</p>
      ) : (
        <>
          <section className="grid gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-4">
            <div>
              <p className="text-2xl font-extrabold text-accent">
                {memberSpend(orders).count}
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Paid purchases
              </p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-accent">
                {formatPrice(
                  memberSpend(orders).cents / 100,
                )}
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Spent
              </p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-accent">
                {live.length}
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Active orders (incl. unpaid)
              </p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-accent">
                {orders.filter((o) => o.status === "delivered").length}
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Delivered
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Top 3 peptides purchased
            </h3>
            {topProducts(orders).length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No purchases yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {topProducts(orders).map((t) => (
                  <li key={t.name} className="flex justify-between text-sm">
                    <span className="font-bold uppercase text-foreground">
                      {t.name}
                    </span>
                    <span className="font-extrabold text-accent">
                      × {t.qty}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <AdminMemberFoundation userId={member.id} />
          <AdminMemberRewards userId={member.id} />

          <section className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Live orders ({live.length})
            </h3>
            {live.length === 0 ? (
              <p className="text-sm text-muted-foreground">No live orders.</p>
            ) : (
              live.map((o) => <MemberOrderCard key={o.id} order={o} />)
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Delivered &amp; closed orders ({closed.length})
            </h3>
            {closed.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No delivered orders yet.
              </p>
            ) : (
              closed.map((o) => <MemberOrderCard key={o.id} order={o} />)
            )}
          </section>
        </>
      )}
    </div>
  );
}

export function AdminMembers() {
  const [selected, setSelected] = useState<AdminMember | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-members"],
    queryFn: () => adminListMembers({}),
  });

  if (selected)
    return <MemberDetail member={selected} onBack={() => setSelected(null)} />;
  if (isLoading)
    return <p className="text-sm text-muted-foreground">Loading members…</p>;

  const members = data ?? [];
  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No customers have signed up yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {members.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setSelected(m)}
          className="w-full rounded-xl border border-border bg-card p-5 text-left transition hover:border-accent/60"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              <p className="text-base font-extrabold uppercase text-foreground">
                {memberName(m)}
              </p>
              <p>{m.email ?? "No email"}</p>
              <p>{m.phone_number ?? "No phone number"}</p>
              <p>
                {[m.address_line, m.city, m.state, m.postcode]
                  .filter(Boolean)
                  .join(", ") ||
                  m.postal_address ||
                  "No address on file"}
              </p>
              <p className="mt-1 text-xs">
                Member since {formatDate(m.created_at)}
                {m.last_order_at
                  ? ` · last order ${formatDate(m.last_order_at)}`
                  : ""}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Top peptides
              </p>
              {m.top_products.length === 0 ? (
                <p className="text-xs">No purchases yet</p>
              ) : (
                <p className="text-xs">
                  {m.top_products
                    .map((t) => `${t.name} × ${t.qty}`)
                    .join(" · ")}
                </p>
              )}
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p className="text-2xl font-extrabold text-accent">
                {m.order_count}
              </p>
              <p className="text-xs uppercase tracking-[0.2em]">orders</p>
              <p className="mt-1 text-xs">
                {m.live_count} active · {m.delivered_count} delivered (paid)
              </p>
              <p className="text-xs">{formatPrice(m.total_spent)} spent</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
