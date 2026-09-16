import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface AdminMilestoneProps {
  milestone?: number
  customerName?: string
  email?: string
  phone?: string
  address?: string
}

export function AdminMilestone({
  milestone = 50,
  customerName = 'A customer',
  email = '',
  phone = '',
  address = '',
}: AdminMilestoneProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${customerName} has reached ${milestone} orders`}</Preview>
      <Body style={{ backgroundColor: '#0b1220', fontFamily: 'Arial, sans-serif', margin: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }}>
          <Heading style={{ color: '#4da3ff', fontSize: '22px', margin: '0 0 8px' }}>
            TITAN LABS AUSTRALIA
          </Heading>
          <Text style={{ color: '#c9d4e4', fontSize: '14px', margin: '0 0 24px' }}>
            Customer milestone
          </Text>
          <Section style={{ backgroundColor: '#121c2e', borderRadius: '10px', padding: '24px' }}>
            <Text style={{ color: '#ffffff', fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px' }}>
              {customerName} has now placed {milestone} orders
            </Text>
            <Text style={{ color: '#c9d4e4', fontSize: '14px', margin: '0 0 6px' }}>Email: {email || '-'}</Text>
            <Text style={{ color: '#c9d4e4', fontSize: '14px', margin: '0 0 6px' }}>Phone: {phone || '-'}</Text>
            <Text style={{ color: '#c9d4e4', fontSize: '14px', margin: '0 0 6px' }}>
              Address: {address || '-'}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AdminMilestone,
  subject: (data: Record<string, any>) =>
    `Customer milestone: ${data['milestone'] ?? ''} orders — ${data['customerName'] ?? 'customer'}`,
  displayName: 'Customer milestone (admin notification)',
  previewData: {
    milestone: 50,
    customerName: 'Jane Smith',
    email: 'jane@example.com',
    phone: '0400 000 000',
    address: '1 Example St, Melbourne, VIC, 3000',
  },
} satisfies TemplateEntry
