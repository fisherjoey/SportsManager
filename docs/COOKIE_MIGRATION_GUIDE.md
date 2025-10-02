# Cookie Migration Guide

## Migrating from localStorage to Cookies for Middleware Support

**Status**: Action Required
**Priority**: High
**Estimated Time**: 2-4 hours

---

## Why This Migration is Needed

The new Next.js middleware (`frontend/middleware.ts`) runs on the server-side **before** pages render. Since middleware runs on the server, it cannot access `localStorage` (which only exists in the browser). To enable server-side route protection, we need to migrate from localStorage to cookies.

---

## Current State vs. Target State

### Current State (localStorage)

```typescript
// ❌ Only works client-side
localStorage.setItem('auth_token', token)
const token = localStorage.getItem('auth_token')
```

**Problems**:
- Middleware cannot read localStorage
- Server components cannot access localStorage
- No SSR authentication state

### Target State (Cookies)

```typescript
// ✅ Works both client and server-side
document.cookie = 'auth_token=...; path=/; ...'
const token = request.cookies.get('auth_token')
```

**Benefits**:
- Middleware can verify authentication
- Server components can read auth state
- Better security with HttpOnly option
- CSRF protection with SameSite attribute

---

## Migration Steps

### Step 1: Update Frontend API Client

**File**: `frontend/lib/api.ts`

**Find** (around line 77-96):

```typescript
setToken(token: string) {
  this.token = token
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token)
  }
}

getToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token')
  }
  return this.token
}

removeToken() {
  this.token = null
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token')
  }
}
```

**Replace with**:

```typescript
import { setAuthToken, getAuthToken, deleteAuthToken } from './cookies'

setToken(token: string) {
  this.token = token
  if (typeof window !== 'undefined') {
    // Use cookie utility for consistent cookie management
    setAuthToken(token, {
      maxAge: 86400, // 24 hours
      sameSite: 'lax',
      // secure: true, // Uncomment for production with HTTPS
    })
  }
}

getToken() {
  if (typeof window !== 'undefined') {
    const cookieToken = getAuthToken()
    if (cookieToken) {
      this.token = cookieToken
      return cookieToken
    }
  }
  return this.token
}

removeToken() {
  this.token = null
  if (typeof window !== 'undefined') {
    deleteAuthToken()
  }
}
```

---

### Step 2: Update Auth Provider

**File**: `frontend/components/auth-provider.tsx`

**Find** (around line 135):

```typescript
const storedToken = localStorage.getItem('auth_token')
```

**Replace with**:

```typescript
import { getAuthToken } from '@/lib/cookies'

const storedToken = getAuthToken()
```

**Find** (around line 155):

```typescript
localStorage.removeItem('auth_token')
```

**Replace with**:

```typescript
import { deleteAuthToken } from '@/lib/cookies'

deleteAuthToken()
```

---

### Step 3: Update Notification Service (if applicable)

**File**: `frontend/lib/notifications-api.ts`

**Find** (around line 94):

```typescript
private getToken(): string | null {
  return localStorage.getItem('auth_token');
}
```

**Replace with**:

```typescript
import { getAuthToken } from './cookies'

private getToken(): string | null {
  return getAuthToken();
}
```

---

### Step 4: Update Login Form (Handle Redirect)

**File**: `frontend/components/login-form.tsx`

After successful login, redirect to the intended page:

```typescript
// Find your login success handler and add redirect logic:

const handleLogin = async (email: string, password: string) => {
  const success = await login(email, password)

  if (success) {
    // Check for redirect parameter
    const params = new URLSearchParams(window.location.search)
    const redirectTo = params.get('redirect') || '/'

    // Redirect to intended page or home
    router.push(redirectTo)
  }
}
```

---

### Step 5: Backend Cookie Setting (Recommended)

For maximum security, have the backend set HttpOnly cookies.

**File**: `backend/src/routes/auth.ts` (or similar)

```typescript
// Express.js example
app.post('/login', async (req, res) => {
  // ... existing authentication logic ...

  // Set HttpOnly cookie (most secure - not accessible via JavaScript)
  res.cookie('auth_token', token, {
    httpOnly: true,        // Prevents XSS attacks
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax',      // CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    path: '/',
  })

  // Still return token in response for client-side use if needed
  res.json({
    success: true,
    user,
    token, // Frontend can use this for API calls
  })
})

app.post('/logout', async (req, res) => {
  // Clear cookie
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })

  res.json({ success: true })
})
```

---

## Testing Your Migration

### Test Checklist

- [ ] **Login Flow**
  1. Clear all cookies and localStorage
  2. Visit any protected page (e.g., `/games`)
  3. Should redirect to `/login?redirect=/games`
  4. Login with valid credentials
  5. Should redirect back to `/games`
  6. Check browser DevTools → Application → Cookies
  7. Verify `auth_token` cookie exists

- [ ] **Logout Flow**
  1. While logged in, click logout
  2. Should redirect to `/login`
  3. Check cookies - `auth_token` should be gone
  4. Try visiting protected page
  5. Should redirect to `/login`

- [ ] **Page Refresh**
  1. Login successfully
  2. Navigate to protected page
  3. Refresh the page (F5 or Cmd+R)
  4. Should stay on the same page (not redirect to login)
  5. User should remain authenticated

- [ ] **Public Pages**
  1. Visit `/login` without auth
  2. Should show login form (no redirect)
  3. Visit `/complete-signup` without auth
  4. Should work normally

