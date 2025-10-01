# Phase 3: In-App Notification System - Implementation Complete ✓

**Date:** 2025-09-30
**Status:** Backend Complete
**Next:** Frontend Implementation (NotificationBell, NotificationList)

## Overview

Implemented a comprehensive in-app notification system for the sports management application. This system delivers real-time notifications to users about game assignments, status changes, and other important events.

---

## ✅ Completed Features

### 1. Database Schema

#### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,  -- assignment, status_change, reminder, system
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500),  -- Deep link to relevant page
  metadata JSONB,  -- Additional data (game_id, assignment_id, etc.)
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX notifications_user_unread_index ON notifications(user_id, is_read);
CREATE INDEX notifications_user_created_index ON notifications(user_id, created_at);
CREATE INDEX notifications_type_index ON notifications(type);
```

#### Notification Preferences Table
```sql
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_assignments BOOLEAN DEFAULT true,
  email_reminders BOOLEAN DEFAULT true,
  email_status_changes BOOLEAN DEFAULT true,
  sms_assignments BOOLEAN DEFAULT true,
  sms_reminders BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Migration:** `backend/migrations/20250930_create_notifications.js`

### 2. NotificationService

**File:** `backend/src/services/NotificationService.ts`

Core service for all notification operations:

#### Key Methods

```typescript
class NotificationService {
  // Create notification (respects user preferences)
  async createNotification(data: CreateNotificationData): Promise<NotificationEntity | null>

  // Get user notifications with pagination
  async getUserNotifications(userId: UUID, options: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<NotificationListResult>

  // Mark operations
  async markAsRead(notificationId: UUID): Promise<void>
  async markAllAsRead(userId: UUID): Promise<number>

  // Cleanup
  async deleteNotification(notificationId: UUID): Promise<void>
  async deleteOldNotifications(daysToKeep: number): Promise<number>

  // Preferences
  async getUserPreferences(userId: UUID): Promise<any>
  async updateUserPreferences(userId: UUID, preferences: Partial<any>): Promise<any>
}
```

#### Notification Types

| Type | Description | Use Case |
|------|-------------|----------|
| `assignment` | New game assignment | Referee gets assigned to a game |
| `status_change` | Assignment status update | Referee accepts/declines assignment |
| `reminder` | Game reminder | Upcoming game notification |
| `system` | System messages | Platform announcements, updates |

#### Features

- **Preference-aware**: Checks `in_app_enabled` before creating notifications
- **Auto-create preferences**: Creates default preferences for new users
- **Non-blocking**: Failures logged but don't throw errors
- **Metadata storage**: JSONB field for flexible additional data
- **Cleanup utilities**: Remove old read notifications

### 3. API Endpoints

**File:** `backend/src/routes/notifications.ts`

All endpoints require authentication (`authenticateToken` middleware).

#### GET /api/notifications
Get user's notifications with pagination and filtering.

**Query Parameters:**
- `unread_only`: `true` to show only unread (default: `false`)
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "type": "assignment",
        "title": "New Game Assignment",
        "message": "You've been assigned to Lakers vs Warriors on Oct 15",
        "link": "/assignments/abc-123",
        "metadata": {
          "game_id": "uuid",
          "assignment_id": "uuid",
          "position": "Head Referee",
          "calculated_wage": 75.00
        },
        "is_read": false,
        "read_at": null,
        "created_at": "2025-09-30T10:00:00Z"
      }
    ],
    "unreadCount": 5,
    "total": 42
  }
}
```

#### GET /api/notifications/unread-count
Get only the unread count (lightweight endpoint for polling/badges).

**Response:**
```json
{
  "success": true,
  "data": {
    "unreadCount": 5
  }
}
```

#### PATCH /api/notifications/:id/read
Mark a single notification as read.

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

#### PATCH /api/notifications/mark-all-read
Mark all user's notifications as read.

**Response:**
```json
{
  "success": true,
  "data": {
    "markedAsRead": 5
  }
}
```

#### DELETE /api/notifications/:id
Delete a single notification.

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

#### GET /api/notifications/preferences
Get user's notification preferences.

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "email_assignments": true,
    "email_reminders": true,
    "email_status_changes": true,
    "sms_assignments": true,
    "sms_reminders": true,
    "in_app_enabled": true,
    "created_at": "2025-09-30T10:00:00Z",
    "updated_at": "2025-09-30T10:00:00Z"
  }
}
```

