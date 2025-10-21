# Cerbos Version Format Fix - October 21, 2025

## Problem

Cerbos was failing to start with this error:
```
principalPolicy.version: value does not match regex pattern `^[\w]+$`
```

**Root Cause:** The `super_admin.yaml` policy had `version: "1.0"` (with a dot), but Cerbos requires underscores only.

---

## Solution Implemented

### 1. Immediate Fix ✅

**File:** `cerbos-policies/principals/super_admin.yaml`

**Changed:**
```yaml
version: "1.0"  # ❌ WRONG
```

**To:**
```yaml
version: "1_0"  # ✅ CORRECT
```

**Result:** Cerbos now starts successfully and is healthy.

---

### 2. Prevention Tools Created ✅

To ensure this NEVER happens again, we created 4 layers of protection:

#### Layer 1: Validation Script

**File:** `scripts/validate-cerbos-policies.sh`

**Features:**
- ✓ Checks version format (no dots allowed)
- ✓ Validates required fields (apiVersion)
- ✓ Checks YAML syntax (no tabs)
- ✓ Full Cerbos compilation validation (Docker or CLI)

**Usage:**
```bash
npm run validate:cerbos
```

#### Layer 2: Git Pre-Commit Hook

**File:** `.githooks/pre-commit`

**Features:**
- Automatically runs validation before every commit
- Blocks commits with invalid policies
- Can be skipped with `--no-verify` (not recommended)

**Setup (one-time):**
```bash
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
```

#### Layer 3: npm Script

**File:** `package.json`

**Added:**
```json
"validate:cerbos": "bash scripts/validate-cerbos-policies.sh"
```

**Usage:**
```bash
npm run validate:cerbos
```

#### Layer 4: Documentation

**Files Created:**
- `cerbos-policies/VALIDATION_GUIDE.md` - Quick reference
- `docs/CERBOS_VALIDATION_SETUP.md` - Complete setup guide

---

## Validation Results

### Before Fix

```bash
$ npm run validate:cerbos

❌ FAILED: Found policies with invalid version format:
  - cerbos-policies/principals/super_admin.yaml
    6:  version: "1.0"

Fix: Replace dots with underscores
```

### After Fix

```bash
$ npm run validate:cerbos

✅ All validation checks passed!
- ✓ All version formats valid
- ✓ All policies have apiVersion
- ✓ No basic YAML syntax errors
- ✓ Docker-based validation passed
```

### Cerbos Status

```bash
$ docker ps --filter name=cerbos

STATUS: Up 2 minutes (healthy)  ✅
```

---

## How to Prevent This Forever

### One-Time Setup (Do This Now!)

```bash
cd /c/Users/School/OneDrive/Desktop/SportsManager-assigning-logic

# Enable pre-commit hook
git config core.hooksPath .githooks

# Make scripts executable
chmod +x .githooks/pre-commit
chmod +x scripts/validate-cerbos-policies.sh

# Test it works
npm run validate:cerbos
```

### Every Time You Edit Policies

The pre-commit hook will **automatically** validate before allowing commits.

**Or run manually:**
```bash
npm run validate:cerbos
```

---

## Version Format Rules (Never Forget!)

### ✅ ALLOWED Characters

- Letters: `a-z`, `A-Z`
- Numbers: `0-9`
- Underscores: `_`

### ❌ NOT ALLOWED

- Dots: `.`
- Hyphens: `-`
- Spaces
- Special characters

### Examples

```yaml
# ✅ CORRECT
version: "default"
version: "1_0"
version: "2_1_3"
version: "v2025_01"
version: "prod_v1"

# ❌ WRONG
version: "1.0"      # NO DOTS!
version: "2-1"      # NO HYPHENS!
version: "v 1.0"    # NO SPACES!
version: "test!"    # NO SPECIAL CHARS!
```

---

## Testing

### Manual Testing

```bash
# 1. Validate policies
npm run validate:cerbos

# 2. Restart Cerbos
docker restart sportsmanager-cerbos-local

# 3. Check status
docker ps --filter name=cerbos

# 4. Check logs
docker logs sportsmanager-cerbos-local

# 5. Test health endpoint
curl http://localhost:3592/_cerbos/health
```

### Expected Results

All commands should succeed:
- ✅ Validation passes
- ✅ Cerbos status: "healthy"
- ✅ No errors in logs
- ✅ Health endpoint returns 200

---

## Impact

### Before

- ❌ Cerbos failed to start
- ❌ All authorization checks failed
- ❌ Backend API returned "Failed to check permissions"
- ❌ Manual debugging required

### After

- ✅ Cerbos starts successfully
- ✅ Automatic validation before commits
- ✅ Clear error messages if validation fails
- ✅ Can't commit invalid policies (with pre-commit hook enabled)

---

## Summary

| Task | Status | Evidence |
|------|--------|----------|
| Fix version format | ✅ Complete | `version: "1_0"` in super_admin.yaml |
| Create validation script | ✅ Complete | `scripts/validate-cerbos-policies.sh` |
| Create pre-commit hook | ✅ Complete | `.githooks/pre-commit` |
| Add npm script | ✅ Complete | `npm run validate:cerbos` |
| Document solution | ✅ Complete | This file + VALIDATION_GUIDE.md |
| Test Cerbos startup | ✅ Complete | Container status: healthy |
| Validate all policies | ✅ Complete | All checks pass |

---

## Next Steps

### For You (One-Time Setup)

```bash
# Enable the pre-commit hook NOW:
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
chmod +x scripts/validate-cerbos-policies.sh
```

### For The Team

1. Share `docs/CERBOS_VALIDATION_SETUP.md` with all developers
2. Add to onboarding documentation
3. Consider adding to CI/CD pipeline (GitHub Actions example included in setup doc)

---

## Files Changed

### Fixed

- `cerbos-policies/principals/super_admin.yaml` - Fixed version format

### Created

- `scripts/validate-cerbos-policies.sh` - Validation script
- `.githooks/pre-commit` - Pre-commit hook
- `cerbos-policies/VALIDATION_GUIDE.md` - Quick reference
- `docs/CERBOS_VALIDATION_SETUP.md` - Complete setup guide
- `docs/CERBOS_VERSION_FIX_2025-10-21.md` - This file

### Modified

- `package.json` - Added `validate:cerbos` script

---

## Lessons Learned

1. **Regex patterns are strict** - Cerbos validates version strings against `^[\w]+$`
2. **Dots break things** - Semantic versioning style (`1.0`) doesn't work
3. **Automation prevents errors** - Pre-commit hooks catch issues early
4. **Validation is essential** - Manual testing misses these issues
5. **Documentation matters** - Clear error messages + guides = faster fixes

---

## Prevention Checklist

Before committing Cerbos policy changes:

- [ ] Run `npm run validate:cerbos`
- [ ] Check no dots in version strings
- [ ] Verify `apiVersion` is present
- [ ] Test locally (restart Cerbos and check logs)
- [ ] Commit (pre-commit hook validates automatically)

**With the pre-commit hook enabled, this checklist is enforced automatically!** ✅

---

## Questions?

See:
- `docs/CERBOS_VALIDATION_SETUP.md` - Complete setup instructions
- `cerbos-policies/VALIDATION_GUIDE.md` - Quick reference
- Cerbos docs: https://docs.cerbos.dev/

---

**Problem Solved!** Cerbos now validates policies automatically, preventing this error from ever happening again. 🎉
