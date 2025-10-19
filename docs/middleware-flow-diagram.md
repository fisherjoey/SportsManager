# Middleware Flow Diagram

## Visual Flow of Request Processing

```
┌─────────────────────────────────────────────────────────────────┐
│                        Incoming Request                          │
│                     (e.g., GET /games)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
          ┌──────────────────────────────────────┐
          │  Is route excluded?                  │
          │  • /api/*                           │
          │  • /_next/*                         │
          │  • *.svg, *.png, etc.              │
          └──────────┬───────────────────┬──────┘
                     │                   │
                   YES                  NO
                     │                   │
                     ▼                   ▼
          ┌──────────────────┐  ┌──────────────────────┐
          │  Allow Through   │  │  Is route public?     │
          │  (skip checks)   │  │  • /login             │
          └──────────────────┘  │  • /complete-signup   │
                                │  • /unauthorized      │
                                └──────┬─────────┬──────┘
                                       │         │
                                     YES        NO
                                       │         │
                                       ▼         ▼
                            ┌──────────────┐  ┌────────────────────┐
                            │ Allow Through│  │ Check for Cookie   │
                            └──────────────┘  │ auth_token exists? │
                                              └──────┬───────┬─────┘
                                                     │       │
                                                   YES      NO
                                                     │       │
                                                     ▼       ▼
                                          ┌─────────────┐  ┌──────────────────┐
                                          │ Allow       │  │ Redirect to      │
                                          │ Continue to │  │ /login?redirect= │
                                          │ Page        │  │ <pathname>       │
                                          └──────┬──────┘  └──────────────────┘
                                                 │
                                                 ▼
                                     ┌────────────────────┐
                                     │ Page Component     │
                                     │ (Cerbos Check)     │
                                     │                    │
                                     │ • Load user perms  │
                                     │ • Check page access│
                                     │ • Render or 403    │
                                     └────────────────────┘
```

---

## Cookie-Based Authentication Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         User Login                               │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  POST /api/login             │
              │  { email, password }         │
              └──────────┬───────────────────┘
                         │
                         ▼
              ┌──────────────────────────────┐
              │  Backend Validates           │
              │  Credentials                 │
              └──────────┬───────────────────┘
                         │
                         ▼
              ┌──────────────────────────────┐
              │  Generate JWT Token          │
              └──────────┬───────────────────┘
                         │
                    ┌────┴────┐
                    │         │
                    ▼         ▼
        ┌──────────────┐  ┌─────────────────────┐
        │ Return Token │  │ Set Cookie          │
        │ in Response  │  │ (HttpOnly, Secure)  │
        └──────┬───────┘  └──────┬──────────────┘
               │                 │
               ▼                 ▼
        ┌──────────────┐  ┌─────────────────────┐
        │ Frontend     │  │ Browser stores      │
        │ stores in    │  │ cookie              │
        │ cookie       │  │ automatically       │
        └──────┬───────┘  └──────┬──────────────┘
               │                 │
               └────────┬────────┘
                        │
                        ▼
              ┌──────────────────────────────┐
              │  Subsequent Requests         │
              │  Include Cookie Automatically│
              └──────────┬───────────────────┘
                         │
                         ▼
              ┌──────────────────────────────┐
              │  Middleware Reads Cookie     │
              │  and Validates Presence      │
              └──────────────────────────────┘
```

---

## localStorage vs Cookie Comparison

```
┌─────────────────────────────────────────────────────────────────┐
│                    localStorage (Current)                        │
└─────────────────────────────────────────────────────────────────┘

Browser Request
    │
    ├─► Client-Side Only ✅
    │   • localStorage.getItem('auth_token')
    │   • Works in browser
    │
    ├─► Server-Side ❌
    │   • Middleware cannot access
    │   • Server components cannot access
    │   • SSR breaks
    │
    └─► Security ⚠️
        • Accessible via JavaScript
        • Vulnerable to XSS
        • No HttpOnly option

┌─────────────────────────────────────────────────────────────────┐
│                    Cookies (Target State)                        │
└─────────────────────────────────────────────────────────────────┘

Browser Request
    │
    ├─► Client-Side ✅
    │   • document.cookie
    │   • getCookie('auth_token')
    │
    ├─► Server-Side ✅
    │   • request.cookies.get('auth_token')
    │   • Works in middleware
    │   • Works in server components
    │
    └─► Security ✅
        • Can be HttpOnly (no JS access)
        • SameSite protection (CSRF)
        • Secure flag (HTTPS only)
```

---

## Multi-Layer Security Model

```
┌─────────────────────────────────────────────────────────────────┐
│                         Request Flow                             │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Middleware (Server-Side, Edge)
┌─────────────────────────────────────────────────────────────────┐
│  • Lightweight authentication check                             │
│  • Cookie presence validation                                   │
│  • Public route bypass                                          │
│  • Performance: < 1ms                                           │
│  • Decision: Allow or Redirect                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ ALLOW
                             ▼
Layer 2: Page Component (Client-Side)
┌─────────────────────────────────────────────────────────────────┐
│  • Fetch user from auth context                                 │
│  • Load user permissions from Cerbos                            │
│  • Check page-level permissions                                 │
│  • Performance: ~50-100ms                                       │
│  • Decision: Render or Redirect to /unauthorized               │
└────────────────────────────┬────────────────────────────────────┘
                             │ AUTHORIZED
                             ▼
