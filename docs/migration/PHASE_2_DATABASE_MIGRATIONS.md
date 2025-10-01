# Phase 2: Database Migrations Documentation
**Duration**: 45 minutes
**Goal**: Implement the base + secondary referee role architecture in the database

## Overview
This phase creates the referee role structure with a base "Referee" role that all referees have, plus secondary specialization roles for different referee levels. This eliminates the need for the `is_referee` flag and the missing `user_referee_roles` table.

---

## Migration 2.1: Create Referee Roles

### File Location
Create new migration file: `/backend/src/migrations/[timestamp]_create_referee_roles.ts`

### Migration Code
```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Step 1: Insert base and secondary referee roles
  const roles = [
    {
      name: 'Referee',
      description: 'Base role for all referees',
      is_system: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Rookie Referee',
      description: 'New referee with limited permissions',
      is_system: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Junior Referee',
      description: 'Standard referee',
      is_system: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Senior Referee',
      description: 'Experienced referee with mentoring capabilities',
      is_system: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Head Referee',
      description: 'Lead referee with management permissions',
      is_system: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Referee Coach',
      description: 'Referee trainer and evaluator',
      is_system: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ];

  // Insert roles if they don't exist
  for (const role of roles) {
    const existing = await knex('roles').where('name', role.name).first();
    if (!existing) {
      await knex('roles').insert(role);
    }
  }

  console.log('✅ Referee roles created');
}

export async function down(knex: Knex): Promise<void> {
  // Remove the referee roles
  await knex('roles')
    .whereIn('name', [
      'Referee',
      'Rookie Referee',
      'Junior Referee',
      'Senior Referee',
      'Head Referee',
      'Referee Coach'
    ])
    .delete();
}
```

---

## Migration 2.2: Create Referee Permissions

### File Location
Create new migration file: `/backend/src/migrations/[timestamp]_create_referee_permissions.ts`

### Migration Code
```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Define permissions for referee operations
  const permissions = [
    // Base referee permissions
    {
      name: 'games.view',
      resource: 'games',
      action: 'view',
      description: 'View game assignments',
      created_at: knex.fn.now()
    },
    {
      name: 'assignments.view',
      resource: 'assignments',
      action: 'view',
      description: 'View own assignments',
      created_at: knex.fn.now()
    },
    {
      name: 'assignments.accept',
      resource: 'assignments',
      action: 'accept',
      description: 'Accept or decline assignments',
      created_at: knex.fn.now()
    },
    {
      name: 'profile.edit.own',
      resource: 'profile',
      action: 'edit',
      description: 'Edit own referee profile',
      created_at: knex.fn.now()
    },

    // Advanced referee permissions
    {
      name: 'games.self_assign',
      resource: 'games',
      action: 'self_assign',
      description: 'Self-assign to open games',
      created_at: knex.fn.now()
    },
    {
      name: 'mentorship.request',
      resource: 'mentorship',
      action: 'request',
      description: 'Request mentorship',
      created_at: knex.fn.now()
    },
    {
      name: 'mentorship.provide',
      resource: 'mentorship',
      action: 'provide',
      description: 'Act as mentor',
      created_at: knex.fn.now()
    },
    {
      name: 'evaluations.create',
      resource: 'evaluations',
      action: 'create',
      description: 'Evaluate other referees',
      created_at: knex.fn.now()
    },
    {
      name: 'evaluations.view.own',
      resource: 'evaluations',
      action: 'view',
      description: 'View own evaluations',
      created_at: knex.fn.now()
    },
    {
      name: 'evaluations.manage',
      resource: 'evaluations',
      action: 'manage',
      description: 'Manage all evaluations',
      created_at: knex.fn.now()
    },
    {
      name: 'games.recommend',
      resource: 'games',
      action: 'recommend',
      description: 'Recommend referees for games',
      created_at: knex.fn.now()
    },
    {
      name: 'assignments.approve.junior',
      resource: 'assignments',
      action: 'approve',
      description: 'Approve junior referee assignments',
      created_at: knex.fn.now()
    },
    {
      name: 'referees.manage',
      resource: 'referees',
      action: 'manage',
      description: 'Full referee management',
      created_at: knex.fn.now()
    },
    {
      name: 'assignments.override',
      resource: 'assignments',
      action: 'override',
      description: 'Override any assignment',
      created_at: knex.fn.now()
    },
    {
      name: 'training.create',
      resource: 'training',
      action: 'create',
      description: 'Create training materials',
      created_at: knex.fn.now()
    },
    {
      name: 'certifications.approve',
      resource: 'certifications',
      action: 'approve',
      description: 'Approve certifications',
      created_at: knex.fn.now()
    }
  ];

  // Insert permissions if they don't exist
  for (const permission of permissions) {
    const existing = await knex('permissions').where('name', permission.name).first();
    if (!existing) {
      await knex('permissions').insert(permission);
    }
  }

  console.log('✅ Referee permissions created');
}

export async function down(knex: Knex): Promise<void> {
  // Remove referee-specific permissions
  await knex('permissions')
    .where('resource', 'IN', [
      'games',
      'assignments',
      'mentorship',
      'evaluations',
      'referees',
      'training',
      'certifications'
    ])
    .delete();
}
```

