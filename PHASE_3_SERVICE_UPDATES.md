# Phase 3: Service Updates Documentation
**Duration**: 30 minutes
**Goal**: Update all services to use the new referee role architecture

## Overview
This phase updates the UserService and related services to work with the base + secondary referee role system, eliminating the need for the `is_referee` flag and the non-existent `user_referee_roles` table.

---

## Update 3.1: UserService Core Methods

### File Location
`/backend/src/services/UserService.ts`

### Add New Methods for Referee Role Checking

```typescript
// Add these methods to the UserService class

/**
 * Check if a user has the base Referee role
 * @param userId - The user ID to check
 * @returns True if user has Referee role
 */
async isReferee(userId: UUID): Promise<boolean> {
  const result = await this.db('user_roles')
    .join('roles', 'user_roles.role_id', 'roles.id')
    .where('user_roles.user_id', userId)
    .where('roles.name', 'Referee')
    .first();

  return !!result;
}

/**
 * Get the referee specialization level for a user
 * @param userId - The user ID to check
 * @returns The referee level name or null if not a specialized referee
 */
async getRefereeLevel(userId: UUID): Promise<string | null> {
  const result = await this.db('user_roles')
    .join('roles', 'user_roles.role_id', 'roles.id')
    .where('user_roles.user_id', userId)
    .whereIn('roles.name', [
      'Head Referee',
      'Senior Referee',
      'Junior Referee',
      'Rookie Referee',
      'Referee Coach'
    ])
    .select('roles.name')
    .orderByRaw(`
      CASE roles.name
        WHEN 'Head Referee' THEN 1
        WHEN 'Senior Referee' THEN 2
        WHEN 'Junior Referee' THEN 3
        WHEN 'Rookie Referee' THEN 4
        WHEN 'Referee Coach' THEN 5
        ELSE 6
      END
    `)
    .first();

  return result?.name || null;
}

/**
 * Get all users who are referees
 * @param includeInactive - Whether to include inactive users
 * @returns Array of referee users with their roles
 */
async getAllReferees(includeInactive: boolean = false): Promise<EnhancedUser[]> {
  let query = this.db('users as u')
    .join('user_roles as ur', 'u.id', 'ur.user_id')
    .join('roles as r', 'ur.role_id', 'r.id')
    .where('r.name', 'Referee')
    .distinct('u.*');

  if (!includeInactive) {
    query = query.where('u.is_active', true);
  }

  const referees = await query;

  // Enhance each referee with all their roles
  return Promise.all(
    referees.map(ref => this.enhanceUserWithRoles(ref))
  );
}

/**
 * Get referee roles for a user (replaces user_referee_roles query)
 * @param userId - The user ID
 * @returns Array of referee-related roles
 */
async getUserRefereeRoles(userId: UUID): Promise<RefereeRole[]> {
  // This replaces queries to the non-existent user_referee_roles table
  const roles = await this.db('user_roles as ur')
    .join('roles as r', 'ur.role_id', 'r.id')
    .leftJoin('role_permissions as rp', 'r.id', 'rp.role_id')
    .leftJoin('permissions as p', 'rp.permission_id', 'p.id')
    .where('ur.user_id', userId)
    .where('r.name', 'LIKE', '%Referee%')
    .select(
      'r.id',
      'r.name',
      'r.description',
      'ur.assigned_at',
      this.db.raw('COALESCE(ur.is_active, true) as is_active'),
      this.db.raw('json_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) as permissions')
    )
    .groupBy('r.id', 'r.name', 'r.description', 'ur.assigned_at', 'ur.is_active');

  // Transform permissions from array to object format
  return roles.map(role => ({
    ...role,
    permissions: (role.permissions || []).reduce((acc: any, perm: string) => {
      acc[perm] = true;
      return acc;
    }, {})
  }));
}

/**
 * Check if a user can mentor other referees
 * @param userId - The user ID to check
 * @returns True if user can mentor
 */
async canMentor(userId: UUID): Promise<boolean> {
  const result = await this.db('user_roles as ur')
    .join('roles as r', 'ur.role_id', 'r.id')
    .join('role_permissions as rp', 'r.id', 'rp.role_id')
    .join('permissions as p', 'rp.permission_id', 'p.id')
    .where('ur.user_id', userId)
    .where('p.name', 'mentorship.provide')
    .first();

  return !!result;
}

/**
 * Check if a user can evaluate other referees
 * @param userId - The user ID to check
 * @returns True if user can evaluate
 */
async canEvaluate(userId: UUID): Promise<boolean> {
  const result = await this.db('user_roles as ur')
    .join('roles as r', 'ur.role_id', 'r.id')
    .join('role_permissions as rp', 'r.id', 'rp.role_id')
    .join('permissions as p', 'rp.permission_id', 'p.id')
    .where('ur.user_id', userId)
    .where('p.name', 'evaluations.create')
    .first();

  return !!result;
}
```

