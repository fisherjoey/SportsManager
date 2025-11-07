# Game Assignment Workflow - Comprehensive Audit

**Date:** 2025-09-30
**Audited By:** System Analysis
**Status:** Current Implementation Review

---

## Executive Summary

This document provides a complete audit of the game assignment workflow in the SportsManager application, covering the entire lifecycle from assignor creating/assigning games to referees receiving notifications, viewing assignments, and accepting/rejecting them.

### Key Findings

✅ **Strengths:**
- Well-structured backend API with comprehensive assignment management
- Database schema supports full workflow with proper relationships
- Frontend components exist for both assignor and referee views
- Robust conflict detection and validation
- Wage calculation with multipliers

❌ **Critical Gaps:**
- **NO EMAIL NOTIFICATION SYSTEM** for new assignments
- **NO SMS NOTIFICATION SYSTEM** implemented
- **NO AUTOMATED NOTIFICATIONS** when games are assigned
- Limited rejection message/reason tracking
- No in-app notification system
- Email service only handles invitations and password resets

---

## Workflow Overview

```
┌─────────────────┐
│   ASSIGNOR      │
│  Creates Game   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ Game Management Interface   │
│ - Create game               │
│ - Set details (date, time)  │
│ - Define refs needed        │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Assignment Process         │
│ - Select referee            │
│ - Choose position           │
│ - Conflict detection        │
│ - Wage calculation          │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ ❌ MISSING: Notifications   │
│ - NO email sent             │
│ - NO SMS sent               │
│ - NO in-app notification    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   REFEREE                   │
│ - Manually checks dashboard │
│ - Views "My Assignments"    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Accept/Reject Decision     │
│ - Accept: status → accepted │
│ - Reject: status → declined │
│ - ⚠️ Limited decline reason │
└─────────────────────────────┘
```

---

## 1. Assignor Workflow

### 1.1 Game Creation

**Files:**
- Backend: [backend/src/routes/games.ts](backend/src/routes/games.ts)
- Frontend: [frontend/components/game-management.tsx](frontend/components/game-management.tsx)
- Database: [backend/migrations/005_create_games.js](backend/migrations/005_create_games.js)

**Current Implementation:**

#### Backend - Game Creation Endpoint
```typescript
POST /api/games
- Creates game with teams, venue, datetime
- Validates scheduling conflicts
- Auto-creates teams/leagues if needed
- Returns game object
```

**Key Features:**
- ✅ Team management (home/away)
- ✅ Date/time scheduling
- ✅ Location/venue tracking
- ✅ Level (Recreational/Competitive/Elite)
- ✅ Game type (Community/Club/Tournament)
- ✅ Pay rate and wage multipliers
- ✅ Refs needed count
- ✅ Conflict detection for venue scheduling

**Database Schema:**
```sql
games
  - id (UUID)
  - game_number
  - home_team_id → teams(id)
  - away_team_id → teams(id)
  - league_id → leagues(id)
  - date_time (timestamp)
  - field (location)
  - division
  - game_type
  - refs_needed (default: 2)
  - base_wage
  - wage_multiplier
  - metadata (JSON)
```

### 1.2 Assignment Creation

**Files:**
- Backend: [backend/src/routes/assignments.ts](backend/src/routes/assignments.ts)
- Service: [backend/src/services/AssignmentService.ts](backend/src/services/AssignmentService.ts)
- Frontend: [frontend/components/game-assignment-board.tsx](frontend/components/game-assignment-board.tsx)

**Current Implementation:**

#### Backend - Assignment Creation
```typescript
POST /api/assignments
Body: {
  game_id: UUID
  user_id: UUID (referee)
  position_id: UUID
  assigned_by?: UUID
}

Process:
1. ✅ Validate game exists
2. ✅ Validate referee exists and is active
3. ✅ Validate position exists
4. ✅ Check position not already filled
5. ✅ Check referee not already assigned to game
6. ✅ Check game hasn't reached max refs
7. ✅ Run conflict detection
8. ✅ Calculate wage (with multipliers)
9. ✅ Create assignment (status: 'pending')
10. ✅ Update game status
11. ❌ Send notification (NOT IMPLEMENTED)
```

