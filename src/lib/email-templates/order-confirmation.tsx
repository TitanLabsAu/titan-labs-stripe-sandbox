import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface OrderConfirmationProps {
  orderNumber?: string
  customerName?: string
  total?: string
  paymentConfirmed?: boolean
  shippingMethod?: string
  items?: string[]
}

export function OrderConfirmation({
  orderNumber = 'TL-0000',
  customerName = 'there',
  total = '$0.00',
  paymentConfirmed = false,
  shippingMethod = 'Australia Post Express',
  items = [],
}: OrderConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Order ${orderNumber} received`}</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', margin: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }}>
          <Heading style={{ color: '#12447d', fontSize: '22px', margin: '0 0 8px' }}>
            TITAN LABS AUSTRALIA
          </Heading>
          <Text style={{ color: '#5b6b80', fontSize: '14px', margin: '0 0 24px' }}>
            Order confirmation
          </Text>

          <Section style={{ backgroundColor: '#f4f7fb', borderRadius: '10px', padding: '24px' }}>
            <Text style={{ color: '#0d1b2a', fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px' }}>
              Hi {customerName}, we have your order {orderNumber}
            </Text>
            <Text style={{ color: '#3c4a5c', fontSize: '14px', margin: '0 0 12px' }}>
              {paymentConfirmed
                ? `Payment confirmed. Your order is being prepared for dispatch with ${shippingMethod}.`
                : 'Your order has been received and is awaiting payment confirmation. We will prepare it once payment is confirmed.'}
            </Text>
            {items.map((line) => (
              <Text key={line} style={{ color: '#3c4a5c', fontSize: '14px', margin: '0 0 4px' }}>
                {line}
              </Text>
            ))}
            <Text style={{ color: '#0d1b2a', fontSize: '15px', fontWeight: 'bold', margin: '16px 0 0' }}>
              Order total: {total}
            </Text>
            <Text style={{ color: '#5b6b80', fontSize: '13px', margin: '16px 0 0' }}>
              We will send your Australia Post tracking number as soon as your parcel is dispatched.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OrderConfirmation,
  subject: (data: Record<string, any>) => `Your Titan Labs order ${data['orderNumber'] ?? ''}`,
  displayName: 'Order confirmation (customer)',
  previewData: {
    orderNumber: 'TL-1052',
    customerName: 'Jane',
    total: '$300.00',
    items: ['2 × Retatrutide 10mg', '1 × BPC-157'],
  },
} satisfies TemplateEntry

