import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/products";
import { adminSendOrderEmail, type AdminOrder } from "@/lib/admin.functions";
import { orderReference } from "@/lib/order-reference";

export function trackingUrl(tracking: string) {
  return `https://auspost.com.au/mypost/track/details/${encodeURIComponent(tracking)}`;
}

export function copyText(value: string, label: string) {
  void navigator.clipboard
    .writeText(value)
    .then(() => toast.success(`${label} copied`))
    .catch(() => toast.error(`Could not copy the ${label.toLowerCase()}`));
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => copyText(value, label)}
      title={`Copy ${label.toLowerCase()}`}
      className="inline-flex items-center text-muted-foreground transition-colors hover:text-accent"
    >
      <Copy className="h-3.5 w-3.5" />
      <span className="sr-only">Copy {label}</span>
    </button>
  );
}

function waNumber(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("61")) return digits;
  if (digits.startsWith("0")) return `61${digits.slice(1)}`;
  return digits;
}

function messages(order: AdminOrder) {
  const name = order.customer?.first_name?.trim() || "there";
  const ref = orderReference(order);
  const total = formatPrice(Number(order.total));
  const tracking = order.tracking_number ?? "";

  return [
    {
      key: "received",
      label: "Order received",
      text: `Hi ${name}, thanks for your Titan Labs order #${ref} (${total}). It has been received and is being packed for dispatch. I'll send your Australia Post tracking number as soon as it ships.`,
    },
    {
      key: "packed",
      label: "Being packed",
      text: `Hi ${name}, quick update on Titan Labs order #${ref} — it's packed and going out with Australia Post Express shortly.`,
    },
    {
      key: "dispatched",
      label: "Dispatched + tracking",
      text: tracking
        ? `Hi ${name}, your Titan Labs order #${ref} has been dispatched via Australia Post Express. Track it here: ${trackingUrl(tracking)} (${tracking}). Thanks for your support!`
        : `Hi ${name}, your Titan Labs order #${ref} has been dispatched via Australia Post Express. I'll send the tracking link shortly.`,
    },
  ];
}

export function AdminOrderActions({ order }: { order: AdminOrder }) {
  const phone = waNumber(order.customer?.phone_number);
  const email = order.customer?.email ?? "";

  const sendEmail = useMutation({
    mutationFn: (template: "order-confirmation" | "order-dispatched") =>
      adminSendOrderEmail({ data: { orderId: order.id, template } }),
    onSuccess: (result) => {
      if (result.sent) toast.success(`Email sent to ${result.email}`);
      else toast.message("This customer has unsubscribed from emails.");
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not send the email"),
  });

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-border bg-background/40 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          WhatsApp messages
        </p>
        <div className="mt-3 space-y-3">
          {messages(order).map((m) => (
            <div key={m.key} className="rounded-md border border-border/70 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-foreground">{m.label}</p>
              <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{m.text}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="font-bold uppercase"
                  onClick={() => copyText(m.text, "Message")}
                >
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="font-bold uppercase"
                  disabled={!phone}
                  title={phone ? "Open WhatsApp" : "No phone number on file"}
                  onClick={() =>
                    window.open(
                      `https://wa.me/${phone}?text=${encodeURIComponent(m.text)}`,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  <MessageCircle className="mr-1 h-3.5 w-3.5" /> WhatsApp
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background/40 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Customer emails
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {email ? `Sends to ${email}` : "No email address on file for this customer."}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Button
            variant="outline"
            className="font-bold uppercase"
            disabled={!email || sendEmail.isPending}
            onClick={() => sendEmail.mutate("order-confirmation")}
          >
            <Mail className="mr-2 h-4 w-4" /> Send order confirmation
          </Button>
          <Button
            variant="outline"
            className="font-bold uppercase"
            disabled={!email || sendEmail.isPending}
            onClick={() => sendEmail.mutate("order-dispatched")}
          >
            <Mail className="mr-2 h-4 w-4" /> Send dispatch + tracking
          </Button>
        </div>
      </div>
    </div>
  );
}