**Assignment Service Features:**
- Comprehensive conflict detection
- Wage calculation based on payment model (INDIVIDUAL/FLAT_RATE)
- Automatic game status updates
- Transaction safety
- Audit trail logging

**Database Schema:**
```sql
game_assignments
  - id (UUID)
  - game_id → games(id) ON DELETE CASCADE
  - user_id → users(id) (referee)
  - position_id → positions(id)
  - assigned_at (timestamp)
  - assigned_by → users(id)
  - status: 'pending' | 'accepted' | 'declined' | 'completed'
  - calculated_wage
  - created_at
  - updated_at

Constraints:
  - UNIQUE(game_id, position_id)
  - UNIQUE(game_id, user_id)
  - INDEX on game_id
  - INDEX on user_id
```

### 1.3 Bulk Assignment

**Current Implementation:**
```typescript
POST /api/assignments/bulk
Body: {
  game_id: UUID
  assignments: [
    { user_id: UUID, position_id: UUID },
    ...
  ]
  assigned_by?: UUID
}

Features:
- ✅ Batch assign multiple refs to one game
- ✅ Individual validation for each assignment
- ✅ Partial success handling
- ✅ Error tracking per assignment
- ❌ Bulk notification (NOT IMPLEMENTED)
```

---

## 2. Notification System (CRITICAL GAP)

### 2.1 Current Email Service

**File:** [backend/src/services/emailService.ts](backend/src/services/emailService.ts)

**What's Implemented:**
```typescript
EmailService {
  ✅ sendInvitationEmail() - User invitations only
  ✅ sendPasswordResetEmail() - Password resets only
  ❌ sendAssignmentNotification() - NOT IMPLEMENTED
  ❌ sendGameReminderEmail() - NOT IMPLEMENTED
}
```

**Email Provider:** Resend API
- Configured: `process.env.RESEND_API_KEY`
- From: `process.env.FROM_EMAIL`
- HTML templates with responsive design
- Fallback to console logging in dev mode

### 2.2 SMS Service

**Status:** ❌ **NOT IMPLEMENTED**

No SMS functionality exists in the codebase:
- No Twilio integration
- No SMS service class
- No phone number validation
- No SMS templates

### 2.3 In-App Notifications

**Status:** ❌ **NOT IMPLEMENTED**

No in-app notification system:
- No notifications table in database
- No WebSocket for real-time updates
- No notification bell component
- No unread notification tracking

**Note:** There is a `notifications-bell.tsx` component, but it appears to be unused.

### 2.4 What's Missing

**Critical Missing Features:**

1. **Assignment Notification Email**
   - Subject: "New Game Assignment: [HomeTeam] vs [AwayTeam]"
   - Should include:
     - Game details (teams, date, time, location)
     - Position assigned
     - Pay rate / wage
     - Accept/Decline links
     - Calendar attachment (.ics file)

2. **Assignment Notification SMS**
   - Short text: "New game assigned: [Date] at [Time]. Check email for details."

3. **Game Reminder Notifications**
   - 24 hours before game
   - 2 hours before game

4. **Assignment Status Change Notifications**
   - To Assignor when referee accepts/declines
   - To Assignor when assignment nears game time without acceptance

---

## 3. Referee Workflow

### 3.1 Dashboard View

**Files:**
- [frontend/components/dashboard-overview.tsx](frontend/components/dashboard-overview.tsx)
- [frontend/components/my-assignments.tsx](frontend/components/my-assignments.tsx)

**Current Implementation:**

#### Dashboard Features
```typescript
Dashboard Overview:
- ✅ Upcoming games count
- ✅ Unassigned games
- ✅ Up-for-grabs games
- ✅ Active referees count
- ✅ Referee performance metrics (if user is referee)
  - Total assignments
  - Completion rate
  - Upcoming games
  - Availability status
  - Performance trends
- ✅ Recent assignments list
```

