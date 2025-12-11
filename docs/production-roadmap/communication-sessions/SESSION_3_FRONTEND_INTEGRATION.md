# Session 3: Frontend Integration

## Context

You are working on the SportsManager application - a sports referee management system. Sessions 1-2 verified database and API functionality.

**Overall Goal**: Verify and complete the Communications system.

**This Session**: Connect the frontend component to the backend API.

---

## Prerequisites from Sessions 1-2

- [ ] Database tables working
- [ ] All API endpoints verified
- [ ] Role-based access working
- [ ] API client methods available

---

## Current Frontend Status

**File**: `frontend/components/communications-management.tsx`

**Known Issues:**
1. `fetchCommunications()` sets empty array instead of calling API
2. Uses `broadcastNotification` instead of `createCommunication`
3. Missing API integration for listing communications

---

## Session 3 Tasks

### Task 1: Update API Client

Verify/add communication methods to `frontend/lib/api.ts`:

```typescript
// Communications API
async getCommunications(filters?: {
  type?: string;
  priority?: string;
  status?: string;
  unread_only?: boolean;
  page?: number;
  limit?: number;
}): Promise<{
  communications: Communication[];
  pagination: { page: number; limit: number; total: number };
}> {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.priority) params.append('priority', filters.priority);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.unread_only) params.append('unread_only', 'true');
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));

  const response = await this.request(`/communications?${params.toString()}`);
  return response;
}

async getCommunication(id: string): Promise<Communication> {
  const response = await this.request(`/communications/${id}`);
  return response;
}

async createCommunication(data: {
  title: string;
  content: string;
  type: string;
  priority?: string;
  target_audience: { role?: string[]; specific_users?: string[]; all_users?: boolean };
  requires_acknowledgment?: boolean;
  tags?: string[];
}): Promise<Communication> {
  const response = await this.request('/communications', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response;
}

async updateCommunication(id: string, data: Partial<{
  title: string;
  content: string;
  type: string;
  priority: string;
  target_audience: object;
  requires_acknowledgment: boolean;
}>): Promise<Communication> {
  const response = await this.request(`/communications/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response;
}

async publishCommunication(id: string): Promise<Communication> {
  const response = await this.request(`/communications/${id}/publish`, {
    method: 'POST',
  });
  return response;
}

async archiveCommunication(id: string): Promise<Communication> {
  const response = await this.request(`/communications/${id}/archive`, {
    method: 'POST',
  });
  return response;
}

