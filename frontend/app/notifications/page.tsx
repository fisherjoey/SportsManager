'use client';

import { NotificationList } from '@/components/NotificationList';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

/**
 * Notifications Page
 *
 * Displays the full list of notifications for the authenticated user.
 * Accessible to all authenticated users.
 */
export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationList />
    </ProtectedRoute>
  );
}