**API Calls:**
```typescript
useEffect(() => {
  // Parallel API calls
  Promise.all([
    apiClient.getGames(),
    apiClient.getReferees(),
    apiClient.getProfile()
  ])

  // If user is referee:
  apiClient.getRefereeAssignments(referee_id)
})
```

### 3.2 My Assignments View

**File:** [frontend/components/my-assignments.tsx](frontend/components/my-assignments.tsx)

**Features:**
- ✅ List upcoming assignments
- ✅ List past assignments
- ✅ Display game details (teams, date, time, location)
- ✅ Display pay rate / calculated wage
- ✅ Show wage multiplier and reason
- ✅ Filter by status
- ✅ Mobile-responsive cards
- ✅ Desktop table view

**API Integration:**
```typescript
GET /api/assignments?refereeId={userId}

Response:
{
  assignments: [
    {
      id, gameId, refereeId, positionId,
      status, calculatedWage,
      game: { homeTeam, awayTeam, date, time, location, level, payRate }
      referee: { name, email }
      position: { name }
    }
  ]
}
```

### 3.3 Accept/Decline Functionality

**Current Implementation:**

#### Frontend
```typescript
const handleAcceptDecline = async (assignmentId, action: 'accept' | 'decline') => {
  const status = action === 'accept' ? 'accepted' : 'declined'
  await api.updateAssignmentStatus(assignmentId, status)

  // Toast notification to user
  // Refresh assignments
}
```

#### Backend
```typescript
PATCH /api/assignments/:id/status
Body: { status: 'accepted' | 'declined' }

Process:
1. ✅ Validate assignment exists
2. ✅ Validate status value
3. ✅ Update assignment status
4. ✅ Update game status
5. ✅ Track critical path metrics
6. ❌ Send notification to assignor (NOT IMPLEMENTED)
7. ❌ Save decline reason (LIMITED)
```

**Status Tracking:**
```typescript
Assignment Statuses:
- 'pending'    → Initial state after assignment
- 'accepted'   → Referee confirmed
- 'declined'   → Referee rejected
- 'completed'  → Game finished
```

### 3.4 Decline Reason Tracking

**Current State:** ⚠️ **LIMITED**

**Database Schema:**
```sql
game_assignments
  - ❌ decline_reason NOT in schema
  - ❌ decline_timestamp NOT in schema
```

**What's Needed:**
```sql
ALTER TABLE game_assignments
  ADD COLUMN decline_reason TEXT,
  ADD COLUMN decline_timestamp TIMESTAMP;
```

**UI Component:**
- ❌ No decline reason dialog
- ❌ No reason selection (dropdown)
- ❌ No custom reason text field

**Proposed Decline Reasons:**
- Schedule conflict
- Too far from location
- Not qualified for this level
- Personal reasons
- Other (custom text)

---

## 4. API Endpoints Reference

### Games API

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/games` | GET | List all games | ✅ |
| `/api/games/:id` | GET | Get game details | ✅ |
| `/api/games` | POST | Create game | ✅ |
| `/api/games/:id` | PUT | Update game | ✅ |
| `/api/games/:id/status` | PATCH | Update game status | ✅ |
| `/api/games/:id` | DELETE | Delete game | ✅ |
| `/api/games/bulk-import` | POST | Bulk import games | ✅ |

### Assignments API

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/assignments` | GET | List assignments | ✅ |
| `/api/assignments/:id` | GET | Get assignment details | ✅ |
| `/api/assignments` | POST | Create assignment | ✅ |
| `/api/assignments/bulk` | POST | Bulk assign referees | ✅ |
| `/api/assignments/bulk-update` | POST | Bulk update statuses | ✅ |
| `/api/assignments/bulk-remove` | DELETE | Bulk remove assignments | ✅ |
| `/api/assignments/:id/status` | PATCH | Update assignment status | ✅ |
| `/api/assignments/:id` | DELETE | Delete assignment | ✅ |
| `/api/assignments/check-conflicts` | POST | Check conflicts | ✅ |
| `/api/assignments/available-referees/:game_id` | GET | Get available refs | ✅ |

