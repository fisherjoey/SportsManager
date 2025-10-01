# Access Control Setup Guide

## Current Status

Your Sports Management application has **TWO authorization systems** running:

### 1. **Legacy RBAC System** (Old)
- Used by admin routes: `/api/admin/roles`, `/api/admin/permissions`, `/api/admin/users`
- Uses middleware: `requirePermission()`, `requireAnyPermission()`, `requireRole()`
- Checks permissions stored in database tables: `roles`, `permissions`, `role_permissions`, `user_roles`
- Your frontend Access Control dashboard connects to these routes

### 2. **Cerbos Authorization** (New)
- Used by migrated routes: `/api/games` (7 endpoints migrated so far)
- Uses middleware: `requireCerbosPermission()`
- Checks policies defined in `cerbos-policies/` directory
- Runs as Docker container on port 3592

## Why You're Getting 403 Forbidden

Your user has the **Super Admin** role in the database ✓

However, your **JWT token might not include the roles array**.

### JWT Token Evolution

**Old tokens** (before roles array was added):
\`\`\`json
{
  "userId": "...",
  "email": "user@example.com",
  "role": "user"  // <-- Legacy single role
}
\`\`\`

**New tokens** (current implementation):
\`\`\`json
{
  "userId": "...",
  "email": "user@example.com",
  "role": "user",  // <-- Legacy (kept for compatibility)
  "roles": ["Super Admin"]  // <-- New array format (required!)
}
\`\`\`

## Solution

### Step 1: Check Your Current Token

Run this command with your JWT token:
\`\`\`bash
cd backend
node decode-token.js YOUR_TOKEN_HERE
\`\`\`

To get your token:
1. Open browser DevTools (F12)
2. Console tab
3. Run: \`localStorage.getItem("auth_token")\`
4. Copy the token (long string)

### Step 2: Log Out and Log Back In

**If your token doesn't have a `roles` array:**

1. Click logout in your app
2. Log back in with your credentials
3. Your new token will include: \`"roles": ["Super Admin"]\`
4. All admin routes should now work!

### Step 3: Verify Access

After logging back in, try accessing:
- **Users Management**: Should show user list
- **Roles Management**: Should show all roles (Admin, Referee, etc.)
- **Permissions**: Should show permission configuration

## Database Structure

Your database already has everything set up:

\`\`\`
✓ 12 Roles (Admin, Super Admin, Referee, etc.)
✓ 62 Permissions assigned to Super Admin
✓ Your user assigned to Super Admin role
\`\`\`

**Super Admin has these key permissions:**
- \`roles:read\` - View roles
- \`roles:manage\` - Edit roles
- \`roles:assign\` - Assign roles to users
- Plus 59 other permissions

## Admin Routes (Legacy RBAC)

These routes use the **old permission system**:

| Route | Permission Required | Purpose |
|-------|-------------------|---------|
| GET /api/admin/roles | \`roles:read\` OR \`system:admin\` | List all roles |
| POST /api/admin/roles | \`roles:create\` OR \`system:admin\` | Create new role |
| PUT /api/admin/roles/:id | \`roles:update\` OR \`system:admin\` | Update role |
| DELETE /api/admin/roles/:id | \`roles:delete\` OR \`system:admin\` | Delete role |
| GET /api/admin/permissions | \`permissions:read\` OR \`system:admin\` | List permissions |

**Super Admin bypass:** The middleware automatically grants Super Admin access to ALL routes, even without specific permissions.

## Game Routes (New Cerbos)

These routes use the **new Cerbos system**:

| Route | Cerbos Action | Policy Check |
|-------|--------------|-------------|
| GET /api/games | \`list\` | Organization + Role check |
| GET /api/games/:id | \`view\` | Organization + Region + Role |
| POST /api/games | \`create\` | Organization + Region |
| PUT /api/games/:id | \`update\` | Owner + Status check |
| DELETE /api/games/:id | \`delete\` | Owner + Status check |

**Guest role:** Users without roles get \`guest\` role, which is denied all game access.

## Migration Plan

### Completed ✅
- Day 1-4: Multi-tenancy, Cerbos setup, policies
- Day 5: Games routes migrated to Cerbos (7 endpoints)
- Docker & Cerbos running successfully

### Next Steps (Optional)
- Day 6: Migrate assignments routes to Cerbos
- Day 7+: Migrate remaining routes to Cerbos
- Eventually: Deprecate legacy RBAC, use only Cerbos

## Troubleshooting

### Still Getting 403 After Relogin?

1. **Check backend logs** for permission checks:
   \`\`\`bash
   tail -f backend/logs/app-2025-09-26.log | grep "Permission check"
   \`\`\`

2. **Verify your token has roles**:
   \`\`\`bash
   cd backend
   node decode-token.js YOUR_NEW_TOKEN
   \`\`\`

3. **Check Super Admin permissions** in database:
   \`\`\`sql
   SELECT p.name
   FROM role_permissions rp
   JOIN permissions p ON rp.permission_id = p.id
   WHERE rp.role_id = '3f4b74df-0135-4632-8f5a-5ae4a6d4cf99'
   AND p.name LIKE 'roles:%';
   \`\`\`

### Backend Not Running?

\`\`\`bash
cd backend
npm run dev
\`\`\`

### Cerbos Not Running?

\`\`\`bash
docker-compose -f docker-compose.cerbos.yml up -d
curl http://localhost:3592/_cerbos/health
\`\`\`

## Summary

**Problem:** Old JWT token without \`roles\` array
**Solution:** Log out and log back in
**Result:** Access to all admin and game management features ✓

Your access control system is fully set up - you just needed a fresh token!