# Cerbos-Only Migration Plan

## Executive Summary

Migrate from dual authorization system (Legacy RBAC + Cerbos) to **Cerbos-only** architecture while maintaining all UI functionality for role/permission management.

**Timeline**: 10-15 days
**Risk Level**: Medium (extensive testing required)
**Rollback Plan**: Git branch with feature flags

---

## Current Architecture

### 1. Legacy RBAC System
**Database Tables:**
- `roles` - Role metadata (name, description, color, etc.)
- `permissions` - Permission definitions (name, category, risk_level)
- `role_permissions` - Many-to-many mapping
- `user_roles` - User role assignments

**Routes:** 63 routes using `requirePermission()`, `requireRole()`, `requireAnyPermission()`

**Key Routes:**
- `/api/admin/roles` - Full CRUD
- `/api/admin/permissions` - Full CRUD
- `/api/admin/users` - User role management

### 2. Cerbos System
**Policy Files:** (YAML in `cerbos-policies/`)
- `resources/game.yaml` - 5 actions (list, view, create, update, delete)
- `resources/assignment.yaml` - Assignment permissions
- `resources/referee.yaml` - Referee permissions
- `derived_roles/common_roles.yaml` - owner, same_organization, same_region

**Routes:** 7 game routes using `requireCerbosPermission()`

**Roles Supported:** admin, assignor, referee, guest

---

## Target Architecture: Cerbos-Only

### What Stays in Database

#### 1. `roles` Table (Keep - Metadata Only)
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  code VARCHAR(20),         -- Maps to Cerbos role name
  category VARCHAR(30),
  color VARCHAR(7),         -- For UI display
  is_system BOOLEAN,        -- Cannot be deleted
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```
**Purpose:** Store role metadata for UI display, but NOT permissions

#### 2. `user_roles` Table (Keep - User Assignment)
```sql
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES roles(id),
  assigned_at TIMESTAMPTZ,
  assigned_by UUID,
  PRIMARY KEY (user_id, role_id)
);
```
**Purpose:** Track which users have which roles (Cerbos doesn't store this)

### What Gets Removed

#### 1. `permissions` Table (Delete - Replaced by Cerbos)
- Permissions now defined in Cerbos policy files as "actions"
- No longer in database

#### 2. `role_permissions` Table (Delete - Replaced by Cerbos)
- Role-to-permission mapping now in Cerbos policy rules
- No longer in database

---

## New Cerbos Policy Management System

### Problem
Cerbos policies are YAML files on disk. Need REST API to manage them from UI.

### Solution: Policy Management Service

#### API Endpoints

##### 1. Resource Management
```
GET    /api/cerbos/resources           - List all resources
GET    /api/cerbos/resources/:kind     - Get resource policy
POST   /api/cerbos/resources           - Create new resource
PUT    /api/cerbos/resources/:kind     - Update resource policy
DELETE /api/cerbos/resources/:kind     - Delete resource policy
```

##### 2. Action Management (Permissions)
```
GET    /api/cerbos/resources/:kind/actions        - List actions for resource
POST   /api/cerbos/resources/:kind/actions        - Add action to resource
DELETE /api/cerbos/resources/:kind/actions/:name  - Remove action
```

##### 3. Role Rules Management
```
GET    /api/cerbos/resources/:kind/roles/:role    - Get role rules
PUT    /api/cerbos/resources/:kind/roles/:role    - Update role rules
```

##### 4. Policy Reload
```
POST   /api/cerbos/reload - Reload Cerbos policies (after changes)
```

#### Example: Creating a Permission

**Old Way (Legacy RBAC):**
```http
POST /api/admin/permissions
{
  "name": "games:assign",
  "description": "Assign referees to games",
  "category": "games",
  "risk_level": "medium"
}
```

**New Way (Cerbos):**
```http
POST /api/cerbos/resources/game/actions
{
  "action": "assign",
  "description": "Assign referees to games",
  "roles": {
    "admin": { "effect": "EFFECT_ALLOW" },
    "assignor": {
      "effect": "EFFECT_ALLOW",
      "condition": "R.attr.organizationId == P.attr.organizationId"
    },
    "referee": { "effect": "EFFECT_DENY" },
    "guest": { "effect": "EFFECT_DENY" }
  }
}
```

This creates/updates `cerbos-policies/resources/game.yaml`:
```yaml
resourcePolicy:
  resource: "game"
  version: "default"
  rules:
    - actions: ["assign"]
      effect: EFFECT_ALLOW
      roles: ["admin"]

    - actions: ["assign"]
      effect: EFFECT_ALLOW
      roles: ["assignor"]
      condition:
        match:
          expr: R.attr.organizationId == P.attr.organizationId

    - actions: ["assign"]
      effect: EFFECT_DENY
      roles: ["referee", "guest"]