---

## Update 3.2: EnhanceUserWithRoles Method

### Update the Existing Method

```typescript
/**
 * Enhance a user object with their roles and referee information
 * @param user - The base user object
 * @returns Enhanced user with roles and computed properties
 */
async enhanceUserWithRoles(user: User): Promise<EnhancedUser> {
  try {
    // Get all roles for the user
    const roles = await this.getUserRoles(user.id);

    // Compute is_referee from roles (not stored in database)
    const isReferee = roles.some(r => r.name === 'Referee');

    // Get referee level if applicable
    const refereeLevel = isReferee ? await this.getRefereeLevel(user.id) : null;

    // Get referee-specific roles if applicable
    const refereeRoles = isReferee ? await this.getUserRefereeRoles(user.id) : [];

    // Check special capabilities
    const canMentor = isReferee ? await this.canMentor(user.id) : false;
    const canEvaluate = isReferee ? await this.canEvaluate(user.id) : false;

    // Build enhanced user object
    const enhancedUser: EnhancedUser = {
      ...user,
      roles,
      legacy_role: user.role || 'user', // Keep for backward compatibility
      is_referee: isReferee, // Computed property
      referee_level: refereeLevel,
      referee_roles: refereeRoles,
      role_names: roles.map(r => r.name),
      can_mentor: canMentor,
      can_evaluate: canEvaluate,
      // Keep white_whistle for UI display if needed
      should_display_white_whistle: refereeLevel === 'Senior Referee' ||
                                    refereeLevel === 'Head Referee'
    };

    // Add referee profile data if user is a referee
    if (isReferee && this.db.schema.hasTable('referees')) {
      const refereeProfile = await this.db('referees')
        .where('user_id', user.id)
        .first();

      if (refereeProfile) {
        enhancedUser.referee_profile = refereeProfile;
      }
    }

    return enhancedUser;
  } catch (error) {
    console.error(`Error enhancing user ${user.id}:`, error);
    // Return user with minimal enhancement on error
    return {
      ...user,
      roles: [],
      legacy_role: user.role || 'user',
      is_referee: false,
      role_names: []
    };
  }
}
```

---

## Update 3.3: GetReferees Method

### Replace Existing Implementation

```typescript
/**
 * Get all referees with filtering and pagination
 * @param filters - Optional filters for the query
 * @returns Paginated referee results
 */
async getReferees(filters?: {
  level?: string;
  available?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: EnhancedUser[], total: number }> {
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const offset = (page - 1) * limit;

  // Start with base query for all referees
  let query = this.db('users as u')
    .join('user_roles as ur', 'u.id', 'ur.user_id')
    .join('roles as r', 'ur.role_id', 'r.id')
    .where('r.name', 'Referee');

  // Count query (before pagination)
  let countQuery = this.db('users as u')
    .join('user_roles as ur', 'u.id', 'ur.user_id')
    .join('roles as r', 'ur.role_id', 'r.id')
    .where('r.name', 'Referee');

  // Apply filters
  if (filters?.available !== undefined) {
    query = query.where('u.is_available', filters.available);
    countQuery = countQuery.where('u.is_available', filters.available);
  }

  if (filters?.search) {
    const searchTerm = `%${filters.search}%`;
    query = query.where(function() {
      this.where('u.name', 'ILIKE', searchTerm)
        .orWhere('u.email', 'ILIKE', searchTerm);
    });
    countQuery = countQuery.where(function() {
      this.where('u.name', 'ILIKE', searchTerm)
        .orWhere('u.email', 'ILIKE', searchTerm);
    });
  }

  // Filter by referee level if specified
  if (filters?.level) {
    // Need to join again to check for specialization role
    query = query
      .join('user_roles as ur2', 'u.id', 'ur2.user_id')
      .join('roles as r2', 'ur2.role_id', 'r2.id')
      .where('r2.name', filters.level);

    countQuery = countQuery
      .join('user_roles as ur2', 'u.id', 'ur2.user_id')
      .join('roles as r2', 'ur2.role_id', 'r2.id')
      .where('r2.name', filters.level);
  }

  // Get total count
  const [{ count }] = await countQuery
    .countDistinct('u.id as count');

  // Get paginated results
  const referees = await query
    .distinct('u.*')
    .orderBy('u.name', 'asc')
    .limit(limit)
    .offset(offset);

  // Enhance all referees with their roles
  const enhancedReferees = await Promise.all(
    referees.map(ref => this.enhanceUserWithRoles(ref))
  );

  return {
    data: enhancedReferees,
    total: parseInt(count as string, 10)
  };
}
```