Layer 3: Component Features (Client-Side)
┌─────────────────────────────────────────────────────────────────┐
│  • Check feature-level permissions                              │
│  • Show/hide UI elements                                        │
│  • Enable/disable actions                                       │
│  • Performance: < 1ms (in-memory)                               │
│  • Decision: Show/Hide, Enable/Disable                          │
└────────────────────────────┬────────────────────────────────────┘
                             │ ALLOWED
                             ▼
Layer 4: API Endpoints (Server-Side)
┌─────────────────────────────────────────────────────────────────┐
│  • Full Cerbos authorization check                              │
│  • Resource-level permissions                                   │
│  • Action-specific validation                                   │
│  • Performance: ~10-50ms                                        │
│  • Decision: Execute or Return 403                              │
└─────────────────────────────────────────────────────────────────┘

Defense in Depth: Each layer provides additional security
```

---

## Redirect Flow with Return URL

```
User wants to access /games
         │
         ▼
┌──────────────────────────┐
│ Middleware checks cookie │
│ No auth_token found      │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Create redirect URL:                 │
│ /login?redirect=/games               │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ User arrives at login page           │
│ Sees redirect param in URL           │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ User enters credentials and submits  │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Backend validates and returns token  │
│ Frontend sets auth_token cookie      │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Frontend reads redirect param        │
│ Redirects to: /games                 │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ User now on /games                   │
│ Middleware finds auth_token          │
│ Allows request through               │
└──────────────────────────────────────┘
```

---

## Error Handling Flow

```
Request with Invalid/Expired Token
         │
         ▼
┌──────────────────────────────────────┐
│ Middleware reads auth_token cookie   │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ (Future) JWT Validation              │
│ Token expired or invalid             │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Clear invalid cookie                 │
│ response.cookies.delete('auth_token')│
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Redirect to login with error:        │
│ /login?redirect=/games&error=expired │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Login page shows:                    │
│ "Your session has expired.           │
│  Please log in again."               │
└──────────────────────────────────────┘
```

---

## Performance Optimization

```
┌─────────────────────────────────────────────────────────────────┐
│                    Request Timeline                              │
└─────────────────────────────────────────────────────────────────┘

Time (ms)
    0 ─┐
       │ Request arrives
       ├─► Static Asset? ───────────────────► Serve immediately
       │   (excluded from middleware)         (0ms overhead)
       │
       │ Not Static
    1 ─┤ Middleware starts
       ├─► Read cookie from header (< 0.1ms)
       ├─► Check route category (< 0.1ms)
       ├─► Make decision (< 0.1ms)
       │
    2 ─┤ Middleware completes (< 1ms total)
       │
       ├─► Public Route ──────────────────► Render page
       │
       ├─► No Token ──────────────────────► Redirect (50ms)
       │
       ├─► Has Token ─────────────────────► Continue
       │                                      │
       │                                      ▼
   50 ─┤                            Page Component Loads
       │                            ├─► Fetch user (API call)
       │                            ├─► Check Cerbos (API call)
       │                            │
  150 ─┤                            └─► Render or 403
       │
       └─► Total: 150ms (most time is API calls, not middleware)
```

---

## Development vs Production

```
┌─────────────────────────────────────────────────────────────────┐
│                      Development                                 │
└─────────────────────────────────────────────────────────────────┘

localhost:3000 (HTTP)
    │
    ├─► Cookie Settings
    │   • secure: false (allow HTTP)
    │   • sameSite: 'lax'
    │   • httpOnly: false (debug in DevTools)
    │
    ├─► Debug Features
    │   • Console logging enabled
    │   • Detailed error messages
    │   • Cookie visible in JavaScript
    │
    └─► CORS
        • Origin: localhost:3000
        • Credentials: include

┌─────────────────────────────────────────────────────────────────┐
│                      Production                                  │
└─────────────────────────────────────────────────────────────────┘

app.example.com (HTTPS)
    │
    ├─► Cookie Settings
    │   • secure: true (HTTPS only)
    │   • sameSite: 'strict'
    │   • httpOnly: true (no JS access)
    │
    ├─► Security Features
    │   • JWT validation enabled
    │   • Rate limiting active
    │   • Audit logging enabled
    │   • Security headers added
    │
    └─► CORS
        • Origin: app.example.com
        • Credentials: include
        • Strict domain validation
```

---

## Key Takeaways

1. **Middleware is Fast**: < 1ms per request, minimal overhead
2. **Layered Security**: Multiple checkpoints (middleware → page → API)
3. **Cookie Required**: localStorage won't work with server-side middleware
4. **Return URLs**: Users redirected back to intended page after login
5. **Future Ready**: Code includes placeholders for JWT validation and security headers

---

**See Also**:
- Full implementation: `docs/MIDDLEWARE_IMPLEMENTATION.md`
- Migration guide: `docs/COOKIE_MIGRATION_GUIDE.md`
- Quick reference: `docs/MIDDLEWARE_QUICK_REFERENCE.md`
