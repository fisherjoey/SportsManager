# Cerbos Migration - Stage 1 Implementation Plan

**Branch:** `feat/cerbos-authorization-rebase`
**Status:** Planning Complete - Ready for Implementation
**Goal:** Remove broken auth implementation and establish Cerbos foundation

---

## 🎯 Stage 1 Objectives

1. **Audit and Document Current Broken Auth** ✅
2. **Plan Complete Removal of Old System**
3. **Design Multi-Tenancy Database Schema**
4. **Set Up Cerbos Infrastructure**
5. **Define Resource Model for Policies**
6. **Establish Clean Auth Patterns**

**Timeline:** Days 1-7 (Week 1)
**Risk Level:** Medium (foundational changes, but no business logic yet)

---

## 📊 Current State Audit (COMPLETED)

### What We Found - The Broken Auth Patterns

#### 1. **Inconsistent Role Checking (CRITICAL ISSUE)**

```typescript
// backend/src/middleware/auth.ts - Lines 101-106, 134-140, 168-169, 188-196, 236-244
// PROBLEM: Five different variations of admin checking!

// Variation 1:
if (userRoles.includes('admin') || userRoles.includes('Admin') ||
    userRoles.includes('Super Admin') || userRoles.includes('super admin') ||
    userRoles.includes('super_admin'))

// This pattern appears in:
// - requireRole middleware (lines 101-106)
// - requireAnyRole middleware (lines 134-140)
// - hasRole helper (line 168)
// - requirePermission middleware (lines 188-196)
// - requireAnyPermission middleware (lines 236-244)

// IMPACT: Case-sensitive bugs, unclear which variation is correct
// RISK: Authorization bypass if wrong case used
```

**Files Affected:** 76 route files use these inconsistent middlewares

#### 2. **Permission System Exists But Barely Used**

```typescript
// backend/src/middleware/auth.ts
// HAS: requirePermission, requireAnyPermission (lines 180-254)
// BUT: Most routes still use requireRole instead!

// Current usage:
// - 76 files use requireRole/requireAnyRole
// - 45 files have direct role checks (user.role/user.roles)
// - Only ~15 files actually use requirePermission properly
```

**Analysis:** You built a permission system but migration from role-based was incomplete.

#### 3. **No Multi-Tenancy**

```sql
-- Database Analysis
-- ❌ NO organization_id on any domain tables
-- ❌ NO region_id on users/games
-- ❌ Single organization_settings row (only 1 org supported)

-- Tables Missing Context:
-- - games (no org/region)
-- - assignments (no org/region)
-- - users (no org/region)
-- - referees (no org/region)
-- - expenses (no org)
-- - budgets (no org)
```

**Impact:** All users see all data. Can't isolate by organization or region.

#### 4. **Frontend Has RBAC UI, Backend is Inconsistent**

```
Frontend (Good):
✅ frontend/components/admin/rbac/ - Full RBAC management UI
✅ frontend/components/auth-provider.tsx - Proper permission checking
✅ frontend/hooks/usePermissions.ts - Clean permission hooks
✅ 161 frontend uses of hasPermission/hasRole

Backend (Broken):
❌ Routes use old requireRole middleware
❌ Inconsistent admin bypass logic
❌ Permission middleware exists but underutilized
❌ No contextual auth (org/region)
```

**Insight:** Frontend is ahead of backend. Good news: frontend patterns are clean!

#### 5. **Mock Fallback in PermissionService**

```typescript
// backend/src/middleware/auth.ts lines 20-33
try {
  permissionService = new PermissionService();
} catch (error) {
  console.error('Could not load PermissionService:', error.message);
  // Create a mock service to prevent runtime errors during compilation
  permissionService = {
    hasPermission: () => Promise.resolve(false),
    hasAnyPermission: () => Promise.resolve(false),
    // ...
  } as any;
}
```

