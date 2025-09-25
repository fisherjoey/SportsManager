# Resource Access Control Implementation Plan

## Overview
Implement group-based access control for the Resource Centre, where permissions to view and edit resources are entirely determined by group membership.

## Core Concepts

### 1. Resource Groups
- Each resource can be assigned to one or more groups
- Groups define who can view/edit the resource
- Default group for public resources (viewable by all)

### 2. Permission Levels per Group
- **View**: Can see and read the resource
- **Edit**: Can modify the resource content
- **Delete**: Can remove the resource
- **Manage**: Can change resource permissions and groups

## Database Schema Changes

### New Tables

```sql
-- Resource groups table
CREATE TABLE resource_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false, -- Anyone can view
  is_default BOOLEAN DEFAULT false, -- Auto-assigned to new users
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link resources to groups with permission levels
CREATE TABLE resource_group_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  group_id UUID REFERENCES resource_groups(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_manage BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(resource_id, group_id)
);

-- Link users to resource groups
CREATE TABLE user_resource_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES resource_groups(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- member, moderator, admin
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, group_id)
);
```

### Modifications to Existing Tables

```sql
-- Add group tracking to resources
ALTER TABLE resources 
ADD COLUMN visibility VARCHAR(50) DEFAULT 'groups', -- 'public', 'groups', 'private'
ADD COLUMN owner_group_id UUID REFERENCES resource_groups(id);
```

## Implementation Steps

### Phase 1: Database Setup
1. Create migration files for new tables
2. Add seed data for default groups:
   - "Public Resources" (is_public: true)
   - "All Members" (is_default: true)
   - "Referees"
   - "Assignors"
   - "Administrators"
3. Update existing resources to have default group assignments

### Phase 2: Backend API Updates

#### New Endpoints
```javascript
// Group management
GET    /api/resources/groups              // List all groups
POST   /api/resources/groups              // Create new group (admin)
PUT    /api/resources/groups/:id          // Update group (admin)
DELETE /api/resources/groups/:id          // Delete group (admin)

// User-group associations
GET    /api/resources/groups/:id/members  // List group members
POST   /api/resources/groups/:id/members  // Add user to group
DELETE /api/resources/groups/:id/members/:userId // Remove user

// Resource permissions
GET    /api/resources/:id/permissions     // Get resource permissions
PUT    /api/resources/:id/permissions     // Update resource permissions
```

#### Middleware Updates
```javascript
// checkResourceAccess.js
const checkResourceAccess = (requiredPermission) => {
  return async (req, res, next) => {
    const { resourceId } = req.params;
    const userId = req.user.id;
    
    // Check if user has access through any group
    const hasAccess = await db('resource_group_permissions')
      .join('user_resource_groups', 'resource_group_permissions.group_id', 'user_resource_groups.group_id')
      .where('resource_group_permissions.resource_id', resourceId)
      .where('user_resource_groups.user_id', userId)
      .where(`resource_group_permissions.can_${requiredPermission}`, true)
      .first();
    
    if (!hasAccess) {
      // Check if resource is public and permission is 'view'
      const resource = await db('resources')
        .where('id', resourceId)
        .first();
      
      if (resource.visibility === 'public' && requiredPermission === 'view') {
        return next();
      }
      
      return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
  };
};
```

### Phase 3: Frontend Implementation

#### Components to Create

1. **ResourceGroupSelector.tsx**
```typescript
interface ResourceGroupSelectorProps {
  selectedGroups: string[];
  onChange: (groups: string[]) => void;
  permissions: Record<string, PermissionSet>;
}
```

2. **ResourceAccessManager.tsx**
```typescript
// Manage which groups can access a resource
interface ResourceAccessManagerProps {
  resourceId: string;
  onUpdate: () => void;
}
```

3. **GroupMembersList.tsx**
```typescript
// View and manage group members
interface GroupMembersListProps {
  groupId: string;
  canManage: boolean;
}
```