---

## Migration 2.3: Assign Permissions to Roles

### File Location
Create new migration file: `/backend/src/migrations/[timestamp]_assign_referee_permissions.ts`

### Migration Code
```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Helper function to assign permission to role
  async function assignPermission(roleName: string, permissionName: string) {
    const role = await knex('roles').where('name', roleName).first();
    const permission = await knex('permissions').where('name', permissionName).first();

    if (role && permission) {
      const existing = await knex('role_permissions')
        .where({ role_id: role.id, permission_id: permission.id })
        .first();

      if (!existing) {
        await knex('role_permissions').insert({
          role_id: role.id,
          permission_id: permission.id,
          created_at: knex.fn.now()
        });
      }
    }
  }

  // Base Referee role permissions (all referees get these)
  const basePermissions = [
    'games.view',
    'assignments.view',
    'assignments.accept',
    'profile.edit.own'
  ];

  for (const perm of basePermissions) {
    await assignPermission('Referee', perm);
  }

  // Rookie Referee additional permissions
  await assignPermission('Rookie Referee', 'mentorship.request');
  await assignPermission('Rookie Referee', 'evaluations.view.own');

  // Junior Referee additional permissions
  await assignPermission('Junior Referee', 'games.self_assign');
  await assignPermission('Junior Referee', 'evaluations.view.own');

  // Senior Referee additional permissions
  const seniorPermissions = [
    'mentorship.provide',
    'evaluations.create',
    'games.recommend',
    'assignments.approve.junior'
  ];

  for (const perm of seniorPermissions) {
    await assignPermission('Senior Referee', perm);
  }

  // Head Referee additional permissions
  const headPermissions = [
    'referees.manage',
    'assignments.override',
    'evaluations.manage',
    ...seniorPermissions // Inherits senior permissions
  ];

  for (const perm of headPermissions) {
    await assignPermission('Head Referee', perm);
  }

  // Referee Coach permissions
  const coachPermissions = [
    'evaluations.create',
    'evaluations.manage',
    'training.create',
    'certifications.approve',
    'mentorship.provide'
  ];

  for (const perm of coachPermissions) {
    await assignPermission('Referee Coach', perm);
  }

  console.log('✅ Permissions assigned to referee roles');
}

export async function down(knex: Knex): Promise<void> {
  // Get referee role IDs
  const refereeRoles = await knex('roles')
    .whereIn('name', [
      'Referee',
      'Rookie Referee',
      'Junior Referee',
      'Senior Referee',
      'Head Referee',
      'Referee Coach'
    ])
    .select('id');

  const roleIds = refereeRoles.map(r => r.id);

  // Remove all permission assignments for these roles
  if (roleIds.length > 0) {
    await knex('role_permissions')
      .whereIn('role_id', roleIds)
      .delete();
  }
}
```

---

## Migration 2.4: Migrate Existing Users to New Role System

### File Location
Create new migration file: `/backend/src/migrations/[timestamp]_migrate_existing_referees.ts`

