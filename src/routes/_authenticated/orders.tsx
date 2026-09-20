import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { OrderList } from "@/components/OrderList";
import { fetchOrders } from "@/lib/orders";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "Current Orders | Titan Labs Aus" },
      {
        name: "description",
        content:
          "Track your Titan Labs Aus orders that are being packed or on their way with Australia Post Express.",
      },
      { property: "og:title", content: "Current Orders | Titan Labs Aus" },
      {
        property: "og:description",
        content: "See what you have ordered and track your Australia Post Express delivery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CurrentOrdersPage,
});

function CurrentOrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["orders", "current"],
    queryFn: () => fetchOrders(["processing", "shipped"]),
  });

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24">
        <h1 className="text-4xl font-extrabold uppercase tracking-tight text-foreground">
          Current orders
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Orders that are being packed or on their way to you.
        </p>

        <div className="mt-8">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading your orders…</p>
          ) : (
            <OrderList
              orders={data ?? []}
              emptyMessage="You have no orders on the way right now."
            />
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
