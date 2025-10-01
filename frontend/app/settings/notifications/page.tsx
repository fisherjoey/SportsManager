'use client';

import { NotificationPreferences } from '@/components/NotificationPreferences';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

/**
 * Notification Settings Page
 *
 * Allows users to manage their notification preferences for email, SMS, and in-app notifications.
 * Accessible to all authenticated users.
 */
export default function NotificationSettingsPage() {
  return (
    <ProtectedRoute>
      <NotificationPreferences />
    </ProtectedRoute>
  );
}
