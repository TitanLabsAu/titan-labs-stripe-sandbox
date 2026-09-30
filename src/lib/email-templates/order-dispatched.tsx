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

export interface OrderDispatchedProps {
  orderNumber?: string
  customerName?: string
  trackingNumber?: string
  total?: string
}

export function OrderDispatched({
  orderNumber = 'TL-0000',
  customerName = 'there',
  trackingNumber = '',
  total = '$0.00',
}: OrderDispatchedProps) {
  const trackingLink = trackingNumber
    ? `https://auspost.com.au/mypost/track/details/${encodeURIComponent(trackingNumber)}`
    : ''
  return (
    <Html>
      <Head />
      <Preview>{`Order ${orderNumber} dispatched`}</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', margin: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }}>
          <Heading style={{ color: '#12447d', fontSize: '22px', margin: '0 0 8px' }}>
            TITAN LABS AUSTRALIA
          </Heading>
          <Text style={{ color: '#5b6b80', fontSize: '14px', margin: '0 0 24px' }}>
            Dispatch confirmation
          </Text>

          <Section style={{ backgroundColor: '#f4f7fb', borderRadius: '10px', padding: '24px' }}>
            <Text style={{ color: '#0d1b2a', fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px' }}>
              Hi {customerName}, order {orderNumber} is on its way
            </Text>
            <Text style={{ color: '#3c4a5c', fontSize: '14px', margin: '0 0 6px' }}>
              Your parcel has been dispatched with Australia Post Express.
            </Text>
            {trackingNumber ? (
              <Text style={{ color: '#3c4a5c', fontSize: '14px', margin: '0 0 6px' }}>
                Tracking:{' '}
                <Link href={trackingLink} style={{ color: '#12447d' }}>
                  {trackingNumber}
                </Link>
              </Text>
            ) : null}
            <Text style={{ color: '#0d1b2a', fontSize: '15px', fontWeight: 'bold', margin: '16px 0 0' }}>
              Order total: {total}
            </Text>
            <Text style={{ color: '#5b6b80', fontSize: '13px', margin: '16px 0 0' }}>
              Thank you for supporting Titan Labs Australia.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OrderDispatched,
  subject: (data: Record<string, any>) =>
    `Your Titan Labs order ${data['orderNumber'] ?? ''} has been dispatched`,
  displayName: 'Order dispatched (customer)',
  previewData: {
    orderNumber: 'TL-1052',
    customerName: 'Jane',
    trackingNumber: '33ABC123456789',
    total: '$300.00',
  },
} satisfies TemplateEntry