#### PATCH /api/notifications/preferences
Update user's notification preferences.

**Request Body:**
```json
{
  "email_assignments": false,
  "sms_reminders": false,
  "in_app_enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "email_assignments": false,
    "sms_reminders": false,
    "in_app_enabled": true,
    // ... other fields
  },
  "message": "Notification preferences updated"
}
```

**Validation:** Joi schema validates all boolean fields are optional.

### 4. Integration with Assignment Workflow

**File:** `backend/src/routes/assignments.ts`

#### On Assignment Creation (Referee Notification)

```typescript
await notificationService.createNotification({
  user_id: referee_id,
  type: 'assignment',
  title: 'New Game Assignment',
  message: `You've been assigned to ${homeTeam} vs ${awayTeam} on ${date}`,
  link: `/assignments/${assignment_id}`,
  metadata: {
    game_id,
    assignment_id,
    position,
    calculated_wage
  }
});
```

#### On Assignment Status Update (Assignor Notification)

```typescript
await notificationService.createNotification({
  user_id: assignor_id,
  type: 'status_change',
  title: `Assignment ${status === 'accepted' ? 'Accepted' : 'Declined'}`,
  message: `${referee_name} ${status} ${homeTeam} vs ${awayTeam}${decline_reason}`,
  link: `/games/${game_id}`,
  metadata: {
    game_id,
    assignment_id,
    status,
    referee_name,
    decline_reason,
    decline_category
  }
});
```

**Error Handling:** All notification operations wrapped in try-catch blocks. Failures are logged but don't break assignment operations.

---

## 📊 Database Performance

### Indexes

Three composite indexes for optimal query performance:

1. **User + Unread**: `(user_id, is_read)` - Fast unread queries
2. **User + Created**: `(user_id, created_at)` - Chronological sorting
3. **Type**: `(type)` - Filter by notification type

### Estimated Storage

- **Per Notification**: ~500 bytes average
- **10,000 notifications**: ~5 MB
- **100,000 notifications**: ~50 MB

**Recommendation:** Run cleanup job to delete old read notifications (30+ days).

### Sample Cleanup Query

```sql
-- Delete read notifications older than 30 days
DELETE FROM notifications
WHERE created_at < NOW() - INTERVAL '30 days'
  AND is_read = true;
```

Or use the service method:
```typescript
await notificationService.deleteOldNotifications(30);
```

---

## 🔧 Configuration

### Environment Variables

None required! Notification system uses existing database connection.

### User Preferences

Default preferences (created automatically for new users):

```json
{
  "email_assignments": true,
  "email_reminders": true,
  "email_status_changes": true,
  "sms_assignments": true,
  "sms_reminders": true,
  "in_app_enabled": true
}
```

Users can disable in-app notifications by setting `in_app_enabled: false`.

---

## 🧪 Testing

### Manual API Testing

#### 1. Create a notification (simulated):
```bash
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "assignment",
    "title": "Test Assignment",
    "message": "This is a test notification"
  }'
```

#### 2. Get notifications:
```bash
curl http://localhost:3001/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3. Get unread count:
```bash
curl http://localhost:3001/api/notifications/unread-count \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 4. Mark as read:
```bash
curl -X PATCH http://localhost:3001/api/notifications/{id}/read \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 5. Update preferences:
```bash
curl -X PATCH http://localhost:3001/api/notifications/preferences \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "in_app_enabled": false,
    "email_assignments": false
  }'
```

### Database Verification