---

## Update 3.4: Assignment and Mentorship Queries

### Fix Queries Looking for user_referee_roles

```typescript
/**
 * Get eligible referees for a game assignment
 * @param gameId - The game ID
 * @returns Array of eligible referees
 */
async getEligibleRefereesForGame(gameId: UUID): Promise<EnhancedUser[]> {
  // Instead of querying user_referee_roles table
  const referees = await this.db('users as u')
    .join('user_roles as ur', 'u.id', 'ur.user_id')
    .join('roles as r', 'ur.role_id', 'r.id')
    .leftJoin('game_assignments as ga', function() {
      this.on('u.id', 'ga.referee_id')
        .andOn('ga.game_id', this.db.raw('?', [gameId]));
    })
    .where('r.name', 'Referee')
    .where('u.is_available', true)
    .whereNull('ga.id') // Not already assigned to this game
    .distinct('u.*');

  return Promise.all(
    referees.map(ref => this.enhanceUserWithRoles(ref))
  );
}

/**
 * Get mentees for a mentor
 * @param mentorId - The mentor's user ID
 * @returns Array of mentee users
 */
async getMentees(mentorId: UUID): Promise<EnhancedUser[]> {
  // Check if user can mentor
  const canMentor = await this.canMentor(mentorId);
  if (!canMentor) {
    return [];
  }

  // Get mentees from mentorship relationships
  const mentees = await this.db('mentorships as m')
    .join('users as u', 'm.mentee_id', 'u.id')
    .where('m.mentor_id', mentorId)
    .where('m.is_active', true)
    .select('u.*');

  return Promise.all(
    mentees.map(mentee => this.enhanceUserWithRoles(mentee))
  );
}
```

---

## Update 3.5: Role Assignment Methods

### Add Helper Methods for Role Management