#### Updates to Existing Components

1. **ResourceEditor.tsx**
   - Add group selection during resource creation
   - Show permission settings for resource owner
   - Display current access groups

2. **resource-centre-new.tsx**
   - Filter resources based on user's group memberships
   - Show group badges on resource cards
   - Add "My Groups" filter option

### Phase 4: Permission Scenarios

#### Default Permissions
1. **Resource Creator**: Full permissions (view, edit, delete, manage)
2. **Admin Role**: Override permissions for all resources
3. **Group Members**: Permissions as defined in resource_group_permissions

#### Use Cases

1. **Public Resource**
   - Anyone can view
   - Only designated groups can edit

2. **Referee-Only Resource**
   - Only referee group members can view
   - Referee moderators can edit
   - Referee admins can delete/manage

3. **Private Team Resource**
   - Only specific team group can view/edit
   - Team captain has manage permissions

### Phase 5: UI/UX Flow

#### Creating a Resource
1. User fills in resource details
2. Selects visibility: Public, Groups, or Private
3. If Groups selected, choose which groups and their permissions
4. Save resource with group associations

#### Viewing Resources
1. System checks user's groups on login
2. Resource list filtered by accessible resources
3. Show lock icon for restricted resources
4. Display group badges for context

#### Managing Permissions (Resource Owner/Admin)
1. Click "Manage Access" on resource
2. See list of groups with current permissions
3. Add/remove groups
4. Adjust permission levels per group
5. View audit log of permission changes

### Phase 6: Integration Points

#### With Existing Roles System
- Admin role bypasses group restrictions
- Roles can have default group memberships
- Permission precedence: Admin Role > Group Permissions > Default

#### With Existing Features
- Search respects group permissions
- Categories remain independent of groups
- Audit logging tracks group changes

## API Examples

### Get User's Accessible Resources
```javascript
GET /api/resources?include=groups
Authorization: Bearer {token}

Response:
{
  "resources": [
    {
      "id": "...",
      "title": "Referee Guidelines",
      "groups": [
        { "id": "...", "name": "Referees", "permissions": ["view", "edit"] }
      ],
      "userPermissions": ["view", "edit"]
    }
  ]
}
```

### Update Resource Permissions
```javascript
PUT /api/resources/{id}/permissions
{
  "groups": [
    {
      "group_id": "referee-group-id",
      "can_view": true,
      "can_edit": true,
      "can_delete": false,
      "can_manage": false
    }
  ]
}
```

## Security Considerations

1. **Permission Checks**: Every resource access must validate group membership
2. **Caching**: Cache user's groups in JWT or session for performance
3. **Audit Trail**: Log all permission changes
4. **Default Deny**: No access unless explicitly granted
5. **Group Deletion**: Handle cascading when groups are deleted

## Migration Strategy

1. **Phase 1**: Deploy database changes
2. **Phase 2**: Deploy backend with backward compatibility
3. **Phase 3**: Migrate existing resources to default groups
4. **Phase 4**: Deploy frontend changes
5. **Phase 5**: Remove legacy permission code

## Testing Plan

1. **Unit Tests**
   - Permission calculation logic
   - Group membership validation
   - Access control middleware

2. **Integration Tests**
   - Resource CRUD with groups
   - Permission inheritance
   - Group management

3. **E2E Tests**
   - User journey: Create resource with groups
   - User journey: Access restricted resource
   - Admin journey: Manage group permissions

## Timeline Estimate

- **Week 1**: Database schema and migrations
- **Week 2**: Backend API implementation
- **Week 3**: Frontend components
- **Week 4**: Integration and testing
- **Week 5**: Deployment and migration

## Future Enhancements

1. **Nested Groups**: Groups can contain other groups
2. **Time-based Access**: Temporary group memberships
3. **Request Access**: Users can request to join groups
4. **Group Owners**: Delegate group management
5. **Resource Sharing**: Share individual resources via link with temporary access