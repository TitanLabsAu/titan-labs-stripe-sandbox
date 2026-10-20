import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { OrderPurchaseBreakdown } from '@/components/OrderPurchaseBreakdown';
import { ReceiptDownload } from '@/components/ReceiptDownload';
import { Button } from '@/components/ui/button';
import { getOrderReceipt, getGuestOrderReceipt } from '@/lib/receipt.functions';

export const Route = createFileRoute('/receipt/$orderId')({
  head: () => ({ meta: [{ title: 'Your Order Receipt | Titan Labs Australia' }, { name: 'description', content: 'Secure saved order receipt from Titan Labs Australia.' }, { property: 'og:title', content: 'Your Order Receipt | Titan Labs Australia' }, { property: 'og:description', content: 'View your saved Titan Labs Australia order and receipt.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex, noarchive' }] }),
  component: ReceiptPage,
});
function ReceiptPage() {
  const { orderId } = Route.useParams(); const getReceipt = useServerFn(getOrderReceipt);
  const getGuestReceipt = useServerFn(getGuestOrderReceipt);
  const query = useQuery({ queryKey: ['order-receipt', orderId], queryFn: async () => {
    try { return { ...await getReceipt({ data: { orderId } }), guest: false }; }
    catch { return { ...await getGuestReceipt({ data: { orderId } }), guest: true }; }
  }, retry: false, gcTime: 0 });
  return <div className="min-h-screen bg-background"><SiteHeader/><main className="page-shell py-12"><h1 className="font-display text-3xl font-bold">Your order receipt</h1><div className="mt-8 max-w-4xl">{query.isPending ? <p>Checking order access…</p> : query.data ? <><p className="mb-6 font-semibold">Order {query.data.order.order_number ? `TL-${query.data.order.order_number}` : ''}</p><OrderPurchaseBreakdown order={query.data.order}/><div className="mt-6"><ReceiptDownload orderId={orderId} guest={query.data.guest}/></div></> : <><p className="mb-4 text-muted-foreground">Sign in with the order account, or return using the original guest checkout session. Expired guest sessions require the store owner’s help.</p><Button asChild><a href={`/auth?redirect=${encodeURIComponent(`/receipt/${orderId}`)}`}>Sign in to view receipt</a></Button></>}</div></main><SiteFooter/></div>;
}