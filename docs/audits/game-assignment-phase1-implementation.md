# Phase 1 Implementation: Email Notifications & Decline Reasons

**Status:** ✅ COMPLETED
**Date:** 2025-09-30
**Phase:** 1 of 4 (Critical Priority)

---

## What Was Implemented

### 1. Database Schema Changes ✅

**Migration File:** `backend/migrations/20250930_add_decline_reasons_to_assignments.js`

Added two new columns to `game_assignments` table:
- `decline_reason` (TEXT) - Free text explanation from referee
- `decline_category` (VARCHAR 100) - Categorized reason for analytics
  - Valid categories: `unavailable`, `conflict`, `distance`, `level`, `other`
- Index on `decline_category` for efficient filtering

**Verification:**
```sql
-- Check columns exist
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'game_assignments'
AND column_name IN ('decline_reason', 'decline_category');
```

### 2. Email Service Extensions ✅

**File:** `backend/src/services/emailService.ts`

**New Interfaces:**
```typescript
export interface AssignmentEmailData {
  email: string;
  firstName: string;
  lastName: string;
  assignment: { id, position, calculatedWage };
  game: { id, homeTeam, awayTeam, date, time, location, level, payRate, wageMultiplier, wageMultiplierReason };
  assignor: { name, email };
  acceptLink: string;
  declineLink: string;
}

export interface AssignorNotificationData {
  email: string;
  name: string;
  referee: { name, email };
  game: { homeTeam, awayTeam, date, time };
  status: 'accepted' | 'declined';
  declineReason?: string;
  declineCategory?: string;
}
```

**New Methods:**
- `sendAssignmentEmail(data: AssignmentEmailData)` - Sends assignment notification to referee
- `sendAssignorNotificationEmail(data: AssignorNotificationData)` - Sends status update to assignor

**Email Templates Include:**
- Professional HTML/text templates
- Accept/Decline buttons with links
- Game details (teams, date, time, location, position)
- Wage information with multiplier breakdown
- Decline reason display for assignors
- Responsive design for mobile devices

### 3. API Updates ✅

**Files Updated:**
- `backend/src/routes/assignments.ts`
- `backend/src/services/AssignmentService.ts`

**New Request Body Fields:**

Status update endpoint `PATCH /api/assignments/:id/status`:
```typescript
{
  status: 'accepted' | 'declined' | 'pending' | 'completed',
  decline_reason?: string,        // Optional, max 500 chars
  decline_category?: string       // Optional: unavailable|conflict|distance|level|other
}
```

Bulk update endpoint `POST /api/assignments/bulk-update`:
```typescript
{
  updates: [{
    assignment_id: UUID,
    status: string,
    calculated_wage?: number,
    decline_reason?: string,        // NEW
    decline_category?: string       // NEW
  }]
}
```

**Validation Rules:**
- `decline_reason`: Optional string, max 500 characters
- `decline_category`: Optional enum: `unavailable`, `conflict`, `distance`, `level`, `other`
- Fields only saved when `status === 'declined'`

### 4. TypeScript Type Updates ✅

**Updated Interfaces:**
```typescript
// In assignments.ts
export interface UpdateAssignmentBody {
  status?: AssignmentStatus;
  position_id?: UUID;
  calculated_wage?: number;
  decline_reason?: string;         // NEW
  decline_category?: string;       // NEW
  rating?: number;
  feedback?: string;
}

export interface AssignmentStatusUpdateBody {
  status: AssignmentStatus;
  decline_reason?: string;         // NEW
  decline_category?: string;       // NEW
}

// In AssignmentService.ts
export interface BulkUpdateData {
  assignment_id: UUID;
  status: AssignmentStatus;
  calculated_wage?: number;
  decline_reason?: string;         // NEW
  decline_category?: string;       // NEW
}
```

---

## How to Use

### For Referees - Declining an Assignment

**API Request:**
```bash
curl -X PATCH http://localhost:3001/api/assignments/{assignment_id}/status \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "declined",
    "decline_reason": "I have a family commitment that evening",
    "decline_category": "unavailable"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "assignment": {
      "id": "...",
      "status": "declined",
      "decline_reason": "I have a family commitment that evening",
      "decline_category": "unavailable",
      "updated_at": "2025-09-30T..."
    }
  },
  "message": "Assignment status updated successfully"
}
```

### For Assignors - Viewing Decline Reasons

**Query assignments with decline info:**
```bash
curl -X GET "http://localhost:3001/api/assignments?status=declined&game_id={game_id}" \
  -H "Authorization: Bearer {token}"
```

