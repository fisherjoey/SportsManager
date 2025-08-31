# How the Permissions Management Pipeline Works

## Overview
The permissions system is **NOT** just modifying an object. It's a complex relational database system with multiple tables and relationships. Here's how it actually works:

## Database Structure

### Core Tables
1. **permissions** - Stores all available permissions
   - `id` (UUID)
   - `name` (e.g., "Create Games")
   - `category` (e.g., "games")
   - `description`
   - `is_system` (boolean - system permissions can't be deleted)

2. **roles** - Stores role definitions
   - `id` (UUID)
   - `name` (e.g., "Admin", "Referee")
   - `description`
   - `is_system` (boolean)
   - `is_active` (boolean)

3. **role_permissions** - Junction table linking roles to permissions (many-to-many)
   - `role_id` (foreign key to roles)
   - `permission_id` (foreign key to permissions)
   - `created_at`

4. **user_roles** - Junction table linking users to roles
   - `user_id` (foreign key to users)
   - `role_id` (foreign key to roles)

## The Complete Pipeline

### 1. Loading Permissions for Display

```
Frontend Request → Backend API → Database → Response
```

**Step-by-step process:**

1. **Frontend Component Mounts** (`PermissionMatrix.tsx`)
   ```typescript
   useEffect(() => {
     if (open && role) {
       fetchPermissionsAndRole()
     }
   }, [open, role])
   ```

2. **Fetch All Available Permissions**
   ```typescript
   const permData = await apiClient.getPermissions()
   ```
   - Calls: `GET /api/admin/permissions`

3. **Backend Route** (`backend/src/routes/admin/permissions.js`)
   ```javascript
   router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
     const permissions = await permissionService.getPermissionsGroupedByCategory()
     res.json({ success: true, data: { permissions } })
   })
   ```

4. **Permission Service** (`backend/src/services/PermissionService.js`)
   ```javascript
   async getPermissionsGroupedByCategory() {
     // Query ALL permissions from database
     const permissions = await this.db('permissions')
       .select('*')
       .orderBy('category', 'asc')
       .orderBy('name', 'asc');
     
     // Group them by category
     const grouped = {};
     permissions.forEach(permission => {
       if (!grouped[permission.category]) {
         grouped[permission.category] = [];
       }
       grouped[permission.category].push(permission);
     });
     
     return grouped;
   }
   ```

5. **Fetch Current Role's Permissions**
   ```typescript
   const roleData = await apiClient.getRole(role.id)
   ```
   - Calls: `GET /api/admin/roles/:roleId`
   - Returns role with its currently assigned permissions

6. **Backend Gets Role with Permissions**
   ```javascript
   async getRoleWithPermissions(roleId) {
     // Get role details
     const role = await this.db('roles').where('id', roleId).first();
     
     // Get permissions assigned to this role via junction table
     const permissions = await this.db('permissions')
       .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
       .where('role_permissions.role_id', roleId)
       .select('permissions.*');
     
     return { ...role, permissions };
   }
   ```

### 2. Modifying Permissions

When you toggle checkboxes and save:

1. **Frontend Tracks Changes**
   ```typescript
   const handlePermissionToggle = (permissionId: string) => {
     const newSelected = new Set(selectedPermissions)
     if (newSelected.has(permissionId)) {
       newSelected.delete(permissionId)
     } else {
       newSelected.add(permissionId)
     }
     setSelectedPermissions(newSelected)
   }
   ```
   - This is just local state management
   - No database changes yet!

2. **Save Button Clicked**
   ```typescript
   const handleSave = async () => {
     const response = await apiClient.assignPermissionsToRole(
       role.id, 
       Array.from(selectedPermissions)
     )
   }
   ```
   - Sends: `POST /api/admin/roles/:roleId/permissions`
   - Body: `{ permission_ids: ["uuid1", "uuid2", ...] }`

3. **Backend Updates Database** (`backend/src/services/RoleService.js`)
   ```javascript
   async assignPermissionsToRole(roleId, permissionIds) {
     // Start database transaction
     await this.withTransaction(async (trx) => {
       // 1. Delete ALL existing role-permission relationships
       await trx('role_permissions')
         .where('role_id', roleId)
         .del();
       
       // 2. Insert NEW role-permission relationships
       if (permissionIds.length > 0) {
         const rolePermissions = permissionIds.map(permissionId => ({
           role_id: roleId,
           permission_id: permissionId,
           created_at: new Date()
         }));
         
         await trx('role_permissions').insert(rolePermissions);
       }
     });
   }
   ```

### 3. Why It's NOT Just "Modifying an Object"

**It's not like this:**
```javascript
// WRONG - This is NOT how it works
role.permissions = ["permission1", "permission2"]
save(role)
```

**It's actually:**
1. **Relational Database Operations**
   - Delete rows from junction table
   - Insert new rows into junction table
   - Maintain referential integrity

2. **Transaction Management**
   - All changes happen atomically
   - If any part fails, everything rolls back

3. **Validation at Multiple Levels**
   - Frontend validates selection
   - API validates request format
   - Service validates permissions exist
   - Database enforces foreign key constraints

4. **Caching & Performance**
   - Permission service maintains cache
   - Cache invalidation on updates
   - Optimized queries with joins

## Data Flow Summary

```
1. GET all permissions → Returns master list grouped by category
2. GET role details → Returns role with its current permissions
3. User modifies selections in UI (local state only)
4. POST new permission list → Replaces ALL role permissions
   - DELETE all rows in role_permissions for this role
   - INSERT new rows for selected permissions
5. Return updated role with new permissions
```

## Key Points

- **Permissions are NOT stored on the role object** - they're in a separate junction table
- **It's a complete replacement operation** - not incremental add/remove
- **Database normalization** - permissions are reusable across roles
- **Referential integrity** - can't assign non-existent permissions
- **Transactional safety** - all-or-nothing updates

## Why This Architecture?

1. **Scalability** - Can have thousands of users, hundreds of roles, dozens of permissions
2. **Flexibility** - Easy to add new permissions without schema changes
3. **Reusability** - Same permission can be assigned to multiple roles
4. **Auditability** - Can track when permissions were assigned
5. **Performance** - Indexed lookups, cached results
6. **Integrity** - Database enforces valid relationships