```sql
-- Check notification counts by type
SELECT type, COUNT(*) as count,
       COUNT(*) FILTER (WHERE is_read = false) as unread_count
FROM notifications
GROUP BY type;

-- Check user preferences
SELECT user_id, in_app_enabled, email_assignments, sms_assignments
FROM notification_preferences
LIMIT 10;

-- Check recent notifications
SELECT u.email, n.type, n.title, n.is_read, n.created_at
FROM notifications n
JOIN users u ON n.user_id = u.id
ORDER BY n.created_at DESC
LIMIT 20;
```

### Integration Testing

Create a test assignment and verify:
1. ✅ Referee receives in-app notification
2. ✅ Notification appears in GET /api/notifications
3. ✅ Unread count increments
4. ✅ Mark as read works
5. ✅ Assignor receives notification when referee accepts/declines

---

## 🚀 Frontend Implementation (TODO)

### Components to Create

#### 1. NotificationBell Component
```tsx
// Location: frontend/src/components/NotificationBell.tsx
// Features:
// - Bell icon with unread badge
// - Dropdown menu with recent notifications
// - "View All" link to full notification page
// - Mark as read on click
// - Polling for updates (every 30-60 seconds)
```

#### 2. NotificationList Component
```tsx
// Location: frontend/src/components/NotificationList.tsx
// Features:
// - Full notification list with pagination
// - Filter by read/unread
// - Mark all as read button
// - Delete individual notifications
// - Click to navigate to linked page
```

#### 3. NotificationPreferences Component
```tsx
// Location: frontend/src/components/settings/NotificationPreferences.tsx
// Features:
// - Toggle switches for all preference types
// - Email, SMS, and in-app sections
// - Save preferences button
// - Success/error feedback
```

### API Client Updates
```typescript
// frontend/src/api/notifications.ts
export const notificationApi = {
  getNotifications: (params?: { unread_only?: boolean; limit?: number; offset?: number }) =>
    api.get('/notifications', { params }),

  getUnreadCount: () =>
    api.get('/notifications/unread-count'),

  markAsRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.patch('/notifications/mark-all-read'),

  deleteNotification: (id: string) =>
    api.delete(`/notifications/${id}`),

  getPreferences: () =>
    api.get('/notifications/preferences'),

  updatePreferences: (data: Partial<NotificationPreferences>) =>
    api.patch('/notifications/preferences', data)
};
```

### Layout Integration
```tsx
// Add NotificationBell to main layout header
<Header>
  <Logo />
  <Navigation />
  <NotificationBell />  {/* Add here */}
  <UserMenu />
</Header>
```

### Routing
```tsx
// Add notification routes
<Route path="/notifications" element={<NotificationList />} />
<Route path="/settings/notifications" element={<NotificationPreferences />} />
```

---

## 📈 Analytics & Monitoring

### Key Metrics to Track

```sql
-- Notification delivery rate
SELECT
  type,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE is_read = true) as read_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_read = true) / COUNT(*), 2) as read_percentage
FROM notifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY type;

-- Average time to read
SELECT
  type,
  AVG(EXTRACT(EPOCH FROM (read_at - created_at)) / 60) as avg_minutes_to_read
FROM notifications
WHERE is_read = true
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY type;

-- Notifications per user
SELECT
  u.email,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE n.is_read = false) as unread_count
FROM users u
JOIN notifications n ON u.id = n.user_id
WHERE n.created_at > NOW() - INTERVAL '7 days'
GROUP BY u.email
ORDER BY total_notifications DESC
LIMIT 20;

-- User preference adoption
SELECT
  COUNT(*) FILTER (WHERE in_app_enabled = true) as in_app_enabled_count,
  COUNT(*) FILTER (WHERE email_assignments = false) as email_disabled_count,
  COUNT(*) FILTER (WHERE sms_assignments = false) as sms_disabled_count,
  COUNT(*) as total_users
FROM notification_preferences;
```

---

## 🐛 Troubleshooting

### Notifications Not Appearing

**Issue:** User not receiving notifications

**Checklist:**
1. Check if user has `in_app_enabled: true` in notification_preferences
2. Verify notification was created (check database)
3. Check application logs for errors
4. Verify user_id matches authenticated user

