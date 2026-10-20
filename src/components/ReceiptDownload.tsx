import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getOrderReceipt, getGuestOrderReceipt } from '@/lib/receipt.functions';

export function ReceiptDownload({ orderId, guest = false }: { orderId: string; guest?: boolean }) {
  const getReceipt = useServerFn(getOrderReceipt); const [busy, setBusy] = useState(false);
  const getGuestReceipt = useServerFn(getGuestOrderReceipt);
  const download = async () => {
    setBusy(true);
    try {
      const result = await (guest ? getGuestReceipt : getReceipt)({ data: { orderId, pdf: true } }); if (!result.pdf) throw new Error('Receipt unavailable');
      const bytes = Uint8Array.from(atob(result.pdf.base64), c => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: result.pdf.mime }));
      const a = document.createElement('a'); a.href = url; a.download = result.pdf.filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast.error('Could not download this receipt. Please sign in with the order account and try again.'); }
    finally { setBusy(false); }
  };
  return <Button variant="outline" size="sm" onClick={download} disabled={busy}><Download className="size-4"/>{busy ? 'Preparing receipt…' : 'Download receipt'}</Button>;
}