# Middleware Quick Reference Card

## Phase 5: Server-Side Route Protection

---

## File Locations

| File | Purpose |
|------|---------|
| `frontend/middleware.ts` | Main middleware (route protection) |
| `frontend/lib/cookies.ts` | Cookie utilities |
| `docs/MIDDLEWARE_IMPLEMENTATION.md` | Full implementation guide |
| `docs/COOKIE_MIGRATION_GUIDE.md` | Migration instructions |

---

## Route Protection Logic

```
Request
  ↓
Excluded? (API, static) → YES → Allow
  ↓ NO
Public? (login, signup) → YES → Allow
  ↓ NO
Has auth_token cookie? → NO → Redirect to /login
  ↓ YES
Allow → Page does Cerbos check
```

---

## Route Categories

### Public Routes (No Auth Required)
- `/login`
- `/complete-signup`
- `/unauthorized`

### Protected Routes (Auth Required)
- `/` (Dashboard)
- `/games`
- `/admin/*`
- All other pages

### Excluded Routes (Skip Middleware)
- `/api/*`
- `/_next/*`
- Static files (`.svg`, `.png`, etc.)

---

## Cookie Management

### Set Auth Token
```typescript
import { setAuthToken } from '@/lib/cookies'

setAuthToken('eyJhbGc...')
```

### Get Auth Token
```typescript
import { getAuthToken } from '@/lib/cookies'

const token = getAuthToken()
```

### Delete Auth Token
```typescript
import { deleteAuthToken } from '@/lib/cookies'

deleteAuthToken()
```

---

## Testing Commands

```bash
# 1. Test unauthenticated access
curl -v http://localhost:3000/games
# Expected: 302 Redirect to /login?redirect=/games

# 2. Test public route
curl -v http://localhost:3000/login
# Expected: 200 OK

# 3. Test with cookie
curl -v http://localhost:3000/games \
  -H "Cookie: auth_token=your-token-here"
# Expected: 200 OK

# 4. Test static asset
curl -v http://localhost:3000/favicon.ico
# Expected: 200 OK (no redirect)
```

---

## Browser DevTools Checks

### View Cookies
1. F12 → Application → Cookies → localhost:3000
2. Look for `auth_token`

### Expected Cookie Properties
- **Name**: `auth_token`
- **Path**: `/`
- **SameSite**: `Lax`
- **Secure**: ✅ (if HTTPS)
- **HttpOnly**: ✅ (if set by backend)

---

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Infinite redirect | Cookie not set | Check cookie in DevTools |
| Always redirects | Cookie name mismatch | Verify `auth_token` name |
| Static assets fail | Matcher too broad | Check middleware matcher |
| CORS issues | Missing credentials | Add `credentials: 'include'` |

---

## Quick Debug Code

### Add to Middleware (Temporarily)
```typescript
export async function middleware(request: NextRequest) {
  console.log('[Middleware] Path:', request.nextUrl.pathname)
  console.log('[Middleware] Cookies:', request.cookies.getAll())

  // ... rest of middleware code
}
```

### Add to API Client (Temporarily)
```typescript
setToken(token: string) {
  console.log('[API] Setting token:', token.substring(0, 20) + '...')
  setAuthToken(token)
  console.log('[API] Cookie after set:', document.cookie)
}
```

---

## Migration Checklist

- [ ] Update `lib/api.ts` (use cookie utilities)
- [ ] Update `components/auth-provider.tsx` (use `getAuthToken`)
- [ ] Update `lib/notifications-api.ts` (use `getAuthToken`)
- [ ] Test login flow
- [ ] Test logout flow
- [ ] Test page refresh
- [ ] Verify cookies in DevTools

---

## Security Settings

### Development
```typescript
{
  secure: false,      // Allow HTTP
  sameSite: 'lax',
  httpOnly: false,    // Allow JS access for debugging
}
```

### Production
```typescript
{
  httpOnly: true,     // Prevent XSS
  secure: true,       // HTTPS only
  sameSite: 'strict', // Strong CSRF protection
}
```

---

## Important Notes

1. **Middleware is lightweight**: Only checks token presence, not validity
2. **Full auth in components**: Cerbos checks happen in page components
3. **Cookie required**: localStorage won't work with middleware
4. **Backend should set HttpOnly**: Most secure approach

---

## Need Help?

1. **Full guide**: `docs/MIDDLEWARE_IMPLEMENTATION.md`
2. **Migration steps**: `docs/COOKIE_MIGRATION_GUIDE.md`
3. **Cookie utils**: `frontend/lib/cookies.ts`
4. **Inline comments**: Check `frontend/middleware.ts`

---

**Version**: 1.0.0
**Last Updated**: 2025-10-01
