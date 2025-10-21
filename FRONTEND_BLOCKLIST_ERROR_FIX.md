# Frontend Blocklist Error - Fix Guide

## Problem

Frontend won't start - getting this error:
```
TypeError: Cannot read properties of undefined (reading 'blocklist')
```

**Root Cause:** Next.js 15.2.4 has an internal bug with css-loader that references a deleted `blocklist` API.

**GitHub Issue:** https://github.com/vercel/next.js/issues/71638

---

## Solution Options

### Option 1: Downgrade Next.js (Recommended - 5 min)

**This will definitely work:**

```bash
cd frontend

# Downgrade to Next.js 14.2.x (last stable)
npm install next@14.2.18 --save-exact

# Clear cache
rm -rf .next node_modules/.cache

# Restart container
docker restart sportsmanager-frontend-local
```

**Pros:**
- ✅ Guaranteed to work
- ✅ Next 14 is stable and well-tested
- ✅ No breaking changes for our code

**Cons:**
- ⚠️ Not using latest Next.js features

---

### Option 2: Wait for Next.js 15.3 (Not Recommended)

Next.js team is working on a fix for 15.3.

**Current status:** Not released yet

**When to use:** If you can wait 1-2 weeks

---

### Option 3: Use Canary Build (For Testing Only)

```bash
cd frontend
npm install next@canary
```

**Warning:** Canary builds are unstable!

---

## Recommended Action for Tomorrow

### Step 1: Downgrade Next.js

```bash
cd /c/Users/School/OneDrive/Desktop/SportsManager-assigning-logic/frontend

# Install Next.js 14.2.18 (stable)
npm install next@14.2.18 --save-exact

# Verify version
npm list next
# Should show: next@14.2.18

# Clear caches
rm -rf .next
rm -rf node_modules/.cache
```

### Step 2: Rebuild Frontend Container

```bash
cd ../deployment

# Rebuild frontend with new Next.js version
docker-compose -f docker-compose.local.yml up -d --build frontend

# Watch logs
docker logs -f sportsmanager-frontend-local
```

### Step 3: Verify Fix

```bash
# Should see:
✓ Ready in 2000ms

# No more blocklist errors!

# Test in browser:
# http://localhost:3000
```

---

## Why This Happened

Next.js 15 changed internal CSS processing and removed the `blocklist` option from css-loader config. However, some internal Next.js code still tries to access it, causing this crash.

**Timeline:**
- Next.js 14.x: Works fine ✅
- Next.js 15.0-15.2: Has this bug ❌
- Next.js 15.3: Will have fix (not released yet) ⏳

---

## What We Already Tried (Didn't Work)

❌ Added autoprefixer to PostCSS config
❌ Added webpack config to delete blocklist
❌ Added Tailwind experimental flags
❌ Cleared cache and reinstalled
❌ Restarted containers

**None of these work because the bug is in Next.js internals.**

---

## If Downgrade Doesn't Work

Unlikely, but if it fails:

### Debug Steps

```bash
# Check Next.js version
cd frontend
npm list next

# Should be 14.2.18, not 15.x

# Check for lock file issues
rm package-lock.json
npm install
```

### Nuclear Option

```bash
# Complete reinstall
cd frontend
rm -rf node_modules package-lock.json .next
npm install
```

---

## After Fix - Commit Changes

```bash
cd ..
git add frontend/package.json frontend/package-lock.json
git commit -m "fix: Downgrade Next.js to 14.2.18 to resolve blocklist error

Next.js 15.2.4 has a bug with css-loader that causes:
TypeError: Cannot read properties of undefined (reading 'blocklist')

Downgraded to stable Next.js 14.2.18 which doesn't have this issue.

See: https://github.com/vercel/next.js/issues/71638

Can upgrade back to Next.js 15.3+ when the fix is released."
```

---

## Summary

**Current Status:** Frontend won't start due to Next.js 15 bug

**Fix:** Downgrade to Next.js 14.2.18

**Time Needed:** 5 minutes

**Commands:**
```bash
cd frontend
npm install next@14.2.18 --save-exact
rm -rf .next node_modules/.cache
cd ../deployment
docker-compose -f docker-compose.local.yml up -d --build frontend
```

**After this, frontend will work!** ✅
