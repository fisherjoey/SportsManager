/**
 * @fileoverview Next.js Middleware for Server-Side Route Protection
 *
 * This middleware runs on the edge before page rendering to protect routes and handle authentication.
 * It performs lightweight authentication checks and redirects unauthenticated users to login.
 *
 * Phase 5 of Cerbos page access control implementation.
 *
 * Key Features:
 * - Server-side route protection before page render
 * - Cookie-based authentication check (auth_token)
 * - Automatic redirect to login with return URL preservation
 * - Public routes bypass (login, signup, unauthorized)
 * - Static asset and API route exclusion
 * - Performance optimized (no heavy Cerbos checks)
 *
 * Flow:
 * 1. Check if route is public → allow through
 * 2. Check if route is static/API → allow through
 * 3. Check for auth_token cookie → redirect to login if missing
 * 4. Allow authenticated requests → granular checks happen in page components
 *
 * @module middleware
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Public routes that don't require authentication.
 * These routes are accessible to all users, authenticated or not.
 */
const PUBLIC_ROUTES = [
  '/login',
  '/complete-signup',
  '/unauthorized',
] as const

/**
 * Routes that should be excluded from middleware processing entirely.
 * Includes API routes, Next.js internals, and static assets.
 */
const EXCLUDED_PATTERNS = [
  '/api',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
] as const

/**
 * Admin-only routes that require elevated permissions.
 * Note: This is a lightweight check. Full Cerbos validation happens in page components.
 */
const ADMIN_ROUTES = [
  '/admin',
  '/admin-users',
  '/admin-roles',
  '/admin-permissions',
  '/admin-settings',
  '/admin-access-control',
  '/admin-security',
  '/admin-workflows',
] as const

/**
 * Cookie configuration constants
 */
const AUTH_COOKIE_NAME = 'auth_token' as const
const REDIRECT_PARAM_NAME = 'redirect' as const

/**
 * Checks if a route is public and doesn't require authentication
 *
 * @param pathname - The URL pathname to check
 * @returns True if the route is public
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )
}

/**
 * Checks if a route should be excluded from middleware processing
 *
 * @param pathname - The URL pathname to check
 * @returns True if the route should be excluded
 */
function isExcludedRoute(pathname: string): boolean {
  return EXCLUDED_PATTERNS.some(pattern =>
    pathname.startsWith(pattern)
  )
}

/**
 * Checks if a route requires admin privileges
 * Note: This is a preliminary check. Full authorization happens in page components via Cerbos.
 *
 * @param pathname - The URL pathname to check
 * @returns True if the route is admin-only
 */
function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )
}

/**
 * Next.js Middleware Function
 *
 * Executes on every request before the page renders. Performs lightweight authentication
 * checks and redirects as needed. Heavy authorization logic (Cerbos) runs in page components.
 *
 * Security Flow:
 * 1. Skip middleware for excluded routes (API, static assets, Next.js internals)
 * 2. Allow public routes to pass through
 * 3. Check for authentication token in cookies
 * 4. Redirect to login if no token, preserving intended destination
 * 5. Allow authenticated requests to proceed (page components do granular checks)
 *
 * Future Enhancements:
 * - Add JWT validation (decode and verify token signature)
 * - Add token expiration check
 * - Add rate limiting for login attempts
 * - Add security headers (CSP, HSTS, etc.)
 *
 * @param request - The incoming Next.js request
 * @returns NextResponse with redirect or pass-through
 */
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // ============================================================================
  // TEMPORARY: MIDDLEWARE DISABLED PENDING COOKIE MIGRATION
  // ============================================================================
  // The middleware requires cookies, but the app currently uses localStorage.
  // Middleware is disabled until cookie migration is complete.
  // See: docs/COOKIE_MIGRATION_GUIDE.md
  //
  // TODO: Remove this bypass after completing cookie migration
  console.log('[Middleware] DISABLED - Bypassing all checks until cookie migration')
  return NextResponse.next()

  // ============================================================================
  // STEP 1: Exclude routes that don't need middleware processing
  // ============================================================================
  // Skip middleware for API routes, static assets, and Next.js internals
  // This improves performance and avoids unnecessary processing
  if (isExcludedRoute(pathname)) {
    return NextResponse.next()
  }

  // ============================================================================
  // STEP 2: Allow public routes
  // ============================================================================
  // Public routes are accessible to everyone (login, signup, unauthorized page)
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // ============================================================================
  // STEP 3: Check authentication
  // ============================================================================
  // Look for auth_token in cookies
  const authToken = request.cookies.get(AUTH_COOKIE_NAME)?.value

  // If no token, redirect to login with return URL
  if (!authToken) {
    const loginUrl = new URL('/login', request.url)

    // Preserve the intended destination
    // Users will be redirected back after successful login
    loginUrl.searchParams.set(REDIRECT_PARAM_NAME, pathname)

    // Preserve existing query parameters
    searchParams.forEach((value, key) => {
      if (key !== REDIRECT_PARAM_NAME) {
        loginUrl.searchParams.set(key, value)
      }
    })

    // Return redirect response
    return NextResponse.redirect(loginUrl)
  }

  // ============================================================================
  // STEP 4: Token exists - Allow request (with optional future enhancements)
  // ============================================================================

  // TODO: Future Enhancement - JWT Validation
  // Uncomment and implement when ready for enhanced security:
  /*
  try {
    // Decode JWT token to verify it's valid and not expired
    const decodedToken = await verifyJWT(authToken)

    // Check token expiration
    if (decodedToken.exp && decodedToken.exp < Date.now() / 1000) {
      // Token expired - redirect to login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set(REDIRECT_PARAM_NAME, pathname)
      loginUrl.searchParams.set('error', 'session_expired')

      // Clear the expired token
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete(AUTH_COOKIE_NAME)
      return response
    }

    // Optional: Check if admin route and user has admin role in token
    if (isAdminRoute(pathname)) {
      const userRoles = decodedToken.roles || []
      const isAdmin = userRoles.includes('admin') ||
                     userRoles.includes('Admin') ||
                     userRoles.includes('Super Admin')

      if (!isAdmin) {
        // Not admin - redirect to unauthorized
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    }
  } catch (error) {
    // JWT verification failed - invalid token
    console.error('[Middleware] JWT verification failed:', error)

    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set(REDIRECT_PARAM_NAME, pathname)
    loginUrl.searchParams.set('error', 'invalid_token')

    // Clear the invalid token
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete(AUTH_COOKIE_NAME)
    return response
  }
  */

  // Token exists and is valid - allow request to proceed
  // Note: Page components will perform granular Cerbos authorization checks
  const response = NextResponse.next()

  // TODO: Future Enhancement - Add Security Headers
  // Uncomment when ready to enforce security headers:
  /*
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )
  */

  return response
}

/**
 * Middleware Configuration
 *
 * Defines which routes the middleware should run on.
 * Uses a negative lookahead pattern to exclude:
 * - /api/* routes (backend API calls)
 * - /_next/static/* (static assets)
 * - /_next/image/* (Next.js image optimization)
 * - /favicon.ico (favicon)
 * - Static file extensions (svg, png, jpg, jpeg, gif, webp, ico, woff, woff2, ttf)
 *
 * The matcher runs the middleware on all other routes.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static file extensions
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp|.*\\.ico|.*\\.woff|.*\\.woff2|.*\\.ttf).*)',
  ],
}
