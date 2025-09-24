# Resource RBAC Implementation Plan
## Role-Based Access Control for Resources with Category Management & Audit Logging

## Overview
Integrate resource access control directly with the existing role-based permission system, adding category-level management and comprehensive audit logging.

## Core Concepts

### 1. Three-Level Permission Hierarchy
- **System Level**: Global permissions via roles (resources:create, resources:read, etc.)
- **Category Level**: Manage entire categories (e.g., "Training Materials" manager)
- **Resource Level**: Granular control over individual resources

### 2. Category Ownership
- Each category can have designated managers/owners
- Category managers can control all resources within their category
- Useful for delegating management (e.g., Referee Coordinator manages "Referee Resources")

### 3. Audit Trail
- Track all resource creation, modification, and deletion
- Log who accessed what and when
- Maintain version history for sensitive documents

## Database Schema

### New Tables

```sql
-- Category-level permissions
CREATE TABLE resource_category_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES resource_categories(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT true,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_manage BOOLEAN DEFAULT false, -- Can grant permissions to others
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  UNIQUE(category_id, role_id)
);

-- Resource-level permissions (overrides category permissions)
CREATE TABLE resource_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_manage BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  UNIQUE(resource_id, role_id)
);

-- Audit log for all resource activities
CREATE TABLE resource_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
  category_id UUID REFERENCES resource_categories(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'viewed', 'downloaded', 'permission_changed'
  changes JSONB, -- Stores what was changed (for updates)
  metadata JSONB, -- Additional context (IP, user agent, etc.)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resource versions for tracking changes
CREATE TABLE resource_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title VARCHAR(255),
  description TEXT,
  content TEXT,
  metadata JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  change_summary TEXT,
  UNIQUE(resource_id, version_number)
);

-- Category managers (users who own/manage specific categories)
CREATE TABLE resource_category_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES resource_categories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'manager', -- 'owner', 'manager', 'contributor'
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category_id, user_id)
);
```

### Modifications to Existing Tables

```sql
-- Add tracking fields to resources
ALTER TABLE resources 
ADD COLUMN version_number INTEGER DEFAULT 1,
ADD COLUMN is_draft BOOLEAN DEFAULT false,
ADD COLUMN published_at TIMESTAMP,
ADD COLUMN published_by UUID REFERENCES users(id),
ADD COLUMN last_accessed_at TIMESTAMP,
ADD COLUMN access_count INTEGER DEFAULT 0;

-- Add ownership to categories
ALTER TABLE resource_categories
ADD COLUMN created_by UUID REFERENCES users(id),
ADD COLUMN managed_by UUID REFERENCES users(id),
ADD COLUMN visibility VARCHAR(50) DEFAULT 'public'; -- 'public', 'restricted', 'private'
```

### New Permissions for Existing System

```sql
-- Add to permissions table
INSERT INTO permissions (name, category, description, is_system) VALUES
  -- Global resource permissions
  ('resources:read', 'resources', 'View public resources', true),
  ('resources:create', 'resources', 'Create new resources', true),
  ('resources:update', 'resources', 'Edit own resources', true),
  ('resources:delete', 'resources', 'Delete own resources', true),
  ('resources:manage', 'resources', 'Manage all resources and permissions', true),
  
  -- Category management permissions
  ('categories:create', 'resources', 'Create new resource categories', true),
  ('categories:update', 'resources', 'Edit resource categories', true),
  ('categories:delete', 'resources', 'Delete resource categories', true),
  ('categories:manage', 'resources', 'Manage category permissions', true),
  
  -- Audit and reporting permissions
  ('resources:audit', 'resources', 'View resource audit logs', true),
  ('resources:export', 'resources', 'Export resources and reports', true);
```

## Permission Resolution Logic

### Permission Check Flow
```javascript
async function checkResourcePermission(userId, resourceId, action) {
  // 1. Check if user is Super Admin (bypass all checks)
  if (await userHasRole(userId, 'Super Admin')) {
    return true;
  }
  
  // 2. Check global permissions through roles
  if (await userHasPermission(userId, `resources:${action}`)) {
    return true;
  }
  
  // 3. Check if user created the resource (owner rights)
  const resource = await getResource(resourceId);
  if (resource.created_by === userId) {
    return ['view', 'edit'].includes(action);
  }
  
  // 4. Check category-level permissions
  const categoryPermission = await checkCategoryPermission(
    userId, 
    resource.category_id, 
    action
  );
  if (categoryPermission) {
    return true;
  }
  
  // 5. Check resource-specific permissions
  const resourcePermission = await checkResourceSpecificPermission(
    userId, 
    resourceId, 
    action
  );
  
  return resourcePermission;
}
```

## Implementation Details

### Category Management Features

#### 1. Category Ownership Model
```typescript
interface CategoryManager {
  userId: string;
  categoryId: string;
  role: 'owner' | 'manager' | 'contributor';
  permissions: {
    canCreateResources: boolean;
    canEditAllResources: boolean;
    canDeleteResources: boolean;
    canManagePermissions: boolean;
    canAddManagers: boolean;
  };
}
```

#### 2. Category Permission UI
- **Category Settings Page**
  - List of managers with their roles
  - Add/remove managers
  - Set default permissions for new resources
  - Configure category visibility

### Audit Logging Implementation