```

---

## Frontend Changes

### 1. Access Control Dashboard

**Current UI:**
- Roles tab: Create/edit/delete roles ✓ (no change - still uses roles table)
- Permissions tab: Create/edit/delete permissions ✗ (needs update)
- User Management: Assign roles to users ✓ (no change - still uses user_roles)

**Changes Needed:**

#### Permissions Tab Redesign
Instead of flat permission list, show hierarchical structure:

```
Game Permissions
  ├─ list: View game list
  ├─ view: View game details
  ├─ create: Create new games
  ├─ update: Update game info
  ├─ delete: Delete games
  └─ assign: Assign referees

Assignment Permissions
  ├─ list: View assignments
  ├─ create: Create assignments
  └─ ...

Referee Permissions
  ├─ list: View referees
  └─ ...
```

#### Role Permission Assignment
Instead of selecting permissions from list, configure rules:

**Old UI:**
```
Role: Assignor
Permissions: [x] games:create [x] games:update [ ] games:delete
```

**New UI:**
```
Role: Assignor
Resource: Game
  Action: create
    ○ Allow
    ○ Deny
    ● Conditional
    Condition: R.attr.organizationId == P.attr.organizationId

  Action: update
    ○ Allow
    ○ Deny
    ● Conditional
    Condition: R.attr.organizationId == P.attr.organizationId
```

### 2. API Client Updates

Update frontend API calls:

**Before:**
```typescript
// Get all permissions
const perms = await api.get('/api/admin/permissions');

// Assign permission to role
await api.post(`/api/admin/roles/${roleId}/permissions`, {
  permission_ids: ['perm-uuid-1', 'perm-uuid-2']
});
```

**After:**
```typescript
// Get all actions across all resources
const resources = await api.get('/api/cerbos/resources');
const actions = resources.flatMap(r =>
  r.actions.map(a => ({ resource: r.kind, action: a.name }))
);

// Configure role rules for resource actions
await api.put(`/api/cerbos/resources/game/roles/assignor`, {
  actions: {
    create: {
      effect: 'EFFECT_ALLOW',
      condition: 'R.attr.organizationId == P.attr.organizationId'
    },
    update: {
      effect: 'EFFECT_ALLOW',
      condition: 'R.attr.organizationId == P.attr.organizationId'
    }
  }
});