**Response includes:**
```json
{
  "assignments": [{
    "id": "...",
    "status": "declined",
    "decline_reason": "I have a family commitment that evening",
    "decline_category": "unavailable",
    "referee": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }]
}
```

---

## Email Notifications

### Assignment Email to Referee

**Triggered When:** Assignment is created
**Sent To:** Referee being assigned
**Contains:**
- Game details (teams, date, time, location)
- Position and level
- Calculated wage with multiplier breakdown
- Accept/Decline buttons with direct links
- Assignor contact information

**Sample:**
```
Subject: New Game Assignment: Lakers vs Warriors

Hello John Doe,

You have been assigned to referee a game by Sarah Admin.

📋 Game Details:
Match: Lakers vs Warriors
Date: October 15, 2025
Time: 7:00 PM
Location: Staples Center
Position: Head Referee
Level: Varsity
Your Wage: $85.00

[Accept Assignment] [Decline Assignment]
```

### Assignor Notification Email

**Triggered When:** Referee accepts/declines assignment
**Sent To:** Assignor who created the assignment
**Contains:**
- Status (Accepted/Declined)
- Game details
- Referee information
- Decline reason and category (if declined)

**Sample for Decline:**
```
Subject: Assignment Declined: Lakers vs Warriors

Hello Sarah Admin,

John Doe has declined the assignment for:

Match: Lakers vs Warriors
Date: October 15, 2025
Time: 7:00 PM

📝 Decline Reason
Category: unavailable
Details: I have a family commitment that evening

Referee Contact: john@example.com
```

---

## Testing

### Manual Testing Steps

1. **Create an assignment:**
   ```bash
   POST /api/assignments
   {
     "game_id": "{game_id}",
     "user_id": "{referee_id}",
     "position_id": "{position_id}",
     "assigned_by": "{assignor_id}"
   }
   ```

2. **Check console for email log** (if RESEND_API_KEY not configured):
   ```
   Email service not configured - assignment details:
   To: referee@example.com
   Game: Lakers vs Warriors
   Position: Head Referee
   Accept Link: http://localhost:3000/assignments/{id}/accept
   Decline Link: http://localhost:3000/assignments/{id}/decline
   ```

3. **Decline with reason:**
   ```bash
   PATCH /api/assignments/{id}/status
   {
     "status": "declined",
     "decline_reason": "Schedule conflict",
     "decline_category": "conflict"
   }
   ```

4. **Verify database:**
   ```sql
   SELECT id, status, decline_reason, decline_category
   FROM game_assignments
   WHERE id = '{assignment_id}';
   ```

### Database Verification

```sql
-- Check decline reasons are being saved
SELECT
  ga.id,
  ga.status,
  ga.decline_reason,
  ga.decline_category,
  u.email as referee_email,
  g.home_team_id,
  g.away_team_id
FROM game_assignments ga
JOIN users u ON ga.referee_id = u.id
JOIN games g ON ga.game_id = g.id
WHERE ga.status = 'declined'
AND ga.decline_reason IS NOT NULL
ORDER BY ga.updated_at DESC
LIMIT 10;

-- Decline analytics by category
SELECT
  decline_category,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM game_assignments
WHERE status = 'declined' AND decline_category IS NOT NULL
GROUP BY decline_category
ORDER BY count DESC;
```

---

## What's NOT Implemented Yet (Next Phases)

### Still To Do:

1. **Email Automation Integration** (Need to connect in workflow)
   - Auto-send assignment emails when assignment created
   - Auto-send assignor notifications when status changes
   - Add email preferences for referees

2. **Frontend UI Components**
   - Decline dialog with reason input
   - Decline category dropdown
   - Display decline reasons in assignment lists
   - Assignor dashboard with decline analytics

3. **SMS Notifications** (Phase 2)
   - Twilio integration
   - SMS preferences
   - Game reminders

4. **In-App Notifications** (Phase 3)
   - Notification bell UI
   - Real-time notification system
   - Notification preferences

5. **Calendar Integration** (Phase 4)
   - iCal attachments in emails
   - Google Calendar integration
   - Outlook calendar integration

---

## Next Steps

### Immediate (This Week):

1. **Connect Email Sending to Assignment Creation**
   - Modify `createAssignment` in assignments.ts
   - Call `emailService.sendAssignmentEmail()` after successful creation
   - Handle email failures gracefully

2. **Connect Email Sending to Status Updates**
   - Modify `updateAssignmentStatus` in assignments.ts
   - Call `emailService.sendAssignorNotificationEmail()` after status change
   - Only send for accepted/declined status changes

