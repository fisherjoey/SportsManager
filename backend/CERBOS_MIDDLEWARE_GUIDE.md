# Cerbos Middleware Integration Guide

This guide explains how to use the new Cerbos-based authorization middleware in the Sports Management API.

## Overview

The new Cerbos middleware provides fine-grained, policy-based access control that replaces the simple permission-based system. It supports:

- **Organization-based multi-tenancy**: Users can only access resources in their organization
- **Region-based access control**: Users can be restricted to specific regions within an organization
- **Resource-level authorization**: Permissions can vary based on resource attributes (e.g., game status, creator)
- **Role-based policies**: Different roles (assignor, referee, admin) have different capabilities
- **Flexible permission checks**: Support for single actions or multiple actions

## Key Components

### 1. Middleware: `requireCerbosPermission`

Located in `src/middleware/requireCerbosPermission.ts`

The main middleware function that checks if a user has permission to perform an action on a resource.

### 2. Auth Context Helpers

Located in `src/utils/auth-context.ts`

Helper functions to extract authentication context from requests:
- `getAuthContext(req)` - Get full auth context (user, org, regions)
- `getOrganizationId(req)` - Extract organization ID
- `getPrimaryRegionId(req)` - Extract primary region ID
- `getRegionIds(req)` - Extract all region IDs
- `createPrincipalFromRequest(req)` - Create Cerbos principal from request
- `createResourceFromRequest(req, type, attrs)` - Create Cerbos resource
- `hasOrganizationAccess(req, orgId)` - Check org access

### 3. Cerbos Helpers

Located in `src/utils/cerbos-helpers.ts`

Functions to convert application data to Cerbos format:
- `toPrincipal(user, orgId, primaryRegionId, regionIds)` - Convert user to principal
- `toResource(type, data)` - Convert resource data to Cerbos resource
- `createGameResource(game)` - Create game resource
- `createAssignmentResource(assignment)` - Create assignment resource
- `createRefereeResource(referee)` - Create referee resource

## Usage Examples

### Basic Permission Check

Check if user can view a game:

```typescript
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';

router.get(
  '/games/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'game',
    action: 'view',
  }),
  async (req, res) => {
    // User has permission, handle request
  }
);
```

### Permission Check with Resource Attributes

Check permissions based on resource attributes from database:

```typescript
router.put(
  '/games/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'game',
    action: 'update',
    getResourceId: (req) => req.params.id,
    getResourceAttributes: async (req) => {
      const game = await db('games')
        .select('organization_id', 'region_id', 'created_by', 'status')
        .where('id', req.params.id)
        .first();

      if (!game) {
        throw new Error('Game not found');
      }

      return {
        organizationId: game.organization_id,
        regionId: game.region_id,
        createdBy: game.created_by,
        status: game.status,
      };
    },
  }),
  async (req, res) => {
    // User has permission to update this specific game
  }
);
```

### Multiple Action Check

Require multiple permissions (e.g., view AND update):

```typescript
router.post(
  '/games/:id/assignments',
  authenticateToken,
  requireCerbosPermission({
    resource: 'game',
    actions: ['view', 'update'], // User needs BOTH permissions
    getResourceId: (req) => req.params.id,
    getResourceAttributes: async (req) => {
      const game = await db('games')
        .select('organization_id', 'region_id', 'status')
        .where('id', req.params.id)
        .first();

      return {
        organizationId: game.organization_id,
        regionId: game.region_id,
        status: game.status,
      };
    },
  }),
  async (req, res) => {
    // User can view and update the game
  }
);
```

### Custom Error Messages

Provide user-friendly error messages:

```typescript
router.delete(
  '/games/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'game',
    action: 'delete',
    getResourceId: (req) => req.params.id,
    forbiddenMessage: 'You do not have permission to delete this game',
  }),
  async (req, res) => {
    // User can delete the game
  }
);
```

### Custom Resource ID Resolution

When the resource ID is not in `req.params.id`:

```typescript
router.post(
  '/assignments',
  authenticateToken,
  requireCerbosPermission({
    resource: 'assignment',
    action: 'create',
    getResourceId: (req) => req.body.gameId, // ID from body
  }),
  async (req, res) => {
    // User can create assignment
  }
);
```

## Middleware Options

### `RequireCerbosPermissionOptions`

```typescript
interface RequireCerbosPermissionOptions {
  // The type of resource (game, assignment, referee, etc.)
  resource: ResourceType;

  // Single action to check
  action?: ResourceAction;

  // Multiple actions to check (all must pass)
  actions?: ResourceAction[];

  // Function to extract resource ID from request
  getResourceId?: (req: Request) => string;

  // Function to fetch resource attributes from database
  getResourceAttributes?: (req: Request) => Promise<Record<string, any>>;

  // Custom error message when permission denied
  forbiddenMessage?: string;
}
```

## Migration from Old Permission System