---

## 5. User Stories

### Epic 1: Assignor Creates and Assigns Games

#### Story 1.1: Create New Game
```
As an Assignor
I want to create a new game with teams, date, time, and location
So that I can schedule games and prepare for referee assignments

Acceptance Criteria:
✅ Can enter home team and away team details
✅ Can select date and time for the game
✅ Can enter location/venue
✅ Can specify level (Recreational/Competitive/Elite)
✅ Can set number of referees needed (default 2)
✅ Can set pay rate and optional wage multiplier
✅ System validates no venue conflicts at same date/time
✅ System auto-creates teams and leagues as needed
✅ Game is created with status 'unassigned'

Current Status: ✅ IMPLEMENTED
```

#### Story 1.2: Assign Referee to Game
```
As an Assignor
I want to assign a referee to a specific game position
So that I can ensure the game has qualified officials

Acceptance Criteria:
✅ Can select a referee from available referees list
✅ Can choose position (Referee, AR1, AR2, etc.)
✅ System validates referee qualifications for game level
✅ System checks for scheduling conflicts (double-booking)
✅ System prevents assigning same referee twice to same game
✅ System prevents overfilling positions (refs_needed limit)
✅ System calculates and displays final wage
❌ Referee receives email notification immediately
❌ Referee receives SMS notification immediately
✅ Assignment created with status 'pending'

Current Status: ⚠️ PARTIAL - Missing notifications
```

#### Story 1.3: Bulk Assign Multiple Referees
```
As an Assignor
I want to assign multiple referees to a game at once
So that I can efficiently staff games

Acceptance Criteria:
✅ Can select multiple referees for different positions
✅ System validates each assignment individually
✅ Shows success/failure for each assignment
✅ Partial success allowed (some succeed, some fail)
❌ All assigned referees receive notifications

Current Status: ⚠️ PARTIAL - Missing notifications
```

#### Story 1.4: View Assignment Status
```
As an Assignor
I want to see which referees have accepted/declined assignments
So that I can track game staffing status

Acceptance Criteria:
✅ Can view all assignments for a game
✅ Can see assignment status (pending/accepted/declined)
❌ Receive notification when referee accepts
❌ Receive notification when referee declines
⚠️ Can see decline reason (limited implementation)
✅ Can reassign if declined

Current Status: ⚠️ PARTIAL - Missing notifications and decline reasons
```

---

### Epic 2: Referee Receives and Responds to Assignments

#### Story 2.1: Receive Assignment Notification
```
As a Referee
I want to receive immediate notification when assigned to a game
So that I can review and respond promptly

Acceptance Criteria:
❌ Receive email within 1 minute of assignment
❌ Email includes game details (teams, date, time, location)
❌ Email includes position assigned
❌ Email includes pay rate/wage
❌ Email includes direct accept/decline links
❌ Email includes calendar attachment (.ics file)
❌ Receive SMS text with brief details and link
❌ See in-app notification badge

Current Status: ❌ NOT IMPLEMENTED
```

#### Story 2.2: View Assignments on Dashboard
```
As a Referee
I want to see my pending, upcoming, and past assignments
So that I can manage my schedule

Acceptance Criteria:
✅ Dashboard shows count of upcoming assignments
✅ Dashboard shows this month's earnings
✅ Dashboard shows completed games count
✅ "My Assignments" page lists all assignments
✅ Can filter by upcoming vs past
✅ Can see assignment status (pending/accepted/declined)
✅ Can see game details for each assignment
✅ Can see calculated wage per assignment
✅ Mobile-responsive card view
✅ Desktop table view

Current Status: ✅ IMPLEMENTED
```