**PROBLEM:** If PermissionService fails to load, all permission checks return FALSE
**RISK:** Silent failures, users mysteriously can't access anything
**ROOT CAUSE:** Likely TypeScript migration broke initialization

---

## 🗑️ What Will Be Removed (DELETE LIST)

### Backend Files to DELETE ENTIRELY

```
backend/src/middleware/auth.ts
  ├─ requireRole() - lines 90-116 ❌ DELETE
  ├─ requireAnyRole() - lines 123-151 ❌ DELETE
  ├─ hasRole() - lines 159-173 ❌ DELETE
  ├─ Admin bypass logic (5 locations) ❌ DELETE
  └─ Keep: authenticateToken() ✅ (JWT verification still needed)

backend/src/services/PermissionService.ts
  └─ KEEP but will be REPLACED by CerbosAuthService
     (Don't delete yet, gradual migration)
```

### Patterns to REMOVE from All Routes (76 files)

```typescript
// Pattern 1: requireRole middleware
router.get('/games', requireRole('admin'), ...); // ❌ DELETE

// Pattern 2: requireAnyRole middleware
router.post('/assignments', requireAnyRole('admin', 'assignor'), ...); // ❌ DELETE

// Pattern 3: Direct role checks (45 occurrences)
if (req.user.role === 'admin' || req.user.roles.includes('admin')) // ❌ DELETE

// Pattern 4: Hard-coded admin bypass
if (user.roles.includes('admin') || user.roles.includes('Admin')) // ❌ DELETE

// Pattern 5: No-op permission checks
if (!await permissionService.hasPermission(...)) {
  // But admin bypasses above this anyway
} // ❌ DELETE (will be replaced by Cerbos)
```

### Frontend - KEEP BUT ADAPT

```
✅ frontend/components/admin/rbac/* - KEEP (UI still needed)
✅ frontend/components/auth-provider.tsx - KEEP (adapt to call Cerbos)
✅ frontend/hooks/usePermissions.ts - KEEP (adapt to Cerbos decisions)

Changes needed:
- Update hasPermission() to call Cerbos API
- Update hasRole() to use Cerbos role checks
- Add hasAccess(resource, action) helper for Cerbos
```

**Key Point:** Frontend patterns are good. Just change where they call to (Cerbos instead of current backend).

---

## 🏗️ What Will Be Built (BUILD LIST)

### 1. Database Multi-Tenancy Schema

```sql
-- New Tables
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  parent_region_id UUID REFERENCES regions(id), -- For hierarchies
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

CREATE TABLE user_region_assignments (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'assignor', 'coordinator', etc.
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  expires_at TIMESTAMP,
  PRIMARY KEY (user_id, region_id, role)
);

-- Modify Existing Tables
ALTER TABLE users
  ADD COLUMN organization_id UUID REFERENCES organizations(id),
  ADD COLUMN primary_region_id UUID REFERENCES regions(id);

ALTER TABLE games
  ADD COLUMN organization_id UUID REFERENCES organizations(id),
  ADD COLUMN region_id UUID REFERENCES regions(id),
  ADD COLUMN created_by UUID REFERENCES users(id);

ALTER TABLE assignments
  ADD COLUMN organization_id UUID REFERENCES organizations(id);

ALTER TABLE referees
  ADD COLUMN organization_id UUID REFERENCES organizations(id),
  ADD COLUMN primary_region_id UUID REFERENCES regions(id);

ALTER TABLE expenses
  ADD COLUMN organization_id UUID REFERENCES organizations(id);

ALTER TABLE budgets
  ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Indexes for Performance
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_region ON users(primary_region_id);
CREATE INDEX idx_games_organization ON games(organization_id);
CREATE INDEX idx_games_region ON games(region_id);
CREATE INDEX idx_games_created_by ON games(created_by);
CREATE INDEX idx_assignments_organization ON assignments(organization_id);
CREATE INDEX idx_user_region_assignments_user ON user_region_assignments(user_id);
CREATE INDEX idx_user_region_assignments_region ON user_region_assignments(region_id);
```

