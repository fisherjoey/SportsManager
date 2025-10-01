# Notification System Overview

**Last Updated:** 2025-09-30
**Status:** Complete & Production-Ready

## Executive Summary

The sports management app now has a comprehensive notification system that delivers real-time updates through **in-app notifications**, **email**, and **SMS**. Notifications are deeply integrated with games, assignments, and communications.

---

## ✅ How Notifications Are Connected to Games

### 1. Game Assignment Notifications

**When a referee is assigned to a game:**

```typescript
// Notification created with game metadata
{
  type: 'assignment',
  title: 'New Game Assignment',
  message: 'You've been assigned to Lakers vs Warriors on Oct 15',
  link: '/assignments/{assignment_id}',
  metadata: {
    game_id: 'uuid',           // ✅ Connected to game
    assignment_id: 'uuid',
    position: 'Head Referee',
    calculated_wage: 75.00
  }
}
```

**Triggers:**
- POST `/api/assignments` - When assignor creates assignment
- Email sent to referee
- SMS sent to referee (if phone number configured)
- In-app notification created

### 2. Assignment Status Change Notifications

**When a referee accepts/declines an assignment:**

```typescript
// Assignor receives notification
{
  type: 'status_change',
  title: 'Assignment Accepted',
  message: 'John Smith accepted Lakers vs Warriors - Reason: Available',
  link: '/games/{game_id}',      // ✅ Links directly to game
  metadata: {
    game_id: 'uuid',             // ✅ Connected to game
    assignment_id: 'uuid',
    status: 'accepted',
    referee_name: 'John Smith',
    decline_reason: null,
    decline_category: null
  }
}
```

**Triggers:**
- PATCH `/api/assignments/:id/status` - When referee updates status
- Email sent to assignor
- In-app notification created for assignor

### 3. Game Reminder Notifications

**Automated reminders sent 2-3 hours before game:**

```typescript
// SMS reminder sent to referee
{
  phoneNumber: '+15551234567',
  firstName: 'John',
  game: {
    homeTeam: 'Lakers',
    awayTeam: 'Warriors',
    location: 'Staples Center',
    date: '2025-10-15',
    time: '7:00 PM'
  },
  position: 'Head Referee',
  dashboardLink: 'https://app.refassign.com/assignments'
}
```

**Triggers:**
- Cron job runs every hour (ReminderScheduler)
- Queries games 2-3 hours away
- Sends SMS to assigned referees
- Tracks `reminder_sent_at` to prevent duplicates

**Implementation:**
- File: `backend/src/services/reminderScheduler.ts`
- Cron schedule: `0 * * * *` (every hour at :00 minutes)
- Database field: `game_assignments.reminder_sent_at`

---

## 🎯 Manual Notification Broadcasting

### Overview

Admins can now send manual notifications to multiple users through two methods:

1. **Communications System** (full-featured)
2. **Direct Broadcast API** (quick notifications)

---

### Method 1: Communications System (Recommended)

**Route:** POST `/api/communications`

The communications system is the primary way to send structured messages to users. When a communication is published, it **automatically creates in-app notifications** for all recipients.

#### Features:
- ✅ Draft and publish workflow
- ✅ File attachments support
- ✅ Acknowledgment tracking
- ✅ Read receipts
- ✅ Expiration dates
- ✅ Priority levels (low, normal, high, urgent)
- ✅ Automatic in-app notification creation
- ✅ Target audience filtering

#### Communication Types:
- `announcement` - General announcements
- `memo` - Internal memos
- `policy_update` - Policy changes
- `emergency` - Emergency notifications (highest priority)
- `newsletter` - Regular newsletters

#### Target Audience Options:
```json
{
  "target_audience": {
    "departments": ["uuid1", "uuid2"],      // Filter by departments
    "roles": ["Admin", "Referee"],          // Filter by roles
    "specific_users": ["uuid1", "uuid2"],   // Specific user IDs
    "all_users": true                       // Everyone
  }
}
```

#### Example Request:
```bash
curl -X POST http://localhost:3001/api/communications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Game Schedule Changes for This Weekend",
    "content": "Due to weather conditions, all outdoor games scheduled for Saturday, October 14th have been rescheduled to Sunday, October 15th. Please check your assignments for updated times and locations.",
    "type": "announcement",
    "priority": "high",
    "target_audience": {
      "roles": ["Referee", "Assignor"]
    },
    "publish_date": "2025-10-13T09:00:00Z",
    "requires_acknowledgment": true,
    "tags": ["schedule", "weather"]
  }'
```

