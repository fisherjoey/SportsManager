# 🎯 TypeScript Migration Sprint Plan

## 📊 Current Status
- **Total JS files**: ~150 files
- **Routes**: 71 JS files (highest priority)
- **Services**: 31 JS files
- **Middleware**: ~20 JS files
- **Config**: 6 JS files

## 🚀 Quick Win Strategy: 4-Hour Sprint

### Phase 1: Critical Path Only (2 hours)
Focus ONLY on files that the frontend actively calls.

#### Priority 1: Core Routes (30 mins)
```bash
# These are actively used by frontend
backend/src/routes/auth.js → auth.ts
backend/src/routes/users.js → users.ts
backend/src/routes/games.js → games.ts
backend/src/routes/assignments.js → assignments.ts
backend/src/routes/referees.js → referees.ts
```

#### Priority 2: Entry Points (30 mins)
```bash
backend/src/app.js → app.ts
backend/src/server.js → server.ts
```

#### Priority 3: Critical Middleware (30 mins)
```bash
backend/src/middleware/auth.js → auth.ts
backend/src/middleware/errorHandling.js → errorHandling.ts
backend/src/middleware/validation.js → validation.ts
```

#### Priority 4: Config Files (30 mins)
```bash
backend/src/config/database.js → database.ts
backend/src/config/redis.js → redis.ts
backend/src/config/aiConfig.js → aiConfig.ts
```

### Phase 2: Bulk Migration with Script (1 hour)

#### Auto-Migration Script
Create and run this script to bulk convert remaining files:

```bash
#!/bin/bash
# save as: backend/migrate-to-ts.sh

# Function to migrate a single file
migrate_file() {
    local file=$1
    local ts_file="${file%.js}.ts"

    echo "Migrating $file to $ts_file"

    # Copy file
    cp "$file" "$ts_file"

    # Add basic modifications
    sed -i '1i // @ts-nocheck' "$ts_file"
    sed -i 's/module.exports =/export default/g' "$ts_file"
    sed -i 's/exports\./export /g' "$ts_file"
    sed -i 's/const \(.*\) = require(\(.*\))/import \1 from \2/g' "$ts_file"

    # Remove old JS file
    rm "$file"
}

# Migrate all remaining JS files
for file in $(find src -name "*.js" -type f | grep -v node_modules | grep -v __tests__); do
    migrate_file "$file"
done
```

### Phase 3: Fix Compilation (1 hour)

#### Quick Type Additions
Create a types file for common patterns:

```typescript
// backend/src/types/express.d.ts
import { Request, Response, NextFunction } from 'express';

export type AsyncHandler = (
  req: Request | any,
  res: Response | any,
  next: NextFunction
) => Promise<void>;

export type RouteHandler = AsyncHandler;

// Add 'any' user to Request
declare global {
  namespace Express {
    interface Request {
      user?: any;
      file?: any;
      files?: any;
    }
  }
}
```

## 📝 Migration Checklist

### Step 1: Preparation (10 mins)
```bash
cd backend

# Create a backup branch
git checkout -b ts-migration-backup
git add .
git commit -m "Backup before TS migration"
git checkout feature/js-to-ts-migration

# Install missing types
npm install --save-dev \
  @types/node \
  @types/express \
  @types/bcryptjs \
  @types/jsonwebtoken \
  @types/multer
```

### Step 2: Run Migrations (2 hours)

#### A. Manual Migration of Critical Files
```bash
# 1. Auth route (most important)
mv src/routes/auth.js src/routes/auth.ts
# Edit: Add request/response types

# 2. User route
mv src/routes/users.js src/routes/users.ts
# Edit: Add types

# 3. Games route
mv src/routes/games.js src/routes/games.ts

# 4. App.js
mv src/app.js src/app.ts
# Add: import types, fix requires

# 5. Server.js
mv src/server.js src/server.ts
```

#### B. Bulk Migration for Others
```bash
# For each remaining file, just rename and add @ts-nocheck
find src/routes -name "*.js" -type f | while read file; do
  ts_file="${file%.js}.ts"
  echo "// @ts-nocheck" > "$ts_file"
  cat "$file" >> "$ts_file"
  rm "$file"
done
```

### Step 3: Fix Package.json (5 mins)
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

### Step 4: Update TSConfig (5 mins)
```json
// backend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": false, // START WITH FALSE!
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowJs": true, // Important!
    "noImplicitAny": false // Start lenient
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 5: Quick Test (10 mins)
```bash
# Try to compile
npx tsc --noEmit

# Start dev server
npm run dev

# Test a few endpoints
curl http://localhost:3001/api/health
curl http://localhost:3001/api/auth/login -X POST ...
```

## 🔧 Common Quick Fixes

### Problem 1: Cannot find module
```typescript
// Change:
const express = require('express');
// To:
import express from 'express';
```

### Problem 2: Missing types
```typescript
// Add 'any' liberally:
export const handler = async (req: any, res: any) => {
  // code
};
```

### Problem 3: Export errors
```typescript
// Change:
module.exports = router;
// To:
export default router;
```

### Problem 4: Async/await errors
```typescript
// Wrap in try-catch:
export const handler = async (req: any, res: any) => {
  try {
    // async code
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
```

## 🎯 Success Criteria

✅ **Minimum Success** (2 hours):
- [ ] Frontend can still make API calls
- [ ] Auth works
- [ ] Games page loads
- [ ] No more mixed imports

✅ **Good Success** (3 hours):
- [ ] All routes migrated
- [ ] All middleware migrated
- [ ] Compiles without errors

✅ **Excellent Success** (4 hours):
- [ ] All JS files migrated
- [ ] Basic types added (not just 'any')
- [ ] Tests still pass

## 🚨 Escape Hatches

If things go wrong:

### Option 1: Partial Rollback
```bash
# Keep TS for services, revert routes to JS
git checkout HEAD -- src/routes/
mv src/routes/*.ts src/routes/*.js
```

### Option 2: Use allowJs
```json
// tsconfig.json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": false
  }
}
```

### Option 3: Progressive Migration
```typescript
// Just add .d.ts files alongside .js files
// src/routes/auth.d.ts
export function login(req: any, res: any): Promise<void>;
export function logout(req: any, res: any): Promise<void>;
```

## 📅 Suggested Timeline

**Saturday Morning (2 hours)**:
- 9:00 AM - Setup & backup
- 9:15 AM - Migrate critical routes
- 10:15 AM - Migrate middleware
- 10:45 AM - Test compilation

**Saturday Afternoon (2 hours)**:
- 2:00 PM - Bulk migrate remaining files
- 2:30 PM - Fix type errors
- 3:30 PM - Test all endpoints
- 3:45 PM - Commit and push

## 💡 Pro Tips

1. **Don't perfectionist** - `any` is fine for now
2. **Use @ts-nocheck** liberally on complex files
3. **Migrate in small commits** - easier to rollback
4. **Test after each group** of files
5. **Keep the old JS files** until TS versions work

## 🎉 Done! Next Steps

Once migrated:
1. Remove @ts-nocheck gradually
2. Replace 'any' with proper types over time
3. Enable strict mode in tsconfig
4. Add type tests

Remember: **Working > Perfect**. Get it compiling first, improve types later!