# Phase 2: SMS Notifications & Game Reminders - Implementation Complete

**Date:** 2025-09-30
**Status:** ✅ COMPLETE
**Duration:** ~2 weeks (as planned)
**Priority:** HIGH

---

## Summary

Phase 2 successfully implements SMS notifications using Twilio integration, including:
- SMS notifications sent to referees when assigned to games
- Automated game reminders sent 2-3 hours before game time
- Phone number validation with E.164 formatting
- Non-blocking SMS sending that never fails assignment operations
- Hourly cron scheduler for checking upcoming games

---

## Deliverables

### 1. SMS Service (`backend/src/services/smsService.ts`)

**Features:**
- Twilio integration with graceful fallback when not configured
- Phone number validation and E.164 formatting
- Two notification types:
  - Assignment notifications
  - Game reminders
- Static `formatPhoneNumber()` utility for phone normalization

**Key Methods:**
```typescript
async sendAssignmentSMS(data: AssignmentSMSData): Promise<SMSResult>
async sendReminderSMS(data: ReminderSMSData): Promise<SMSResult>
static formatPhoneNumber(phoneNumber: string, countryCode?: string): string
```

**Message Format Examples:**
- **Assignment:** "Hi John, you've been assigned: Lakers vs Warriors on Oct 15 at 7:00 PM. Check your email or visit https://app.com/assignments to respond."
- **Reminder:** "⚽ Game Reminder: Lakers vs Warriors in 2 hours at 7:00 PM. Location: Main Arena"

---

### 2. Game Reminder Scheduler (`backend/src/services/reminderScheduler.ts`)

**Features:**
- Runs every hour using node-cron (cron schedule: `0 * * * *`)
- Queries database for accepted assignments with games 2-3 hours away
- Sends SMS reminders to referees with phone numbers
- Tracks sent reminders using `reminder_sent_at` column (prevents duplicates)
- Graceful start/stop for server lifecycle

**How It Works:**
1. Every hour at :00 minutes, scheduler wakes up
2. Queries for accepted assignments where:
   - `game_assignments.status = 'accepted'`
   - Game time is between 2-3 hours from now
   - `reminder_sent_at IS NULL` (not already sent)
3. For each match:
   - Sends SMS reminder with game details
   - Marks `reminder_sent_at = NOW()` in database
4. Logs success/failure for each reminder

---

### 3. Database Migration (`backend/migrations/20250930_add_reminder_sent_at.js`)

**Schema Changes:**
```sql
ALTER TABLE game_assignments
  ADD COLUMN reminder_sent_at TIMESTAMP;

CREATE INDEX game_assignments_reminder_sent_at_index
  ON game_assignments(reminder_sent_at);
```

**Purpose:** Track when reminders have been sent to prevent duplicate SMS

---

### 4. Server Integration (`backend/src/server.ts`)

**Startup:**
```typescript
// Start reminder scheduler (game reminders via SMS)
if (process.env.DISABLE_REMINDER_SCHEDULER !== 'true') {
  try {
    reminderScheduler.start();
  } catch (error) {
    console.error('⚠️  Reminder scheduler failed to start:', error);
    // Server continues normally - reminders are optional
  }
} else {
  console.log('ℹ️  Reminder scheduler disabled by environment variable');
}
```

**Graceful Shutdown:**
```typescript
const gracefulShutdown = async (signal: string) => {
  // ...
  reminderScheduler.stop(); // Stop cron jobs
  await db.destroy(); // Close database
  process.exit(0);
};
```

---

### 5. Assignment Workflow Integration (`backend/src/routes/assignments.ts`)

**SMS on Assignment Creation (lines 391-420):**
```typescript
// Send SMS notification (if referee has phone number)
const refereePhone = (assignment as any).referee_phone;
if (refereePhone) {
  try {
    const formattedPhone = SMSService.formatPhoneNumber(refereePhone);
    await smsService.sendAssignmentSMS({
      phoneNumber: formattedPhone,
      firstName: assignment.referee_name.split(' ')[0],
      game: {
        homeTeam: assignment.home_team_name,
        awayTeam: assignment.away_team_name,
        date: assignment.game_date,
        time: gameTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      },
      dashboardLink: `${baseUrl}/assignments`
    });
    console.log(`✅ Assignment SMS sent to ${refereePhone}`);
  } catch (smsError) {
    console.error('Failed to send assignment SMS:', smsError);
    console.log('⚠️ SMS notification failed, but assignment created successfully');
  }
}
```

