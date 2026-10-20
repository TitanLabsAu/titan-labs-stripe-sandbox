import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { BrandedOrderEmail, type OrderEmailProps } from "./order-receipt-content";
import type { TemplateEntry } from "./registry";

type Props = OrderEmailProps & {
  kind?: "payment-confirmed" | "delivered";
  orderNumber?: string;
  customerName?: string;
  total?: string;
  trackingNumber?: string;
};

export function OrderCheckpoint({
  kind = "payment-confirmed",
  orderNumber = "TL-0000",
  customerName = "there",
  total = "$0.00 AUD",
  trackingNumber = "",
  receipt, orderId,
}: Props) {
  if (kind === "payment-confirmed") return <BrandedOrderEmail kind={kind} orderNumber={orderNumber} customerName={customerName} total={total} paymentConfirmed={true} receipt={receipt} orderId={orderId}/>;
  const delivered = kind === "delivered";
  const title = delivered ? "Delivery confirmation" : "Payment confirmed";
  return (
    <Html>
      <Head />
      <Preview>{`${orderNumber}: ${title}`}</Preview>
      <Body
        style={{
          backgroundColor: "#ffffff",
          fontFamily: "Arial, sans-serif",
          margin: 0,
        }}
      >
        <Container
          style={{ maxWidth: "560px", margin: "0 auto", padding: "32px 24px" }}
        >
          <Heading style={{ color: "#12447d", fontSize: "22px" }}>
            TITAN LABS // AUS
          </Heading>
          <Section
            style={{
              backgroundColor: "#f4f7fb",
              borderRadius: "10px",
              padding: "24px",
            }}
          >
            <Heading style={{ color: "#0d1b2a", fontSize: "18px" }}>
              {title}
            </Heading>
            <Text>Hi {customerName},</Text>
            <Text>
              {delivered
                ? `Order ${orderNumber} has been marked delivered. Thank you for supporting Titan Labs Australia.`
                : `Payment for order ${orderNumber} is confirmed. We will send your tracking details when your parcel is dispatched.`}
            </Text>
            <Text>Order total: {total}</Text>
            {delivered && trackingNumber ? (
              <Text>
                Track your parcel:{" "}
                <Link
                  href={`https://auspost.com.au/mypost/track/details/${encodeURIComponent(trackingNumber)}`}
                >
                  {trackingNumber}
                </Link>
              </Text>
            ) : null}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: OrderCheckpoint,
  subject: (data: Record<string, unknown>) =>
    `Your Titan Labs order ${data["orderNumber"] ?? ""} — ${data["kind"] === "delivered" ? "delivered" : "payment confirmed"}`,
  displayName: "Order payment or delivery update (customer)",
  previewData: {
    kind: "payment-confirmed",
    orderNumber: "TL-1056",
    customerName: "Jane",
    total: "$288.00 AUD",
  },
} satisfies TemplateEntry;
