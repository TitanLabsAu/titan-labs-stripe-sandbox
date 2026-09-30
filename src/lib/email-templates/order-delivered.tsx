import * as React from 'react'
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
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface OrderDeliveredProps {
  orderNumber?: string
  customerName?: string
  trackingNumber?: string
  total?: string
}

export function OrderDelivered({
  orderNumber = 'TL-0000',
  customerName = 'a customer',
  trackingNumber = '',
  total = '$0.00',
}: OrderDeliveredProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Order ${orderNumber} has been delivered`}</Preview>
      <Body style={{ backgroundColor: '#0b1220', fontFamily: 'Arial, sans-serif', margin: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }}>
          <Heading style={{ color: '#4da3ff', fontSize: '22px', margin: '0 0 8px' }}>
            TITAN LABS AUSTRALIA
          </Heading>
          <Text style={{ color: '#c9d4e4', fontSize: '14px', margin: '0 0 24px' }}>
            Delivery confirmation
          </Text>

          <Section
            style={{
              backgroundColor: '#121c2e',
              borderRadius: '10px',
              padding: '24px',
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px' }}>
              Order {orderNumber} has been delivered
            </Text>
            <Text style={{ color: '#c9d4e4', fontSize: '14px', margin: '0 0 6px' }}>
              Customer: {customerName}
            </Text>
            <Text style={{ color: '#c9d4e4', fontSize: '14px', margin: '0 0 6px' }}>
              Order total: {total}
            </Text>
            {trackingNumber ? (
              <Text style={{ color: '#c9d4e4', fontSize: '14px', margin: '0 0 6px' }}>
                Tracking:{' '}
                <Link
                  href={`https://auspost.com.au/mypost/track/details/${encodeURIComponent(trackingNumber)}`}
                  style={{ color: '#4da3ff' }}
                >
                  {trackingNumber}
                </Link>
              </Text>
            ) : null}
            <Text style={{ color: '#8ea3bf', fontSize: '13px', margin: '16px 0 0' }}>
              This order has been moved from Live Orders to Closed Orders automatically.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OrderDelivered,
  subject: (data: Record<string, any>) =>
    `Order ${data['orderNumber'] ?? ''} delivered by Australia Post`,
  displayName: 'Order delivered (admin notification)',
  previewData: {
    orderNumber: 'TL-1052',
    customerName: 'Jane Smith',
    trackingNumber: '33ABC123456789',
    total: '$300.00',
  },
} satisfies TemplateEntry