#### Story 2.3: Accept Game Assignment
```
As a Referee
I want to accept a game assignment
So that I can confirm my availability and commitment

Acceptance Criteria:
✅ Can click "Accept" button on assignment
✅ Status changes from 'pending' to 'accepted'
✅ See confirmation message
✅ Assignment appears in "Accepted" filter
❌ Assignor receives notification of acceptance
❌ Game automatically added to my calendar
✅ Wage is confirmed and locked

Current Status: ⚠️ PARTIAL - Missing assignor notification
```

#### Story 2.4: Decline Game Assignment with Reason
```
As a Referee
I want to decline a game assignment and provide a reason
So that assignors understand why I'm unavailable

Acceptance Criteria:
⚠️ Can click "Decline" button on assignment
❌ Presented with reason selection dialog
❌ Can select from predefined reasons:
    - Schedule conflict
    - Too far from location
    - Not qualified for this level
    - Personal reasons
    - Other (custom text field)
❌ Reason is saved with assignment
✅ Status changes from 'pending' to 'declined'
❌ Assignor receives notification with decline reason
❌ Assignment becomes available for reassignment

Current Status: ⚠️ PARTIAL - Basic decline works, no reason tracking
```

#### Story 2.5: Receive Game Reminders
```
As a Referee
I want to receive reminders before my assigned games
So that I don't forget my commitments

Acceptance Criteria:
❌ Receive email reminder 24 hours before game
❌ Receive SMS reminder 2 hours before game
❌ Reminder includes game details and location
❌ Reminder includes directions link to venue
❌ Can opt-out of reminders in settings

Current Status: ❌ NOT IMPLEMENTED
```

---

### Epic 3: Communication and Notifications

#### Story 3.1: Email Notification System
```
As a System
I want to send email notifications for all assignment events
So that users stay informed

Acceptance Criteria:
❌ New assignment notification to referee
❌ Acceptance notification to assignor
❌ Decline notification to assignor
❌ Game reminder 24h before
❌ Game reminder 2h before
❌ Reassignment notification to referee
❌ Game cancellation notification
❌ Professional HTML email templates
❌ Plain text fallback
❌ Tracking/logging of sent emails

Current Status: ❌ NOT IMPLEMENTED (only invitation/reset emails work)
```

#### Story 3.2: SMS Notification System
```
As a System
I want to send SMS notifications for critical events
So that users receive timely mobile alerts

Acceptance Criteria:
❌ Integrate SMS provider (Twilio)
❌ New assignment SMS to referee
❌ Game reminder 2h before (SMS only)
❌ Message includes essential details + link
❌ Respect user SMS preferences
❌ Track SMS delivery status

Current Status: ❌ NOT IMPLEMENTED
```

#### Story 3.3: In-App Notification Center
```
As a User
I want to see all my notifications in one place
So that I don't miss important updates

Acceptance Criteria:
❌ Notification bell icon in header
❌ Badge showing unread count
❌ Dropdown list of recent notifications
❌ Mark as read functionality
❌ Link to full notification history
❌ Real-time updates (WebSocket)
❌ Notification preferences page

Current Status: ❌ NOT IMPLEMENTED
```

---

## 6. Technical Gaps and Recommendations

### 6.1 Critical Gaps

#### Gap 1: No Assignment Notifications
**Impact:** HIGH
**Priority:** CRITICAL

**Problem:**
- Referees don't get notified when assigned
- Must manually check dashboard
- Leads to delayed responses
- Poor user experience

**Solution:**
```typescript
// Add to AssignmentService.createAssignment()
async createAssignment(data) {
  // ... existing code ...

  // Send notifications
  await NotificationService.sendAssignmentNotification({
    referee: referee,
    game: game,
    assignment: assignment,
    channels: ['email', 'sms', 'in-app']
  });

  return { assignment, wageBreakdown, warnings };
}
```

#### Gap 2: No Decline Reason Tracking
**Impact:** MEDIUM
**Priority:** HIGH

