import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
import { template as orderDeliveredTemplate } from './order-delivered'
import { template as adminMilestoneTemplate } from './admin-milestone'
import { template as orderConfirmationTemplate } from './order-confirmation'
import { template as orderDispatchedTemplate } from './order-dispatched'
import { template as orderCheckpointTemplate } from './order-checkpoint'
import { template as calendarReminderTemplate } from './calendar-reminder'
import { template as memberWelcomeTemplate } from './member-welcome'
import { template as titanClubWelcomeTemplate } from './titan-club-welcome'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'order-delivered': orderDeliveredTemplate,
  'admin-milestone': adminMilestoneTemplate,
  'order-confirmation': orderConfirmationTemplate,
  'order-dispatched': orderDispatchedTemplate,
  'order-checkpoint': orderCheckpointTemplate,
  'calendar-reminder': calendarReminderTemplate,
  'member-welcome': memberWelcomeTemplate,
  'titan-club-welcome': titanClubWelcomeTemplate,
}

