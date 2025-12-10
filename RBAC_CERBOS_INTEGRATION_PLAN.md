# RBAC System & Cerbos Integration Plan

## Current System Overview

### Frontend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `UnifiedAccessControlDashboard` | `/frontend/components/admin/access-control/` | Main admin hub with tabs for Users, Roles, Page Access, Mentorships, Configuration |
| `RoleManagementDashboard` | Same directory | Create/edit/delete roles, displays role cards with permission counts |
| `UnifiedRoleEditor` | Same directory | Dialog for creating/editing roles with permission selection UI |
| `PermissionManagementDashboard` | Same directory | View-only permission matrix showing role-permission assignments |
| `RolePageAccessManager` | Same directory | Configure which pages each role can access |
| `UserRoleManager` | Same directory | Assign/remove users from roles |

### Backend APIs

| Endpoint | File | Purpose |
|----------|------|---------|
| `GET /api/admin/unified-roles` | `backend/src/routes/admin/unified-roles.ts` | List all roles with unified Cerbos + Database view |
| `GET /api/admin/roles/available-permissions` | Same file | Get list of all available permissions |
| `GET /api/admin/roles/:name` | Same file | Get specific role details |
| `POST /api/admin/roles` | Same file | Create new role |
| `PUT /api/admin/roles/:name` | Same file | Update role (description, permissions, color) |
| `DELETE /api/admin/roles/:name` | Same file | Delete role |
| `GET /api/admin/permissions` | `backend/src/routes/admin/permissions.ts` | Returns permission categories and available permissions |
| `* /api/admin/cerbos-policies` | `backend/src/routes/admin/cerbos-policies.ts` | Direct Cerbos Admin API interaction |

### Database Tables

| Table | Purpose |
|-------|---------|
| `users` | Contains roles array (text[]) |
| `roles` | Role metadata (name, description, color, is_active, settings) |
| `user_roles` | User-role assignments (many-to-many) |
| `role_pages` | Role page access mappings |

### Cerbos Policy Structure

**Location**: `/cerbos/policies/` (44 policy files)

1. **Resource Policies** (e.g., `user.yaml`, `game.yaml`, `assignment.yaml`)
   - Define which roles can perform which actions on each resource
   - Format:
   ```yaml
   apiVersion: api.cerbos.dev/v1
   resourcePolicy:
     version: default
     resource: user
     rules:
       - actions: [view, create, update, delete, manage]
         effect: EFFECT_ALLOW
         roles: [admin, super_admin]
   ```

2. **Derived Roles** (`common_roles.yaml`)
   - Contextual roles based on conditions (owner, same_organization, same_region, etc.)

3. **Principal Policies** (e.g., `super_admin.yaml`)
   - Full access policies for specific principals

---

## Current Problem

The existing backend **modifies YAML files** directly in the `cerbos/policies/` directory, but we have now configured Cerbos to use **PostgreSQL storage** with the `cerbos` schema.

**These approaches are incompatible:**
- **File-based**: Policies stored as YAML files, mounted into container
- **Database-based**: Policies stored in PostgreSQL `cerbos.policy` table

### Current Cerbos Configuration

**File**: `/cerbos/config/config.yaml`
```yaml
storage:
  driver: "postgres"
  postgres:
    url: "${CERBOS_DB_URL}"
```

**Docker Compose Environment**:
```
CERBOS_DB_URL=postgres://postgres:postgres123@host.docker.internal:5432/sports_management?sslmode=disable&search_path=cerbos
```

### Database Schema (Already Created)

**Schema**: `cerbos`

| Table | Purpose |
|-------|---------|
| `policy` | Main policy storage (id, kind, name, version, scope, description, disabled, definition) |
| `policy_dependency` | Policy dependencies tracking |
| `policy_ancestor` | Policy ancestors for derived roles |
| `policy_revision` | Audit trail of policy changes |
| `attr_schema_defs` | Attribute schema definitions |

---

## What Needs to Be Implemented

### 1. Modify Backend APIs to Use Cerbos Admin API

The backend currently reads/writes YAML files. It needs to be updated to:
- Use Cerbos Admin API (HTTP on port 3592 or gRPC on port 3593)
- Upload policies via `PUT /admin/policy` endpoint
- Read policies via Admin API or directly from database

### 2. Key Files to Modify

1. **`backend/src/routes/admin/unified-roles.ts`**
   - Replace file-based policy reading with Cerbos Admin API calls
   - Replace file-based policy writing with Admin API uploads

2. **`backend/src/services/CerbosPolicyAdminService.ts`** (already exists)
   - This service was created for Admin API interaction
   - Needs to be fully implemented and used

3. **`backend/src/routes/admin/cerbos-policies.ts`**
   - Already has some Admin API integration
   - Needs to be enhanced for full CRUD operations