**Migration Strategy:**
1. Create new tables (organizations, regions)
2. Add columns to existing tables (nullable at first)
3. Seed default organization ("Default Organization")
4. Migrate existing data (all users → default org)
5. Make columns NOT NULL after migration
6. Add foreign key constraints

### 2. Cerbos Deployment Setup

```yaml
# docker-compose.cerbos.yml
version: '3.8'

services:
  cerbos:
    image: ghcr.io/cerbos/cerbos:latest
    ports:
      - "3592:3592" # HTTP API
      - "3593:3593" # gRPC API (optional)
    volumes:
      - ./cerbos/policies:/policies:ro
      - ./cerbos/config:/config:ro
    command:
      - "server"
      - "--config=/config/config.yaml"
    environment:
      - CERBOS_LOG_LEVEL=info
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3592/_cerbos/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped

  # Optional: Cerbos playground for policy testing
  cerbos-playground:
    image: ghcr.io/cerbos/cerbos-playground:latest
    ports:
      - "3594:3594"
    depends_on:
      - cerbos
    environment:
      - CERBOS_SERVER=cerbos:3592
```

```yaml
# cerbos/config/config.yaml
server:
  httpListenAddr: ":3592"
  grpcListenAddr: ":3593"

storage:
  driver: "disk"
  disk:
    directory: "/policies"
    watchForChanges: true

audit:
  enabled: true
  backend: local
  local:
    storagePath: /var/log/cerbos/audit.log
    advanced:
      maxFileSize: 100
      maxFileAge: 30
```

**Deployment Options:**
- **Local Dev:** Docker Compose (above)
- **Staging:** Same Docker Compose
- **Production:**
  - Option A: Sidecar (deployed alongside each backend instance)
  - Option B: Dedicated service (2+ replicas for availability)

### 3. Resource Model Definition

```typescript
// backend/src/types/cerbos.types.ts

export type ResourceType =
  | 'game'
  | 'assignment'
  | 'referee'
  | 'user'
  | 'expense'
  | 'budget'
  | 'report'
  | 'financial_transaction'
  | 'document'
  | 'league'
  | 'team';

export type ResourceAction =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'assign_referee' // Game-specific
  | 'approve' // Expense/Budget-specific
  | 'publish' // Report-specific
  | 'manage_permissions'; // Admin-specific

export interface CerbosPrincipal {
  id: string;
  roles: string[];
  attr: {
    organization_id: string;
    primary_region_id?: string;
    cross_region_access?: string[]; // Array of region IDs
    email: string;
    level?: string; // For referees
  };
}

export interface CerbosResource {
  kind: ResourceType;
  id: string;
  attr: {
    organization_id: string;
    region_id?: string;
    created_by?: string;
    status?: string;
    [key: string]: any; // Additional resource-specific attributes
  };
}

export interface CerbosDecision {
  allowed: boolean;
  resource: CerbosResource;
  action: ResourceAction;
}
```

### 4. Cerbos Integration Service

