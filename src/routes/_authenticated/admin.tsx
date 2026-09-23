import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminMembers } from "@/components/AdminMembers";
import { AdminProducts } from "@/components/AdminProducts";
import { AdminDiscounts } from "@/components/AdminDiscounts";
import { AdminEdits } from "@/components/AdminEdits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/products";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { AdminOrderActions, CopyButton, copyText } from "@/components/AdminOrderActions";
import {
  adminListNotifications,
  adminListOrders,
  adminMarkNotificationsRead,
  adminRefreshTracking,
  adminSetPaymentConfirmed,
  adminSetTracking,
  adminUpdateStatus,
  type AdminOrder,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin | Titan Labs Aus" },
      { name: "description", content: "Titan Labs Aus order administration." },
      { property: "og:title", content: "Admin | Titan Labs Aus" },
      { property: "og:description", content: "Titan Labs Aus order administration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function trackingUrl(tracking: string) {
  return `https://auspost.com.au/mypost/track/details/${encodeURIComponent(tracking)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CustomerBlock({ order }: { order: AdminOrder }) {
  const c = order.customer;
  return (
    <div className="rounded-lg border border-border bg-background/40 p-4 text-sm">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Customer</p>
      {c ? (
        (() => {
          const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
          const address =
            [c.address_line, c.city, c.state, c.postcode].filter(Boolean).join(", ") ||
            c.postal_address ||
            "";
          return (
            <div className="mt-2 space-y-1 text-muted-foreground">
              <p className="font-bold text-foreground">{name || "—"}</p>
              <p className="flex items-center gap-2">
                {c.email ?? "—"}
                {c.email ? <CopyButton value={c.email} label="Email" /> : null}
              </p>
              <p className="flex items-center gap-2">
                {c.phone_number ?? "No phone number"}
                {c.phone_number ? <CopyButton value={c.phone_number} label="Phone number" /> : null}
              </p>
              <p className="flex items-start gap-2">
                <span>{address || "No address on file"}</span>
                {address ? <CopyButton value={address} label="Address" /> : null}
              </p>
              {address ? (
                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      [name, address, c.phone_number ?? ""].filter(Boolean).join("\n"),
                      "Shipping label",
                    )
                  }
                  className="pt-1 text-xs font-bold uppercase tracking-wide text-accent underline underline-offset-4"
                >
                  Copy full shipping details
                </button>
              ) : null}
            </div>
          );
        })()
      ) : (
        <p className="mt-2 text-muted-foreground">No profile details saved.</p>
      )}
    </div>
  );
}

function OrderCard({ order, live }: { order: AdminOrder; live: boolean }) {
  const queryClient = useQueryClient();
  const [tracking, setTracking] = useState(order.tracking_number ?? "");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const saveTracking = useMutation({
    mutationFn: () => adminSetTracking({ data: { orderId: order.id, trackingNumber: tracking } }),
    onSuccess: () => {
      toast.success("Tracking number saved");
      invalidate();
    },
    onError: () => toast.error("Could not save the tracking number"),
  });

  const updateStatus = useMutation({
    mutationFn: (status: AdminOrder["status"]) =>
      adminUpdateStatus({ data: { orderId: order.id, status } }),
    onSuccess: () => {
      toast.success("Order updated");
      invalidate();
    },
    onError: () => toast.error("Could not update the order"),
  });

  const setPaid = useMutation({
    mutationFn: (confirmed: boolean) =>
      adminSetPaymentConfirmed({ data: { orderId: order.id, confirmed } }),
    onSuccess: () => {
      toast.success("Payment status updated");
      invalidate();
    },
    onError: () => toast.error("Could not update the payment status"),
  });

  const methodName =
    order.payment_method === "crypto"
      ? "Cryptocurrency (USDC)"
      : order.payment_method === "wise"
        ? "Wise transfer"
        : "PayID / Bank transfer";

  return (
    <article className="rounded-xl border border-border bg-card/80 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Order {order.order_number ? `#TL-${order.order_number}` : `#${order.id.slice(0, 8)}`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed {formatDate(order.created_at)}
            {order.delivered_at ? ` · Delivered ${formatDate(order.delivered_at)}` : ""}
          </p>
        </div>
        <span className="rounded-full border border-accent/50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent">
          {order.status}
        </span>
      </header>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <CustomerBlock order={order} />

        <div className="rounded-lg border border-border bg-background/40 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Products
          </p>
          <ul className="mt-2 divide-y divide-border">
            {order.order_items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                <div>
                  <p className="font-bold uppercase text-foreground">{item.product_name}</p>
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
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-background/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Payment
            </p>
            <p className="mt-1 text-sm text-foreground">{methodName}</p>
            {order.payment_reference ? (
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                Reference: {order.payment_reference}
              </p>
            ) : null}
            {order.notes ? (
              <p className="mt-1 text-xs text-muted-foreground">Notes: {order.notes}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                order.payment_confirmed
                  ? "border-accent/50 text-accent"
                  : "border-border text-muted-foreground"
              }`}
            >
              {order.payment_confirmed ? "Paid" : "Awaiting payment"}
            </span>
            <Button
              variant="outline"
              className="font-bold uppercase"
              disabled={setPaid.isPending}
              onClick={() => setPaid.mutate(!order.payment_confirmed)}
            >
              {order.payment_confirmed ? "Mark unpaid" : "Mark as paid"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-background/40 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Australia Post Express tracking
        </p>
        {live ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="Paste tracking number"
              className="max-w-xs"
            />
            <Button
              className="font-bold uppercase"
              disabled={saveTracking.isPending}
              onClick={() => saveTracking.mutate()}
            >
              Save
            </Button>
            <Button
              variant="outline"
              className="font-bold uppercase"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate("delivered")}
            >
              Mark delivered
            </Button>
          </div>
        ) : null}
        {order.tracking_number ? (
          <a
            href={trackingUrl(order.tracking_number)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block font-bold text-accent underline underline-offset-4"
          >
            {order.tracking_number}
          </a>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No tracking number yet.</p>
        )}
        {order.tracking_status ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Australia Post status: {order.tracking_status}
          </p>
        ) : null}
      </div>

      <AdminOrderActions order={order} />
    </article>
  );
}

function OrdersPanel({ scope }: { scope: "live" | "closed" }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", scope],
    queryFn: () => adminListOrders({ data: { scope } }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading orders…</p>;
  const orders = data ?? [];
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card/70 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {scope === "live" ? "No live orders right now." : "No closed orders yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} live={scope === "live"} />
      ))}
    </div>
  );
}

function NotificationsPanel() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => adminListNotifications({}),
  });

  const markRead = useMutation({
    mutationFn: () => adminMarkNotificationsRead({}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });

  const items = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          className="font-bold uppercase"
          onClick={() => markRead.mutate()}
          disabled={markRead.isPending || items.every((n) => n.read)}
        >
          Mark all read
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/70 p-8 text-center">
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-lg border p-4 ${n.read ? "border-border bg-card/60" : "border-accent/50 bg-card"}`}
            >
              <p className="font-bold uppercase text-foreground">{n.title}</p>
              {n.body ? <p className="mt-1 text-sm text-muted-foreground">{n.body}</p> : null}
              <p className="mt-2 text-xs text-muted-foreground">{formatDate(n.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AdminPage() {
  const { isAdmin, isLoading } = useIsAdmin();
  const queryClient = useQueryClient();

  const refresh = useMutation({
    mutationFn: () => adminRefreshTracking({}),
    onSuccess: (summary) => {
      toast.success(
        `Checked ${summary.checked} order(s); ${summary.delivered} marked delivered.`,
      );
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
    onError: () => toast.error("Australia Post check failed. Check the API details."),
  });

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-24">
        <h1 className="text-4xl font-extrabold uppercase tracking-tight text-foreground">Admin</h1>

        {isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Checking access…</p>
        ) : !isAdmin ? (
          <p className="mt-4 text-sm text-muted-foreground">
            This area is restricted to the store owner.
          </p>
        ) : (
          <Tabs defaultValue="orders" className="mt-8">
            <TabsList className="flex flex-wrap">
              <TabsTrigger value="orders" className="font-bold uppercase">
                Orders
              </TabsTrigger>
              <TabsTrigger value="members" className="font-bold uppercase">
                Members
              </TabsTrigger>
              <TabsTrigger value="products" className="font-bold uppercase">
                Products
              </TabsTrigger>
              <TabsTrigger value="discounts" className="font-bold uppercase">
                Discounts
              </TabsTrigger>
              <TabsTrigger value="edits" className="font-bold uppercase">
                Edits
              </TabsTrigger>
              <TabsTrigger value="notifications" className="font-bold uppercase">
                Notifications
              </TabsTrigger>
            </TabsList>


            <TabsContent value="orders" className="mt-6">
              <div className="mb-4 flex justify-end">
                <Button
                  variant="outline"
                  className="font-bold uppercase"
                  disabled={refresh.isPending}
                  onClick={() => refresh.mutate()}
                >
                  {refresh.isPending ? "Checking…" : "Check Aus Post now"}
                </Button>
              </div>
              <Tabs defaultValue="live">
                <TabsList>
                  <TabsTrigger value="live" className="font-bold uppercase">
                    Live orders
                  </TabsTrigger>
                  <TabsTrigger value="closed" className="font-bold uppercase">
                    Closed orders
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="live" className="mt-6">
                  <OrdersPanel scope="live" />
                </TabsContent>
                <TabsContent value="closed" className="mt-6">
                  <OrdersPanel scope="closed" />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="members" className="mt-6">
              <AdminMembers />
            </TabsContent>

            <TabsContent value="products" className="mt-6">
              <AdminProducts />
            </TabsContent>


            <TabsContent value="discounts" className="mt-6">
              <AdminDiscounts />
            </TabsContent>

            <TabsContent value="edits" className="mt-6">
              <AdminEdits />
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <NotificationsPanel />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