**Non-Blocking Behavior:**
- SMS sending wrapped in try-catch
- Errors logged but not thrown
- Assignment creation always succeeds, even if SMS fails

---

## Configuration

### Environment Variables

Add to `.env` file:

```env
# Twilio SMS Configuration (Optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+1234567890

# Optional: Disable reminder scheduler
DISABLE_REMINDER_SCHEDULER=false
```

### Behavior When Not Configured

**SMS Service:**
- If Twilio credentials are missing, SMS logs to console instead
- Returns `{ success: true, logged: true }` to indicate console logging
- Application continues normally

**Reminder Scheduler:**
- Can be disabled with `DISABLE_REMINDER_SCHEDULER=true`
- Useful for development environments or cost control

---

## Testing

### Manual Testing

**Test SMS on Assignment Creation:**
1. Ensure a referee has a phone number in the `users` table
2. Create a new game assignment for that referee
3. Check server logs for: `✅ Assignment SMS sent to +1234567890`
4. Verify SMS received (if Twilio configured)

**Test Reminder Scheduler:**
1. Create an accepted assignment for a game 2.5 hours from now
2. Wait for the next hour (scheduler runs at :00 minutes)
3. Check server logs for: `⏰ Running game reminder check...`
4. Check for: `✅ Reminder sent for assignment <id>`
5. Verify `reminder_sent_at` is set in database
6. Verify SMS received (if Twilio configured)

**Test Graceful Fallback:**
1. Remove Twilio credentials from `.env`
2. Restart server
3. Create assignment - should see console log instead of SMS error
4. Check logs for: `SMS service not configured - assignment SMS logged`

---

### Database Verification

**Check reminder status:**
```sql
-- See which assignments have had reminders sent
SELECT
  ga.id,
  ga.status,
  ga.reminder_sent_at,
  g.date_time as game_time,
  u.name as referee_name,
  u.phone
FROM game_assignments ga
JOIN games g ON ga.game_id = g.id
JOIN users u ON ga.user_id = u.id
WHERE ga.status = 'accepted'
  AND g.date_time > NOW()
ORDER BY g.date_time;
```

**Check upcoming games needing reminders:**
```sql
-- Games needing reminders in next 2-3 hours
SELECT
  ga.id as assignment_id,
  g.date_time,
  u.name as referee_name,
  u.phone,
  ga.reminder_sent_at
FROM game_assignments ga
JOIN games g ON ga.game_id = g.id
JOIN users u ON ga.user_id = u.id
WHERE ga.status = 'accepted'
  AND g.date_time BETWEEN NOW() + INTERVAL '2 hours' AND NOW() + INTERVAL '3 hours'
  AND ga.reminder_sent_at IS NULL;
```

---

## Cost Considerations

**Twilio SMS Pricing (as of 2025):**
- ~$0.0075 per SMS in US
- ~$0.01-0.03 per SMS internationally

**Example Monthly Costs:**
- 100 assignments/month = ~$0.75
- 500 assignments/month = ~$3.75
- 2000 assignments/month = ~$15.00
- Plus reminders (same rate)

**Cost Control Strategies:**
1. Only send SMS if referee has phone number
2. Reminder scheduler can be disabled
3. Use console logging in development
4. Set daily caps in Twilio dashboard
5. Monitor usage with analytics queries

---

## Monitoring & Analytics

### Console Logging

**Successful SMS:**
```
✅ Assignment SMS sent to +12345678901
✅ Reminder sent for assignment abc-123
```

**Errors:**
```
⚠️  SMS notification failed, but assignment created successfully
Failed to send assignment SMS: [Twilio error]
```

**Scheduler Activity:**
```
⏰ Running game reminder check...
Found 3 games needing reminders
✅ Reminder sent for assignment abc-123
```

### Analytics Queries

**SMS delivery tracking:**
```sql
-- Count assignments by whether SMS was sent
SELECT
  COUNT(*) FILTER (WHERE referee_phone IS NOT NULL) as with_phone,
  COUNT(*) FILTER (WHERE referee_phone IS NULL) as without_phone,
  COUNT(*) as total
FROM (
  SELECT
    ga.id,
    u.phone as referee_phone
  FROM game_assignments ga
  JOIN users u ON ga.user_id = u.id
  WHERE ga.created_at > NOW() - INTERVAL '30 days'
) assignments;
```

