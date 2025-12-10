'use client'

import { PageAccessGuard } from '@/components/page-access-guard'
import { NotificationPreferences } from '@/components/NotificationPreferences'

/**
 * Notification Settings Page
 *
 * Allows users to manage their notification preferences for email, SMS, and in-app notifications.
 * Accessible to all authenticated users.
 */
export default function NotificationSettingsPage() {
  return (
    <PageAccessGuard pageId="settings_notifications">
      <NotificationPreferences />
    </PageAccessGuard>
  )
}
