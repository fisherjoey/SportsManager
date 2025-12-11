# Session 2: API Integration Testing

## Context

You are working on the SportsManager application - a sports referee management system. Session 1 verified the database schema and backend infrastructure.

**Overall Goal**: Verify and complete the Communications system.

**This Session**: Deep API integration testing across all endpoints and user roles.

---

## Prerequisites from Session 1

- [ ] Database tables verified and working
- [ ] Backend routes registered in app.ts
- [ ] Basic API endpoints returning responses
- [ ] Cerbos policy loaded

---

## Session 2 Tasks

### Task 1: Verify API Client Methods

Check `frontend/lib/api.ts` for communication methods:

**Required Methods:**
```typescript
// Should exist or need to be added:
getCommunications(filters?: CommunicationFilters): Promise<PaginatedCommunications>
getCommunication(id: string): Promise<Communication>
createCommunication(data: CreateCommunicationRequest): Promise<Communication>
updateCommunication(id: string, data: UpdateCommunicationRequest): Promise<Communication>
publishCommunication(id: string): Promise<Communication>
archiveCommunication(id: string): Promise<Communication>
acknowledgeCommunication(id: string, text?: string): Promise<void>
getCommunicationRecipients(id: string): Promise<RecipientsResponse>
getCommunicationStats(): Promise<CommunicationStatsResponse>
getPendingAcknowledgments(): Promise<PendingAcknowledgment[]>
```

If missing, add them to the apiClient.

---

### Task 2: Test Full CRUD Workflow

Test the complete communication lifecycle:

```bash
# Set up auth token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sportsmanager.com","password":"admin123"}' \
  | jq -r '.token')

# 1. CREATE - Create draft communication
COMM_ID=$(curl -s -X POST "http://localhost:3001/api/communications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Important Announcement",
    "content": "<p>This is an important announcement for all referees.</p>",
    "type": "announcement",
    "priority": "high",
    "target_audience": {"all_users": true},
    "requires_acknowledgment": true
  }' | jq -r '.id')
echo "Created communication: $COMM_ID"

# 2. READ - Get the communication
curl -X GET "http://localhost:3001/api/communications/$COMM_ID" \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. UPDATE - Update the draft
curl -X PUT "http://localhost:3001/api/communications/$COMM_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Important Announcement",
    "priority": "urgent"
  }' | jq

# 4. PUBLISH - Publish the communication
curl -X POST "http://localhost:3001/api/communications/$COMM_ID/publish" \
  -H "Authorization: Bearer $TOKEN" | jq

# 5. RECIPIENTS - Check recipients
curl -X GET "http://localhost:3001/api/communications/$COMM_ID/recipients" \
  -H "Authorization: Bearer $TOKEN" | jq

# 6. ARCHIVE - Archive the communication
curl -X POST "http://localhost:3001/api/communications/$COMM_ID/archive" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected Results:**
- Create returns new communication with status 'draft'
- Update modifies only draft communications
- Publish changes status to 'published' and creates recipients
- Recipients shows delivery status for all target users
- Archive changes status to 'archived'

---

### Task 3: Test Role-Based Access

Test different user roles:

```bash
# Test as Referee (limited permissions)
REF_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"referee@test.com","password":"referee123"}' \
  | jq -r '.token')

# Should SUCCEED: View communications
curl -X GET "http://localhost:3001/api/communications" \
  -H "Authorization: Bearer $REF_TOKEN" | jq

# Should FAIL: Create communication
curl -X POST "http://localhost:3001/api/communications" \
  -H "Authorization: Bearer $REF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Test","type":"announcement","target_audience":{"all_users":true}}' | jq

# Should SUCCEED: Acknowledge (if requires_acknowledgment)
curl -X POST "http://localhost:3001/api/communications/$COMM_ID/acknowledge" \
  -H "Authorization: Bearer $REF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"acknowledgment_text":"I have read this"}' | jq

# Should SUCCEED: Get pending acknowledgments
curl -X GET "http://localhost:3001/api/communications/acknowledgments/pending" \
  -H "Authorization: Bearer $REF_TOKEN" | jq
