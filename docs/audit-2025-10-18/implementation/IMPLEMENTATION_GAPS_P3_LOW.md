# Implementation Gaps - P3 Low Priority

**Total Endpoints**: 32
**Estimated Effort**: 51 hours (~2 weeks)
**Status**: ⚠️ PARTIALLY IMPLEMENTED
**Impact**: Low - Nice-to-have features and optimizations

---

## Overview

These endpoints provide advanced features, extended mentorship capabilities, and unified role management. They can be implemented after core functionality is stable.

---

## 1. Unified Role Management (20 hours)

### 1.1 GET /api/admin/unified-roles
**Effort**: 5 hours | **Status**: ⚠️ PARTIAL

Get all roles with combined database and Cerbos policy data.

**Query Parameters**:
- `include_users` (boolean) - Include user count
- `include_permissions` (boolean) - Include permission count
- `include_pages` (boolean) - Include accessible pages

**Response**:
```typescript
{
  success: boolean
  data: {
    roles: Array<{
      id: string
      name: string
      description: string
      color?: string
      is_active: boolean
      user_count: number
      permission_count: number
      pages?: string[]
      created_at: string
      updated_at: string
      source: 'database' | 'cerbos' | 'unified'
      cerbos_policy_exists: boolean
      parent_roles?: string[]
    }>
  }
}
```

**Database Tables**: `roles`, `user_roles`, `role_permissions`, `role_page_access`, Cerbos API

---

### 1.2 DELETE /api/admin/unified-roles/:roleName
**Effort**: 4 hours | **Status**: ⚠️ PARTIAL

Delete role from both database and Cerbos.

**Validation**:
- Prevent deletion of system roles
- Check if users assigned to role
- Return error with user count if assigned

**Response**:
```typescript
{
  success: boolean
  message: string
  deleted_from: {
    database: boolean
    cerbos: boolean
  }
  affected_users?: number
}
```

---

### 1.3 POST /api/admin/roles/unified
**Effort**: 5 hours | **Status**: ❌ MISSING

Create new role with permissions and page access.

**Request Body**:
```typescript
{
  name: string  // Must be lowercase with underscores
  description?: string
  permissions: string[]
  pages: string[]
  color?: string
}
```

**Validation**:
- Name must match pattern: `/^[a-z_]+$/`
- Name must be unique
- Name cannot be changed after creation

**Database Tables**: `roles`, `role_permissions`, `role_page_access`

---

### 1.4 PUT /api/admin/roles/unified/:id
**Effort**: 4 hours | **Status**: ❌ MISSING

Update existing role (name cannot be changed).

**Note**: Name field should NOT be sent (immutable)

---

### 1.5 GET /api/admin/permissions/available
**Effort**: 2 hours | **Status**: ⚠️ NEEDS VERIFICATION

Get all available permissions grouped by resource.

**Response**:
```typescript
{
  success: boolean
  data: {
    groupedByResource: Record<string, string[]>
  }
}
// Example:
{
  "user": ["user:view", "user:create", "user:update", "user:delete"],
  "game": ["game:view", "game:create", "game:update", "game:delete"],
  ...
}
```

---

## 2. Mentorship Extended Features (16 hours)

### 2.1 GET /api/mentees/:menteeId/notes
**Effort**: 3 hours | **Status**: ❌ MISSING

Get all notes for a mentee.

**Response**:
```typescript
{
  success: boolean
  data: Array<{
    id: string
    mentee_id: string
    mentor_id: string
    title: string
    content: string  // HTML content
    category: 'observation' | 'evaluation' | 'feedback' | 'plan' | 'general'
    is_private: boolean
    created_at: string
    updated_at: string
  }>
}
```

**Database Tables**: `mentee_notes`

---

### 2.2 GET /api/mentees/:menteeId/documents
**Effort**: 3 hours | **Status**: ❌ MISSING

Get all documents for a mentee.

**Database Tables**: `mentee_documents`

---

### 2.3 GET /api/mentees/:menteeId/goals
**Effort**: 3 hours | **Status**: ❌ MISSING

Get development goals for a mentee.

**Database Tables**: `mentorship_goals`

---

### 2.4 GET /api/mentees/:menteeId/sessions
**Effort**: 3 hours | **Status**: ❌ MISSING

Get mentorship sessions for a mentee.

**Database Tables**: `mentorship_sessions`

---

### 2.5 PUT /api/mentees/:menteeId
**Effort**: 2 hours | **Status**: ❌ MISSING

Update mentee profile information.

**Database Tables**: `mentees`

---

### 2.6 POST /api/mentee-documents
**Effort**: 2 hours | **Status**: ❌ MISSING

Upload a new document for a mentee (multipart/form-data).

**Implementation**: Requires file storage system (AWS S3 or local)

---

## 3. Access Control Stats (15 hours)

### 3.1 GET /api/access-control/stats
**Effort**: 4 hours | **Status**: ❌ MISSING

Get overview statistics for access control dashboard.

**Response**:
```typescript
{
  userCount: number
  roleCount: number
  permissionCount: number
  activeSessionCount: number
}
```

**Database Tables**: `users`, `roles`, `permissions`, `sessions`

---

### 3.2 GET /api/admin/roles
**Effort**: 2 hours | **Status**: ✅ EXISTS

Verify response includes page_access data.

---

### 3.3 GET /api/admin/roles/:roleId/page-access
**Effort**: 3 hours | **Status**: ⚠️ PARTIAL