### 3. Admin API Endpoints to Use

| Operation | Method | Endpoint | Auth |
|-----------|--------|----------|------|
| Upload policies | PUT | `http://localhost:3592/admin/policy` | Basic auth (cerbos:cerbosAdmin) |
| List policies | GET | `http://localhost:3592/admin/v1/policies` | Basic auth |
| Delete policy | DELETE | `http://localhost:3592/admin/policy` | Basic auth |

**Example Upload Request**:
```javascript
const auth = Buffer.from('cerbos:cerbosAdmin').toString('base64');
const response = await fetch('http://localhost:3592/admin/policy', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${auth}`
  },
  body: JSON.stringify({ policies: [policyObject] })
});
```

### 4. Policy Format for Upload

When creating/updating a role, generate a policy object like:
```javascript
{
  apiVersion: "api.cerbos.dev/v1",
  resourcePolicy: {
    version: "default",
    resource: "user",  // or other resource
    rules: [
      {
        actions: ["view", "create", "update"],
        effect: "EFFECT_ALLOW",
        roles: ["custom_role_name"]
      }
    ]
  }
}
```

### 5. Implementation Steps

1. **Create a CerbosAdminClient service**
   - Methods: `uploadPolicy()`, `listPolicies()`, `deletePolicy()`, `getPolicy()`
   - Handle authentication and error handling

2. **Update unified-roles.ts**
   - `POST /api/admin/roles`: Generate and upload Cerbos policies via Admin API
   - `PUT /api/admin/roles/:name`: Update policies via Admin API
   - `DELETE /api/admin/roles/:name`: Delete policies via Admin API
   - `GET /api/admin/unified-roles`: Read from database or Admin API

3. **Sync derived roles**
   - When a new role is created, update `common_roles.yaml` equivalent in database
   - Add the role to appropriate derived role conditions

4. **Database metadata sync**
   - Keep `roles` table for metadata (color, description, user counts)
   - Cerbos stores actual permissions/policies

---

## Frontend API Client Methods

**File**: `/frontend/lib/api.ts`

```typescript
// Existing methods that will continue to work:
getUnifiedRoles()
getUnifiedRole(name: string)
createUnifiedRole(roleData: { name, description, permissions, color })
updateUnifiedRole(name: string, roleData: { description, permissions, color })
deleteUnifiedRole(name: string, force?: boolean)
getPermissions()
getPermissionsByCategory(category: string)
```

The frontend should not need changes - only the backend implementation needs updating.

---

## Testing

After implementation, test these scenarios:

1. **Create a new role** via frontend
   - Verify policy appears in `cerbos.policy` table
   - Verify Cerbos returns correct permissions for the role

2. **Update role permissions** via frontend
   - Verify policy is updated in database
   - Verify Cerbos enforces new permissions immediately

3. **Delete a role** via frontend
   - Verify policy is removed from database
   - Verify Cerbos no longer recognizes the role

4. **Permission checks work**
   ```bash
   curl -X POST http://localhost:3592/api/check/resources \
     -H "Content-Type: application/json" \
     -d '{
       "principal": {"id": "user1", "roles": ["custom_role"]},
       "resources": [{"kind": "game", "id": "1", "actions": ["view"]}]
     }'
   ```

---

## Current Status

- [x] Cerbos running with PostgreSQL storage
- [x] Database schema created (`cerbos.policy`, etc.)
- [x] 44 policies uploaded to Cerbos (via Admin API, in memory)
- [ ] Policies NOT persisting to database (Admin API uploads work but don't persist)
- [ ] Backend still using file-based approach
- [ ] Need to implement Admin API integration in backend

---

## Key Files Reference

### Backend
- `/backend/src/routes/admin/unified-roles.ts` - Main role CRUD API
- `/backend/src/routes/admin/permissions.ts` - Permissions list API
- `/backend/src/routes/admin/cerbos-policies.ts` - Cerbos admin API routes
- `/backend/src/services/CerbosPolicyAdminService.ts` - Admin service (needs enhancement)
- `/backend/src/services/CerbosAuthService.ts` - Auth checks using Cerbos

### Frontend
- `/frontend/components/admin/access-control/UnifiedAccessControlDashboard.tsx`
- `/frontend/components/admin/access-control/RoleManagementDashboard.tsx`
- `/frontend/components/admin/access-control/UnifiedRoleEditor.tsx`
- `/frontend/lib/api.ts` - API client
- `/frontend/lib/rbac-config.ts` - RBAC configuration

### Cerbos
- `/cerbos/config/config.yaml` - Cerbos server config
- `/cerbos/policies/` - YAML policy files (legacy, for reference)
- `/database-init/01-cerbos-schema.sql` - Database schema

### Docker
- `/config/docker/docker-compose.cerbos.yml` - Cerbos container config