```typescript
// backend/src/services/CerbosAuthService.ts

import { Cerbos } from '@cerbos/sdk';
import { CerbosPrincipal, CerbosResource, CerbosDecision, ResourceAction } from '../types/cerbos.types';

export class CerbosAuthService {
  private client: Cerbos;
  private cache: Map<string, { decision: boolean; timestamp: number }>;
  private cacheTTL: number;

  constructor() {
    this.client = new Cerbos({
      hostname: process.env.CERBOS_HOST || 'localhost:3592',
      tls: process.env.NODE_ENV === 'production'
    });

    this.cache = new Map();
    this.cacheTTL = parseInt(process.env.CERBOS_CACHE_TTL || '300000'); // 5 min default

    // Start cache cleanup
    this.startCacheCleanup();
  }

  /**
   * Check if principal can perform action on resource
   */
  async checkAccess(
    principal: CerbosPrincipal,
    resource: CerbosResource,
    action: ResourceAction
  ): Promise<boolean> {
    const cacheKey = this.getCacheKey(principal.id, resource.kind, resource.id, action);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.decision;
    }

    try {
      const result = await this.client.check({
        principal: {
          id: principal.id,
          roles: principal.roles,
          attr: principal.attr
        },
        resource: {
          kind: resource.kind,
          id: resource.id,
          attr: resource.attr
        },
        actions: [action]
      });

      const allowed = result.isAllowed(action);

      // Cache the result
      this.cache.set(cacheKey, { decision: allowed, timestamp: Date.now() });

      return allowed;
    } catch (error) {
      console.error('Cerbos check failed:', error);

      // Fail closed: deny access if Cerbos is unavailable
      // TODO: Add circuit breaker pattern for graceful degradation
      return false;
    }
  }

  /**
   * Bulk check multiple actions on same resource
   */
  async checkMultipleActions(
    principal: CerbosPrincipal,
    resource: CerbosResource,
    actions: ResourceAction[]
  ): Promise<Record<ResourceAction, boolean>> {
    try {
      const result = await this.client.check({
        principal: {
          id: principal.id,
          roles: principal.roles,
          attr: principal.attr
        },
        resource: {
          kind: resource.kind,
          id: resource.id,
          attr: resource.attr
        },
        actions
      });

      const decisions: Record<string, boolean> = {};
      actions.forEach(action => {
        decisions[action] = result.isAllowed(action);
      });

      return decisions as Record<ResourceAction, boolean>;
    } catch (error) {
      console.error('Cerbos bulk check failed:', error);

      // Fail closed: deny all actions
      const decisions: Record<string, boolean> = {};
      actions.forEach(action => {
        decisions[action] = false;
      });
      return decisions as Record<ResourceAction, boolean>;
    }
  }

  /**
   * Helper: Require access or throw
   */
  async requireAccess(
    principal: CerbosPrincipal,
    resource: CerbosResource,
    action: ResourceAction
  ): Promise<void> {
    const allowed = await this.checkAccess(principal, resource, action);
    if (!allowed) {
      throw new ForbiddenError(
        `Access denied: Cannot ${action} ${resource.kind}:${resource.id}`
      );
    }
  }

  /**
   * Clear cache for specific user (after role/permission changes)
   */
  clearUserCache(userId: string): void {
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  private getCacheKey(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string
  ): string {
    return `${userId}:${resourceType}:${resourceId}:${action}`;
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > this.cacheTTL) {
          this.cache.delete(key);
        }
      }
    }, this.cacheTTL);
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Simple check: try to query Cerbos
      await this.client.check({
        principal: { id: 'health-check', roles: [] },
        resource: { kind: 'game', id: 'health-check' },
        actions: ['view']
      });
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const cerbosAuthService = new CerbosAuthService();
```

### 5. Helper Functions (Principal/Resource Builders)

```typescript
// backend/src/utils/cerbos-helpers.ts

import { CerbosPrincipal, CerbosResource, ResourceType } from '../types/cerbos.types';
import { User, GameEntity, AssignmentEntity } from '../types';

/**
 * Convert Express user to Cerbos principal
 */
export function toPrincipal(user: User, additionalContext?: Record<string, any>): CerbosPrincipal {
  return {
    id: user.id,
    roles: user.roles || [],
    attr: {
      organization_id: user.organization_id,
      primary_region_id: user.primary_region_id,
      cross_region_access: user.cross_region_ids || [],
      email: user.email,
      level: user.level,
      ...additionalContext
    }
  };
}

/**
 * Convert domain object to Cerbos resource
 */
export function toResource(
  type: ResourceType,
  entity: any,
  additionalContext?: Record<string, any>
): CerbosResource {
  return {
    kind: type,
    id: entity.id,
    attr: {
      organization_id: entity.organization_id,
      region_id: entity.region_id,
      created_by: entity.created_by,
      status: entity.status,
      ...additionalContext
    }
  };
}

/**
 * Game-specific resource builder
 */
export function gameToResource(game: GameEntity): CerbosResource {
  return toResource('game', game, {
    level: game.level,
    date_time: game.date_time,
    is_published: game.status === 'published'
  });
}

/**
 * Assignment-specific resource builder
 */
export function assignmentToResource(assignment: AssignmentEntity): CerbosResource {
  return toResource('assignment', assignment, {
    referee_id: assignment.user_id,
    game_id: assignment.game_id
  });
}

// Add more resource builders as needed...
```

