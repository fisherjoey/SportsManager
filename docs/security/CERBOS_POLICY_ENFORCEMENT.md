# Cerbos Policy Enforcement

This document explains how we enforce Cerbos policy coverage across the codebase to ensure all endpoints and routes are properly protected.

## Overview

Every API endpoint and protected route **must** have a corresponding Cerbos policy. This is enforced at three levels:

1. **Pre-commit Hook** - Validates locally before commit (fastest feedback)
2. **CI/CD Pipeline** - Validates on pull requests (prevents merge)
3. **Deployment Gate** - Final validation before deployment (safety net)

## How It Works

### Automated Policy Coverage Validation

The `validate-cerbos-coverage.js` script scans your codebase for:

**Backend (Permission Checks):**
```typescript
// Pattern 1: Middleware
requireCerbosPermission('game', 'read')

// Pattern 2: Direct client calls
cerbos.checkResource({ resource: 'game', action: 'update' })

// Pattern 3: Helper functions
isAllowed('user', 'delete')
```

**Frontend (Permission Usage):**
```typescript
// Pattern 1: Hooks
usePermissions('game', 'create')

// Pattern 2: Direct checks
checkPermission('team', 'update')
```

Then validates that each resource/action pair has a corresponding policy in `cerbos/policies/`.

## Running Validation

### Locally (Manual)

```bash
# Quick validation
cd backend
npm run cerbos:validate

# Verbose output (shows all details)
npm run cerbos:validate:verbose
```

### Pre-commit Hook (Automatic)

Validation runs automatically when you commit:

```bash
git commit -m "feat: add new endpoint"
# 🔍 Validating Cerbos policy coverage...
# ✅ Cerbos policy coverage validated
```

**To skip** (not recommended):
```bash
git commit --no-verify
```

### CI/CD Pipeline (Automatic)

When you open a PR, the `cerbos-policy-coverage` job runs:
- ✅ **Pass**: PR can be merged
- ❌ **Fail**: PR blocked, bot comments with details

## Adding New Protected Endpoints

### Step 1: Create Your Endpoint

```typescript
// backend/src/routes/games.ts
router.post('/games',
  requireCerbosPermission('game', 'create'),
  gameController.createGame
);
```

### Step 2: Create Cerbos Policy

```bash
# Create policy file
touch cerbos/policies/game.yaml
```

```yaml
# cerbos/policies/game.yaml
---
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: "default"
  resource: "game"
  rules:
    - actions: ["create", "read", "update", "delete"]
      effect: EFFECT_ALLOW
      roles:
        - Admin
        - Assignor

    - actions: ["read"]
      effect: EFFECT_ALLOW
      roles:
        - Referee
```

### Step 3: Validate

```bash
npm run cerbos:validate:verbose
```

**Expected output:**
```
🔍 Validating Cerbos policy coverage...

✅ Loaded 44 Cerbos policies

✅ Found 127 protected endpoints

✅ Found 53 protected routes

📊 Validation Results
================================================================================
Total Permission Checks: 180
Total Cerbos Policies:   44
Coverage:                100.00%
================================================================================

✅ All permission checks have corresponding Cerbos policies!
```

## Common Issues

### ❌ Missing Policy

**Error:**
```
❌ Missing Policies:

1. MISSING_POLICY: game.create
   File: backend/src/routes/games.ts:42
   No Cerbos policy found for resource 'game'
   Fix: Create policy file at cerbos/policies/game.yaml
```

**Solution:**
Create `cerbos/policies/game.yaml` with the required actions.

### ⚠️ Missing Action

**Warning:**
```
⚠️ Warnings:

1. MISSING_ACTION: game.approve
   File: backend/src/routes/games.ts:88
   Action 'approve' not defined in policy 'game' (has: create, read, update, delete)
```

**Solution:**
Add `approve` action to your existing `game.yaml` policy.

## Best Practices

### ✅ DO

1. **Create policies proactively** - Before implementing endpoints
2. **Use specific actions** - `read`, `create`, `update`, `delete`, not `manage`
3. **Test locally** - Run `npm run cerbos:validate:verbose` before committing
4. **Document policies** - Add comments explaining permission logic
5. **Use role hierarchy** - Leverage Cerbos derived roles

### ❌ DON'T

1. **Skip validation** - `--no-verify` should be rare
2. **Use wildcard actions** - Avoid `actions: ["*"]` unless intentional
3. **Duplicate policies** - One resource = one policy file
4. **Hardcode permissions** - Always use Cerbos, not inline checks
5. **Ignore warnings** - Missing actions will cause runtime errors

## Policy File Structure

### Resource Policy Template

```yaml
---
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: "default"
  resource: "RESOURCE_NAME"  # e.g., "game", "user", "team"

  # Import common roles (optional)
  importDerivedRoles:
    - common_roles

  rules:
    # Admin full access
    - actions: ["*"]
      effect: EFFECT_ALLOW
      roles:
        - Admin

    # Role-specific permissions
    - actions: ["create", "update", "delete"]
      effect: EFFECT_ALLOW
      roles:
        - Assignor
      condition:
        match:
          expr: request.resource.attr.organization_id == request.principal.attr.organization_id

    # Read-only access
    - actions: ["read"]
      effect: EFFECT_ALLOW
      roles:
        - Referee
```

## Validation Output in CI

When the CI check runs, you'll see:

**Success:**
```
✅ Cerbos Policy Coverage Check
   All permission checks have corresponding policies
   Coverage: 100%
```

**Failure:**
```
❌ Cerbos Policy Coverage Check
   Missing policies detected

   Bot Comment:
   ❌ Cerbos Policy Coverage Check Failed

   Some endpoints or routes are missing Cerbos policies.
   Please ensure all permission checks have corresponding
   policy files in cerbos/policies/.

   Run npm run cerbos:validate:verbose locally to see details.
```

## Troubleshooting

### Validation Script Not Found

```bash
# Install dependencies
cd backend
npm install
```

### Permission Denied on Pre-commit Hook

```bash
# Make hook executable (Linux/Mac)
chmod +x .husky/pre-commit

# Windows - no action needed
```

### False Positives

If the validator detects permission checks that aren't real:

1. Check regex patterns in `validate-cerbos-coverage.js`
2. Add comments to exclude: `// cerbos:ignore`
3. Report issue if it's a legitimate edge case

## Disabling Validation (Emergency)

**Temporarily disable pre-commit hook:**
```bash
git commit --no-verify
```

**Disable CI check** (requires repo admin):
Edit `.github/workflows/pr-checks.yml` and comment out `cerbos-policy-coverage` job.

**Not recommended** - This defeats the purpose of policy enforcement!

## Migration from RBAC Scanner

If you previously used the RBAC scanner:

1. **RBAC scanner is deprecated** - We've fully migrated to Cerbos
2. **Old RBAC tables** - Can be safely dropped (see migration guide)
3. **Policy discovery** - Now manual (policy-as-code approach)

## Related Documentation

- [Cerbos Official Docs](https://docs.cerbos.dev/)
- [Policy Examples](../../cerbos/policies/)
- [Permission Middleware](../../backend/src/middleware/permissions.ts)
- [Frontend Permission Hooks](../../frontend/hooks/usePermissions.ts)

## Support

**Questions?**
- Check existing policies in `cerbos/policies/` for examples
- Read Cerbos docs: https://docs.cerbos.dev/
- Ask in #security Slack channel

**Found a bug in validation?**
- File an issue with reproduction steps
- Include output from `npm run cerbos:validate:verbose`

---

**Remember:** Policy enforcement keeps our application secure. Every permission check should have a policy!