### Before (Old System)

```typescript
router.post(
  '/games',
  authenticateToken,
  requirePermission('games:create'),
  async (req, res) => {
    // Handle request
  }
);
```

### After (Cerbos System)

```typescript
router.post(
  '/games',
  authenticateToken,
  requireCerbosPermission({
    resource: 'game',
    action: 'create',
  }),
  async (req, res) => {
    // Handle request
  }
);
```

### Migration Benefits

1. **Organization Isolation**: Automatic enforcement of org boundaries
2. **Region-Based Access**: Support for regional hierarchies
3. **Resource-Level Control**: Permissions based on resource state
4. **Policy Centralization**: Authorization logic in Cerbos policies, not code
5. **Audit Trail**: Built-in permission check logging

## Resource Types and Actions

### Game Resource

**Type**: `'game'`

**Actions**:
- `'view'` - View game details
- `'create'` - Create new game
- `'update'` - Update game details
- `'delete'` - Delete game
- `'assign'` - Assign referees to game

**Attributes**:
- `organizationId` - Organization that owns the game
- `regionId` - Region where game is played
- `createdBy` - User who created the game
- `status` - Game status (scheduled, in_progress, completed, cancelled)
- `level` - Competition level
- `date` - Game date

### Assignment Resource

**Type**: `'assignment'`

**Actions**:
- `'view'` - View assignment details
- `'create'` - Create new assignment
- `'update'` - Update assignment
- `'delete'` - Delete assignment
- `'accept'` - Accept assignment (referee)
- `'decline'` - Decline assignment (referee)

**Attributes**:
- `organizationId` - Organization
- `gameId` - Associated game
- `refereeId` - Assigned referee
- `status` - Assignment status
- `position` - Referee position

### Referee Resource

**Type**: `'referee'`

**Actions**:
- `'view'` - View referee profile
- `'create'` - Create referee profile
- `'update'` - Update referee profile
- `'delete'` - Delete referee profile
- `'assign'` - Assign to games

**Attributes**:
- `organizationId` - Organization
- `userId` - Associated user
- `certificationLevel` - Referee certification
- `primaryRegionId` - Primary region
- `isAvailable` - Availability status

## Testing

### Unit Tests

Tests for middleware: `src/middleware/__tests__/requireCerbosPermission.test.ts`
Tests for auth helpers: `src/utils/__tests__/auth-context.test.ts`
Tests for Cerbos helpers: `src/utils/__tests__/cerbos-helpers.test.ts`

### Integration Tests

Full auth flow tests: `src/__tests__/auth-flow-integration.test.ts`

Run tests:
```bash
npm test -- requireCerbosPermission.test.ts
npm test -- auth-context.test.ts
npm test -- auth-flow-integration.test.ts
```

## Best Practices

1. **Always Use `authenticateToken` First**: The Cerbos middleware requires an authenticated user
   ```typescript
   router.get('/', authenticateToken, requireCerbosPermission(...), handler);
   ```

2. **Fetch Resource Attributes**: For update/delete operations, always fetch resource attributes
   ```typescript
   getResourceAttributes: async (req) => {
     const resource = await db('table').where('id', req.params.id).first();
     return { organizationId: resource.organization_id, ... };
   }
   ```

3. **Handle Not Found**: Throw errors in `getResourceAttributes` if resource doesn't exist
   ```typescript
   if (!game) {
     throw new Error('Game not found');
   }
   ```

4. **Use Custom Messages**: Provide clear error messages for better UX
   ```typescript
   forbiddenMessage: 'You cannot delete games that have started'
   ```

5. **Cache Permission Checks**: The Cerbos service has built-in caching (5 minutes by default)

6. **Log Permission Denials**: Use `res.locals.cerbosResult` to access permission check results

## Troubleshooting

### "User not authenticated" Error

**Cause**: Missing or incorrect `authenticateToken` middleware

**Solution**: Ensure `authenticateToken` is before `requireCerbosPermission`

### "Failed to check permissions" Error

**Cause**: Cerbos service connection issue or error in `getResourceAttributes`

**Solution**: Check Cerbos service is running and `getResourceAttributes` doesn't throw

### Permission Always Denied

**Cause**: Incorrect resource attributes or missing Cerbos policy

**Solution**:
1. Check that resource attributes match policy expectations
2. Verify Cerbos policies are loaded
3. Check user's organization and region IDs are set

### Tests Failing

**Cause**: Mock configuration issues

**Solution**: Ensure all mocks (CerbosAuthService, cerbos-helpers, logger) are properly set up

## Example Route File

See `src/routes/games-cerbos-example.ts` for a complete example of using Cerbos middleware in a route file.

## Next Steps

1. Review Cerbos policies in the Cerbos repository
2. Migrate existing routes one at a time
3. Update frontend to handle new error messages
4. Add integration tests for critical paths
5. Monitor permission check performance