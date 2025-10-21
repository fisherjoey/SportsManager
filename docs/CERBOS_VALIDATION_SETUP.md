# Cerbos Policy Validation - Setup Guide

## Problem Solved

**Before:** Cerbos would fail to start with cryptic errors like:
```
principalPolicy.version: value does not match regex pattern `^[\w]+$`
```

**After:** Automatic validation catches errors BEFORE they break Cerbos! ✅

---

## One-Time Setup (5 minutes)

### Step 1: Enable Git Pre-Commit Hook

```bash
cd /c/Users/School/OneDrive/Desktop/SportsManager-assigning-logic

# Configure Git to use custom hooks directory
git config core.hooksPath .githooks

# Make hook executable
chmod +x .githooks/pre-commit
chmod +x scripts/validate-cerbos-policies.sh
```

**Done!** Now every commit that touches `cerbos-policies/*.yaml` will be automatically validated.

### Step 2: Test the Setup

```bash
# Test the validation script
npm run validate:cerbos
```

Expected output:
```
🔍 Validating Cerbos policies...
✓ All version formats valid
✓ All policies have apiVersion
✓ No basic YAML syntax errors detected
✓ Docker-based validation passed
✅ All validation checks passed!
```

---

## How It Works

### 4 Layers of Protection

1. **Pre-Commit Hook** (Automatic)
   - Runs when you `git commit`
   - Blocks commits with invalid policies
   - Zero effort after setup

2. **npm Script** (Manual)
   - Run anytime: `npm run validate:cerbos`
   - Validates all policies
   - Shows detailed errors

3. **Docker Validation** (Runtime)
   - Cerbos won't start if policies are invalid
   - Immediate feedback during development
   - Uses official Cerbos Docker image

4. **Visual Feedback** (Logs)
   - Watch: `docker logs -f sportsmanager-cerbos-local`
   - See policy loading in real-time
   - Catch errors immediately

---

## What Gets Validated

### 1. Version Format ⚠️ MOST COMMON ERROR

```yaml
# ❌ WRONG - Will fail
version: "1.0"

# ✅ CORRECT - Will pass
version: "1_0"
```

**Rule:** Only alphanumeric + underscores allowed in version strings.

### 2. Required Fields

Every policy must have:
```yaml
apiVersion: api.cerbos.dev/v1
```

### 3. YAML Syntax

- No tabs (use 2 spaces)
- Proper indentation
- Valid YAML structure

### 4. Cerbos Compilation

Full validation with Cerbos engine (Docker or CLI).

---

## Usage Examples

### Before Committing

```bash
# Make policy changes
vi cerbos-policies/resources/game.yaml

# Validate (optional - pre-commit hook will do this automatically)
npm run validate:cerbos

# Commit (hook validates automatically)
git add cerbos-policies/
git commit -m "Update game policy"
```

### If Validation Fails

```bash
# Pre-commit hook blocks the commit:
❌ Commit blocked: Cerbos policy validation failed

Found policies with invalid version format:
  - cerbos-policies/principals/super_admin.yaml
    6:  version: "1.0"

Fix: Replace dots with underscores
  version: "1.0"  ❌
  version: "1_0"  ✅
```

**Fix the error, then commit again.**

### Skip Validation (NOT RECOMMENDED)

```bash
# Only use this if you're ABSOLUTELY sure the policy is valid
git commit --no-verify
```

---

## Manual Validation

### Quick Validate

```bash
npm run validate:cerbos
```

### Validate Specific File

```bash
docker run --rm \
  -v "$(pwd)/cerbos-policies:/policies:ro" \
  ghcr.io/cerbos/cerbos:latest \
  compile /policies
```

### Watch Cerbos Logs

```bash
# Terminal 1: Watch logs
docker logs -f sportsmanager-cerbos-local

# Terminal 2: Edit policies
vi cerbos-policies/resources/game.yaml

# Terminal 1: See validation in real-time
# Cerbos will automatically reload and show any errors
```