// Reload Cerbos
await api.post('/api/cerbos/reload');
```

---

## Migration Phases

### Phase 1: Build Cerbos Policy Management API (3-4 days)

**Tasks:**
1. Create `CerbosPolicyService` class
   - Read/write YAML policy files
   - Parse and modify policy structures
   - Validate policy syntax
2. Create `/api/cerbos/*` routes
3. Add Cerbos reload endpoint (using HTTP API or docker restart)
4. Write comprehensive tests

**Deliverable:** Working API to manage Cerbos policies

### Phase 2: Migrate Existing Policies (2 days)

**Tasks:**
1. Export current permissions from database
2. Map to Cerbos resources and actions
3. Create policy files for all resources:
   - game, assignment, referee (already exist)
   - user, organization, region (new)
   - expense, budget, communication, document (new)
   - role, permission (new - for admin management)
4. Map role-permission relationships to Cerbos rules

**Example Migration:**

**Database:**
```sql
-- Role: Assignor
-- Permissions: games:create, games:update, assignments:create

-- Role: Referee
-- Permissions: games:view, assignments:view, availability:manage
```

**Cerbos:**
```yaml
# game.yaml
resourcePolicy:
  resource: "game"
  rules:
    - actions: ["create", "update"]
      roles: ["admin", "assignor"]
      effect: EFFECT_ALLOW

    - actions: ["view"]
      roles: ["admin", "assignor", "referee"]
      effect: EFFECT_ALLOW
```

```yaml
# assignment.yaml
resourcePolicy:
  resource: "assignment"
  rules:
    - actions: ["create"]
      roles: ["admin", "assignor"]
      effect: EFFECT_ALLOW

    - actions: ["view"]
      roles: ["admin", "assignor", "referee"]
      effect: EFFECT_ALLOW
```

### Phase 3: Migrate All Routes to Cerbos (4-5 days)

**Currently:** 63 routes using legacy middleware
**Target:** All routes using `requireCerbosPermission()`

**Route Migration Pattern:**

**Before:**
```typescript
router.post('/',
  authenticateToken,
  requirePermission('assignments:create'),
  createAssignment
);
```

**After:**
```typescript
router.post('/',
  authenticateToken,
  requireCerbosPermission({
    resource: 'assignment',
    action: 'create',
  }),
  createAssignment
);
```

**Routes by Priority:**
1. **High**: Admin routes (roles, users, permissions)
2. **High**: Core features (games, assignments, referees)
3. **Medium**: Financial routes (expenses, budgets, transactions)
4. **Medium**: Communication routes (posts, communications)
5. **Low**: Utility routes (documents, assets, reports)

### Phase 4: Update Frontend UI (3-4 days)

**Tasks:**
1. Update `UnifiedAccessControlDashboard.tsx`
   - Redesign permissions tab to show resource/action hierarchy
   - Update role permission assignment UI
   - Add policy reload button
2. Update API client
3. Add real-time policy validation
4. Add policy preview before saving

**UI Components:**
- `ResourceActionTree` - Hierarchical display of resources/actions
- `RoleRuleEditor` - Configure allow/deny/conditional rules
- `PolicyPreview` - Show generated YAML before saving

### Phase 5: Database Cleanup (1 day)

**Tasks:**
1. Create migration script to:
   - Export data for backup
   - Drop `permissions` table
   - Drop `role_permissions` table
   - Keep `roles` and `user_roles` tables
2. Update database schema documentation
3. Remove legacy RBAC middleware code
4. Remove `PermissionService` and related code

### Phase 6: Testing & Validation (2-3 days)

**Test Scenarios:**
1. **Role Management**
   - Create new role → Should create role in DB
   - Delete role → Should remove from DB and all policy files
   - Assign role to user → Should update user_roles table

2. **Permission Management**
   - Create new action → Should update Cerbos policy file
   - Assign action to role → Should update role rules in policy
   - Remove action from role → Should update policy file

3. **Authorization**
   - Test all 63 routes with different roles
   - Verify organizational boundaries
   - Test conditional rules

4. **UI Functionality**
   - Create role through UI
   - Assign permissions through UI
   - Verify Cerbos reload happens automatically

---

## Risk Mitigation

### 1. Feature Flags
```typescript
const USE_CERBOS_ONLY = process.env.USE_CERBOS_ONLY === 'true';

if (USE_CERBOS_ONLY) {
  router.use(requireCerbosPermission({ resource, action }));
} else {
  router.use(requirePermission(permission));
}
```

### 2. Gradual Rollout
- Phase 3: Migrate routes one by one, test each
- Run both systems in parallel initially
- Switch routes gradually with feature flags

### 3. Data Backup
```bash
# Backup before migration
pg_dump sports_management > backup_before_cerbos_migration.sql

# Export legacy permissions
node scripts/export-legacy-permissions.js > legacy_permissions.json
```

### 4. Rollback Plan
```bash
# If migration fails, rollback:
git checkout main
psql sports_management < backup_before_cerbos_migration.sql
docker-compose down
docker-compose up -d
```

---

## Technical Considerations

### 1. Policy File Hot Reload

Cerbos supports watching policy files for changes:
```yaml
# .cerbos.yaml
storage:
  driver: "disk"
  disk:
    directory: /policies
    watchForChanges: true  # ← Auto-reload on file changes
```

After writing policy file, Cerbos automatically reloads (1-2 second delay).

### 2. Atomic Policy Updates

When updating policies, use atomic file writes:
```typescript
// Write to temp file first
fs.writeFileSync(`${policyPath}.tmp`, yamlContent);
// Rename atomically
fs.renameSync(`${policyPath}.tmp`, policyPath);
```

### 3. Policy Validation

Before writing policy files, validate with Cerbos:
```typescript
const validatePolicy = async (yamlContent: string) => {
  const response = await fetch('http://localhost:3592/_cerbos/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/yaml' },
    body: yamlContent
  });
  return response.ok;
};
```

### 4. Transaction Management

Policy updates aren't transactional. If multi-file update fails:
```typescript
// Pattern: Update all, rollback on error
const backups = new Map();
try {
  for (const policy of policiesToUpdate) {
    backups.set(policy.path, fs.readFileSync(policy.path));
    fs.writeFileSync(policy.path, policy.newContent);
  }
} catch (error) {
  // Rollback all changes
  for (const [path, content] of backups) {
    fs.writeFileSync(path, content);
  }
  throw error;
}
```

---

## Benefits of Cerbos-Only Architecture

### 1. Single Source of Truth
- All authorization logic in Cerbos policies
- No sync issues between DB and Cerbos
- Easier to audit and review

### 2. More Expressive Permissions
```yaml
# Conditional rules based on attributes
condition:
  match:
    all:
      of:
        - expr: R.attr.organizationId == P.attr.organizationId
        - expr: R.attr.status == "pending"
        - expr: P.attr.regionIds.contains(R.attr.regionId)
```

### 3. Policy-as-Code
- Policies in Git
- Version controlled
- Code review for permission changes
- Rollback to previous policy versions

### 4. Better Testing
```yaml
# Cerbos test files (tests/game_tests.yaml)
name: Game Permissions Test
tests:
  - name: Admin can create games
    input:
      principal:
        id: user-1
        roles: ["admin"]
      resource:
        kind: game
        id: game-1
      actions: ["create"]
    expected:
      - action: create
        effect: EFFECT_ALLOW
```

### 5. Separation of Concerns
- **Database**: User data, role metadata, role assignments
- **Cerbos**: Authorization rules and policies
- Clear boundaries

---

## Post-Migration

### 1. Documentation Updates
- Update API documentation
- Document new policy management workflow
- Create admin user guide for new UI

### 2. Performance Monitoring
- Monitor Cerbos response times
- Track policy reload frequency
- Watch for slow authorization checks

### 3. Ongoing Maintenance
- Regular policy audits
- Remove unused actions/resources
- Optimize complex conditions

---

## Next Steps

Ready to proceed? Here's how we'll start:

1. **Approve Plan**: Review and approve this migration plan
2. **Create Branch**: `git checkout -b feat/cerbos-only-migration`
3. **Phase 1**: Start building Cerbos Policy Management API
4. **Daily Check-ins**: Review progress, adjust timeline

**Estimated Total Time**: 10-15 days
**Recommended Approach**: Full-time focus OR 2-3 weeks part-time

Let me know when you're ready to begin!