### 6. New Auth Middleware (Cerbos-based)

```typescript
// backend/src/middleware/cerbos-auth.ts

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
import { cerbosAuthService } from '../services/CerbosAuthService';
import { toPrincipal, toResource } from '../utils/cerbos-helpers';
import { ResourceType, ResourceAction } from '../types/cerbos.types';
import { ForbiddenError } from '../utils/errors';

/**
 * Middleware factory: Require Cerbos permission
 *
 * Usage:
 *   router.get('/games/:id', requireCerbosPermission('game', 'view'), ...)
 */
export function requireCerbosPermission(
  resourceType: ResourceType,
  action: ResourceAction,
  resourceLoader?: (req: AuthenticatedRequest) => Promise<any>
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Build principal
      const principal = toPrincipal(req.user);

      // Load resource if loader provided, otherwise use route params
      let resource;
      if (resourceLoader) {
        const entity = await resourceLoader(req);
        resource = toResource(resourceType, entity);
      } else {
        // Default: Use route params to build minimal resource
        resource = {
          kind: resourceType,
          id: req.params.id || 'collection', // 'collection' for list endpoints
          attr: {
            organization_id: req.user.organization_id // Scope to user's org
          }
        };
      }

      // Check permission
      const allowed = await cerbosAuthService.checkAccess(principal, resource, action);

      if (!allowed) {
        res.status(403).json({
          error: 'Access denied',
          resource: resourceType,
          action: action
        });
        return;
      }

      // Store resource in request for use in handler
      req.cerbosResource = resource;
      next();
    } catch (error) {
      console.error('Cerbos middleware error:', error);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

/**
 * Middleware factory: Check permission in handler (for complex cases)
 *
 * Usage:
 *   router.post('/games/:id/assign', withCerbosContext(), async (req, res) => {
 *     await requireCerbosAccess(req, 'game', req.params.id, 'assign_referee');
 *     // ... business logic
 *   })
 */
export function withCerbosContext() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Attach helper to request
    req.checkCerbosAccess = async (resourceType, resourceId, action, resourceAttrs = {}) => {
      const principal = toPrincipal(req.user!);
      const resource = {
        kind: resourceType,
        id: resourceId,
        attr: {
          organization_id: req.user!.organization_id,
          ...resourceAttrs
        }
      };

      const allowed = await cerbosAuthService.checkAccess(principal, resource, action);
      if (!allowed) {
        throw new ForbiddenError(`Cannot ${action} ${resourceType}:${resourceId}`);
      }
    };

    next();
  };
}
```

### 7. Initial Cerbos Policies (Starter Set)

```yaml
# cerbos/policies/_schemas.yaml
# Define common schemas for reuse

---
apiVersion: api.cerbos.dev/v1
schemas:
  principalSchema:
    ref: "#/definitions/Principal"
    definitions:
      Principal:
        type: object
        required: [organization_id]
        properties:
          organization_id:
            type: string
          primary_region_id:
            type: string
          cross_region_access:
            type: array
            items:
              type: string
          email:
            type: string
          level:
            type: string

  resourceSchema:
    ref: "#/definitions/Resource"
    definitions:
      Resource:
        type: object
        required: [organization_id]
        properties:
          organization_id:
            type: string
          region_id:
            type: string
          created_by:
            type: string
          status:
            type: string
```

