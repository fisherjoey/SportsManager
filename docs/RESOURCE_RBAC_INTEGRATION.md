# Resource RBAC Integration Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Database Setup](#database-setup)
4. [Initial Configuration](#initial-configuration)
5. [Permission Assignment](#permission-assignment)
6. [Audit Configuration](#audit-configuration)
7. [Frontend Integration](#frontend-integration)
8. [Common Scenarios](#common-scenarios)
9. [API Reference](#api-reference)
10. [Troubleshooting](#troubleshooting)
11. [Performance Tuning](#performance-tuning)
12. [Security Considerations](#security-considerations)

## Overview

The Resource RBAC (Role-Based Access Control) system provides granular permission management for resources in the Sports Manager application. It features:

- **Three-level permission hierarchy**: System → Category → Resource
- **Comprehensive audit logging**: Track all resource operations
- **Version control**: Maintain history and enable rollback
- **Category management**: Delegate control of resource categories
- **Performance optimization**: Built-in caching and efficient queries

## Prerequisites

Before integrating the Resource RBAC system:

1. Ensure PostgreSQL database is running
2. Node.js v18+ installed
3. Existing authentication system functioning
4. Base roles and permissions tables exist

## Database Setup

### 1. Run Migrations

Execute the migrations in sequence to set up the RBAC tables:

```bash
cd backend

# Run all migrations
npx knex migrate:latest

# Or run specific RBAC migrations
npx knex migrate:up 20250831000001_create_resource_category_permissions.js
npx knex migrate:up 20250831000002_create_resource_permissions.js
npx knex migrate:up 20250831000003_create_resource_audit_log.js
npx knex migrate:up 20250831000004_create_resource_versions.js
npx knex migrate:up 20250831000005_create_resource_category_managers.js
npx knex migrate:up 20250831000006_add_resource_rbac_fields.js
npx knex migrate:up 20250831000007_insert_resource_permissions.js
```

### 2. Verify Migration Success

```bash
# Check migration status
npx knex migrate:status

# Verify tables exist
npx knex raw "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'resource%'"
```

### 3. Rollback (if needed)

```bash
# Rollback last batch
npx knex migrate:rollback

# Rollback specific migration
npx knex migrate:down 20250831000007_insert_resource_permissions.js
```

## Initial Configuration

### 1. Environment Variables

Add these to your `.env` file:

```env
# Audit Configuration
AUDIT_LOG_RETENTION_DAYS=90
AUDIT_CLEANUP_BATCH_SIZE=1000
AUDIT_LOG_ARCHIVE_ENABLED=false
AUDIT_LOG_ARCHIVE_DIR=./archives/audit
AUDIT_CLEANUP_CRON=0 0 * * 0  # Weekly on Sunday
AUDIT_CLEANUP_ENABLED=true

# Permission Caching
PERMISSION_CACHE_TTL=300  # 5 minutes
PERMISSION_CACHE_ENABLED=true

# Version Control
RESOURCE_VERSION_LIMIT=50  # Max versions per resource
RESOURCE_VERSION_CLEANUP_DAYS=365
```

### 2. Initialize Services

In your backend startup file:

```javascript
// backend/src/app.js or server.js
const ResourcePermissionService = require('./services/ResourcePermissionService');
const ResourceAuditService = require('./services/ResourceAuditService');
const ResourceVersionService = require('./services/ResourceVersionService');

// Initialize services
const permissionService = new ResourcePermissionService();
const auditService = new ResourceAuditService();
const versionService = new ResourceVersionService();

// Start audit cleanup job
const { startCleanupJob } = require('./jobs/auditLogCleanup');
if (process.env.AUDIT_CLEANUP_ENABLED === 'true') {
  startCleanupJob();
}
```

## Permission Assignment

### 1. Assign Permissions to Roles

```javascript
// Example: Grant resource permissions to roles
const db = require('./config/database');

async function assignResourcePermissions() {
  // Get role IDs
  const roles = await db('roles').select('id', 'name');
  const permissions = await db('permissions')
    .where('category', 'resources')
    .select('id', 'name');

  // Assign permissions to Super Admin
  const superAdmin = roles.find(r => r.name === 'Super Admin');
  for (const permission of permissions) {
    await db('role_permissions').insert({
      role_id: superAdmin.id,
      permission_id: permission.id
    }).onConflict(['role_id', 'permission_id']).ignore();
  }

  // Assign read/create to Referee Coordinator
  const coordinator = roles.find(r => r.name === 'Referee Coordinator');
  const allowedPerms = ['resources:read', 'resources:create', 'resources:update'];
  for (const permName of allowedPerms) {
    const perm = permissions.find(p => p.name === permName);
    if (perm) {
      await db('role_permissions').insert({
        role_id: coordinator.id,
        permission_id: perm.id
      }).onConflict(['role_id', 'permission_id']).ignore();
    }
  }

  // Basic read for all Referees
  const referee = roles.find(r => r.name === 'Referee');
  const readPerm = permissions.find(p => p.name === 'resources:read');
  if (referee && readPerm) {
    await db('role_permissions').insert({
      role_id: referee.id,
      permission_id: readPerm.id
    }).onConflict(['role_id', 'permission_id']).ignore();
  }
}
```

### 2. Set Category Permissions

```javascript
// Grant role access to a category
async function setCategoryPermissions(categoryId, roleId, permissions) {
  await db('resource_category_permissions')
    .insert({
      category_id: categoryId,
      role_id: roleId,
      can_view: permissions.view || false,
      can_create: permissions.create || false,
      can_edit: permissions.edit || false,
      can_delete: permissions.delete || false,
      can_manage: permissions.manage || false,
      created_by: adminUserId
    })
    .onConflict(['category_id', 'role_id'])
    .merge();
}

// Example: Referee Coordinator manages Referee Training category
const trainingCategory = await db('resource_categories')
  .where('name', 'Referee Training')
  .first();
const coordinatorRole = await db('roles')
  .where('name', 'Referee Coordinator')
  .first();

await setCategoryPermissions(trainingCategory.id, coordinatorRole.id, {
  view: true,
  create: true,
  edit: true,
  delete: true,
  manage: true
});
```

### 3. Assign Category Managers

```javascript
// Make a user a category manager
async function assignCategoryManager(categoryId, userId, role = 'manager') {
  await db('resource_category_managers')
    .insert({
      category_id: categoryId,
      user_id: userId,
      role: role, // 'owner', 'manager', 'contributor'
      assigned_by: adminUserId,
      assigned_at: new Date()
    })
    .onConflict(['category_id', 'user_id'])
    .merge();
}
```

## Audit Configuration

### 1. Enable Audit Middleware

```javascript
// backend/src/app.js
const { createResourceAuditMiddleware } = require('./middleware/auditLogger');

// Apply to resource routes
app.use('/api/resources', createResourceAuditMiddleware());
app.use('/api/admin', createSensitiveOperationsAuditMiddleware());
```

### 2. Manual Audit Logging

```javascript
// Log custom actions
const auditService = new ResourceAuditService();

await auditService.logAction({
  resourceId: resource.id,
  userId: req.user.id,
  action: 'custom_action',
  metadata: {
    reason: 'Special operation',
    details: { ... }
  }
});
```

### 3. Query Audit Logs

```javascript
// Get audit logs with filters
const logs = await auditService.getAuditLogs({
  resourceId: 'resource-uuid',
  userId: 'user-uuid',
  action: 'update',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  limit: 100,
  offset: 0
});
```

## Frontend Integration

### 1. Permission Context Provider

```tsx
// app/providers/ResourcePermissionProvider.tsx
import { createContext, useContext, useEffect, useState } from 'react';

const PermissionContext = createContext({});

export function ResourcePermissionProvider({ children }) {
  const [permissions, setPermissions] = useState({});

  useEffect(() => {
    // Load user's resource permissions
    fetchUserPermissions().then(setPermissions);
  }, []);

  return (
    <PermissionContext.Provider value={permissions}>
      {children}
    </PermissionContext.Provider>
  );
}

export const useResourcePermissions = () => useContext(PermissionContext);
```

### 2. Protected Resource Components

```tsx
// components/resources/ProtectedResource.tsx
import { useResourcePermissions } from '@/providers/ResourcePermissionProvider';

export function ProtectedResource({ resource, children, requiredPermission }) {
  const permissions = useResourcePermissions();
  
  const hasPermission = permissions[resource.id]?.[requiredPermission] || 
                        permissions.global?.[requiredPermission];
  
  if (!hasPermission) {
    return <div>Access Denied</div>;
  }
  
  return children;
}
```

### 3. Category Management UI

```tsx
// Example: Using the category management components
import { CategoryManagerDashboard } from '@/components/resources';

export function CategoryPage({ categoryId }) {
  return (
    <CategoryManagerDashboard
      categoryId={categoryId}
      onPermissionChange={handlePermissionUpdate}
      onManagerAdd={handleManagerAdd}
    />
  );
}
```

## Common Scenarios

### Scenario 1: Create Public Resource Category

```javascript
async function createPublicCategory() {
  // Create category
  const [category] = await db('resource_categories')
    .insert({
      name: 'Public Documents',
      slug: 'public-documents',
      description: 'Publicly accessible documents',
      visibility: 'public',
      is_active: true
    })
    .returning('*');

  // Grant all users view permission
  const allRoles = await db('roles').select('id');
  for (const role of allRoles) {
    await db('resource_category_permissions').insert({
      category_id: category.id,
      role_id: role.id,
      can_view: true,
      can_create: false,
      can_edit: false,
      can_delete: false
    });
  }

  return category;
}
```

### Scenario 2: Restrict Resource to Specific Role

```javascript
async function restrictResource(resourceId, roleId) {
  // Remove all existing permissions
  await db('resource_permissions')
    .where('resource_id', resourceId)
    .delete();

  // Grant permission only to specific role
  await db('resource_permissions').insert({
    resource_id: resourceId,
    role_id: roleId,
    can_view: true,
    can_edit: true,
    can_delete: false,
    can_manage: false
  });

  // Update resource visibility
  await db('resources')
    .where('id', resourceId)
    .update({ visibility: 'restricted' });
}
```

### Scenario 3: Delegate Category Management

```javascript
async function delegateCategoryManagement(categoryId, userId, expiresInDays = 30) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  await db('resource_category_managers').insert({
    category_id: categoryId,
    user_id: userId,
    role: 'manager',
    expires_at: expiresAt,
    assigned_by: adminUserId
  });

  // Log the delegation
  await auditService.logAction({
    categoryId,
    userId: adminUserId,
    action: 'delegate_management',
    metadata: {
      delegated_to: userId,
      expires_at: expiresAt
    }
  });
}
```

## API Reference

### Permission Endpoints

```javascript
// Check user permissions on a resource
GET /api/resources/:id/my-permissions
Response: {
  can_view: true,
  can_edit: false,
  can_delete: false,
  can_manage: false
}

// Get category permissions
GET /api/resources/categories/:id/permissions
Response: {
  permissions: [
    {
      role_id: "uuid",
      role_name: "Referee",
      can_view: true,
      can_create: false,
      can_edit: false,
      can_delete: false
    }
  ]
}

// Update resource permissions
PUT /api/resources/:id/permissions
Body: {
  permissions: [
    {
      role_id: "uuid",
      can_view: true,
      can_edit: true
    }
  ]
}
```

### Audit Endpoints

```javascript
// Get audit logs
GET /api/resources/audit-log?
  resource_id=uuid&
  user_id=uuid&
  action=update&
  start_date=2025-01-01&
  end_date=2025-12-31&
  limit=50&
  offset=0

// Export audit logs
GET /api/resources/audit-log/export?format=csv

// Get audit statistics
GET /api/resources/audit-log/statistics
```

### Version Endpoints

```javascript
// Get resource versions
GET /api/resources/:id/versions

// Get specific version
GET /api/resources/:id/versions/:versionNumber

// Restore version
POST /api/resources/:id/versions/:versionNumber/restore

// Compare versions
GET /api/resources/:id/versions/:v1/compare/:v2
```

## Troubleshooting

### Issue: Permission Denied Despite Role Assignment

**Symptoms**: User receives 403 error despite having appropriate role

**Solutions**:
1. Clear permission cache:
```javascript
await permissionService.clearCache();
```

2. Verify role-permission association:
```sql
SELECT r.name as role, p.name as permission
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.id = 'role-uuid';
```

3. Check permission hierarchy:
```javascript
const perms = await permissionService.checkResourcePermission(
  userId, 
  resourceId, 
  'view',
  { debug: true }  // Enable debug logging
);
```

### Issue: Audit Logs Not Recording

**Symptoms**: Actions not appearing in audit log

**Solutions**:
1. Verify middleware is registered:
```javascript
// Check app.js
console.log(app._router.stack.map(r => r.route?.path));
```

2. Check audit service status:
```javascript
const health = await auditService.getHealth();
console.log(health);
```

3. Verify database connectivity:
```sql
SELECT COUNT(*) FROM resource_audit_log;
```

### Issue: Version History Missing

**Symptoms**: Updates not creating versions

**Solutions**:
1. Check version limit:
```javascript
const versions = await db('resource_versions')
  .where('resource_id', resourceId)
  .count();
```

2. Verify version service is enabled:
```javascript
const isEnabled = process.env.RESOURCE_VERSION_ENABLED !== 'false';
```

3. Manual version creation:
```javascript
await versionService.createVersion(resourceId, {
  title: resource.title,
  content: resource.content,
  metadata: resource.metadata,
  created_by: userId
});
```

## Performance Tuning

### 1. Enable Permission Caching

```javascript
// In ResourcePermissionService
const CACHE_TTL = parseInt(process.env.PERMISSION_CACHE_TTL) || 300;

// Pre-warm cache for frequent users
await permissionService.warmCache(userId);
```

### 2. Optimize Database Queries

```sql
-- Add indexes for common queries
CREATE INDEX idx_audit_log_resource_date 
ON resource_audit_log(resource_id, created_at DESC);

CREATE INDEX idx_resource_permissions_lookup 
ON resource_permissions(resource_id, role_id);

CREATE INDEX idx_category_permissions_lookup 
ON resource_category_permissions(category_id, role_id);
```

### 3. Batch Operations

```javascript
// Batch permission checks
const results = await permissionService.checkMultiplePermissions(
  userId,
  resourceIds,
  'view'
);

// Batch audit logging
await auditService.logBatch(auditEntries);
```

### 4. Archive Old Data

```bash
# Run archive job
node backend/src/jobs/archiveOldAuditLogs.js

# Or via API
POST /api/admin/maintenance/archive/audit-logs
```

## Security Considerations

### 1. Permission Validation

Always validate permissions server-side:
```javascript
// Never trust client-side permission checks
if (!await permissionService.checkResourcePermission(userId, resourceId, 'edit')) {
  throw new ForbiddenError('Access denied');
}
```

### 2. SQL Injection Prevention

Use parameterized queries:
```javascript
// Good
await db('resources').where('id', resourceId);

// Bad - vulnerable to injection
await db.raw(`SELECT * FROM resources WHERE id = '${resourceId}'`);
```

### 3. Audit Sensitive Operations

```javascript
// Always audit permission changes
await auditService.logPermissionChange({
  resourceId,
  userId: req.user.id,
  changes: {
    before: oldPermissions,
    after: newPermissions
  }
});
```

### 4. Rate Limiting

```javascript
// Apply rate limiting to permission endpoints
const rateLimit = require('express-rate-limit');

const permissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/resources/*/permissions', permissionLimiter);
```

### 5. Regular Security Audits

```javascript
// Schedule regular permission audits
async function auditPermissions() {
  // Find orphaned permissions
  const orphaned = await db('resource_permissions')
    .leftJoin('resources', 'resource_permissions.resource_id', 'resources.id')
    .whereNull('resources.id')
    .select('resource_permissions.*');

  // Find users with excessive permissions
  const excessive = await db('user_roles')
    .join('role_permissions', 'user_roles.role_id', 'role_permissions.role_id')
    .groupBy('user_roles.user_id')
    .having(db.raw('COUNT(DISTINCT role_permissions.permission_id) > ?', [20]))
    .select('user_roles.user_id');

  return { orphaned, excessive };
}
```

## Deployment Checklist

- [ ] Run all migrations in production
- [ ] Set environment variables
- [ ] Configure audit retention policy
- [ ] Assign initial permissions to roles
- [ ] Set up category managers
- [ ] Test permission checks
- [ ] Verify audit logging
- [ ] Configure backup strategy
- [ ] Set up monitoring alerts
- [ ] Document emergency procedures
- [ ] Train administrators
- [ ] Create runbook for common issues

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review audit logs for clues
3. Enable debug logging
4. Contact system administrator

## Version History

- v1.0.0 - Initial Resource RBAC implementation
- Features: Permission hierarchy, audit logging, version control
- Migration batch: 20250831000001-20250831000007