#### What Happens:
1. Communication is saved to `internal_communications` table
2. Recipients are resolved from target audience
3. Entries created in `communication_recipients` table
4. **In-app notifications created for all recipients** ✨
5. Notification appears in bell dropdown and `/notifications` page
6. Users can click to view full communication at `/communications/{id}`

#### In-App Notification Format:
```json
{
  "type": "system",
  "title": "🔴 Game Schedule Changes for This Weekend",  // High priority gets emoji
  "message": "Due to weather conditions, all outdoor games scheduled for Saturday, October 14th have been rescheduled to Sunday, October 15th. Please...",
  "link": "/communications/{communication_id}",
  "metadata": {
    "communication_id": "uuid",
    "communication_type": "announcement",
    "priority": "high"
  }
}
```

---

### Method 2: Direct Broadcast API (Quick Notifications)

**Route:** POST `/api/notifications/broadcast`

For quick, simple notifications without the full communication workflow.

#### Features:
- ✅ Single API call
- ✅ No draft workflow
- ✅ Immediate delivery
- ✅ Role-based targeting
- ✅ Admin permission required (Cerbos: `notification:broadcast`)

#### Request Body:
```json
{
  "title": "System Maintenance Tonight",
  "message": "The system will be down for maintenance from 11:00 PM to 1:00 AM. Please plan accordingly.",
  "type": "system",
  "link": "/announcements/maintenance-oct-15",
  "target_audience": {
    "roles": ["Admin", "Referee"],
    "specific_users": ["uuid1", "uuid2"],
    "all_users": false
  },
  "metadata": {
    "maintenance_window": {
      "start": "2025-10-15T23:00:00Z",
      "end": "2025-10-16T01:00:00Z"
    }
  }
}
```

#### Example Request:
```bash
curl -X POST http://localhost:3001/api/notifications/broadcast \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Emergency: All Games Cancelled Today",
    "message": "Due to severe weather conditions, all games scheduled for today (Oct 15) have been cancelled. We will contact you about rescheduling.",
    "type": "system",
    "link": "/games?status=cancelled",
    "target_audience": {
      "roles": ["Referee", "Assignor"]
    }
  }'
```

#### Response:
```json
{
  "success": true,
  "data": {
    "success": true,
    "recipientCount": 150,
    "createdCount": 148,
    "message": "Notification broadcast to 148 users"
  }
}
```

**Why might `createdCount` be less than `recipientCount`?**
- Users with `in_app_enabled: false` won't receive notifications
- Individual notification creation failures (logged but don't break broadcast)

---

## 📊 Notification Types

| Type | Description | Use Cases | Game Connected? |
|------|-------------|-----------|----------------|
| **assignment** | New game assignment | Referee assigned to game | ✅ Yes - includes `game_id` |
| **status_change** | Assignment status update | Referee accepts/declines | ✅ Yes - includes `game_id` |
| **reminder** | Upcoming game reminder | 2-3 hours before game | ✅ Yes - SMS includes game details |
| **system** | System-wide notifications | Maintenance, announcements, policies | ❌ No (general) |

---

## 🔗 Notification Flow Diagram

```
Game Assignment Created
        ↓
  ┌─────┴─────┐
  │ Referee   │
  └─────┬─────┘
        ├──→ Email (✉️)
        ├──→ SMS (📱)
        └──→ In-App Notification (🔔)
              - Type: assignment
              - Link: /assignments/{id}
              - Metadata: game_id, position, wage

Referee Accepts/Declines
        ↓
  ┌─────┴─────┐
  │ Assignor  │
  └─────┬─────┘
        ├──→ Email (✉️)
        └──→ In-App Notification (🔔)
              - Type: status_change
              - Link: /games/{game_id}
              - Metadata: game_id, status, decline_reason

2-3 Hours Before Game
        ↓
  ┌─────────────┐
  │ Cron Job    │
  └─────┬───────┘
        └──→ SMS Reminder (📱)
              - Game details
              - Position
              - Location
              - Dashboard link

Communication Published
        ↓
  ┌─────────────────┐
  │ All Recipients  │
  └─────┬───────────┘
        └──→ In-App Notification (🔔)
              - Type: system
              - Link: /communications/{id}
              - Metadata: communication_id, type, priority
```

---

## 🎮 Frontend Access

### User-Facing Components

#### 1. NotificationBell (Header)
- **Location:** App header/sidebar
- **File:** `frontend/components/notifications-bell.tsx`
- **Features:**
  - Shows unread count badge
  - Dropdown with 5 most recent notifications
  - Click notification to navigate to linked page
  - Auto-refresh every 60 seconds
  - Type icons (bell, checkmark, clock, info)

#### 2. Notifications Page
- **Route:** `/notifications`
- **File:** `frontend/app/notifications/page.tsx`
- **Features:**
  - Full notification list with pagination
  - Filter by read/unread
  - Mark all as read button
  - Delete individual notifications
  - Click to navigate to game/assignment/communication

#### 3. Notification Settings
- **Route:** `/settings/notifications`
- **File:** `frontend/app/settings/notifications/page.tsx`
- **Features:**
  - Toggle in-app notifications
  - Toggle email notifications (assignments, reminders, status changes)
  - Toggle SMS notifications (assignments, reminders)

### Admin Tools (To Be Implemented)

#### Broadcast Notification UI
- **Suggested Route:** `/admin/notifications/broadcast`
- **Features Needed:**
  - Form with title, message, type, link
  - Target audience selector (roles, all users, specific users)
  - Preview before sending
  - Confirmation dialog
  - Success/error feedback

---

## 🗂️ Database Schema

### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,  -- assignment, status_change, reminder, system
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500),
  metadata JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at);
