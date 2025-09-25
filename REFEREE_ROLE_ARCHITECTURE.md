# Referee Role Architecture - Base + Secondary Roles

## Overview
This architecture uses a base "Referee" role for all referees plus secondary specialization roles for different referee levels and responsibilities.

## Role Structure

### Base Role (Required for All Referees)
- **Role Name**: `Referee`
- **Purpose**: Identifies all users who are referees
- **Permissions**:
  - `games.view` - View game assignments
  - `assignments.view` - View own assignments
  - `assignments.accept` - Accept/decline assignments
  - `profile.edit.own` - Edit own referee profile

### Secondary Roles (Specialization)

#### Rookie Referee
- **Inherits**: Base Referee permissions
- **Additional Permissions**:
  - `mentorship.request` - Request mentorship
  - `games.view.limited` - Only see appropriate level games

#### Junior Referee
- **Inherits**: Base Referee permissions
- **Additional Permissions**:
  - `games.self_assign` - Self-assign to open games
  - `evaluations.view.own` - View own evaluations

#### Senior Referee
- **Inherits**: Base Referee permissions
- **Additional Permissions**:
  - `mentorship.provide` - Act as mentor
  - `evaluations.create` - Evaluate other referees
  - `games.recommend` - Recommend referees for games
  - `assignments.approve.junior` - Approve junior referee assignments

#### Head Referee
- **Inherits**: Base Referee permissions
- **Additional Permissions**:
  - `referees.manage` - Full referee management
  - `assignments.override` - Override any assignment
  - `evaluations.manage` - Manage all evaluations
  - `roles.assign.referee` - Assign referee roles

#### Referee Coach
- **Inherits**: Base Referee permissions
- **Additional Permissions**:
  - `evaluations.create.all` - Evaluate any referee
  - `training.create` - Create training materials
  - `certifications.approve` - Approve certifications

## Implementation

### Database Queries

```sql
-- Get all referees (simple!)
SELECT DISTINCT u.*
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.name = 'Referee';

-- Get senior referees only
SELECT DISTINCT u.*
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.name = 'Senior Referee';

-- Get referee with their specialization
SELECT u.*,
       GROUP_CONCAT(r.name) as role_names
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.name LIKE '%Referee%'
GROUP BY u.id;
```

### Code Implementation

```typescript
// UserService method to check if user is referee
async isReferee(userId: UUID): Promise<boolean> {
  const roles = await this.getUserRoles(userId);
  return roles.some(role => role.name === 'Referee');
}

// Get referee level
async getRefereeLevel(userId: UUID): Promise<string | null> {
  const roles = await this.getUserRoles(userId);

  // Check for specialization roles (in order of seniority)
  if (roles.some(r => r.name === 'Head Referee')) return 'Head';
  if (roles.some(r => r.name === 'Senior Referee')) return 'Senior';
  if (roles.some(r => r.name === 'Junior Referee')) return 'Junior';
  if (roles.some(r => r.name === 'Rookie Referee')) return 'Rookie';
  if (roles.some(r => r.name === 'Referee Coach')) return 'Coach';
  if (roles.some(r => r.name === 'Referee')) return 'Standard';

  return null; // Not a referee
}

// Get all referees with their levels
async getAllReferees(): Promise<EnhancedUser[]> {
  const referees = await this.db('users as u')
    .join('user_roles as ur', 'u.id', 'ur.user_id')
    .join('roles as r', 'ur.role_id', 'r.id')
    .where('r.name', 'Referee')
    .distinct('u.*');

  // Enhance with all roles
  return Promise.all(referees.map(ref => this.enhanceUserWithRoles(ref)));
}
```

## Migration Strategy

### Step 1: Create Base Referee Role
```sql
INSERT INTO roles (name, description) VALUES
  ('Referee', 'Base role for all referees');
```

### Step 2: Create Specialization Roles
```sql
INSERT INTO roles (name, description) VALUES
  ('Rookie Referee', 'New referee with limited permissions'),
  ('Junior Referee', 'Standard referee'),
  ('Senior Referee', 'Experienced referee with mentoring capabilities'),
  ('Head Referee', 'Lead referee with management permissions'),
  ('Referee Coach', 'Referee trainer and evaluator');
```

### Step 3: Migrate Existing Referees
```sql
-- Give all current referees the base role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, (SELECT id FROM roles WHERE name = 'Referee')
FROM users u
WHERE u.role = 'referee' OR u.role = 'Referee';

-- Assign specialization based on existing data
-- (This would be customized based on your business rules)
```

## Benefits

1. **Simple Queries**: Finding all referees requires checking for just one role
2. **Flexible Specialization**: Easy to add new referee types without breaking existing code
3. **Clear Hierarchy**: Permission inheritance is explicit through role combinations
4. **Backward Compatible**: Existing code checking for "referee" role still works
5. **Scalable**: Can add unlimited specialization roles without schema changes

## Usage Examples

### Check if User Can Mentor
```typescript
const canMentor = user.roles.some(r =>
  ['Senior Referee', 'Head Referee', 'Referee Coach'].includes(r.name)
);
```

### Get Referees Available for Senior Games
```typescript
const seniorGameReferees = await db('users as u')
  .join('user_roles as ur', 'u.id', 'ur.user_id')
  .join('roles as r', 'ur.role_id', 'r.id')
  .whereIn('r.name', ['Senior Referee', 'Head Referee'])
  .where('u.is_available', true);
```

### Assign Referee Roles
```typescript
async function promoteToSenior(userId: UUID) {
  // They keep base Referee role, add Senior Referee
  await assignRole(userId, 'Senior Referee');

  // Remove Junior Referee role if they had it
  await removeRole(userId, 'Junior Referee');
}
```

## Quick Fix for Current Errors

Replace the failing `user_referee_roles` queries with:

```typescript
// Instead of querying non-existent user_referee_roles table
const getUserRefereeRoles = async (userId: UUID) => {
  const roles = await db('user_roles')
    .join('roles', 'user_roles.role_id', 'roles.id')
    .where('user_roles.user_id', userId)
    .where('roles.name', 'LIKE', '%Referee%')
    .select('roles.*');

  return roles;
};
```