# RBAC Implementation - Phase 1: Database Foundation

## Context
You are implementing a Role-Based Access Control (RBAC) system for a sports management application. The current system has hardcoded `admin` and `referee` roles that need to be replaced with a flexible, database-driven permission system.

## Current State
- The application uses PostgreSQL database with Knex.js for migrations
- Current `users` table has a hardcoded `role` field with values 'admin' or 'referee'
- Authentication uses JWT tokens with role information
- Backend is Express.js with existing middleware for `authenticateToken` and `requireRole`

## Your Task: Implement Phase 1 - Database Foundation

### 1. Create Database Migration
Create a new Knex migration file in `backend/migrations/` that:

**Creates these tables:**

```sql
-- Roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color for UI
    is_system BOOLEAN DEFAULT false, -- System roles can't be deleted
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50), -- e.g., 'games', 'referees', 'reports'
    resource VARCHAR(100), -- e.g., 'games', 'assignments', 'users'
    action VARCHAR(50), -- e.g., 'create', 'read', 'update', 'delete'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role permissions mapping
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id),
    UNIQUE(role_id, permission_id)
);

-- User roles mapping (many-to-many)
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- Optional role expiration
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id)
);

-- Add indexes for performance
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);
```

### 2. Create Seed Data
Create a seed file in `backend/seeds/` that inserts:

**Default Permissions:**
```javascript
const permissions = [
  // Games
  { name: 'games:create', category: 'games', resource: 'games', action: 'create', description: 'Create new games' },
  { name: 'games:read', category: 'games', resource: 'games', action: 'read', description: 'View games' },
  { name: 'games:update', category: 'games', resource: 'games', action: 'update', description: 'Update games' },
  { name: 'games:delete', category: 'games', resource: 'games', action: 'delete', description: 'Delete games' },
  
  // Assignments
  { name: 'assignments:create', category: 'assignments', resource: 'assignments', action: 'create', description: 'Create game assignments' },
  { name: 'assignments:read', category: 'assignments', resource: 'assignments', action: 'read', description: 'View assignments' },
  { name: 'assignments:update', category: 'assignments', resource: 'assignments', action: 'update', description: 'Update assignments' },
  { name: 'assignments:delete', category: 'assignments', resource: 'assignments', action: 'delete', description: 'Delete assignments' },
  
  // Referees
  { name: 'referees:read', category: 'referees', resource: 'referees', action: 'read', description: 'View referee information' },
  { name: 'referees:update', category: 'referees', resource: 'referees', action: 'update', description: 'Update referee information' },
  { name: 'referees:delete', category: 'referees', resource: 'referees', action: 'delete', description: 'Delete referees' },
  
  // Reports
  { name: 'reports:read', category: 'reports', resource: 'reports', action: 'read', description: 'View reports' },
  { name: 'reports:create', category: 'reports', resource: 'reports', action: 'create', description: 'Create reports' },
  
  // Settings
  { name: 'settings:read', category: 'settings', resource: 'settings', action: 'read', description: 'View settings' },
  { name: 'settings:update', category: 'settings', resource: 'settings', action: 'update', description: 'Update settings' },
  
  // Profile
  { name: 'profile:update', category: 'profile', resource: 'profile', action: 'update', description: 'Update own profile' },
  
  // Availability
  { name: 'availability:create', category: 'availability', resource: 'availability', action: 'create', description: 'Set availability' },
  { name: 'availability:read', category: 'availability', resource: 'availability', action: 'read', description: 'View availability' },
  { name: 'availability:update', category: 'availability', resource: 'availability', action: 'update', description: 'Update availability' },
];
```

**Default Roles with Permissions:**
```javascript
const roles = [
  {
    name: 'Super Admin',
    description: 'Full system access',
    is_system: true,
    permissions: ['*'] // Special wildcard
  },
  {
    name: 'Admin',
    description: 'Organization administrator',
    is_system: true,
    permissions: [
      'games:create', 'games:read', 'games:update', 'games:delete',
      'assignments:create', 'assignments:read', 'assignments:update', 'assignments:delete',
      'referees:read', 'referees:update',
      'reports:read', 'reports:create',
      'settings:read', 'settings:update'
    ]
  },
  {
    name: 'Referee',
    description: 'Basic referee account',
    is_system: true,
    permissions: [
      'assignments:read',
      'availability:create', 'availability:read', 'availability:update',
      'profile:update'
    ]
  }
];
```

### 3. Create Migration Script
Create `backend/scripts/migrate_existing_users_to_rbac.js` that:
- Finds all existing users
- Maps users with `role: 'admin'` to the new 'Admin' role
- Maps users with `role: 'referee'` to the new 'Referee' role
- Creates entries in the `user_roles` table
- Does NOT delete the old `role` column yet (for backward compatibility)

### 4. Create Tests
Create test file `backend/tests/rbac/rbac-migration.test.js` that verifies:
- Tables are created correctly
- Permissions are seeded properly
- Roles are created with correct permissions
- Existing users are migrated correctly
- Backward compatibility is maintained

### 5. Update Database Schema Documentation
Update `database-schema-changes.md` with:
- New tables added
- Relationships defined
- Migration notes
- Backward compatibility approach

## Important Notes
1. **DO NOT** remove or modify the existing `role` column in the users table yet
2. **Ensure** all migrations are reversible (include down() methods)
3. **Test** the migration with both empty and populated databases
4. **Maintain** backward compatibility - the old system must still work
5. **Use transactions** for all data modifications to ensure consistency

## Success Criteria
- [ ] Migration creates all 4 new tables
- [ ] Seed data populates permissions and roles
- [ ] Existing users are migrated to new role system
- [ ] Tests pass with 100% coverage
- [ ] Old authentication still works (backward compatible)
- [ ] Migration is reversible
- [ ] No breaking changes to existing functionality

## Files You Should Create/Modify
1. `backend/migrations/[timestamp]_create_rbac_tables.js` - New migration
2. `backend/seeds/01_rbac_permissions_and_roles.js` - Seed data
3. `backend/scripts/migrate_existing_users_to_rbac.js` - User migration script
4. `backend/tests/rbac/rbac-migration.test.js` - Tests
5. `database-schema-changes.md` - Documentation update

## Next Steps After Completion
Once Phase 1 is complete and tested, Phase 2 will implement the backend API layer for managing roles and permissions programmatically.