CREATE INDEX idx_notifications_type ON notifications(type);
```

### Game Connection Examples

**Query: Get all notifications for a specific game**
```sql
SELECT n.*
FROM notifications n
WHERE n.metadata->>'game_id' = 'your-game-id'
ORDER BY n.created_at DESC;
```

**Query: Get all assignment notifications with game details**
```sql
SELECT
  n.*,
  g.home_team_name,
  g.away_team_name,
  g.game_date,
  g.location
FROM notifications n
LEFT JOIN games g ON (n.metadata->>'game_id')::uuid = g.id
WHERE n.type = 'assignment'
ORDER BY n.created_at DESC;
```

**Query: Get notification summary by game**
```sql
SELECT
  g.id as game_id,
  g.home_team_name || ' vs ' || g.away_team_name as game,
  g.game_date,
  COUNT(*) FILTER (WHERE n.type = 'assignment') as assignment_notifications,
  COUNT(*) FILTER (WHERE n.type = 'status_change') as status_notifications,
  COUNT(*) FILTER (WHERE n.type = 'reminder') as reminder_notifications
FROM games g
LEFT JOIN notifications n ON (n.metadata->>'game_id')::uuid = g.id
WHERE g.game_date >= CURRENT_DATE
GROUP BY g.id, g.home_team_name, g.away_team_name, g.game_date
ORDER BY g.game_date;
```

---

## 🔒 Permissions

### Cerbos Policies

**Notification Broadcast:**
```yaml
# Only Admins can broadcast notifications
resource "notification":
  actions:
    - broadcast
  effect: ALLOW
  roles:
    - Admin
    - Super Admin
```

**Communication Creation:**
```yaml
# Admins and Assignors can create communications
resource "communication":
  actions:
    - create
    - publish
  effect: ALLOW
  roles:
    - Admin
    - Super Admin
    - Assignor
```

---

## 📈 Analytics & Monitoring

### Key Metrics to Track

```sql
-- Notification delivery rate by type
SELECT
  type,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE is_read = true) as read_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_read = true) / COUNT(*), 2) as read_percentage
FROM notifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY type;

-- Game-related notifications
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE type = 'assignment') as assignments,
  COUNT(*) FILTER (WHERE type = 'status_change') as status_changes,
  COUNT(*) FILTER (WHERE type = 'reminder') as reminders
FROM notifications
WHERE metadata->>'game_id' IS NOT NULL
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Top games by notification count
SELECT
  g.home_team_name || ' vs ' || g.away_team_name as game,
  g.game_date,
  COUNT(n.*) as notification_count,
  COUNT(*) FILTER (WHERE n.is_read = true) as read_count
