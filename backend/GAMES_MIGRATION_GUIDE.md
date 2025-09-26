# Games Routes Migration to Cerbos

This document details the migration of games routes from the legacy permission system to Cerbos authorization.

## Migration Summary

**Status**: ✅ Complete
**Date**: 2025-09-26
**Routes Migrated**: 7 endpoints
**Testing Status**: Pending manual testing

## Routes Migrated

### 1. GET /api/games (List Games)

**Old Middleware:**
```typescript
authenticateToken, enhancedAsyncHandler(getGames)
```

**New Middleware:**
```typescript
authenticateToken, requireCerbosPermission({
  resource: 'game',
  action: 'list',
}), enhancedAsyncHandler(getGames)
```

**Changes:**
- Added Cerbos permission check for `list` action
- No resource attributes needed (listing doesn't require specific resource)
- User's organization and region context automatically applied

**Policy Behavior:**
- Admins: Can list all games in their organization
- Assignors: Can list games in their regions
- Referees: Can list games in their regions
- Guests: Denied

---

### 2. GET /api/games/:id (Get Game Details)

**Old Middleware:**
```typescript
authenticateToken, validateIdParam, enhancedAsyncHandler(getGameById)
```

**New Middleware:**
```typescript
authenticateToken, validateIdParam, requireCerbosPermission({
  resource: 'game',
  action: 'view',
  getResourceId: (req) => req.params.id,
  getResourceAttributes: async (req) => await getGameResourceAttributes(req.params.id),
}), enhancedAsyncHandler(getGameById)
```

**Changes:**
- Added Cerbos permission check for `view` action
- Fetches game attributes from database (org, region, creator, status)
- Resource-level authorization based on game properties

**Policy Behavior:**
- Admins: Can view all games in their organization
- Assignors: Can view games in their regions
- Referees: Can view games in their regions or assigned to them
- Guests: Denied

---

### 3. POST /api/games (Create Game)

**Old Middleware:**
```typescript
authenticateToken, requirePermission('games:create'),
validateBody(gameSchema), enhancedAsyncHandler(createGame)
```

**New Middleware:**
```typescript
authenticateToken, requireCerbosPermission({
  resource: 'game',
  action: 'create',
}), validateBody(gameSchema), enhancedAsyncHandler(createGame)
```

**Changes:**
- Replaced `requirePermission` with `requireCerbosPermission`
- Simple action check, no resource lookup needed
- User's organization context automatically applied

**Policy Behavior:**
- Admins: Can create games in their organization
- Assignors: Can create games in their regions
- Referees: Denied
- Guests: Denied

---

### 4. PUT /api/games/:id (Update Game)

**Old Middleware:**
```typescript
authenticateToken, requireAnyPermission(['games:update', 'games:manage']),
validateParams(IdParamSchema), validateBody(gameUpdateSchema),
enhancedAsyncHandler(updateGame)
```

**New Middleware:**
```typescript
authenticateToken, requireCerbosPermission({
  resource: 'game',
  action: 'update',
  getResourceId: (req) => req.params.id,
  getResourceAttributes: async (req) => await getGameResourceAttributes(req.params.id),
}), validateParams(IdParamSchema), validateBody(gameUpdateSchema),
enhancedAsyncHandler(updateGame)
```

**Changes:**
- Replaced `requireAnyPermission` with `requireCerbosPermission`
- Fetches game attributes to check permissions
- Enforces status-based restrictions (can't update in-progress games)

**Policy Behavior:**
- Admins: Can update all games in their organization
- Assignors: Can update games they own if status is "scheduled" or "pending"
- Assignors: Must be in same region
- Assignors: Must be in same organization
- Referees: Denied
- Guests: Denied

---

### 5. PATCH /api/games/:id/status (Update Game Status)

**Old Middleware:**
```typescript
authenticateToken, requireAnyPermission(['games:update', 'games:manage']),
enhancedAsyncHandler(updateGameStatus)
```

**New Middleware:**
```typescript
authenticateToken, requireCerbosPermission({
  resource: 'game',
  action: 'update',
  getResourceId: (req) => req.params.id,
  getResourceAttributes: async (req) => await getGameResourceAttributes(req.params.id),
}), enhancedAsyncHandler(updateGameStatus)
```

**Changes:**
- Replaced `requireAnyPermission` with `requireCerbosPermission`
- Uses same `update` action as PUT (status is just another update)
- Same permission rules as full update

**Policy Behavior:**
- Same as PUT /api/games/:id

---

### 6. DELETE /api/games/:id (Delete Game)

**Old Middleware:**
```typescript
authenticateToken, requirePermission('games:delete'),
enhancedAsyncHandler(deleteGame)
```

**New Middleware:**
```typescript
authenticateToken, requireCerbosPermission({
  resource: 'game',
  action: 'delete',
  getResourceId: (req) => req.params.id,
  getResourceAttributes: async (req) => await getGameResourceAttributes(req.params.id),
  forbiddenMessage: 'You do not have permission to delete this game',
}), enhancedAsyncHandler(deleteGame)
```

**Changes:**
- Replaced `requirePermission` with `requireCerbosPermission`
- Fetches game attributes to check permissions
- Added custom error message for better UX
- Enforces strict deletion rules

**Policy Behavior:**
- Admins: Can delete all games in their organization
- Assignors: Can ONLY delete games they created
- Assignors: Game must have status "scheduled" (not in-progress or completed)
- Assignors: Must be in same organization
- Referees: Denied
- Guests: Denied

---

### 7. POST /api/games/bulk-import (Bulk Import Games)

**Old Middleware:**
```typescript
authenticateToken, requireAnyPermission(['games:create', 'games:manage']),
enhancedAsyncHandler(bulkImportGames)
```

**New Middleware:**
```typescript
authenticateToken, requireCerbosPermission({
  resource: 'game',
  action: 'create',
}), enhancedAsyncHandler(bulkImportGames)
```

**Changes:**
- Replaced `requireAnyPermission` with `requireCerbosPermission`
- Uses same `create` action as single game creation
- Bulk operations inherit same permissions as single operations

**Policy Behavior:**
- Same as POST /api/games (create)

---

## Key Changes

### 1. Middleware Replacement

**Before:**
```typescript
requirePermission('games:create')
requireAnyPermission(['games:update', 'games:manage'])
```

**After:**
```typescript
requireCerbosPermission({
  resource: 'game',
  action: 'create' | 'view' | 'update' | 'delete' | 'list'
})
```

### 2. Resource Attributes

For routes that access specific games (GET/:id, PUT/:id, PATCH/:id/status, DELETE/:id), we now fetch resource attributes:

```typescript
getResourceAttributes: async (req) => await getGameResourceAttributes(req.params.id)
```

This helper function fetches:
- `organizationId`: Which organization owns the game
- `regionId`: Which region the game is in
- `createdBy`: User who created the game
- `status`: Current game status (scheduled, in_progress, completed, etc.)
- `level`: Competition level
- `gameType`: Type of game
- `dateTime`: When the game is scheduled

These attributes are used by Cerbos policies to make fine-grained authorization decisions.

### 3. Organization & Region Context

The middleware automatically extracts from `req.user`:
- `organizationId`: User's organization
- `primaryRegionId`: User's primary region
- `regionIds`: All regions user has access to

This context is sent to Cerbos with every permission check.

## Helper Functions

### getGameResourceAttributes(gameId: string)

Located in `src/middleware/cerbos-migration-helpers.ts`

Fetches game attributes from the database for permission checking:

```typescript
const game = await db('games')
  .select('organization_id', 'region_id', 'created_by', 'status', ...)
  .where('id', gameId)
  .first();

if (!game) {
  throw new Error('Game not found');
}

return {
  organizationId: game.organization_id,
  regionId: game.region_id,
  createdBy: game.created_by,
  status: game.status,
  // ...
};
```

**Error Handling:**
- Throws `Error('Game not found')` if game doesn't exist
- Caught by middleware and returned as 500 error
- Frontend should handle both 404 (game not found) and 403 (permission denied)

## Testing

### Prerequisites

1. **Start Cerbos:**
   ```bash
   docker-compose -f docker-compose.cerbos.yml up -d
   ```

2. **Verify Cerbos Health:**
   ```bash
   curl http://localhost:3592/_cerbos/health
   ```

3. **Start Backend:**
   ```bash
   npm run dev
   ```

### Manual Testing Checklist

- [ ] **Admin User**
  - [ ] Can list all games in organization
  - [ ] Can view any game in organization
  - [ ] Can create games
  - [ ] Can update any game in organization
  - [ ] Can delete any game in organization

- [ ] **Assignor User**
  - [ ] Can list games in their regions
  - [ ] Can view games in their regions
  - [ ] Can create games in their regions
  - [ ] Can update games they own (if scheduled/pending)
  - [ ] Cannot update games they don't own
  - [ ] Cannot update in-progress games
  - [ ] Can delete games they own (if scheduled)
  - [ ] Cannot delete games they don't own
  - [ ] Cannot delete in-progress/completed games

- [ ] **Referee User**
  - [ ] Can list games in their regions
  - [ ] Can view games in their regions
  - [ ] Can view games they're assigned to
  - [ ] Cannot create games
  - [ ] Cannot update games
  - [ ] Cannot delete games

- [ ] **Guest User**
  - [ ] Cannot access any game endpoints

- [ ] **Cross-Organization**
  - [ ] Users cannot access games from other organizations
  - [ ] Users cannot view games from other organizations
  - [ ] Proper 403 errors returned

- [ ] **Cross-Region**
  - [ ] Assignors cannot access games outside their regions
  - [ ] Proper 403 errors returned

### Sample Test Requests

```bash
# List games (should respect region/org filters)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/games

# View specific game (checks resource permissions)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/games/game-123

# Create game (checks create permissions)
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "homeTeam": {...}, "awayTeam": {...}, ... }' \
  http://localhost:3000/api/games

# Update game (checks ownership, status, region)
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "location": "New Field", ... }' \
  http://localhost:3000/api/games/game-123

# Delete game (checks ownership, status)
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/games/game-123
```

## Rollback Plan

If issues are found:

1. **Keep both middleware temporarily:**
   ```typescript
   router.put('/:id',
     authenticateToken,
     requireAnyPermission(['games:update']), // OLD - fallback
     requireCerbosPermission({ ... }),        // NEW - additional check
     enhancedAsyncHandler(updateGame)
   );
   ```

2. **Remove Cerbos middleware if needed:**
   ```bash
   git revert <commit-hash>
   ```

3. **Check Cerbos logs for issues:**
   ```bash
   docker logs sportsmanager-cerbos | grep -i error
   ```

## Performance Considerations

### Database Queries

- **Simple routes (GET /games, POST /games)**: No additional queries
- **Resource routes (GET/:id, PUT/:id, DELETE/:id)**: 1 additional query to fetch attributes
- **Optimization**: Consider caching game attributes for frequently accessed games

### Cerbos Performance

- Built-in 5-minute cache for permission checks
- Fast gRPC communication (~3-5ms per check)
- No impact on application startup time

### Monitoring

Monitor these metrics:
- Cerbos response time (should be < 10ms)
- Cache hit rate (should be > 70%)
- 403 error rate (watch for policy issues)

## Known Issues

None currently identified.

## Next Steps

1. ✅ Games routes migrated
2. ⏳ Test in development environment
3. ⏳ Monitor Cerbos logs for errors
4. ⏳ Write integration tests
5. ⏳ Migrate assignments routes (Day 6)
6. ⏳ Migrate admin routes (Day 7)
7. ⏳ Deploy to staging
8. ⏳ Deploy to production

## Support

For issues or questions:
- Check Cerbos logs: `docker logs sportsmanager-cerbos`
- Review policies: `cerbos-policies/resources/game.yaml`
- Test policies: `docker run --rm -v $(pwd)/cerbos-policies:/policies:ro ghcr.io/cerbos/cerbos:latest compile --tests=/policies/tests /policies`

## References

- [Cerbos Middleware Guide](./CERBOS_MIDDLEWARE_GUIDE.md)
- [Policy Files](../cerbos-policies/)
- [Game Policy](../cerbos-policies/resources/game.yaml)
- [Policy Tests](../cerbos-policies/tests/game_tests.yaml)