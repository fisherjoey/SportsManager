# Cerbos Policy Validation Guide

## ⚠️ Critical Rule: Version Format

**ALWAYS use underscores (`_`) in version strings, NEVER dots (`.`)**

### ✅ CORRECT
```yaml
version: "1_0"
version: "2_1"
version: "default"
```

### ❌ WRONG (Will Break Cerbos)
```yaml
version: "1.0"   # ❌ NO DOTS!
version: "2.1"   # ❌ NO DOTS!
```

---

## Why This Matters

Cerbos validates version strings against the regex pattern `^[\w]+$` which only allows:
- Letters (a-z, A-Z)
- Numbers (0-9)
- Underscores (_)

**Dots (.), hyphens (-), and other special characters will cause Cerbos to fail startup!**

---

## Prevention Tools

### 1. Pre-Commit Hook (Automatic)

Enable once, protects forever:

```bash
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
```

Now every commit with policy changes will be validated automatically.

### 2. Manual Validation

Before any commit:

```bash
npm run validate:cerbos
```

### 3. Real-Time Docker Validation

Watch Cerbos logs while editing:

```bash
docker logs -f sportsmanager-cerbos-local
```

If Cerbos restarts repeatedly, you have a validation error!

---

## Quick Fix Checklist

If Cerbos won't start:

1. ✅ Check logs: `docker logs sportsmanager-cerbos-local`
2. ✅ Find the bad file: `npm run validate:cerbos`
3. ✅ Replace dots with underscores: `version: "1.0"` → `version: "1_0"`
4. ✅ Restart: `docker restart sportsmanager-cerbos-local`
5. ✅ Verify: `curl http://localhost:3592/_cerbos/health`

---

## Full Validation Script

Located at: `scripts/validate-cerbos-policies.sh`

Checks for:
- ✓ Version format (underscores only)
- ✓ Required fields (apiVersion)
- ✓ YAML syntax (no tabs)
- ✓ Full Cerbos compilation

Run it: `npm run validate:cerbos`

---

## Never Forget Again

**Setup the pre-commit hook NOW:**

```bash
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
```

Then you're protected! Every policy commit will be validated automatically. ✅