#### 1. Automatic Logging Middleware
```javascript
// auditMiddleware.js
const logResourceAction = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log after successful response
    if (res.statusCode < 400) {
      const action = getActionFromRoute(req.method, req.path);
      
      db('resource_audit_log').insert({
        resource_id: req.params.resourceId,
        category_id: req.body.category_id || req.resource?.category_id,
        user_id: req.user.id,
        action,
        changes: req.method === 'PUT' ? req.body : null,
        metadata: {
          ip: req.ip,
          user_agent: req.get('user-agent'),
          method: req.method,
          path: req.path
        }
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};
```

#### 2. Audit Log Views
- **Resource History**: Show all changes to a specific resource
- **User Activity**: Track what a specific user has done
- **Category Activity**: Monitor all activity in a category
- **Security Audit**: Flag suspicious patterns

### Version Control for Resources

```javascript
// Create new version when updating
async function updateResourceWithVersion(resourceId, updates, userId) {
  return await db.transaction(async (trx) => {
    // Get current resource
    const current = await trx('resources')
      .where('id', resourceId)
      .first();
    
    // Save current version
    await trx('resource_versions').insert({
      resource_id: resourceId,
      version_number: current.version_number,
      title: current.title,
      description: current.description,
      content: current.metadata?.content,
      metadata: current.metadata,
      created_by: userId,
      change_summary: updates.change_summary
    });
    
    // Update resource with new version number
    await trx('resources')
      .where('id', resourceId)
      .update({
        ...updates,
        version_number: current.version_number + 1,
        updated_by: userId,
        updated_at: new Date()
      });
    
    // Log the update
    await trx('resource_audit_log').insert({
      resource_id: resourceId,
      user_id: userId,
      action: 'updated',
      changes: updates,
      metadata: { version: current.version_number + 1 }
    });
  });
}
```

## UI Components

### 1. Category Manager Dashboard
```typescript
interface CategoryManagerDashboardProps {
  categoryId: string;
  currentUser: User;
}

// Shows:
// - Resources in category
// - Category managers
// - Permission matrix
// - Activity log
// - Quick actions (add resource, invite manager)
```

### 2. Resource Permission Editor
```typescript
interface ResourcePermissionEditorProps {
  resourceId: string;
  canManage: boolean;
}

// Shows:
// - Current permissions by role
// - Add role-specific permissions
// - View permission inheritance from category
// - Override category permissions
```

### 3. Audit Log Viewer
```typescript
interface AuditLogViewerProps {
  filter: {
    resourceId?: string;
    categoryId?: string;
    userId?: string;
    dateRange?: [Date, Date];
    actions?: string[];
  };
}

// Shows:
// - Filterable, sortable audit log
// - Export functionality
// - Detailed change diffs
// - User information with each entry
```

## API Endpoints

### Category Management
```javascript
// Category permissions
GET    /api/resources/categories/:id/permissions
PUT    /api/resources/categories/:id/permissions
DELETE /api/resources/categories/:id/permissions/:roleId

// Category managers
GET    /api/resources/categories/:id/managers
POST   /api/resources/categories/:id/managers
DELETE /api/resources/categories/:id/managers/:userId

// Audit logs
GET    /api/resources/audit-log
GET    /api/resources/:id/audit-log
GET    /api/resources/categories/:id/audit-log

// Versions
GET    /api/resources/:id/versions
GET    /api/resources/:id/versions/:versionNumber
POST   /api/resources/:id/restore/:versionNumber
```

## Permission Examples

### Scenario 1: Referee Training Materials
- **Category**: "Referee Training"
- **Category Manager**: Referee Coordinator role
- **Permissions**:
  - All referees can view
  - Referee Coordinator can create/edit/delete
  - Individual resources can be marked "draft" until ready

### Scenario 2: Board Documents
- **Category**: "Board Documents"
- **Category Manager**: Board Secretary (specific user)
- **Permissions**:
  - Board members can view
  - Board Secretary can manage everything
  - Sensitive documents have resource-specific restrictions

### Scenario 3: Public Forms
- **Category**: "Forms & Documents"
- **Permissions**:
  - Everyone can view
  - Admin staff can update
  - Version history maintained for compliance

## Security Considerations

1. **Permission Caching**: Cache user permissions in JWT or Redis for performance
2. **Audit Retention**: Keep audit logs for compliance (configurable retention period)
3. **Version Storage**: Implement storage limits for version history
4. **Rate Limiting**: Limit resource creation/updates per user
5. **Sensitive Data**: Encrypt sensitive resource content at rest

## Migration Plan

### Phase 1: Database Setup (Week 1)
1. Create new tables
2. Add permissions to existing permission table
3. Migrate existing resources to include audit fields

### Phase 2: Backend Implementation (Week 2)
1. Implement permission checking service
2. Add audit logging middleware
3. Create version control system
4. Update resource CRUD operations

### Phase 3: UI Implementation (Week 3)
1. Category manager dashboard
2. Permission management UI
3. Audit log viewer
4. Version history viewer

### Phase 4: Testing & Deployment (Week 4)
1. Unit tests for permission logic
2. Integration tests for audit logging
3. Performance testing with caching
4. Gradual rollout with feature flags

## Benefits

1. **Leverages Existing System**: No duplicate user/role management
2. **Granular Control**: Three levels of permission control
3. **Delegation**: Category managers can handle their own sections
4. **Accountability**: Complete audit trail of all actions
5. **Recovery**: Version history allows rollback
6. **Scalability**: Permission caching ensures performance