```typescript
/**
 * Assign a referee role to a user
 * @param userId - The user to assign role to
 * @param roleName - The referee role name
 * @param assignedBy - The user making the assignment
 */
async assignRefereeRole(
  userId: UUID,
  roleName: 'Rookie Referee' | 'Junior Referee' | 'Senior Referee' | 'Head Referee' | 'Referee Coach',
  assignedBy: UUID
): Promise<void> {
  // First ensure user has base Referee role
  const hasBaseRole = await this.isReferee(userId);
  if (!hasBaseRole) {
    const refereeRole = await this.db('roles')
      .where('name', 'Referee')
      .first();

    if (refereeRole) {
      await this.db('user_roles').insert({
        user_id: userId,
        role_id: refereeRole.id,
        assigned_at: this.db.fn.now(),
        assigned_by: assignedBy
      }).onConflict(['user_id', 'role_id']).ignore();
    }
  }

  // Get the specialization role
  const role = await this.db('roles')
    .where('name', roleName)
    .first();

  if (!role) {
    throw new Error(`Role ${roleName} not found`);
  }

  // Remove other referee specialization roles (user can only have one)
  const otherRefereeRoles = await this.db('roles')
    .whereIn('name', [
      'Rookie Referee',
      'Junior Referee',
      'Senior Referee',
      'Head Referee',
      'Referee Coach'
    ])
    .where('name', '!=', roleName)
    .select('id');

  if (otherRefereeRoles.length > 0) {
    await this.db('user_roles')
      .where('user_id', userId)
      .whereIn('role_id', otherRefereeRoles.map(r => r.id))
      .delete();
  }

  // Assign the new specialization role
  await this.db('user_roles').insert({
    user_id: userId,
    role_id: role.id,
    assigned_at: this.db.fn.now(),
    assigned_by: assignedBy
  }).onConflict(['user_id', 'role_id']).ignore();
}

/**
 * Promote a referee to the next level
 * @param userId - The referee to promote
 * @param promotedBy - The user making the promotion
 */
async promoteReferee(userId: UUID, promotedBy: UUID): Promise<string> {
  const currentLevel = await this.getRefereeLevel(userId);

  let newLevel: string;
  switch (currentLevel) {
    case 'Rookie Referee':
      newLevel = 'Junior Referee';
      break;
    case 'Junior Referee':
      newLevel = 'Senior Referee';
      break;
    case 'Senior Referee':
      newLevel = 'Head Referee';
      break;
    default:
      throw new Error('Cannot promote from current level');
  }

  await this.assignRefereeRole(
    userId,
    newLevel as any,
    promotedBy
  );

  return newLevel;
}
```

---

## Update 3.6: Service Initialization Fix

### File Location
`/backend/src/services/BaseService.ts`

### Ensure Proper Initialization

```typescript
export class BaseService {
  protected tableName: string;
  protected db: Database;

  constructor(tableName: string, db: Database) {
    if (!tableName) {
      throw new Error('BaseService requires tableName parameter');
    }
    if (!db) {
      throw new Error('BaseService requires db parameter');
    }

    this.tableName = tableName;
    this.db = db;
  }

  // ... rest of BaseService implementation
}
```

### Update All Service Constructors

```typescript
// Example for CommunicationService
export class CommunicationService extends BaseService {
  constructor(db: Database) {
    super('communications', db); // Pass table name!
  }
}

// Example for PermissionService
export class PermissionService extends BaseService {
  constructor(db: Database) {
    super('permissions', db); // Pass table name!
  }
}
```

---

## Update 3.7: API Response Formatters

### Update Response Types

```typescript
// In /backend/src/types/index.ts or similar

export interface RefereeListResponse {
  referees: EnhancedUser[];
  total: number;
  page: number;
  limit: number;
  levels: string[]; // Available referee levels for filtering
}

export interface RefereeDetailsResponse {
  referee: EnhancedUser;
  assignments: any[];
  evaluations: any[];
  mentees?: EnhancedUser[]; // Only if they can mentor
}
```

---

## Testing Service Updates

### Test Commands

```typescript
// Test in Node REPL or create test file
const db = require('./backend/src/config/database').default;
const { UserService } = require('./backend/src/services/UserService');

const userService = new UserService(db.getKnex());

// Test isReferee
const userId = 'some-user-id';
const isRef = await userService.isReferee(userId);
console.log('Is referee:', isRef);

// Test getAllReferees
const allRefs = await userService.getAllReferees();
console.log('Total referees:', allRefs.length);

// Test getRefereeLevel
const level = await userService.getRefereeLevel(userId);
console.log('Referee level:', level);
```

---

## Expected Results

After implementing these service updates:

✅ `isReferee()` returns true for users with Referee role
✅ `getRefereeLevel()` returns correct specialization
✅ `getAllReferees()` returns all users with Referee role
✅ `getUserRefereeRoles()` works without user_referee_roles table
✅ `enhanceUserWithRoles()` computes is_referee from roles
✅ No queries to non-existent user_referee_roles table
✅ All referee queries use the new role structure

---

## Notes for Agent Implementation

1. **Update incrementally** - Test each method after implementation
2. **Handle missing data gracefully** - Return empty arrays/false rather than throwing
3. **Keep backward compatibility** - Maintain legacy_role field for now
4. **Use transactions for role assignments** - Ensure consistency
5. **Cache role lookups** - Consider caching role IDs to reduce queries