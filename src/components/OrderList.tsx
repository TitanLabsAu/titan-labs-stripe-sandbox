import { formatPrice } from "@/lib/products";
import { orderReference } from "@/lib/order-reference";

export type OrderItemRow = {
  id: string;
  product_name: string;
  product_slug: string;
  unit_price: number;
  quantity: number;
};

export type OrderRow = {
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

export function OrderList({ orders, emptyMessage }: { orders: OrderRow[]; emptyMessage: string }) {
  if (orders.length === 0) {
    return (
      <div className="border border-border bg-background p-8 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {orders.map((order) => (
        <article key={order.id} className="border border-border bg-background p-6">
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Order {orderReference(order)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Placed {formatDate(order.created_at)}
                {order.delivered_at ? ` · Delivered ${formatDate(order.delivered_at)}` : ""}
              </p>
            </div>
            <span className="brand-cut border border-accent/50 px-3 py-1 text-xs font-bold uppercase text-accent">
              {STATUS_LABEL[order.status]}
            </span>
          </header>

          <ul className="divide-y divide-border">
            {order.order_items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-3">
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

          <div className="space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatPrice(Number(order.subtotal))}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Express shipping</span>
              <span>{formatPrice(Number(order.shipping))}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="font-bold uppercase tracking-wide text-foreground">Total</span>
              <span className="text-xl font-extrabold text-accent">
                {formatPrice(Number(order.total))}
              </span>
            </div>
          </div>

          <div className="mt-4 border border-border bg-background/40 p-4">
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
