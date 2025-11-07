# Referee Features Cleanup Plan

## Files to Remove for School Project

### Frontend Components (Remove these)
```
✅ KEEP (Shared):
- auth-provider.tsx (authentication)
- login-form.tsx (login page)
- profile-settings.tsx (user profile)
- game-management.tsx (view games)
- theme-provider.tsx (theming)
- error-boundary.tsx (error handling)
- page-access-guard.tsx (authorization)

❌ REMOVE (Referee-specific):
- assignor-dashboard.tsx
- assignor-dashboard-overview.tsx
- assignment-comments.tsx
- availability-calendar.tsx
- available-games.tsx
- game-assignment-board.tsx
- my-assignments.tsx
- referee-dashboard.tsx
- referee-dashboard-overview.tsx
- referee-management.tsx

⚠️  MAYBE KEEP (Financial/Admin - not school project):
- admin-dashboard.tsx
- ai-assignments-*.tsx
- budget-tracker.tsx
- expense-*.tsx
- financial-*.tsx
- organizational-dashboard.tsx
```

### Backend Routes (Remove these)
```
✅ KEEP (Shared/Useful):
- auth.ts (authentication)
- games.ts (game viewing)
- leagues.ts (leagues)
- teams.ts (team management - expand this)
- locations.ts (venues)
- users.ts (user management)
- roles.ts (RBAC)
- notifications.ts (notifications)

❌ REMOVE (Referee-specific):
- assignments.ts
- availability.ts
- referee-levels.ts
- referee-roles.ts
- referees.ts
- self-assignment.ts

⚠️  MAYBE REMOVE (Financial - not school project):
- accounting-integration.ts
- budgets.ts
- expenses.ts
- financial-*.ts
- company-credit-cards.ts
- purchase-orders.ts
- receipts.ts
```

### Approach
1. Remove referee-specific files
2. Keep financial files but hide from navigation (could be useful later)
3. Keep shared infrastructure (auth, games, teams, etc.)
