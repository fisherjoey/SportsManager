# Cerbos Integration for Super Admin Role

## Summary

Successfully integrated the `super_admin` role into Cerbos authorization system for admin@test.com user.

## Changes Made

### 1. Database Role Assignment
- ✅ Assigned "Super Admin" role to admin@test.com user
- Role Code: `super_admin` (used by Cerbos)
- Role Name: `Super Admin` (display name)
- User now has full admin permissions in the database

### 2. Cerbos Policy Updates

#### A. Common Derived Roles (`cerbos-policies/derived_roles/common_roles.yaml`)
- Added `super_admin` to parent roles in `owner` derived role
- Added `super_admin` to parent roles in `organization_admin` derived role
- Created new `system_admin` derived role specifically for `super_admin`

#### B. Principal Policy (`cerbos-policies/principals/super_admin.yaml`)
- Created new principal policy granting super_admin full access to all resources
- Grants wildcard permissions: `actions: ["*"]` on `resource: "*"`

#### C. Resource Policies (All 45 resource policies updated)
- Added super_admin role with full permissions to all resource policies:
  - user, game, assignment, team, league, location
  - budget, expense, receipt, financial transactions
  - roles, permissions, organization settings
  - communications, documents, reports
  - mentorship, tournaments, and more

### 3. Backend Integration
The backend already supports Cerbos roles through:
- JWT token includes user roles from database
- `user_roles` table links users to their roles
- Login endpoint fetches roles using `role.code` (e.g., 'super_admin')
- Cerbos middleware uses these roles for authorization

## Test Credentials

**Email:** admin@test.com
**Password:** password
**Role:** Super Admin (super_admin)

## How It Works

1. **Login Flow:**
   - User logs in with email/password
   - Backend queries `user_roles` → `roles` tables
   - Retrieves role codes (e.g., `super_admin`)
   - Includes roles in JWT token

2. **Authorization Flow:**
   - Request comes in with JWT containing roles: `["super_admin"]`
   - Cerbos middleware checks resource policies
   - Finds super_admin has `actions: ["*"]` permission
   - Grants access to the requested resource

3. **Resource Access:**
   - Super Admin can perform ANY action on ANY resource
   - No restrictions on viewing, creating, updating, or deleting
   - Full system-wide access across all organizations

## Scripts Created

1. **assign-admin-role.js** - Assigns Super Admin role to admin@test.com
2. **create-admin-user.js** - Creates admin@test.com user in database

## Next Steps

If you need to add more admin users:
```bash
cd backend
node assign-admin-role.js
```

To verify Cerbos is working:
1. Login as admin@test.com
2. Try accessing any resource
3. Check browser console or backend logs for Cerbos authorization decisions

## Cerbos Policy Structure

```
cerbos-policies/
├── derived_roles/
│   └── common_roles.yaml          # Contains system_admin, owner, etc.
├── principals/
│   └── super_admin.yaml           # Grants super_admin full access
└── resources/
    ├── user.yaml                  # User management policies
    ├── game.yaml                  # Game management policies
    ├── assignment.yaml            # Assignment policies
    └── [42 more resource policies]
```

All policies now recognize and grant full permissions to the `super_admin` role.