FROM games g
JOIN notifications n ON (n.metadata->>'game_id')::uuid = g.id
WHERE g.game_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY g.id, g.home_team_name, g.away_team_name, g.game_date
ORDER BY notification_count DESC
LIMIT 20;
```

---

## 🚀 Future Enhancements

### Phase 4 (Planned)

1. **Game-Specific Broadcasts**
   - Send notification to all referees assigned to a game
   - Example: "Game location changed" notification

2. **Real-Time Updates**
   - WebSocket integration for instant notifications
   - No need to refresh/poll for new notifications

3. **Push Notifications**
   - Mobile app push notifications
   - Browser push notifications (web)

4. **Advanced Filtering**
   - Filter notifications by game date range
   - Filter by league, team, location
   - Search notifications

5. **Notification Templates**
   - Pre-defined message templates for common scenarios
   - Merge fields: {referee_name}, {game}, {date}, etc.

6. **Scheduling**
   - Schedule notifications to be sent at specific times
   - Recurring notifications (weekly reminders, etc.)

---

## 📝 Usage Examples

### Example 1: Game Cancellation

**Scenario:** All games on Saturday are cancelled due to weather.

**Using Communications System:**
```bash
POST /api/communications
{
  "title": "🔴 All Saturday Games Cancelled",
  "content": "Due to severe weather conditions, all games scheduled for Saturday, October 14th have been cancelled. We will contact you about rescheduling. Stay safe!",
  "type": "emergency",
  "priority": "urgent",
  "target_audience": {
    "roles": ["Referee", "Assignor"]
  },
  "requires_acknowledgment": true
}
```

**Result:**
- Communication saved to database
- All referees and assignors receive in-app notification
- Urgent priority adds 🔴 emoji to title
- Requires acknowledgment (users must confirm they read it)
- Track who has/hasn't acknowledged

### Example 2: New Policy Announcement

**Scenario:** New travel reimbursement policy for referees.

**Using Direct Broadcast:**
```bash
POST /api/notifications/broadcast
{
  "title": "New Travel Reimbursement Policy",
  "message": "Starting Nov 1st, referees can claim $0.65/mile for travel over 30 miles. View details in the policies section.",
  "type": "system",
  "link": "/policies/travel-reimbursement",
  "target_audience": {
    "roles": ["Referee"]
  },
  "metadata": {
    "policy_id": "travel-reimbursement-2025",
    "effective_date": "2025-11-01"
  }
}
```

**Result:**
- All referees receive in-app notification immediately
- Click takes them to policy details page
- Metadata allows tracking policy-related notifications

### Example 3: Specific Game Update

**Scenario:** Location changed for a specific game.

**Manual Process (using game_id):**
```bash
# First, get all assigned referees for the game
GET /api/games/{game_id}/assignments

# Then broadcast to those specific users
POST /api/notifications/broadcast
{
  "title": "Game Location Changed",
  "message": "The location for Lakers vs Warriors on Oct 15 has changed from Staples Center to Crypto.com Arena.",
  "type": "status_change",
  "link": "/games/{game_id}",
  "target_audience": {
    "specific_users": ["ref1_id", "ref2_id", "ref3_id"]
  },
  "metadata": {
    "game_id": "uuid",
    "old_location": "Staples Center",
    "new_location": "Crypto.com Arena"
  }
}
```

---

## 🎓 Developer Guide

### Creating Notifications in Code

```typescript
import notificationService from './services/NotificationService';

// Example: Notify referee about game change
await notificationService.createNotification({
  user_id: referee.id,
  type: 'status_change',
  title: 'Game Time Changed',
  message: `Your game ${homeTeam} vs ${awayTeam} has been moved to ${newTime}`,
  link: `/games/${gameId}`,
  metadata: {
    game_id: gameId,
    old_time: oldTime,
    new_time: newTime
  }
});
```

### Broadcasting to Multiple Users

```typescript
// Example: Notify all referees about a policy change
const referees = await db('users')
  .join('user_roles', 'users.id', 'user_roles.user_id')
  .join('roles', 'user_roles.role_id', 'roles.id')
  .where('roles.name', 'Referee')
  .select('users.id');

await Promise.all(
  referees.map(ref =>
    notificationService.createNotification({
      user_id: ref.id,
      type: 'system',
      title: 'New Policy: Travel Reimbursement',
      message: 'Starting Nov 1st...',
      link: '/policies/travel'
    })
  )
);
```

---

## 📚 Related Documentation

- [Phase 1: Email Notifications & Decline Reasons](./game-assignment-phase1-complete.md)
- [Phase 2: SMS Notifications & Reminders](./game-assignment-phase2-complete.md)
- [Phase 3: In-App Notifications](./game-assignment-phase3-complete.md)
- [Implementation Plan](./game-assignment-workflow-implementation-plan.md)

---

**Last Updated:** 2025-09-30
**Maintained By:** Development Team
**Questions?** Contact your system administrator