**Reminder effectiveness:**
```sql
-- Check reminder timing vs game time
SELECT
  AVG(EXTRACT(EPOCH FROM (g.date_time - ga.reminder_sent_at)) / 3600) as avg_hours_before,
  MIN(EXTRACT(EPOCH FROM (g.date_time - ga.reminder_sent_at)) / 3600) as min_hours_before,
  MAX(EXTRACT(EPOCH FROM (g.date_time - ga.reminder_sent_at)) / 3600) as max_hours_before,
  COUNT(*) as total_reminders
FROM game_assignments ga
JOIN games g ON ga.game_id = g.id
WHERE ga.reminder_sent_at IS NOT NULL;
```

---

## Troubleshooting

### Problem: SMS not sending

**Check:**
1. Twilio credentials in `.env` file
2. Phone numbers in E.164 format (+1XXXXXXXXXX)
3. Server logs for Twilio error messages
4. Twilio account balance and limits
5. Referee has phone number in database

**Solution:**
```bash
# Test phone number format
node -e "const sms = require('./dist/services/smsService').default; console.log(sms.formatPhoneNumber('555-1234'))"

# Check Twilio config
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_FROM_NUMBER
```

---

### Problem: Reminders not sending

**Check:**
1. Scheduler is running: `grep "Reminder scheduler started" logs`
2. Scheduler is not disabled: `echo $DISABLE_REMINDER_SCHEDULER`
3. Games exist in 2-3 hour window
4. Assignments have `status = 'accepted'`
5. `reminder_sent_at IS NULL` for those assignments

**Solution:**
```sql
-- Manually trigger reminder check (in development)
-- Set a game to 2.5 hours from now
UPDATE games
SET date_time = NOW() + INTERVAL '2.5 hours'
WHERE id = 'your-game-id';
```

---

### Problem: Duplicate reminders

**Check:**
- `reminder_sent_at` column is properly indexed
- Database query includes `WHERE reminder_sent_at IS NULL`

**Solution:**
```sql
-- Check for duplicates
SELECT ga.id, COUNT(ga.reminder_sent_at)
FROM game_assignments ga
GROUP BY ga.id
HAVING COUNT(ga.reminder_sent_at) > 1;
```

---

### Problem: Scheduler not starting

**Check server logs for:**
```
⚠️  Reminder scheduler failed to start: [error]
```

**Common causes:**
- node-cron package not installed
- TypeScript compilation errors
- Database connection issues

**Solution:**
```bash
cd backend
npm install node-cron @types/node-cron
npm run build
```

---

## Architecture Decisions

### Why Twilio?
- Industry-standard SMS provider
- Reliable global delivery
- Simple API
- Good documentation

### Why Hourly Scheduler?
- Balances timeliness with server load
- 2-3 hour window ensures reminders are relevant
- Prevents spam (reminders only sent once)

### Why Non-Blocking?
- SMS failures should never break core operations
- Notifications are enhancement, not critical feature
- Console logging provides debugging path

### Why E.164 Format?
- International phone number standard
- Required by Twilio
- Prevents ambiguous phone numbers

---

## Next Steps

**Phase 3 (In-App Notifications)** is ready to begin:
- Notification database tables
- NotificationService
- API endpoints for notifications
- Frontend notification bell component
- Real-time updates (optional WebSocket)

---

## Files Modified/Created

### Created:
- `backend/src/services/smsService.ts` (212 lines)
- `backend/src/services/reminderScheduler.ts` (120 lines)
- `backend/migrations/20250930_add_reminder_sent_at.js` (21 lines)

### Modified:
- `backend/src/server.ts` - Added scheduler startup/shutdown
- `backend/src/routes/assignments.ts` - Integrated SMS on assignment creation
- `backend/package.json` - Added twilio and node-cron dependencies

**Total Lines Added:** ~360 lines
**TypeScript Compilation:** ✅ Success
**Build Status:** ✅ Success

---

## Success Metrics

**Target Metrics (to be measured after deployment):**
- SMS delivery rate: > 95%
- Average reminder delivery time: 2-3 hours before game
- SMS cost per assignment: < $0.02
- Failed SMS impact on assignments: 0% (non-blocking)

**Current Status:**
- ✅ All code complete
- ✅ Database schema updated
- ✅ TypeScript compiling
- ✅ Graceful fallback implemented
- ✅ Error handling complete
- ⏳ Awaiting production deployment for metrics

---

**Phase 2 Status: COMPLETE** ✅
**Ready for:** Phase 3 (In-App Notifications)