**Problem:**
- Assignors can't see why referees decline
- Can't address systemic issues (travel, timing)
- No data for improvement

**Solution:**
1. **Database Migration:**
```sql
ALTER TABLE game_assignments
  ADD COLUMN decline_reason TEXT,
  ADD COLUMN decline_timestamp TIMESTAMP,
  ADD COLUMN decline_category VARCHAR(50);
```

2. **API Update:**
```typescript
PATCH /api/assignments/:id/status
Body: {
  status: 'declined',
  decline_reason?: string,
  decline_category?: 'schedule' | 'distance' | 'qualification' | 'personal' | 'other'
}
```

3. **UI Component:**
```tsx
<DeclineDialog
  open={showDeclineDialog}
  onConfirm={(reason, category) => {
    handleDecline(assignmentId, reason, category)
  }}
/>
```

#### Gap 3: No SMS Integration
**Impact:** MEDIUM
**Priority:** MEDIUM

**Problem:**
- No mobile text alerts
- Referee might miss urgent assignments

**Solution:**
```typescript
// services/smsService.ts
export class SMSService {
  private twilio: Twilio;

  async sendAssignmentSMS(phoneNumber: string, data: {
    gameDatetime: string,
    teams: string,
    dashboardLink: string
  }) {
    await this.twilio.messages.create({
      to: phoneNumber,
      from: process.env.TWILIO_FROM_NUMBER,
      body: `New game assigned: ${data.teams} on ${data.gameDatetime}. View details: ${data.dashboardLink}`
    });
  }
}
```

### 6.2 Enhancement Opportunities

#### Enhancement 1: Calendar Integration
**Feature:** Auto-add accepted games to calendar

**Implementation:**
- Generate .ics file on assignment
- Attach to email notification
- Include game details, location, duration
- Add 1-hour reminder

#### Enhancement 2: Real-Time Updates
**Feature:** WebSocket for instant updates

**Implementation:**
- Socket.io integration
- Real-time assignment notifications
- Live game status updates
- Instant acceptance confirmation

#### Enhancement 3: Assignment History & Analytics
**Feature:** Track referee performance and preferences

**Data to Track:**
- Acceptance rate per referee
- Average response time
- Preferred days/times
- Preferred locations
- Decline reasons by category

---

## 7. Database Schema Summary

### Core Tables

#### games
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY,
  game_number VARCHAR,
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  league_id UUID REFERENCES leagues(id),
  date_time TIMESTAMP,
  field VARCHAR,
  division VARCHAR,
  game_type VARCHAR,
  refs_needed INTEGER DEFAULT 2,
  base_wage DECIMAL,
  wage_multiplier DECIMAL DEFAULT 1.0,
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### game_assignments
```sql
CREATE TABLE game_assignments (
  id UUID PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  status VARCHAR CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
  calculated_wage DECIMAL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,

  UNIQUE(game_id, position_id),
  UNIQUE(game_id, user_id)
);

CREATE INDEX idx_assignments_game ON game_assignments(game_id);
CREATE INDEX idx_assignments_user ON game_assignments(user_id);
```

### Proposed Additions

#### notifications (NEW TABLE)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR, -- 'assignment', 'reminder', 'status_change'
  title VARCHAR,
  message TEXT,
  link VARCHAR,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
```

#### notification_preferences (NEW TABLE)
```sql
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_assignments BOOLEAN DEFAULT TRUE,
  email_reminders BOOLEAN DEFAULT TRUE,
  email_status_changes BOOLEAN DEFAULT TRUE,
  sms_assignments BOOLEAN DEFAULT TRUE,
  sms_reminders BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 8. File Structure Reference