async acknowledgeCommunication(id: string, acknowledgmentText?: string): Promise<void> {
  await this.request(`/communications/${id}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({ acknowledgment_text: acknowledgmentText }),
  });
}

async getCommunicationRecipients(id: string): Promise<{
  recipients: Array<{
    recipient_name: string;
    recipient_email: string;
    delivery_status: string;
    read_at: string | null;
    acknowledged_at: string | null;
  }>;
  statistics: {
    total_recipients: number;
    delivered: number;
    read: number;
    acknowledged: number;
    failed: number;
  };
}> {
  const response = await this.request(`/communications/${id}/recipients`);
  return response;
}

async getCommunicationStats(): Promise<{
  overview: {
    total_communications: number;
    draft_communications: number;
    published_communications: number;
    archived_communications: number;
    emergency_communications: number;
    urgent_communications: number;
    acknowledgment_required: number;
  };
  engagement: {
    total_recipients: number;
    total_read: number;
    total_acknowledged: number;
    delivery_failures: number;
    avg_hours_to_read: number | null;
  };
  typeBreakdown: Array<{
    type: string;
    count: number;
    published_count: number;
  }>;
}> {
  const response = await this.request('/communications/stats/overview');
  return response;
}

async getPendingAcknowledgments(): Promise<Array<{
  id: string;
  title: string;
  type: string;
  priority: string;
  publish_date: string;
  requires_acknowledgment: boolean;
  sent_at: string;
  read_at: string | null;
}>> {
  const response = await this.request('/communications/acknowledgments/pending');
  return response;
}
```

---

### Task 2: Update Communication Type Definition

Verify/update `Communication` type in `frontend/lib/api.ts`:

```typescript
export interface Communication {
  id: string;
  title: string;
  content: string;
  type: 'announcement' | 'memo' | 'policy_update' | 'emergency' | 'newsletter';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'draft' | 'published' | 'archived';
  author_id: string;
  author_name?: string;
  target_audience: {
    departments?: string[];
    roles?: string[];
    specific_users?: string[];
    all_users?: boolean;
  };
  publish_date?: string;
  expiration_date?: string | null;
  requires_acknowledgment: boolean;
  attachments?: Array<{
    filename: string;
    path: string;
    size: number;
    mimetype: string;
  }>;
  tags?: string[];
  created_at: string;
  updated_at: string;
  sent_at?: string;
  // Recipient-specific fields
  read_at?: string;
  acknowledged_at?: string;
  delivery_status?: string;
  is_unread?: boolean;
  requires_ack?: boolean;
  // Stats
  total_recipients?: number;
  acknowledgment_count?: number;
  created_by_name?: string;
  scheduled_send_date?: string;
}
```

---

### Task 3: Fix fetchCommunications in Component

Update `communications-management.tsx`:

```typescript
const fetchCommunications = async () => {
  try {
    setLoading(true);
    setError(null);

    const filters: Record<string, string | boolean | number> = {};
    if (statusFilter !== 'all') filters.status = statusFilter;
    if (typeFilter !== 'all') filters.type = typeFilter;
    if (priorityFilter !== 'all') filters.priority = priorityFilter;

    const response = await apiClient.getCommunications(filters);

    // Handle different response formats
    if (response.communications) {
      setCommunications(response.communications);
    } else if (Array.isArray(response)) {
      setCommunications(response);
    } else if (response.items) {
      setCommunications(response.items);
    } else {
      setCommunications([]);
    }
  } catch (error) {
    console.error('Error fetching communications:', error);
    setError('Failed to load communications');
    toast.error('Failed to load communications');
    setCommunications([]);
  } finally {
    setLoading(false);
  }
};
```

---

### Task 4: Fix handleCreateCommunication

Update to use the communications API instead of broadcast:

```typescript
const handleCreateCommunication = async () => {
  try {
    setLoading(true);

    const response = await apiClient.createCommunication({
      title: formData.title,
      content: formData.content,
      type: formData.type,
      priority: formData.priority,
      target_audience: formData.target_audience,
      requires_acknowledgment: formData.requires_acknowledgment,
    });

    // Add to list or refresh
    setCommunications(prev => [response, ...prev]);
    setIsCreateDialogOpen(false);
    resetForm();
    toast.success('Communication created successfully');

    // Optionally publish immediately
    // if (publishImmediately) {
    //   await handlePublishCommunication(response.id);
    // }
  } catch (error) {
    console.error('Error creating communication:', error);
    toast.error('Failed to create communication');
  } finally {
    setLoading(false);
  }
};
```

---

### Task 5: Add Refresh on Filter Change

Add effect to refresh when filters change:

```typescript
useEffect(() => {
  fetchCommunications();
}, [statusFilter, typeFilter, priorityFilter, activeTab]);
```

---

### Task 6: Add Stats Dashboard Integration

Update stats to use API:

```typescript
const [stats, setStats] = useState({
  total: 0,
  published: 0,
  drafts: 0,
  urgent: 0,
});

const fetchStats = async () => {
  try {
    const statsResponse = await apiClient.getCommunicationStats();
    setStats({
      total: statsResponse.overview.total_communications,
      published: statsResponse.overview.published_communications,
      drafts: statsResponse.overview.draft_communications,
      urgent: statsResponse.overview.urgent_communications,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    // Use local calculation as fallback
    setStats({
      total: communications.length,
      published: communications.filter(c => c.status === 'published').length,
      drafts: communications.filter(c => c.status === 'draft').length,
      urgent: communications.filter(c => c.priority === 'urgent').length,
    });
  }
};

useEffect(() => {
  fetchStats();
}, [communications]);
```

---

### Task 7: Add Archive Functionality

Add archive button and handler:

```typescript
const handleArchiveCommunication = async (id: string) => {
  try {
    await apiClient.archiveCommunication(id);
    setCommunications(communications.map(comm =>
      comm.id === id ? { ...comm, status: 'archived' } : comm
    ));
    toast.success('Communication archived');
  } catch (error) {
    console.error('Error archiving communication:', error);
    toast.error('Failed to archive communication');
  }
};
```

Add to UI:
```tsx
{communication.status === 'published' && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => handleArchiveCommunication(communication.id)}
    className="text-gray-600 hover:text-gray-700"
  >
    <Archive className="w-4 h-4" />
  </Button>
)}
```

---

### Task 8: Add Acknowledgment Display

Show acknowledgment status in card:

```tsx
{communication.requires_acknowledgment && (
  <div className="flex items-center gap-1 text-sm">
    <CheckCircle className="w-4 h-4 text-green-600" />
    <span>
      {communication.acknowledgment_count || 0}/{communication.total_recipients || 0} acknowledged
    </span>
  </div>
)}
```

---

### Task 9: Test the Integration

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to `/communications` or wherever the component is mounted
4. Test:
   - View communications list
   - Create new communication
   - Edit draft
   - Publish communication
   - Archive communication
   - Filter by type/priority/status
   - View recipient status

---

## Deliverables for This Session

1. **Updated API client**: All communication methods added
2. **Fixed component**: `fetchCommunications` calls API
3. **Working CRUD**: Create, read, update, archive working
4. **Stats integration**: Dashboard shows real stats

---

## Completion Criteria

Before ending this session, verify:
- [ ] Communications list loads from API
- [ ] Create communication works
- [ ] Update communication works (draft only)
- [ ] Publish communication works
- [ ] Archive communication works
- [ ] Filters work with API
- [ ] Stats show real data
- [ ] No console errors

---

## Handoff Notes for Session 4

Document the following for Session 4 (End-to-End Testing):
- Which features are fully working
- Any known issues or edge cases
- User roles tested
- Areas needing additional testing

**Session 4 Focus**: Full end-to-end testing and polish