```

**Document Results:**
- Which actions succeed/fail for each role
- Any unexpected permission issues
- Cerbos policy adjustments needed

---

### Task 4: Test Target Audience Resolution

Test different audience targeting:

```bash
# Target specific roles
curl -X POST "http://localhost:3001/api/communications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Referee Only Communication",
    "content": "This is only for referees.",
    "type": "memo",
    "priority": "normal",
    "target_audience": {"roles": ["referee"]},
    "requires_acknowledgment": false
  }'

# Target specific users
curl -X POST "http://localhost:3001/api/communications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Personal Communication",
    "content": "This is for specific users.",
    "type": "memo",
    "priority": "normal",
    "target_audience": {"specific_users": ["USER_ID_1", "USER_ID_2"]},
    "requires_acknowledgment": false
  }'
```

Verify:
- Recipients are correctly resolved
- Only targeted users can see the communication
- Correct recipient count is returned

---

### Task 5: Test Filter and Pagination

Test list endpoint with filters:

```bash
# Filter by type
curl -X GET "http://localhost:3001/api/communications?type=announcement" \
  -H "Authorization: Bearer $TOKEN" | jq

# Filter by priority
curl -X GET "http://localhost:3001/api/communications?priority=urgent" \
  -H "Authorization: Bearer $TOKEN" | jq

# Filter by status
curl -X GET "http://localhost:3001/api/communications?status=published" \
  -H "Authorization: Bearer $TOKEN" | jq

# Unread only
curl -X GET "http://localhost:3001/api/communications?unread_only=true" \
  -H "Authorization: Bearer $TOKEN" | jq

# Pagination
curl -X GET "http://localhost:3001/api/communications?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

Verify:
- Filters work correctly
- Pagination returns correct counts
- Combined filters work together

---

### Task 6: Test Statistics Endpoint

```bash
curl -X GET "http://localhost:3001/api/communications/stats/overview" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected Response:**
```json
{
  "overview": {
    "total_communications": 10,
    "draft_communications": 2,
    "published_communications": 7,
    "archived_communications": 1,
    "emergency_communications": 0,
    "urgent_communications": 1,
    "acknowledgment_required": 3
  },
  "engagement": {
    "total_recipients": 50,
    "total_read": 45,
    "total_acknowledged": 30,
    "delivery_failures": 0,
    "avg_hours_to_read": 2.5
  },
  "typeBreakdown": [
    {"type": "announcement", "count": 5, "published_count": 4},
    {"type": "memo", "count": 3, "published_count": 2}
  ]
}
```

---

### Task 7: Test Error Handling

Test error scenarios:

```bash
# Invalid ID
curl -X GET "http://localhost:3001/api/communications/invalid-uuid" \
  -H "Authorization: Bearer $TOKEN"

# Update published (should fail)
curl -X PUT "http://localhost:3001/api/communications/$PUBLISHED_COMM_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"New Title"}'

# Publish non-draft (should fail)
curl -X POST "http://localhost:3001/api/communications/$PUBLISHED_COMM_ID/publish" \
  -H "Authorization: Bearer $TOKEN"

# Acknowledge non-recipient (should fail)
curl -X POST "http://localhost:3001/api/communications/$NON_RECIPIENT_COMM_ID/acknowledge" \
  -H "Authorization: Bearer $TOKEN"
```

Verify proper error responses with appropriate HTTP status codes.

---

## Deliverables for This Session

1. **API test results**: Document all endpoint tests
2. **Role access matrix**: Document what each role can do
3. **Issues found**: List any bugs or improvements needed
4. **API client updates**: If methods were added to frontend/lib/api.ts

---

## Completion Criteria

Before ending this session, verify:
- [ ] All CRUD operations work correctly
- [ ] Role-based access is enforced properly
- [ ] Target audience resolution works for all scenarios
- [ ] Filters and pagination work
- [ ] Statistics are accurate
- [ ] Error handling returns appropriate responses
- [ ] API client has all necessary methods

---

## Handoff Notes for Session 3

Document the following for Session 3 (Frontend Integration):
- Which API methods are available in the client
- Any response format issues that need handling
- Authentication flow for communications
- Known issues that affect frontend integration

**Session 3 Focus**: Connect frontend component to backend API