### Backend Files
```
backend/
├── src/
│   ├── routes/
│   │   ├── games.ts                     ✅ Game CRUD operations
│   │   ├── assignments.ts               ✅ Assignment CRUD operations
│   │   └── referees.ts                  ✅ Referee management
│   ├── services/
│   │   ├── AssignmentService.ts         ✅ Assignment business logic
│   │   ├── emailService.ts              ⚠️  Invitation/reset only
│   │   ├── conflictDetectionService.ts  ✅ Conflict checking
│   │   └── GameStateService.ts          ✅ Game status management
│   ├── middleware/
│   │   ├── auth.ts                      ✅ Authentication
│   │   ├── requireCerbosPermission.ts   ✅ Authorization
│   │   └── auditTrail.ts                ✅ Audit logging
│   └── utils/
│       ├── wage-calculator.ts           ✅ Wage calculations
│       └── availability.ts              ✅ Availability checking
└── migrations/
    ├── 005_create_games.js              ✅ Games table
    └── 006_create_game_assignments.js   ✅ Assignments table
```

### Frontend Files
```
frontend/
├── components/
│   ├── game-management.tsx              ✅ Game creation UI
│   ├── game-assignment-board.tsx        ✅ Assignment board UI
│   ├── my-assignments.tsx               ✅ Referee assignments view
│   ├── dashboard-overview.tsx           ✅ Main dashboard
│   └── notifications-bell.tsx           ❌ Unused component
├── lib/
│   ├── api.ts                           ✅ API client
│   └── types/
│       ├── games.ts                     ✅ Game types
│       └── referees.ts                  ✅ Referee types
```

---

## 9. Implementation Roadmap

### Phase 1: Critical Notifications (2-3 weeks)
**Priority: CRITICAL**

1. **Week 1: Email Notifications**
   - [ ] Extend EmailService with assignment notifications
   - [ ] Create assignment email templates (HTML + text)
   - [ ] Add notification sending to AssignmentService
   - [ ] Test email delivery
   - [ ] Add email logging and error handling

2. **Week 2: Assignment Flow Notifications**
   - [ ] New assignment → referee notification
   - [ ] Acceptance → assignor notification
   - [ ] Decline → assignor notification
   - [ ] Add .ics calendar attachment
   - [ ] Test full notification flow

3. **Week 3: Decline Reason Tracking**
   - [ ] Database migration for decline_reason
   - [ ] Update API to accept decline reason
   - [ ] Build decline dialog UI component
   - [ ] Update assignment list to show reasons
   - [ ] Test decline workflow

### Phase 2: SMS Notifications (1-2 weeks)
**Priority: HIGH**

1. **SMS Service Setup**
   - [ ] Integrate Twilio SDK
   - [ ] Create SMSService class
   - [ ] Configure environment variables
   - [ ] Add phone number validation
   - [ ] Test SMS delivery

2. **SMS Templates**
   - [ ] New assignment SMS
   - [ ] 2-hour game reminder SMS
   - [ ] Test SMS character limits
   - [ ] Add SMS preferences

### Phase 3: In-App Notifications (2-3 weeks)
**Priority: MEDIUM**

1. **Database Setup**
   - [ ] Create notifications table
   - [ ] Create notification_preferences table
   - [ ] Add migration

2. **Backend API**
   - [ ] Build NotificationService
   - [ ] Create notification endpoints (GET, mark read)
   - [ ] Integrate with assignment events
   - [ ] Add WebSocket support

3. **Frontend Components**
   - [ ] Notification bell icon with badge
   - [ ] Notification dropdown
   - [ ] Notification center page
   - [ ] Preferences UI
   - [ ] Real-time updates

### Phase 4: Enhancements (2-3 weeks)
**Priority: LOW**

1. **Calendar Integration**
   - [ ] Generate .ics files
   - [ ] Test with multiple calendar apps
   - [ ] Add "Add to Calendar" buttons

2. **Analytics Dashboard**
   - [ ] Referee acceptance rates
   - [ ] Response time tracking
   - [ ] Decline reason analytics
   - [ ] Assignment patterns

3. **Advanced Features**
   - [ ] Bulk email notifications
   - [ ] Scheduled game reminders
   - [ ] Automated follow-ups
   - [ ] Notification digest (daily/weekly)

