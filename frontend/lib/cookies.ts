/**
 * @fileoverview Cookie Management Utilities
 *
 * Provides type-safe utilities for managing cookies in the application.
 * Supports both client-side (browser) and server-side (Next.js) cookie operations.
 *
 * This module is part of Phase 5 Cerbos implementation for server-side route protection.
 *
 * @module lib/cookies
 */

/**
 * Cookie options interface for type safety
 */
export interface CookieOptions {
  /** Cookie path (default: '/') */
  path?: string
  /** Max age in seconds (default: 86400 = 24 hours) */
  maxAge?: number
  /** Cookie domain */
  domain?: string
  /** Secure flag (HTTPS only) - auto-detected in production */
  secure?: boolean
  /** SameSite attribute for CSRF protection */
  sameSite?: 'strict' | 'lax' | 'none'
  /** HttpOnly flag (server-side only) */
  httpOnly?: boolean
}

/**
 * Default cookie options for auth tokens
 */
const DEFAULT_COOKIE_OPTIONS: Required<Omit<CookieOptions, 'domain' | 'httpOnly'>> = {
  path: '/',
  maxAge: 86400, // 24 hours
  secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
  sameSite: 'lax',
}

/**
 * Sets a cookie in the browser
 *
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 *
 * @example
 * ```typescript
 * // Set auth token with default options
 * setCookie('auth_token', 'eyJhbGc...', { maxAge: 86400 })
 *
 * // Set cookie with custom options
 * setCookie('theme', 'dark', { path: '/', maxAge: 31536000, secure: true })
 * ```
 */
export function setCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  if (typeof window === 'undefined') {
    console.warn('[Cookies] setCookie called on server-side, skipping')
    return
  }

  const opts = { ...DEFAULT_COOKIE_OPTIONS, ...options }

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`

  if (opts.path) {
    cookieString += `; path=${opts.path}`
  }

  if (opts.maxAge !== undefined) {
    cookieString += `; max-age=${opts.maxAge}`
  }

  if (opts.domain) {
    cookieString += `; domain=${opts.domain}`
  }

  if (opts.sameSite) {
    cookieString += `; SameSite=${opts.sameSite}`
  }

  // Only set Secure flag if explicitly true or auto-detected as HTTPS
  if (opts.secure) {
    cookieString += '; Secure'
  }

  // Note: HttpOnly cannot be set via JavaScript
  // It must be set by the server via Set-Cookie header
  if (opts.httpOnly) {
    console.warn(
      '[Cookies] HttpOnly flag cannot be set via JavaScript. ' +
      'Use server-side Set-Cookie header instead.'
    )
  }

  document.cookie = cookieString
}

/**
 * Gets a cookie value from the browser
 *
 * @param name - Cookie name
 * @returns Cookie value or null if not found
 *
 * @example
 * ```typescript
 * const token = getCookie('auth_token')
 * if (token) {
 *   console.log('User is authenticated')
 * }
 * ```
 */
export function getCookie(name: string): string | null {
  if (typeof window === 'undefined') {
    console.warn('[Cookies] getCookie called on server-side, returning null')
    return null
  }

  const cookies = document.cookie.split(';')

  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split('=').map(c => c.trim())

    if (decodeURIComponent(cookieName) === name) {
      return decodeURIComponent(cookieValue)
    }
  }

  return null
}

/**
 * Deletes a cookie by setting its max-age to 0
 *
 * @param name - Cookie name
 * @param options - Cookie options (path and domain must match original cookie)
 *
 * @example
 * ```typescript
 * // Delete auth token
 * deleteCookie('auth_token')
 *
 * // Delete cookie with custom path
 * deleteCookie('session', { path: '/app' })
 * ```
 */
export function deleteCookie(name: string, options: CookieOptions = {}): void {
  if (typeof window === 'undefined') {
    console.warn('[Cookies] deleteCookie called on server-side, skipping')
    return
  }

  setCookie(name, '', {
    ...options,
    maxAge: 0, // Expire immediately
  })
}

/**
 * Checks if a cookie exists
 *
 * @param name - Cookie name
 * @returns True if cookie exists, false otherwise
 *
 * @example
 * ```typescript
 * if (hasCookie('auth_token')) {
 *   console.log('User is authenticated')
 * }
 * ```
 */
export function hasCookie(name: string): boolean {
  return getCookie(name) !== null
}

/**
 * Gets all cookies as an object
 *
 * @returns Object with cookie name-value pairs
 *
 * @example
 * ```typescript
 * const cookies = getAllCookies()
 * console.log(cookies) // { auth_token: '...', theme: 'dark' }
 * ```
 */
export function getAllCookies(): Record<string, string> {
  if (typeof window === 'undefined') {
    console.warn('[Cookies] getAllCookies called on server-side, returning empty object')
    return {}
  }

  const cookies: Record<string, string> = {}
  const cookieStrings = document.cookie.split(';')

  for (const cookie of cookieStrings) {
    const [name, value] = cookie.split('=').map(c => c.trim())

    if (name && value) {
      cookies[decodeURIComponent(name)] = decodeURIComponent(value)
    }
  }

  return cookies
}

/**
 * Cookie names used in the application
 * Centralized for consistency and type safety
 */
export const COOKIE_NAMES = {
  /** Authentication token */
  AUTH_TOKEN: 'auth_token',
  /** User theme preference */
  THEME: 'theme',
  /** Sidebar state */
  SIDEBAR_STATE: 'sidebar:state',
} as const

/**
 * Type-safe helper for setting auth token cookie
 *
 * @param token - JWT token
 * @param options - Cookie options
 *
 * @example
 * ```typescript
 * setAuthToken('eyJhbGc...')
 * ```
 */
export function setAuthToken(token: string, options?: CookieOptions): void {
  setCookie(COOKIE_NAMES.AUTH_TOKEN, token, {
    maxAge: 86400, // 24 hours
    ...options,
  })
}

/**
 * Type-safe helper for getting auth token cookie
 *
 * @returns Auth token or null if not found
 *
 * @example
 * ```typescript
 * const token = getAuthToken()
 * if (token) {
 *   // User is authenticated
 * }
 * ```
 */
export function getAuthToken(): string | null {
  return getCookie(COOKIE_NAMES.AUTH_TOKEN)
}

/**
 * Type-safe helper for deleting auth token cookie
 *
 * @example
 * ```typescript
 * deleteAuthToken() // Logs user out
 * ```
 */
export function deleteAuthToken(): void {
  deleteCookie(COOKIE_NAMES.AUTH_TOKEN)
}

/**
 * Server-side cookie parser for Next.js middleware and server components
 *
 * @param cookieHeader - Cookie header string (from request.headers.get('cookie'))
 * @returns Object with cookie name-value pairs
 *
 * @example
 * ```typescript
 * // In middleware or server component
 * const cookies = parseCookieHeader(request.headers.get('cookie'))
 * const authToken = cookies.auth_token
 * ```
 */
export function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {}
  }

  const cookies: Record<string, string> = {}
  const cookieStrings = cookieHeader.split(';')

  for (const cookie of cookieStrings) {
    const [name, value] = cookie.split('=').map(c => c.trim())

    if (name && value) {
      cookies[decodeURIComponent(name)] = decodeURIComponent(value)
    }
  }

  return cookies
}