3. **Create Frontend Decline Dialog**
   - Create `DeclineReasonDialog.tsx` component
   - Add decline reason textarea (max 500 chars)
   - Add decline category dropdown
   - Wire up to PATCH /api/assignments/:id/status

4. **Add Decline Info to UI**
   - Display decline reasons in assignment details
   - Show decline category badge
   - Add decline analytics to assignor dashboard

### Sample Integration Code:

**In createAssignment function (after line 318):**
```typescript
// After assignment created successfully
if (result.assignment.status === 'pending') {
  // Fetch full assignment details with game and referee info
  const assignmentDetails = await assignmentService.getAssignmentsWithDetails(
    { game_id: result.assignment.game_id },
    1, 1
  );

  const assignment = assignmentDetails.data[0];

  // Send email to referee
  await emailService.sendAssignmentEmail({
    email: assignment.referee_email,
    firstName: assignment.referee_name.split(' ')[0],
    lastName: assignment.referee_name.split(' ').slice(1).join(' '),
    assignment: {
      id: assignment.id,
      position: assignment.position_name,
      calculatedWage: assignment.calculated_wage
    },
    game: {
      id: assignment.game_id,
      homeTeam: assignment.home_team_name,
      awayTeam: assignment.away_team_name,
      date: new Date(assignment.game_date).toLocaleDateString(),
      time: new Date(assignment.game_time).toLocaleTimeString(),
      location: assignment.location,
      level: assignment.level,
      payRate: assignment.pay_rate,
      wageMultiplier: assignment.wage_multiplier,
      wageMultiplierReason: assignment.wage_multiplier_reason
    },
    assignor: {
      name: req.user.name,
      email: req.user.email
    },
    acceptLink: `${process.env.FRONTEND_URL}/assignments/${assignment.id}/accept`,
    declineLink: `${process.env.FRONTEND_URL}/assignments/${assignment.id}/decline`
  });
}
```

**In updateAssignmentStatus function (after line 445):**
```typescript
// After status update successful
if (status === 'accepted' || status === 'declined') {
  // Get full assignment details
  const assignmentDetails = await assignmentService.getAssignmentsWithDetails(
    { game_id: results.updatedAssignments[0].game_id },
    1, 1
  );

  const assignment = assignmentDetails.data[0];

  // Get assignor details
  const assignor = await db('users')
    .where('id', assignment.assigned_by)
    .first();

  if (assignor) {
    await emailService.sendAssignorNotificationEmail({
      email: assignor.email,
      name: assignor.first_name + ' ' + assignor.last_name,
      referee: {
        name: assignment.referee_name,
        email: assignment.referee_email
      },
      game: {
        homeTeam: assignment.home_team_name,
        awayTeam: assignment.away_team_name,
        date: new Date(assignment.game_date).toLocaleDateString(),
        time: new Date(assignment.game_time).toLocaleTimeString()
      },
      status: status as 'accepted' | 'declined',
      declineReason: decline_reason,
      declineCategory: decline_category
    });
  }
}
```

---

## Files Changed

1. ✅ `backend/migrations/20250930_add_decline_reasons_to_assignments.js` (NEW)
2. ✅ `backend/src/services/emailService.ts` (MODIFIED)
3. ✅ `backend/src/services/AssignmentService.ts` (MODIFIED)
4. ✅ `backend/src/routes/assignments.ts` (MODIFIED)

## Build Status

✅ TypeScript compilation: SUCCESS
✅ Database migration: SUCCESS
✅ All types validated: SUCCESS

---

## Configuration Needed

### Environment Variables

Add to `.env`:
```bash
# Email Configuration (already exists)
RESEND_API_KEY=re_your_key_here
FROM_EMAIL=noreply@yourdomain.com

# Frontend URL for email links (NEW - needed for next step)
FRONTEND_URL=http://localhost:3000
```

### Email Service Status

The email service will:
- ✅ Log to console if `RESEND_API_KEY` not configured
- ✅ Send real emails if `RESEND_API_KEY` is configured
- ✅ Handle Resend testing restrictions gracefully
- ✅ Never fail assignment creation if email fails

---

## Success Metrics

When fully integrated (next phase):

- ✅ Referees receive assignment emails within 30 seconds
- ✅ Assignors receive status notifications within 30 seconds
- ✅ 95%+ of decline reasons are provided
- ✅ Email delivery rate > 98%
- ✅ No assignment operations fail due to email issues

## Questions or Issues?

Contact the development team or refer to:
- [docs/audits/game-assignment-workflow-implementation-plan.md](./game-assignment-workflow-implementation-plan.md) - Full implementation plan
- [docs/audits/game-assignment-workflow-audit.md](./game-assignment-workflow-audit.md) - Original audit