---

## 10. Testing Requirements

### Unit Tests Needed
- [ ] AssignmentService.createAssignment()
- [ ] AssignmentService.updateAssignmentStatus()
- [ ] NotificationService.sendAssignmentEmail()
- [ ] NotificationService.sendAssignmentSMS()
- [ ] EmailService template rendering
- [ ] Decline reason validation

### Integration Tests Needed
- [ ] Full assignment flow (create → notify → accept)
- [ ] Decline flow with reason
- [ ] Bulk assignment notifications
- [ ] Email delivery end-to-end
- [ ] SMS delivery end-to-end

### E2E Tests Needed
- [ ] Assignor creates game and assigns referee
- [ ] Referee receives email and SMS
- [ ] Referee accepts assignment from email link
- [ ] Referee declines with reason
- [ ] Assignor sees acceptance/decline

---

## 11. Security Considerations

### Authentication
- ✅ JWT-based authentication
- ✅ Token expiration
- ✅ Cerbos permission checking

### Authorization
- ✅ Role-based access (Assignor, Referee, Admin)
- ✅ Resource-level permissions
- ⚠️ Email links should use signed tokens

### Data Protection
- ✅ Referee contact info protected
- ⚠️ Email unsubscribe links needed
- ⚠️ SMS opt-out required (TCPA compliance)

### Rate Limiting
- ⚠️ Email rate limits not configured
- ⚠️ SMS rate limits needed
- ⚠️ API rate limiting should include notification endpoints

---

## 12. Performance Considerations

### Current Performance
- ✅ Database indexes on game_assignments
- ✅ Optimized assignment queries
- ✅ Query caching for game lists

### Notification Performance
- ⚠️ Email queue system needed for bulk
- ⚠️ SMS queue system needed
- ⚠️ Background job processing for async notifications
- ⚠️ Retry logic for failed notifications

### Recommended Infrastructure
- [ ] Bull/Redis for job queues
- [ ] Separate email sending service
- [ ] SMS provider redundancy
- [ ] Notification logging and monitoring

---

## 13. Cost Estimates

### Email (Resend)
- Free tier: 3,000 emails/month
- Paid: $0.001/email after free tier
- **Estimated:** ~$10-30/month for 10,000-30,000 emails

### SMS (Twilio)
- ~$0.0075/SMS in US
- **Estimated:** ~$15-45/month for 2,000-6,000 SMS

### Infrastructure
- Redis (job queues): ~$10-20/month
- Monitoring/logging: ~$5-10/month

**Total Monthly Cost:** ~$40-105/month for mature system

---

## 14. Conclusion

### Summary of Findings

**✅ What Works Well:**
1. Solid backend API structure
2. Comprehensive assignment validation
3. Conflict detection system
4. Wage calculation with multipliers
5. Frontend referee dashboard
6. Accept/decline functionality

**❌ Critical Missing Features:**
1. **Email notifications** for assignments
2. **SMS notifications** for assignments
3. **In-app notifications**
4. **Decline reason tracking**
5. **Assignor notifications** for status changes
6. **Game reminders**

### Priority Action Items

**Immediate (Week 1):**
1. Implement basic email notifications for new assignments
2. Add decline reason field to database
3. Update API to support decline reasons

**Short-term (Weeks 2-4):**
4. Implement SMS notification service
5. Build decline reason UI
6. Add assignor status change notifications
7. Create email templates for all events

**Medium-term (Weeks 5-8):**
8. Build in-app notification system
9. Add game reminder notifications
10. Implement calendar integration
11. Add notification preferences

### Success Metrics

Track these KPIs after implementation:
- Time from assignment to referee response
- Referee acceptance rate
- Email open rate
- SMS delivery rate
- User satisfaction scores
- Assignment workflow completion time

---

**Document Version:** 1.0
**Last Updated:** 2025-09-30
**Next Review:** After Phase 1 implementation