- [ ] **Middleware Exclusions**
  1. Visit API endpoint directly (e.g., `/api/users`)
  2. Should not redirect to login
  3. Check static assets load (images, fonts, etc.)
  4. Should not be blocked by middleware

---

## Browser DevTools Debugging

### Chrome/Edge DevTools

1. Open DevTools (F12)
2. Go to **Application** tab
3. Expand **Cookies** in left sidebar
4. Select your domain (e.g., `http://localhost:3000`)
5. Look for `auth_token` cookie

### Firefox DevTools

1. Open DevTools (F12)
2. Go to **Storage** tab
3. Expand **Cookies**
4. Select your domain
5. Look for `auth_token` cookie

### Expected Cookie Properties

| Property | Value |
|----------|-------|
| Name | `auth_token` |
| Value | JWT token (long string) |
| Domain | Your domain |
| Path | `/` |
| Expires | 24 hours from creation |
| HttpOnly | ✅ (if set by backend) |
| Secure | ✅ (if HTTPS) |
| SameSite | `Lax` |

---

## Common Issues and Solutions

### Issue 1: Infinite Redirect Loop

**Symptoms**: Browser keeps redirecting between `/login` and another page

**Causes**:
- Cookie not being set properly
- Cookie path mismatch
- Middleware matcher too broad

**Solution**:
```typescript
// Check that cookie is being set
console.log('Setting cookie:', document.cookie)

// Verify cookie after setting
setTimeout(() => {
  console.log('Cookie after set:', document.cookie)
}, 100)
```

---

### Issue 2: Auth Token Not Found in Middleware

**Symptoms**: Always redirects to login even after successful login

**Causes**:
- Cookie not set
- Cookie name mismatch
- Cookie path wrong

**Solution**:
```typescript
// In middleware.ts, add debug logging
const authToken = request.cookies.get('auth_token')
console.log('[Middleware] Auth token:', authToken ? 'found' : 'missing')
console.log('[Middleware] All cookies:', request.cookies.getAll())
```

---

### Issue 3: Cookie Not Visible in DevTools

**Symptoms**: Login succeeds but no cookie appears

**Causes**:
- Cookie set with wrong domain
- Cookie set with HttpOnly but viewing in JavaScript
- Browser privacy settings blocking cookies

**Solution**:
1. Check browser privacy settings
2. Allow cookies for localhost/development
3. Verify cookie is being set (check Network tab → Response Headers)

---

### Issue 4: CORS Issues with Cookies

**Symptoms**: Cookie not sent with API requests

**Causes**:
- Frontend and backend on different domains
- Missing CORS credentials setting

**Solution**:
```typescript
// In frontend API client
const response = await fetch(url, {
  credentials: 'include', // Send cookies with request
  headers: {
    'Content-Type': 'application/json',
  },
})

// In backend CORS config
app.use(cors({
  origin: 'http://localhost:3000', // Your frontend URL
  credentials: true, // Allow credentials (cookies)
}))
```

---

## Rollback Plan

If you need to rollback to localStorage:

1. Revert changes to `frontend/lib/api.ts`
2. Revert changes to `frontend/components/auth-provider.tsx`
3. Revert changes to `frontend/lib/notifications-api.ts`
4. Comment out middleware matcher in `frontend/middleware.ts`:

```typescript
export const config = {
  matcher: [], // Disable middleware temporarily
}
```

5. Clear browser cookies and test

---

## Security Recommendations

### Development Environment

```typescript
// Use less strict settings for local development
setCookie('auth_token', token, {
  secure: false,         // Allow HTTP (localhost)
  sameSite: 'lax',      // Moderate CSRF protection
  httpOnly: false,       // Allow JavaScript access for debugging
  maxAge: 86400,        // 24 hours
})
```

### Production Environment

```typescript
// Use strict settings for production
res.cookie('auth_token', token, {
  httpOnly: true,        // Prevent XSS attacks
  secure: true,          // HTTPS only
  sameSite: 'strict',   // Strong CSRF protection
  maxAge: 86400000,     // 24 hours
  domain: '.yourdomain.com', // Scoped to your domain
})
```

---

## Additional Resources

- Cookie utility documentation: `frontend/lib/cookies.ts`
- Middleware documentation: `docs/MIDDLEWARE_IMPLEMENTATION.md`
- Next.js Middleware Docs: https://nextjs.org/docs/app/building-your-application/routing/middleware
- MDN Cookies Guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies

---

## Support

If you encounter issues during migration:

1. Check this guide's troubleshooting section
2. Review browser console for errors
3. Check Network tab for cookie headers
4. Verify middleware is running (add console.logs)
5. Test in different browsers
6. Reach out to the development team

---

**Migration Status Checklist**:

- [ ] Updated `frontend/lib/api.ts`
- [ ] Updated `frontend/components/auth-provider.tsx`
- [ ] Updated `frontend/lib/notifications-api.ts`
- [ ] Updated `frontend/components/login-form.tsx` (redirect handling)
- [ ] Updated backend to set HttpOnly cookies (optional but recommended)
- [ ] Tested login flow
- [ ] Tested logout flow
- [ ] Tested page refresh
- [ ] Tested public pages
- [ ] Tested middleware exclusions
- [ ] Verified cookies in DevTools
- [ ] Documented any custom changes

---

**Last Updated**: 2025-10-01