```sql
-- Check user preferences
SELECT * FROM notification_preferences WHERE user_id = 'USER_UUID';

-- Check recent notifications for user
SELECT * FROM notifications
WHERE user_id = 'USER_UUID'
ORDER BY created_at DESC
LIMIT 10;
```

### High Database Load

**Issue:** Notification queries causing performance issues

**Solutions:**
1. Verify indexes exist:
```sql
\d notifications  -- Check indexes in PostgreSQL
```

2. Implement pagination (already done):
   - Limit default results to 20
   - Use offset for pagination
   - Frontend should implement virtual scrolling for large lists

3. Run cleanup job:
```typescript
// Run daily via cron or scheduled job
await notificationService.deleteOldNotifications(30);
```

### TypeScript Compilation Errors

**Issue:** `BaseEntity` constraint errors

**Resolution:** NotificationService no longer extends BaseService. Uses direct database operations instead.

If you need to add new methods, follow the existing pattern:
```typescript
async yourMethod(): Promise<void> {
  const result = await (db as any)('notifications')
    .where('some_field', some_value)
    .select('*');

  return result;
}
```

---

## 📝 Best Practices

### 1. Notification Content

**Do:**
- ✅ Keep titles short and actionable
- ✅ Include key details in message (team names, dates)
- ✅ Provide deep links to relevant pages
- ✅ Use consistent language across notification types

**Don't:**
- ❌ Send duplicate notifications for same event
- ❌ Include sensitive information in messages
- ❌ Send too many notifications (respect preferences)
- ❌ Use ALL CAPS or excessive punctuation

### 2. Metadata Usage

Store contextual data in metadata for:
- Deep linking with required IDs
- Analytics and reporting
- Frontend display logic
- Future feature extensions

```typescript
// Good metadata example
metadata: {
  game_id: 'uuid',
  assignment_id: 'uuid',
  position: 'Head Referee',
  calculated_wage: 75.00,
  home_team: 'Lakers',
  away_team: 'Warriors'
}
```

### 3. Error Handling

Always wrap notification operations in try-catch:

```typescript
try {
  await notificationService.createNotification(data);
  console.log('✅ Notification sent');
} catch (error) {
  console.error('Failed to send notification:', error);
  // Don't throw - let primary operation succeed
}
```

### 4. Cleanup Strategy

Run scheduled cleanup to prevent database bloat:

```typescript
// Daily cleanup job (keep 30 days of read notifications)
cron.schedule('0 2 * * *', async () => {
  const deleted = await notificationService.deleteOldNotifications(30);
  console.log(`Cleaned up ${deleted} old notifications`);
});
```

---

## ✅ Phase 3 Checklist

### Backend (Complete)
- [x] Database migrations created and applied
- [x] NotificationService implemented
- [x] API routes created with authentication
- [x] Validation schemas with Joi
- [x] Integration with assignment workflow
- [x] Error handling (non-blocking)
- [x] TypeScript compilation successful
- [x] Documentation completed

### Frontend (Pending)
- [ ] NotificationBell component
- [ ] NotificationList component
- [ ] NotificationPreferences component
- [ ] API client integration
- [ ] Layout integration (header bell icon)
- [ ] Routing setup
- [ ] Polling or WebSocket for real-time updates
- [ ] Unit tests for components

---

## 🎯 Success Criteria

Phase 3 is complete when:
- ✅ Backend: Notifications are created for assignment events
- ✅ Backend: API endpoints return correct data
- ✅ Backend: User preferences are respected
- ⏳ Frontend: Users can view notifications in UI
- ⏳ Frontend: Users can mark notifications as read
- ⏳ Frontend: Users can manage preferences
- ⏳ Frontend: Unread badge displays in header

**Current Status:** Backend Complete ✓ | Frontend Pending

---

## 📚 Related Documentation

- [Phase 1: Email Notifications & Decline Reasons](./game-assignment-phase1-complete.md)
- [Phase 2: SMS Notifications & Reminders](./game-assignment-phase2-complete.md)
- [Implementation Plan](./game-assignment-workflow-implementation-plan.md)

---

**Last Updated:** 2025-09-30
**Next Review:** After frontend implementation
