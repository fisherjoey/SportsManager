# Cerbos Role Management Guide

## Overview

The sports management system uses a dual approach to role management:

1. **Database Roles** - Labels stored in the database that can be assigned to users
2. **Cerbos Policies** - Actual permission definitions that control what roles can do

## Understanding the Difference

### Database Roles
- Stored in the `roles` table in PostgreSQL
- Used for user assignment (associating users with roles)
- Contains metadata like name, description, color
- **Does NOT define actual permissions**

### Cerbos Policies
- Stored as YAML files in `/cerbos/policies/`
- Define actual permissions and access rules
- Control what actions users with specific roles can perform
- Can inherit from other roles (parent roles)

## How They Work Together

```
User → Has Database Role → Role Name → Matches Cerbos Policy → Defines Permissions
```

Example flow:
1. User "John" is assigned the "Admin" role in the database
2. When John tries to access a resource, the system checks Cerbos
3. Cerbos looks for policies that apply to the "Admin" role
4. Cerbos evaluates the policies and returns allow/deny decision

## Managing Roles

### Through the UI

The Role Management interface now provides two modes:

#### Database Mode
- Creates/updates role records in the database
- Useful for creating new role labels
- Assigns roles to users
- Does not affect permissions

#### Cerbos Mode
- Creates/updates actual permission policies
- Defines what roles can do
- Sets up role inheritance
- Controls access to resources

### Best Practices

1. **Create Database Role First**
   - Create the role label in database mode
   - This makes it available for user assignment

2. **Define Permissions in Cerbos**
   - Switch to Cerbos mode
   - Select the permissions the role should have
   - Save to create/update the policy

3. **Keep Names Consistent**
   - Database role names must match Cerbos policy role names
   - Use lowercase with underscores (e.g., `super_admin`, `referee_coordinator`)

## Common Role Permissions

### Super Admin
```yaml
- user:* (all user operations)
- role:* (all role operations)
- system:* (all system operations)
- cerbos_policy:* (manage policies)
```

### Admin
```yaml
- user:view, user:create, user:update
- game:*
- assignment:*
- referee:*
```

### Assignor
```yaml
- game:view
- assignment:create, assignment:update, assignment:delete
- referee:view
```

### Referee
```yaml
- game:view (own games)
- assignment:view (own assignments)
- profile:update (own profile)
```

## API Endpoints

### Database Role Management
- `GET /api/users/roles` - List database roles
- `POST /api/admin/roles` - Create database role
- `PUT /api/admin/roles/:id` - Update database role
- `DELETE /api/admin/roles/:id` - Delete database role

### Cerbos Policy Management
- `GET /api/admin/cerbos-policies/roles` - List Cerbos roles
- `POST /api/admin/cerbos-policies/roles` - Create Cerbos role
- `PUT /api/admin/cerbos-policies/roles/:name` - Update Cerbos role
- `DELETE /api/admin/cerbos-policies/roles/:name` - Delete Cerbos role
- `POST /api/admin/cerbos-policies/role-permissions` - Update role permissions

## Troubleshooting

### User has role but can't access resources
- Check if Cerbos policy exists for the role
- Verify role name matches between database and Cerbos
- Check specific permissions in Cerbos policy

### Can't assign role to user
- Ensure role exists in database (not just Cerbos)
- Check if role is active (`is_active = true`)

### Changes to permissions not taking effect
- Cerbos caches policies briefly, wait a few seconds
- Verify policy was saved successfully
- Check Cerbos logs for policy validation errors

## Migration from Old System

If migrating from a permission-based system to Cerbos:

1. Export existing role-permission mappings
2. Create corresponding Cerbos policies
3. Test thoroughly with a subset of users
4. Gradually migrate all users to new system
5. Remove old permission tables once migration is complete

## Security Considerations

- Cerbos Admin API should be secured in production
- Use proper authentication for Cerbos Admin endpoints
- Audit policy changes regularly
- Follow principle of least privilege
- Test permission changes in staging first