```yaml
# cerbos/policies/game.yaml
# Game resource authorization policy

---
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  resource: "game"
  version: "default"
  importDerivedRoles:
    - common_roles

  rules:
    #============================================
    # SUPER ADMIN - Full Access
    #============================================
    - actions: ['*']
      effect: ALLOW
      roles: ['Super Admin']
      name: super-admin-full-access

    #============================================
    # VIEW ACCESS
    #============================================
    - actions: ['view']
      effect: ALLOW
      roles: ['Admin', 'Regional Coordinator', 'Assignment Manager', 'Referee Coordinator', 'Referee']
      condition:
        match:
          # Must be in same organization
          expr: resource.attr.organization_id == principal.attr.organization_id
      name: view-in-organization

    #============================================
    # CREATE ACCESS
    #============================================
    - actions: ['create']
      effect: ALLOW
      roles: ['Admin', 'Assignment Manager']
      condition:
        match:
          # Can only create in own organization
          expr: resource.attr.organization_id == principal.attr.organization_id
      name: create-in-organization

    #============================================
    # UPDATE/DELETE ACCESS
    #============================================
    - actions: ['update', 'delete']
      effect: ALLOW
      roles: ['Admin']
      condition:
        match:
          expr: resource.attr.organization_id == principal.attr.organization_id
      name: admin-manage-games

    # Assignment Managers can update games they created
    - actions: ['update']
      effect: ALLOW
      roles: ['Assignment Manager']
      condition:
        match:
          all:
            of:
              - expr: resource.attr.organization_id == principal.attr.organization_id
              - expr: resource.attr.created_by == principal.id
      name: update-own-games

    #============================================
    # ASSIGN REFEREE (Complex Rule)
    #============================================
    # Regional Coordinators can assign anywhere in their org
    - actions: ['assign_referee']
      effect: ALLOW
      roles: ['Regional Coordinator']
      condition:
        match:
          expr: resource.attr.organization_id == principal.attr.organization_id
      name: regional-coordinator-assign-anywhere

    # Assignors can assign in their region OR regions they have cross-access to
    - actions: ['assign_referee']
      effect: ALLOW
      roles: ['Assignment Manager']
      condition:
        match:
          all:
            of:
              - expr: resource.attr.organization_id == principal.attr.organization_id
              - expr: |
                  resource.attr.region_id == principal.attr.primary_region_id ||
                  resource.attr.region_id in principal.attr.cross_region_access
      name: assignor-regional-access
```

```yaml
# cerbos/policies/common_roles.yaml
# Derived roles that can be reused across policies

---
apiVersion: api.cerbos.dev/v1
derivedRoles:
  name: common_roles
  definitions:
    # Resource owner
    - name: owner
      parentRoles: ['*']
      condition:
        match:
          expr: resource.attr.created_by == principal.id

    # Same organization
    - name: org_member
      parentRoles: ['*']
      condition:
        match:
          expr: resource.attr.organization_id == principal.attr.organization_id

    # Same region
    - name: region_member
      parentRoles: ['*']
      condition:
        match:
          expr: resource.attr.region_id == principal.attr.primary_region_id

    # Has cross-region access
    - name: cross_region_accessor
      parentRoles: ['*']
      condition:
        match:
          expr: resource.attr.region_id in principal.attr.cross_region_access
```

---

## 📋 Stage 1 Task Checklist

### Day 1: Database Foundation

- [ ] **Task 1.1:** Create migration file `001_add_multi_tenancy.sql`
  - [ ] Create `organizations` table
  - [ ] Create `regions` table
  - [ ] Create `user_region_assignments` table
  - [ ] Add columns to existing tables (nullable)
  - [ ] Add indexes