---

## Common Errors & Fixes

### Error 1: Invalid Version Format

**Error:**
```
principalPolicy.version: value does not match regex pattern `^[\w]+$`
```

**Fix:**
```yaml
# Change this:
version: "1.0"

# To this:
version: "1_0"
```

### Error 2: Missing apiVersion

**Error:**
```
Found policies missing apiVersion
```

**Fix:**
```yaml
# Add to top of file:
apiVersion: api.cerbos.dev/v1
```

### Error 3: Tabs in YAML

**Error:**
```
Found tabs in file (use spaces)
```

**Fix:**
Configure your editor to use spaces (not tabs) for `.yaml` files.

**VS Code:**
```json
{
  "[yaml]": {
    "editor.insertSpaces": true,
    "editor.tabSize": 2
  }
}
```

---

## Troubleshooting

### Hook Not Running

**Problem:** Commits go through without validation

**Solution:**
```bash
# Check Git config
git config core.hooksPath
# Should output: .githooks

# If empty, set it:
git config core.hooksPath .githooks

# Make executable
chmod +x .githooks/pre-commit
```

### Validation Script Not Found

**Problem:** `npm run validate:cerbos` fails

**Solution:**
```bash
# Make script executable
chmod +x scripts/validate-cerbos-policies.sh

# Test directly
bash scripts/validate-cerbos-policies.sh
```

### Docker Not Available

**Problem:** Docker validation fails

**Solution:**
```bash
# Install Cerbos CLI as alternative
# macOS:
brew install cerbos/tap/cerbos

# Linux:
curl -L https://github.com/cerbos/cerbos/releases/latest/download/cerbos_Linux_x86_64.tar.gz | tar xz
sudo mv cerbos /usr/local/bin/

# Windows:
# Use Docker (WSL2) or install Cerbos binary manually
```

---

## Integration with CI/CD

### GitHub Actions (Optional)

Create `.github/workflows/validate-cerbos.yml`:

```yaml
name: Validate Cerbos Policies

on:
  pull_request:
    paths:
      - 'cerbos-policies/**/*.yaml'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Validate Policies
        run: bash scripts/validate-cerbos-policies.sh
```

Now PRs with policy changes will be validated automatically!

---

## Best Practices

### ✅ DO

- Enable pre-commit hook (one-time setup)
- Run `npm run validate:cerbos` before pushing
- Use underscores in version strings
- Test policy changes locally before committing
- Watch Docker logs while editing

### ❌ DON'T

- Use dots in version strings (`"1.0"` ❌)
- Skip validation with `--no-verify` (unless emergency)
- Commit untested policies
- Ignore validation errors
- Use tabs in YAML files

---

## Quick Reference

### Commands

```bash
# Validate all policies
npm run validate:cerbos

# Enable pre-commit hook (one-time)
git config core.hooksPath .githooks

# Watch Cerbos logs
docker logs -f sportsmanager-cerbos-local

# Restart Cerbos after policy changes
docker restart sportsmanager-cerbos-local

# Skip validation (NOT RECOMMENDED)
git commit --no-verify
```

### Version Format Rules

```yaml
# ✅ CORRECT
version: "default"
version: "1_0"
version: "2_1_3"
version: "v2025_01"

# ❌ WRONG
version: "1.0"      # Dots not allowed
version: "2-1"      # Hyphens not allowed
version: "v2.0.1"   # Dots not allowed
```

---

## Summary

**You've successfully set up Cerbos policy validation!**

✅ Pre-commit hook enabled
✅ Validation script working
✅ Docker validation configured
✅ Never commit invalid policies again

**Next time you edit a Cerbos policy:**
1. Make your changes
2. Commit (hook validates automatically)
3. If it fails, fix the error and commit again
4. Done! ✅

**No more Cerbos startup failures due to invalid policies!** 🎉