Get page access configuration for a specific role.

**Response**:
```typescript
{
  success: boolean
  data: {
    role_id: string
    role_name: string
    accessible_pages: string[]
    accessible_categories: string[]
    page_access_config: Record<string, boolean>
  }
}
```

**Database Tables**: `role_page_access`

---

### 3.4 PUT /api/admin/roles/:roleId/page-access
**Effort**: 4 hours | **Status**: ⚠️ PARTIAL

Update page access permissions for a role.

**Features Needed**:
- Support category-level access grants
- Protect system admin from losing critical access

**Request Body**:
```typescript
{
  pages: string[]  // Array of page paths
  categories?: string[]  // Grant access to all pages in categories
  grant_all?: boolean  // Grant access to all pages
}
```

---

### 3.5 DELETE /api/admin/access-cache
**Effort**: 2 hours | **Status**: ❌ MISSING

Clear access control cache for immediate permission updates.

**Query Parameters**:
- `scope` ('all' | 'role' | 'user')
- `identifier` (Role ID or User ID when scope is 'role' or 'user')

**Response**:
```typescript
{
  success: boolean
  message: string
  cache_entries_cleared: number
}
```

**Implementation**: Clear Redis/memory cache for Cerbos decisions

---

## 4. Mentee Analytics (10 hours)

### 4.1 GET /api/mentors/:mentorId
**Effort**: 5 hours | **Status**: ❌ MISSING

Get mentor profile and statistics.

**Response**:
```typescript
{
  success: boolean
  data: {
    id: string
    user_id: string
    first_name: string
    last_name: string
    email: string
    specialization?: string
    bio?: string
    stats?: {
      total_mentees: number
      active_mentees: number
      completed_mentorships: number
      total_sessions: number
      average_mentee_rating: number
      success_rate: number
    }
    mentorship_assignments: Array<{...}>
  }
}
```

**Database Tables**: `mentors`, `mentorship_assignments`, `mentorship_sessions`

---

### 4.2 GET /api/mentee-documents/:documentId/download
**Effort**: 3 hours | **Status**: ❌ MISSING

Download a document file.

**Response**: Binary file stream (blob)
**Headers**:
- `Content-Type`: (file mime type)
- `Content-Disposition`: `attachment; filename="[original_filename]"`

**Validation**:
- Check user has permission
- Respect privacy settings

---

### 4.3 PATCH /api/mentee-documents/:documentId
**Effort**: 2 hours | **Status**: ❌ MISSING

Update document metadata or privacy setting.

---

## 5. Cerbos Integration Enhancements (10 hours)

### 5.1 GET /api/roles/available
**Effort**: 2 hours | **Status**: ⚠️ NEEDS VERIFICATION

Get available roles for parent role selection.

---

### 5.2 GET /api/cerbos/roles/:name/permissions
**Effort**: 3 hours | **Status**: ❌ MISSING

Get permissions for a Cerbos role.

**Source**: Cerbos policy files

---

### 5.3 POST /api/cerbos/roles
**Effort**: 3 hours | **Status**: ❌ MISSING

Create Cerbos policy role with permissions.

**File Target**: `cerbos-policies/derived_roles/`

---

### 5.4 PUT /api/cerbos/roles/:name
**Effort**: 2 hours | **Status**: ❌ MISSING

Update Cerbos policy role.

---

## Database Changes Required

### New Tables

```sql
-- mentee_notes table
CREATE TABLE mentee_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id UUID NOT NULL REFERENCES mentees(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  content TEXT,  -- HTML content
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT mentee_note_category_check CHECK (category IN ('observation', 'evaluation', 'feedback', 'plan', 'general'))
);

-- mentorship_goals table
CREATE TABLE mentorship_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id UUID NOT NULL REFERENCES mentees(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'not_started',
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  progress_percentage INTEGER DEFAULT 0,
  target_date DATE,
  completed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT goal_status_check CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled')),
  CONSTRAINT goal_priority_check CHECK (priority IN ('low', 'medium', 'high')),
  CONSTRAINT progress_range_check CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- mentorship_sessions table
CREATE TABLE mentorship_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id UUID NOT NULL REFERENCES mentees(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  session_type VARCHAR(50) NOT NULL,
  session_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  topics_covered JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT session_type_check CHECK (session_type IN ('one_on_one', 'observation', 'evaluation', 'workshop')),
  CONSTRAINT session_status_check CHECK (status IN ('scheduled', 'completed', 'cancelled'))
);
```

---

## Implementation Order

### Week 1: Unified Role Management
**Days 1-3**: Role management endpoints
- Implement unified roles endpoints
- Add permission grouping
- Implement cache clearing

**Days 4-5**: Access control stats
- Implement stats endpoint
- Enhance page access endpoints

### Week 2: Mentorship Extended + Analytics
**Days 6-8**: Mentorship extended features
- Implement notes, documents, goals, sessions endpoints
- Set up file storage for documents

**Days 9-10**: Analytics and Cerbos
- Implement mentor profile endpoint
- Enhance Cerbos integration endpoints

---

## Success Criteria

- ✅ All 32 endpoints implemented
- ✅ Database tables for mentorship features created
- ✅ File storage system configured
- ✅ Cerbos integration complete
- ✅ Cache clearing functional
- ✅ Test coverage >75%

---

**Next**: See [IMPLEMENTATION_GAPS_DATABASE.md](./IMPLEMENTATION_GAPS_DATABASE.md) for database schema details
