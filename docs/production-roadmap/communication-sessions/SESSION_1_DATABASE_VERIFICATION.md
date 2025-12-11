# Session 1: Database Verification & Backend Audit

## Context

You are working on the SportsManager application - a sports referee management system. The backend is Node.js/Express with TypeScript, PostgreSQL database, and Cerbos for authorization.

**Overall Goal**: Verify and complete the Communications system (4 sessions total).

**This Session**: Verify existing database schema, backend routes, and services are working correctly.

---

## What Already Exists

### Database Tables (Migration: `20250805214140_create_communications_system.js`)

**Table: `internal_communications`**
- id (uuid, primary key)
- title (varchar 200, required)
- content (text, required)
- type (enum: announcement, memo, policy_update, emergency, newsletter)
- priority (enum: low, normal, high, urgent)
- author_id (uuid, FK → users)
- target_audience (jsonb)
- publish_date (timestamp)
- expiration_date (timestamp, nullable)
- requires_acknowledgment (boolean)
- attachments (jsonb, nullable)
- tags (jsonb, nullable)
- status (enum: draft, published, archived)
- created_at, updated_at, sent_at (timestamps)

**Table: `communication_recipients`**
- id (uuid, primary key)
- communication_id (uuid, FK → internal_communications)
- recipient_id (uuid, FK → users)
- delivery_method (enum: app, email, sms)
- delivery_status (enum: pending, delivered, failed, read)
- sent_at, read_at, acknowledged_at (timestamps)
- acknowledged (boolean)

### Backend Infrastructure
- Routes: `backend/src/routes/communications.ts`
- Service: `backend/src/services/CommunicationService.ts`
- Types: `backend/src/types/communication.ts`
- Cerbos policy: `cerbos-policies/resources/communication.yaml`

### Existing Endpoints
```
GET    /api/communications                    - List communications (filtered)
GET    /api/communications/:id                - Get single communication
POST   /api/communications                    - Create communication
PUT    /api/communications/:id                - Update communication (drafts only)
POST   /api/communications/:id/publish        - Publish draft
POST   /api/communications/:id/archive        - Archive communication
POST   /api/communications/:id/acknowledge    - Acknowledge communication
GET    /api/communications/:id/recipients     - Get recipient status
GET    /api/communications/acknowledgments/pending - User's pending acknowledgments
GET    /api/communications/stats/overview     - Communication statistics
```

---

## Session 1 Tasks

### Task 1: Verify Database Tables Exist

Run these queries to confirm schema is properly created:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('internal_communications', 'communication_recipients');

-- Get column details for internal_communications
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'internal_communications'
ORDER BY ordinal_position;

-- Get column details for communication_recipients
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'communication_recipients'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('internal_communications', 'communication_recipients');

-- Check constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'communication_recipients'::regclass;
```

**Expected Result**: Both tables exist with correct columns and indexes.

---

### Task 2: Run Migration (if tables don't exist)

If tables are missing, run the migration:

```bash
cd backend
npm run migrate:latest
```

Or run specific migration:
```bash
npx knex migrate:up 20250805214140_create_communications_system.js
```

---

### Task 3: Verify Backend Routes Are Registered

Check that communications routes are mounted in `backend/src/app.ts`:

```typescript
// Look for this import and registration
import communicationsRouter from './routes/communications';
app.use('/api/communications', communicationsRouter);
```

If not registered, add it.

---

### Task 4: Verify CommunicationService Works

Test the service directly in a Node REPL or test file:

```typescript
import { CommunicationService } from './src/services/CommunicationService';
import { pool } from './src/config/database';

const service = new CommunicationService(pool);

// Test getCommunicationStats
const stats = await service.getCommunicationStats();
console.log('Stats:', stats);
```

---

### Task 5: Test API Endpoints with curl

Test each endpoint to verify they're working:

```bash
# Get auth token first
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sportsmanager.com","password":"admin123"}' \
  | jq -r '.token')

# 1. List communications
curl -X GET "http://localhost:3001/api/communications" \
  -H "Authorization: Bearer $TOKEN"

# 2. Create a draft communication
curl -X POST "http://localhost:3001/api/communications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Communication",
    "content": "This is a test communication.",
    "type": "announcement",
    "priority": "normal",
    "target_audience": {"all_users": true},
    "requires_acknowledgment": false
  }'

# 3. Get stats
curl -X GET "http://localhost:3001/api/communications/stats/overview" \
  -H "Authorization: Bearer $TOKEN"
```

**Document Results**: Note any errors or unexpected responses.

---

### Task 6: Verify Cerbos Policy

Check that the Cerbos policy allows the expected actions:

1. Super Admin: Full access (*)
2. Admin: view:list, view:details, create, update, publish, archive, admin:*
3. Assignor/Referee: view:list, view:details, acknowledge, view:unread_count, view:pending_acknowledgments

Test authorization by logging in as different users and attempting various actions.

---

## Deliverables for This Session

1. **Database verification**: Confirm tables exist with correct schema
2. **Backend audit**: Verify routes are registered and working
3. **API tests**: Document results of endpoint tests
4. **Issues log**: List any bugs or missing functionality discovered

---

## Completion Criteria

Before ending this session, verify:
- [ ] `internal_communications` table exists with correct columns
- [ ] `communication_recipients` table exists with correct columns
- [ ] All indexes are created
- [ ] Communications routes are registered in app.ts
- [ ] GET /api/communications returns valid response
- [ ] POST /api/communications creates a draft
- [ ] Cerbos policy is loaded correctly

---

## Known Issues to Address

Based on frontend code analysis:

1. **Frontend uses notification broadcast instead of communications API**
   - `communications-management.tsx` line 121 uses `apiClient.broadcastNotification`
   - Should use `apiClient.createCommunication` instead

2. **fetchCommunications is incomplete**
   - Line 103-116: Currently just sets empty array
   - Should call `apiClient.getCommunications()`

3. **API client may be missing communication methods**
   - Need to verify `lib/api.ts` has communication methods

---

## Handoff Notes for Session 2

Document the following for Session 2 (API Integration Testing):
- Which endpoints are confirmed working
- Any authentication/authorization issues discovered
- Database schema differences from expected (if any)
- Missing API client methods that need to be added

**Session 2 Focus**: Deep API testing with all user roles and edge cases
