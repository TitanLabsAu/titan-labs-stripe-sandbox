import { OrderPurchaseBreakdown } from "./OrderPurchaseBreakdown";
import { ReceiptDownload } from "./ReceiptDownload";
import type { SavedReceiptOrder } from "@/lib/order-receipt";
import { orderReference } from "@/lib/order-reference";

export type OrderItemRow = {
  id: string;
  product_name: string;
  product_slug: string;
  unit_price: number;
  quantity: number;
};

export type OrderRow = SavedReceiptOrder & {
  id: string;
  order_number?: number | null;
  status: "processing" | "shipped" | "delivered" | "cancelled";
  tracking_number: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  created_at: string;
  delivered_at: string | null;
  order_items: OrderItemRow[];
};

const STATUS_LABEL: Record<OrderRow["status"], string> = {
  processing: "Being packed",
  shipped: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

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

export function OrderList({
  orders,
  emptyMessage,
}: {
  orders: OrderRow[];
  emptyMessage: string;
}) {
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {orders.map((order) => (
        <article
          key={order.id}
          className="rounded-xl border border-border bg-card p-6"
        >
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border pb-4">
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
            <span className="brand-cut border border-accent/50 px-3 py-1 text-xs font-bold uppercase text-accent">
              {STATUS_LABEL[order.status]}
            </span>
          </header>

          <div className="py-5"><OrderPurchaseBreakdown order={order}/></div>
          <ReceiptDownload orderId={order.id}/>

          <div className="mt-4 rounded-xl border border-border bg-background/40 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Australia Post Express tracking
            </p>
            {order.tracking_number ? (
              <a
                href={trackingUrl(order.tracking_number)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block font-bold text-accent underline underline-offset-4"
              >
                {order.tracking_number}
              </a>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Tracking number appears here once your parcel is picked up.
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