- [ ] **Task 1.2:** Create seed data script `seed_default_organization.sql`
  - [ ] Insert default organization
  - [ ] Insert default region (if applicable)
  - [ ] Update existing users to default org
  - [ ] Update existing games to default org
  - [ ] Update existing assignments to default org

- [ ] **Task 1.3:** Test migration on dev database
  - [ ] Run migration
  - [ ] Verify data integrity
  - [ ] Test rollback
  - [ ] Performance test indexes

### Day 2: Cerbos Infrastructure

- [ ] **Task 2.1:** Set up Cerbos deployment
  - [ ] Create `docker-compose.cerbos.yml`
  - [ ] Create `cerbos/config/config.yaml`
  - [ ] Create policy directory structure
  - [ ] Test Cerbos starts and is healthy

- [ ] **Task 2.2:** Install Cerbos SDK
  ```bash
  npm install @cerbos/sdk
  npm install --save-dev @types/node
  ```

- [ ] **Task 2.3:** Create Cerbos type definitions
  - [ ] Create `backend/src/types/cerbos.types.ts`
  - [ ] Define ResourceType, ResourceAction types
  - [ ] Define CerbosPrincipal, CerbosResource interfaces

### Day 3: Auth Service Layer

- [ ] **Task 3.1:** Create CerbosAuthService
  - [ ] Create `backend/src/services/CerbosAuthService.ts`
  - [ ] Implement checkAccess()
  - [ ] Implement checkMultipleActions()
  - [ ] Implement caching
  - [ ] Implement health check

- [ ] **Task 3.2:** Create helper functions
  - [ ] Create `backend/src/utils/cerbos-helpers.ts`
  - [ ] Implement toPrincipal()
  - [ ] Implement toResource()
  - [ ] Implement resource-specific builders

- [ ] **Task 3.3:** Create new middleware
  - [ ] Create `backend/src/middleware/cerbos-auth.ts`
  - [ ] Implement requireCerbosPermission()
  - [ ] Implement withCerbosContext()

### Day 4-5: Initial Policies

- [ ] **Task 4.1:** Write schema definitions
  - [ ] Create `cerbos/policies/_schemas.yaml`
  - [ ] Define principal schema
  - [ ] Define resource schema

- [ ] **Task 4.2:** Write common derived roles
  - [ ] Create `cerbos/policies/common_roles.yaml`
  - [ ] Define owner role
  - [ ] Define org_member role
  - [ ] Define region_member role

- [ ] **Task 4.3:** Write game policy
  - [ ] Create `cerbos/policies/game.yaml`
  - [ ] Define view rules
  - [ ] Define create rules
  - [ ] Define update/delete rules
  - [ ] Define assign_referee rules

- [ ] **Task 4.4:** Write assignment policy (draft)
  - [ ] Create `cerbos/policies/assignment.yaml`
  - [ ] Define basic CRUD rules

- [ ] **Task 4.5:** Test policies
  ```bash
  cerbos compile policies/
  cerbos test policies/
  ```

### Day 6: Documentation

- [ ] **Task 6.1:** Document removal plan
  - [ ] List all files with old auth patterns
  - [ ] Create removal checklist per file
  - [ ] Document migration order

- [ ] **Task 6.2:** Create developer guide
  - [ ] How to write policies
  - [ ] How to use CerbosAuthService
  - [ ] How to add new resources
  - [ ] How to test policies

- [ ] **Task 6.3:** Update environment template
  - [ ] Add `CERBOS_HOST` variable
  - [ ] Add `CERBOS_CACHE_TTL` variable
  - [ ] Document Cerbos setup

### Day 7: Integration Testing

- [ ] **Task 7.1:** Write integration tests
  - [ ] Test CerbosAuthService connectivity
  - [ ] Test policy evaluation
  - [ ] Test caching behavior
  - [ ] Test error handling (Cerbos down)