### Migration Code
```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Starting migration of existing users to referee roles...');

  // Get the admin user for assigning roles
  const adminUser = await knex('users')
    .where('email', 'admin@cmba.ca')
    .first();

  const assignedBy = adminUser?.id || null;

  // Get role IDs
  const refereeRole = await knex('roles').where('name', 'Referee').first();
  const juniorRole = await knex('roles').where('name', 'Junior Referee').first();
  const seniorRole = await knex('roles').where('name', 'Senior Referee').first();

  if (!refereeRole) {
    throw new Error('Referee role not found. Run previous migration first.');
  }

  // Step 1: Find all users who are referees based on legacy role field
  const refereeUsers = await knex('users')
    .where('role', 'referee')
    .orWhere('role', 'Referee')
    .select('id', 'white_whistle', 'email', 'name');

  console.log(`Found ${refereeUsers.length} referee users to migrate`);

  // Step 2: Assign base Referee role to all referee users
  for (const user of refereeUsers) {
    // Check if user already has the base referee role
    const existingRole = await knex('user_roles')
      .where({
        user_id: user.id,
        role_id: refereeRole.id
      })
      .first();

    if (!existingRole) {
      await knex('user_roles').insert({
        user_id: user.id,
        role_id: refereeRole.id,
        assigned_at: knex.fn.now(),
        assigned_by: assignedBy
      });
      console.log(`✅ Assigned Referee role to ${user.email}`);
    }

    // Step 3: Assign secondary role based on white_whistle or other criteria
    let secondaryRoleId = juniorRole?.id; // Default to Junior

    // If white_whistle is true, they're a Senior Referee
    if (user.white_whistle === true && seniorRole) {
      secondaryRoleId = seniorRole.id;
    }

    if (secondaryRoleId) {
      const existingSecondary = await knex('user_roles')
        .where({
          user_id: user.id,
          role_id: secondaryRoleId
        })
        .first();

      if (!existingSecondary) {
        await knex('user_roles').insert({
          user_id: user.id,
          role_id: secondaryRoleId,
          assigned_at: knex.fn.now(),
          assigned_by: assignedBy
        });

        const roleName = user.white_whistle ? 'Senior Referee' : 'Junior Referee';
        console.log(`✅ Assigned ${roleName} role to ${user.email}`);
      }
    }
  }

  // Step 4: Check for users in the referees table who might not have the role
  const refereesTableExists = await knex.schema.hasTable('referees');
  if (refereesTableExists) {
    const refereesInTable = await knex('referees').select('user_id');

    for (const ref of refereesInTable) {
      const existingRole = await knex('user_roles')
        .where({
          user_id: ref.user_id,
          role_id: refereeRole.id
        })
        .first();

      if (!existingRole) {
        await knex('user_roles').insert({
          user_id: ref.user_id,
          role_id: refereeRole.id,
          assigned_at: knex.fn.now(),
          assigned_by: assignedBy
        });

        // Also assign Junior as default secondary
        if (juniorRole) {
          await knex('user_roles').insert({
            user_id: ref.user_id,
            role_id: juniorRole.id,
            assigned_at: knex.fn.now(),
            assigned_by: assignedBy
          });
        }

        console.log(`✅ Migrated referee from referees table: ${ref.user_id}`);
      }
    }
  }

  console.log('✅ Migration of existing referees completed');
}

export async function down(knex: Knex): Promise<void> {
  // Get referee role IDs
  const refereeRoles = await knex('roles')
    .whereIn('name', [
      'Referee',
      'Rookie Referee',
      'Junior Referee',
      'Senior Referee',
      'Head Referee',
      'Referee Coach'
    ])
    .select('id');

  const roleIds = refereeRoles.map(r => r.id);

  // Remove all user assignments for these roles
  if (roleIds.length > 0) {
    await knex('user_roles')
      .whereIn('role_id', roleIds)
      .delete();
  }
}
```

---

## Running the Migrations

### Commands
```bash
# Navigate to backend
cd backend

# Create migration files (if using CLI)
npx knex migrate:make create_referee_roles
npx knex migrate:make create_referee_permissions
npx knex migrate:make assign_referee_permissions
npx knex migrate:make migrate_existing_referees

# Run all pending migrations
npm run migrate:latest

# Or run specific migration
npx knex migrate:up 20250925_create_referee_roles.ts

# Check migration status
npx knex migrate:status

# Rollback if needed
npm run migrate:rollback
```

---

## Verification Queries

After running migrations, verify the data:

### Check Roles Created
```sql
SELECT name, description FROM roles
WHERE name LIKE '%Referee%'
ORDER BY name;
```

### Check Permissions Created
```sql
SELECT name, resource, action, description FROM permissions
WHERE resource IN ('games', 'assignments', 'mentorship', 'evaluations', 'referees')
ORDER BY resource, action;
```

### Check Role-Permission Assignments
```sql
SELECT r.name as role_name, p.name as permission_name
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name LIKE '%Referee%'
ORDER BY r.name, p.name;
```

### Check User-Role Assignments
```sql
SELECT u.email, u.name, r.name as role_name
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
WHERE r.name LIKE '%Referee%'
ORDER BY u.email, r.name;
```

### Verify All Referees Have Base Role
```sql
-- Users with legacy referee role
SELECT u.email, u.role as legacy_role,
       EXISTS(
         SELECT 1 FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = u.id AND r.name = 'Referee'
       ) as has_base_role
FROM users u
WHERE u.role IN ('referee', 'Referee');
```

---

## Expected Results

After running all migrations:

✅ 6 new referee roles in `roles` table
✅ 16+ new permissions in `permissions` table
✅ Permissions assigned to appropriate roles
✅ All existing referees have base "Referee" role
✅ Referees with white_whistle have "Senior Referee" role
✅ Other referees have "Junior Referee" role

---

## Troubleshooting

### If migrations fail:

1. **Check database connection**
```bash
psql -U postgres -h localhost -d sportsmanager -c "SELECT 1;"
```

2. **Check existing schema**
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('roles', 'permissions', 'user_roles', 'role_permissions');
```

3. **Manual fixes if needed**
```sql
-- Create missing tables
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES roles(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID,
  PRIMARY KEY (user_id, role_id)
);
```

---

## Notes for Agent Implementation

1. **Check schema first** - Verify tables exist before inserting
2. **Use transactions** - Wrap migrations in transactions for rollback capability
3. **Log progress** - Output status messages during migration
4. **Handle duplicates** - Check for existing records before inserting
5. **Test incrementally** - Run one migration at a time and verify