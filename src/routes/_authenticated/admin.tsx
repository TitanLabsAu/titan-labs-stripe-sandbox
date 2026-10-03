import { TitanPageHeading } from "@/components/TitanPageHeading";
import { Fragment, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Search, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminMembers } from "@/components/AdminMembers";
import { AdminProducts } from "@/components/AdminProducts";
import { AdminDiscounts } from "@/components/AdminDiscounts";
import { adminSetOrderRefunded } from "@/lib/referrals.functions";
import { AdminEdits } from "@/components/AdminEdits";
import { AdminFinance } from "@/components/AdminFinance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminReviews } from "@/components/AdminReviews";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/products";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { OrderAcknowledgementInfo } from "@/components/OrderAcknowledgementInfo";
import {
  AdminOrderActions,
  CopyButton,
  copyText,
} from "@/components/AdminOrderActions";
import {
  adminListNotifications,
  adminListOrders,
  adminMarkNotificationsRead,
  adminSetPaymentConfirmed,
  adminSetTracking,
  adminUpdateStatus,
  type AdminOrder,
} from "@/lib/admin.functions";
import { orderReference } from "@/lib/order-reference";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin | Titan Labs Aus" },
      { name: "description", content: "Titan Labs Aus order administration." },
      { property: "og:title", content: "Admin | Titan Labs Aus" },
      {
        property: "og:description",
        content: "Titan Labs Aus order administration.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const STATUSES: AdminOrder["status"][] = [
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

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

function orderRef(order: AdminOrder) {
  return orderReference(order);
}

function customerName(order: AdminOrder) {
  const c = order.customer;
  if (!(order as any).user_id) return `${order.contact_name || "Unnamed"} · Guest`;
  return (
    [c?.first_name, c?.last_name].filter(Boolean).join(" ") ||
    order.contact_name ||
    "Unnamed"
  );
}

function customerAddress(order: AdminOrder) {
  const c = order.customer;
  return (
    [c?.address_line, c?.city, c?.state, c?.postcode]
      .filter(Boolean)
      .join(", ") ||
    c?.postal_address ||
    order.shipping_address ||
    ""
  );
}

/* ---------------------------------------------------------------- ORDERS */

type Period = "all" | "day" | "month" | "year";
type View = "active" | "closed";

function OrdersTab() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("active");
  const [statusFilter, setStatusFilter] = useState<
    "all" | AdminOrder["status"]
  >("all");
  const [period, setPeriod] = useState<Period>("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const liveQuery = useQuery({
    queryKey: ["admin-orders", "live"],
    queryFn: () => adminListOrders({ data: { scope: "live" } }),
  });
  const closedQuery = useQuery({
    queryKey: ["admin-orders", "closed"],
    queryFn: () => adminListOrders({ data: { scope: "closed" } }),
  });


  const active = liveQuery.data ?? [];
  const closed = closedQuery.data ?? [];
  const source = view === "active" ? active : closed;
  const statusOptions: AdminOrder["status"][] =
    view === "active" ? ["processing", "shipped"] : ["delivered", "cancelled"];

  const rows = useMemo(() => {
    const now = new Date();
    const q = search.trim().toLowerCase();
    return source.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      const created = new Date(o.created_at);
      const inPeriod =
        period === "all" ||
        (period === "day" && created.toDateString() === now.toDateString()) ||
        (period === "month" &&
          created.getMonth() === now.getMonth() &&
          created.getFullYear() === now.getFullYear()) ||
        (period === "year" && created.getFullYear() === now.getFullYear());
      if (!inPeriod) return false;
      if (!q) return true;
      return (
        orderRef(o).toLowerCase().includes(q) ||
        customerName(o).toLowerCase().includes(q) ||
        (o.customer?.email ?? o.contact_email ?? "")
          .toLowerCase()
          .includes(q) ||
        o.status.includes(q)
      );
    });
  }, [source, statusFilter, period, search]);

  const isLoading = liveQuery.isLoading || closedQuery.isLoading;

  return (
    <div className="rounded-2xl border border-primary/25 bg-card/90 p-5 shadow-glow">
      <div className="mb-4 flex gap-1 border border-border p-1 md:w-fit">
        {(
          [
            ["active", `Active (${active.length})`],
            ["closed", `Closed (${closed.length})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setView(value);
              setStatusFilter("all");
              setOpenId(null);
            }}
            className={`flex-1 px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] md:flex-none ${
              view === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {(["all", ...statusOptions] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s as typeof statusFilter)}
            className={`border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${
              statusFilter === s
                ? "border-accent bg-accent/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex gap-1 border border-border p-1">
          {(["all", "day", "month", "year"] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "day" ? "Today" : p}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            maxLength={80}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order number, customer name, email or status…"
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs uppercase tracking-[0.16em]"
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["admin-orders"] })
          }
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] tracking-[0.18em] text-muted-foreground">
              <th className="py-2 pr-4">ORDER</th>
              <th className="py-2 pr-4">CUSTOMER</th>
              <th className="py-2 pr-4">DATE</th>
              <th className="py-2 pr-4">TOTAL (AUD)</th>
              <th className="py-2 pr-4">PAYMENT</th>
              <th className="py-2 pr-4">STATUS</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((order) => (
              <Fragment key={order.id}>
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4 font-display tracking-wide">
                    {orderRef(order)}
                  </td>
                  <td className="py-3 pr-4">
                    {customerName(order)}
                    <span className="block text-[11px] text-muted-foreground">
                      {order.customer?.email ?? order.contact_email ?? "—"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="py-3 pr-4">
                    {formatPrice(Number(order.total))}
                  </td>
                  <td className="py-3 pr-4 text-[11px] uppercase tracking-[0.16em]">
                    {order.payment_confirmed ? (
                      <span className="text-accent">Paid</span>
                    ) : (
                      <span className="text-muted-foreground">Awaiting</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusSelect order={order} />
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      className="text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setOpenId(openId === order.id ? null : order.id)
                      }
                    >
                      {openId === order.id ? "Hide" : "View"}
                    </button>
                  </td>
                </tr>
                {openId === order.id ? (
                  <tr className="border-b border-border/50 bg-secondary/40">
                    <td colSpan={7} className="p-4">
                      <OrderDetail order={order} live={view === "active"} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Loading orders…
          </p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No orders found.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function StatusSelect({ order }: { order: AdminOrder }) {
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: (status: AdminOrder["status"]) =>
      adminUpdateStatus({ data: { orderId: order.id, status } }),
    onSuccess: () => {
      toast.success("Order updated.");
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: () => toast.error("Could not update the order"),
  });

  return (
    <select
      value={order.status}
      disabled={update.isPending}
      onChange={(e) => update.mutate(e.target.value as AdminOrder["status"])}
      className="border border-border bg-secondary px-2 py-1 text-xs uppercase tracking-[0.12em]"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

function OrderDetail({ order, live }: { order: AdminOrder; live: boolean }) {
  const queryClient = useQueryClient();
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const address = customerAddress(order);
  const phone = order.customer?.phone_number ?? order.contact_phone ?? "";

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const saveTracking = useMutation({
    mutationFn: () =>
      adminSetTracking({
        data: { orderId: order.id, trackingNumber: tracking },
      }),
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

  return (
    <div className="space-y-4">
      <p className="text-[11px] tracking-[0.16em] text-muted-foreground">
        SHIP TO: {address || "No address on file"}
      </p>
      <p className="text-xs text-muted-foreground">
        Email: {order.customer?.email ?? order.contact_email ?? "—"}
        {order.customer?.email ? (
          <span className="ml-2 inline-flex align-middle">
            <CopyButton value={order.customer.email} label="Email" />
          </span>
        ) : null}
        <span className="mx-2">·</span>
        Phone: {phone || "—"}
        {phone ? (
          <span className="ml-2 inline-flex align-middle">
            <CopyButton value={phone} label="Phone number" />
          </span>
        ) : null}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-[11px] uppercase tracking-[0.12em]"
          onClick={() =>
            copyText(
              [customerName(order), address, phone].filter(Boolean).join("\n"),
              "Shipping label",
            )
          }
        >
          Copy shipping details
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-[11px] uppercase tracking-[0.12em]"
          onClick={() =>
            copyText(
              [
                `Order ${orderRef(order)}`,
                customerName(order),
                address,
                "",
                ...order.order_items.map(
                  (i) => `${i.quantity} × ${i.product_name}`,
                ),
                "",
                `Total ${formatPrice(Number(order.total))}`,
              ]
                .filter((line) => line !== undefined)
                .join("\n"),
              "Order",
            )
          }
        >
          Copy order
        </Button>
      </div>

      <ul className="space-y-1 text-xs">
        {order.order_items.map((item) => (
          <li key={item.id} className="flex justify-between">
            <span>
              {item.quantity} × {item.product_name}
            </span>
            <span>{formatPrice(Number(item.unit_price) * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        Subtotal {formatPrice(Number(order.subtotal))} + express shipping{" "}
        {formatPrice(Number(order.shipping))} ={" "}
        <span className="font-bold text-foreground">
          {formatPrice(Number(order.total))}
        </span>
      </p>

      <div className="rounded-xl border border-border bg-background/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.18em] text-muted-foreground">
              PAYMENT
            </p>
            <p className="mt-1 text-sm text-foreground">
              {order.payment_method === "crypto"
                ? "Cryptocurrency"
                : "PayID / Bank transfer"}
            </p>
            {order.payment_reference ? (
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                Reference: {order.payment_reference}
              </p>
            ) : null}
            {order.notes ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Notes: {order.notes}
              </p>
            ) : null}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-[11px] uppercase tracking-[0.12em]"
            disabled={setPaid.isPending}
            onClick={() => setPaid.mutate(!order.payment_confirmed)}
          >
            {order.payment_confirmed ? "Mark unpaid" : "Mark as paid"}
          </Button>
          {order.payment_confirmed && !(order as any).refunded_at ? (
            <Button
              size="sm"
              variant="destructive"
              className="text-[11px] uppercase tracking-[0.12em]"
              onClick={async () => {
                if (!window.confirm("Mark this order refunded? Any referral credit it earned is reversed and credit the customer used is returned. Money is not refunded automatically.")) return;
                try {
                  await adminSetOrderRefunded({ data: { orderId: order.id } });
                  toast.success("Order marked refunded");
                  void queryClient.invalidateQueries();
                } catch {
                  toast.error("Could not mark refunded");
                }
              }}
            >
              Mark refunded
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background/40 p-4">
        <p className="text-[11px] tracking-[0.18em] text-muted-foreground">
          AUSTRALIA POST EXPRESS TRACKING
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
              size="sm"
              className="text-[11px] uppercase tracking-[0.12em]"
              disabled={saveTracking.isPending}
              onClick={() => saveTracking.mutate()}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-[11px] uppercase tracking-[0.12em]"
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
          <p className="mt-2 text-sm text-muted-foreground">
            No tracking number yet.
          </p>
        )}
      </div>

      <OrderAcknowledgementInfo
        orderId={order.id}
        userId={order.user_id}
        createdAt={order.created_at}
      />

      <AdminOrderActions order={order} />
    </div>
  );
}

/* --------------------------------------------------------- NOTIFICATIONS */

function NotificationsPanel() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => adminListNotifications({}),
  });

  const markRead = useMutation({
    mutationFn: () => adminMarkNotificationsRead({}),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });

  const items = data ?? [];

  return (
    <div className="rounded-2xl border border-primary/25 bg-card/90 p-5 shadow-glow">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs tracking-[0.2em] text-steel">NOTIFICATIONS</h2>
        <Button
          variant="outline"
          size="sm"
          className="text-xs uppercase tracking-[0.16em]"
          onClick={() => markRead.mutate()}
          disabled={markRead.isPending || items.every((n) => n.read)}
        >
          Mark all read
        </Button>
      </div>
      <section className="mt-5 rounded-xl border border-primary/25 bg-background/50 p-4">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide">
          Automatic customer emails
        </h3>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Order received",
            "Payment confirmed",
            "Dispatched with tracking",
            "Delivered",
          ].map((step) => (
            <p key={step} className="rounded-lg border border-primary/20 px-3 py-2">
              {step}
            </p>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Confirm manual payments and add the tracking number when you ship.
          Saved order changes send the matching email automatically. Mark orders
          delivered yourself once delivery is confirmed.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Failed emails retry automatically. Repeated failures appear in these
          notifications so you can check them.
        </p>
      </section>
      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No notifications yet.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border p-4 ${n.read ? "border-primary/15 bg-card/60" : "border-accent/50 bg-card/90 shadow-gold"}`}
            >
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-foreground">
                {n.title}
              </p>
              {n.body ? (
                <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
              ) : null}
              <p className="mt-2 text-[11px] tracking-[0.16em] text-muted-foreground">
                {formatDate(n.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ PAGE */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-hero flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <h1 className="text-xl tracking-[0.2em] text-steel">ADMIN</h1>
        <div className="mt-4">{children}</div>
      </main>
    </div>
  );
}

function AdminPage() {
  const { isAdmin, isLoading } = useIsAdmin();

  if (isLoading) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </Shell>
    );
  }

  if (!isAdmin) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">
          This area is restricted to the store owner.
        </p>
      </Shell>
    );
  }

  return (
    <AdminTabsPage />
  );
}

function AdminTabsPage() {
  const [adminTab, setAdminTab] = useState("orders");
  useEffect(() => {
    const go = (e: Event) => setAdminTab(String((e as CustomEvent).detail));
    window.addEventListener("titan-admin-tab", go);
    return () => window.removeEventListener("titan-admin-tab", go);
  }, []);
  return (
    <div className="bg-hero flex min-h-screen flex-col">
      <SiteHeader />
      <main className="page-shell flex-1 pb-24 pt-8 sm:pt-12">
        <TitanPageHeading
          as="h1"
          icon={Settings2}
          eyebrow="Titan management"
          title="Admin"
        />
        <Tabs value={adminTab} onValueChange={setAdminTab} className="mt-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="finance">Sales &amp; profit</TabsTrigger>
            <TabsTrigger value="discounts">Discounts</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="edits">Website editor</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6">
            <OrdersTab />
          </TabsContent>
          <TabsContent value="members" className="mt-6">
            <AdminMembers />
          </TabsContent>
          <TabsContent value="products" className="mt-6">
            <AdminProducts />
          </TabsContent>
          <TabsContent value="finance" className="mt-6">
            <AdminFinance />
          </TabsContent>
          <TabsContent value="discounts" className="mt-6">
            <AdminDiscounts />
          </TabsContent>
          <TabsContent value="reviews" className="mt-6">
            <AdminReviews />
          </TabsContent>
          <TabsContent value="edits" className="mt-6">
            <AdminEdits />
          </TabsContent>
          <TabsContent value="notifications" className="mt-6">
            <NotificationsPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
