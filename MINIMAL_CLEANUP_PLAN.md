# Minimal Clean Starter - Cleanup Plan

## What We're Keeping

### ✅ UI Infrastructure (Design System)
```
frontend/components/ui/              # ALL shadcn components
frontend/lib/utils.ts                # Utility functions
frontend/lib/cn.ts                   # Class name utility
frontend/app/layout.tsx              # Root layout
frontend/app/globals.css             # Global styles
frontend/components/theme-provider.tsx
frontend/components/error-boundary.tsx
```

### ✅ Authentication (Minimal)
```
backend/src/routes/auth.ts           # Login/logout/register
backend/src/middleware/auth.ts       # Auth middleware
frontend/app/login/                  # Login page
frontend/components/login-form.tsx   # Login form
frontend/components/auth-provider.tsx
```

### ✅ Shared Database Tables
```
users (authentication)
teams (will expand)
games (will expand)
leagues (will expand)
locations (venues)
```

### ✅ Core Backend Infrastructure
```
backend/src/server.ts
backend/src/app.ts
backend/src/middleware/
backend/src/types/
backend/knexfile.ts
```

---

## What We're Deleting

### 🗑️ ALL Frontend Pages (except login)
```
frontend/app/admin/
frontend/app/admin-*/
frontend/app/budget/
frontend/app/demo/
frontend/app/financial-*/
frontend/app/games/
frontend/app/notifications/
frontend/app/resources/
frontend/app/settings/
frontend/app/theme-demo/
frontend/app/unauthorized/
frontend/app/complete-signup/

KEEP ONLY:
frontend/app/login/
frontend/app/school-portal/  (empty starter)
```

### 🗑️ ALL Business Components
```
Delete ALL except:
- UI components (frontend/components/ui/)
- login-form.tsx
- auth-provider.tsx
- theme-provider.tsx
- error-boundary.tsx
- page-access-guard.tsx (for future use)
```

### 🗑️ ALL Backend Routes (except auth & health)
```
Delete ALL routes except:
- auth.ts
- health.ts

Everything else goes:
- assignments, availability, referees (referee system)
- budgets, expenses, financial-* (financial system)
- all other business routes
```

---

## What We're Creating Fresh

### 🆕 School Project Structure
```
backend/src/routes/school/
  - (empty, ready for your code)

frontend/app/school-portal/
  - page.tsx (landing page)
  - layout.tsx (school portal layout)
  - team/
  - coach/
  - player/
```

---

## Result: Minimal Starter

After cleanup, you'll have:

**Frontend:**
- Complete UI component library (buttons, forms, tables, etc.)
- Login page
- Empty school-portal ready to build
- Global styles and theming

**Backend:**
- Authentication system
- Database connection
- Basic user/team/game tables
- Empty school routes folder

**Ready to Build:**
- Team roster management
- Coach dashboards
- Player profiles
- Statistics tracking
- All from scratch!