- [ ] **Task 7.2:** Test with sample route
  - [ ] Pick one simple route (GET /games/:id)
  - [ ] Add Cerbos middleware
  - [ ] Test various roles
  - [ ] Verify decisions match expected

- [ ] **Task 7.3:** Performance testing
  - [ ] Measure Cerbos check latency
  - [ ] Measure cache hit rate
  - [ ] Test with 100 concurrent checks

---

## 🚨 Risks and Mitigation

### Risk 1: Cerbos Downtime = No Access

**Mitigation:**
- Aggressive caching (5 min default, configurable)
- Circuit breaker pattern (if Cerbos down 3+ times, cache for 30 min)
- Graceful degradation (fall back to basic org check if Cerbos unavailable)
- Deploy Cerbos with high availability (2+ replicas in production)

### Risk 2: Performance Degradation

**Baseline:** Current auth checks ~1-2ms (in-process)
**Target:** Cerbos checks <20ms (p95), <50ms (p99)

**Mitigation:**
- Deploy Cerbos as sidecar (localhost, minimal latency)
- Cache decisions for 5 minutes
- Batch checks where possible
- Monitor and alert on slow decisions

### Risk 3: Policy Bugs = Authorization Bypass

**Mitigation:**
- Write policy tests FIRST (TDD approach)
- Test in staging before production
- Gradual rollout (one route at a time)
- Audit logging (track all Cerbos decisions)
- Easy rollback (policies in git, can revert)

### Risk 4: Breaking Changes During Migration

**Mitigation:**
- DON'T delete old auth until new is proven
- Run both systems in parallel initially
- Feature flag: `USE_CERBOS=true/false`
- Test extensively in staging

---

## ✅ Stage 1 Success Criteria

**Foundation established when:**

1. ✅ Database has multi-tenancy schema (organizations, regions)
2. ✅ Existing data migrated to default organization
3. ✅ Cerbos running and healthy
4. ✅ CerbosAuthService can connect and make decisions
5. ✅ Initial policies written and tested
6. ✅ Helper functions (toPrincipal, toResource) working
7. ✅ New middleware (requireCerbosPermission) ready
8. ✅ Documentation complete
9. ✅ At least 1 route successfully using Cerbos

**DO NOT PROCEED TO STAGE 2 UNTIL:**
- All tests passing
- Performance acceptable (<20ms p95)
- Sample route works with all roles
- Team reviewed and approved policies

---

## 📊 Progress Tracking

**Current Status:** Planning Complete

**Completed:**
- [x] Auth audit
- [x] Problem documentation
- [x] Database schema design
- [x] Cerbos setup plan
- [x] Service layer design
- [x] Initial policy design
- [x] Stage 1 plan document

**Next Steps:**
1. Review this plan with team
2. Get approval to proceed
3. Start Day 1 tasks (database migration)
4. Set up monitoring/alerting

---

## 📚 References

**Cerbos Documentation:**
- [Cerbos Quick Start](https://docs.cerbos.dev/cerbos/latest/quickstart)
- [Policy Writing Guide](https://docs.cerbos.dev/cerbos/latest/policies)
- [Node.js SDK](https://docs.cerbos.dev/cerbos/latest/sdk/node)
- [Testing Policies](https://docs.cerbos.dev/cerbos/latest/testing)

**Internal Documentation:**
- `docs/AUTHORIZATION_DECISION_ANALYSIS.md` - Full comparison analysis
- `docs/reports/database-diagram-latest.md` - Current database schema
- `docs/RBAC_IMPLEMENTATION_PLAN.md` - Original RBAC plan (now superseded)
- `docs/RESOURCE_RBAC_INTEGRATION.md` - Resource-level RBAC docs

---

**Last Updated:** 2025-09-26
**Branch:** `feat/cerbos-authorization-rebase`
**Next Review:** After Day 3 (Auth Service Layer completion)