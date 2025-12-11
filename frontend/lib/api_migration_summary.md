# API Client Migration Summary

## Changes Made to `frontend/lib/api.ts`

### 1. Removed Cookie-Based Authentication
- **Removed imports**: Deleted imports for `setAuthToken`, `getAuthToken`, and `deleteAuthToken` from `./cookies`
- **Removed methods**:
  - `setToken(token: string)` - Previously stored token in both instance and cookies
  - `removeToken()` - Previously cleared token from instance and cookies
  - `initializeToken()` - Previously initialized token from cookies
  - `getToken()` - Previously returned the stored token value

### 2. Updated Class Structure
- **Removed property**: `private token: string | null = null`
- **Added property**: `private getToken: (() => Promise<string | null>) | null = null`
- **Updated constructor**: Now accepts an optional `getToken` function parameter:
  ```typescript
  constructor(getToken?: () => Promise<string | null>) {
    this.getToken = getToken || null
  }
  ```

### 3. Updated Request Method
The `request()` method now:
- Gets the authentication token by calling the injected `getToken` function (from Clerk)
- Retrieves the active organization ID from `localStorage`
- Adds both `Authorization` and `X-Organization-ID` headers to requests

**New request method logic**:
```typescript
private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Get token from Clerk
  const token = this.getToken ? await this.getToken() : null

  // Get active organization from localStorage
  const orgId = typeof window !== 'undefined' ? localStorage.getItem('activeOrganizationId') : null

  // ... build URL and method ...

  const headers: HeadersInit = {
    ...options.headers
  }

  // ... set Content-Type ...

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (orgId) {
    headers['X-Organization-ID'] = orgId
  }

  // ... make request ...
}
```

## How to Use the Updated API Client

### Option 1: Create a Wrapper Hook (Recommended)

Create a new file `frontend/lib/useApiClient.ts`:

```typescript
import { useAuth } from '@clerk/nextjs'
import { apiClient } from './api'
import { useEffect } from 'react'

export function useApiClient() {
  const { getToken } = useAuth()

  useEffect(() => {
    // Inject Clerk's getToken function into the API client
    // This creates a new instance with the token getter
    const tokenGetter = async () => {
      return await getToken()
    }

    // Create a new API client instance with Clerk token support
    const clerkApiClient = new ApiClient(tokenGetter)

    // You could optionally replace the global apiClient here
    // or return the clerkApiClient from this hook
  }, [getToken])

  return apiClient
}
```

### Option 2: Initialize at App Level

In your `_app.tsx` or root layout:

```typescript
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'
import { useEffect } from 'react'

function MyApp({ Component, pageProps }) {
  const { getToken } = useAuth()

  useEffect(() => {
    // Inject Clerk's getToken into the global API client
    if (getToken) {
      const tokenGetter = async () => await getToken()
      // Since the API client is a singleton, you'll need to modify it
      // or create a new instance
    }
  }, [getToken])

  return <Component {...pageProps} />
}
```

### Option 3: Factory Function Approach

Modify the export in `api.ts`:

```typescript
// Instead of: export const apiClient = new ApiClient()
// Use:
export function createApiClient(getToken?: () => Promise<string | null>) {
  return new ApiClient(getToken)
}

// For backward compatibility, export a default instance
export const apiClient = new ApiClient()
```

Then in your components:

```typescript
import { useAuth } from '@clerk/nextjs'
import { createApiClient } from '@/lib/api'

function MyComponent() {
  const { getToken } = useAuth()
  const api = createApiClient(getToken)

  // Use api.getGames(), api.getTeams(), etc.
}
```

## Setting the Active Organization

The API client now reads the active organization ID from `localStorage` with the key `'activeOrganizationId'`. Make sure to set this value when the user selects an organization:

```typescript
// When user selects an organization
localStorage.setItem('activeOrganizationId', selectedOrgId)

// When user logs out or clears selection
localStorage.removeItem('activeOrganizationId')
```

## Migration Checklist

- [x] Updated `api.ts` to remove cookie-based authentication
- [x] Updated `api.ts` to accept Clerk token getter function
- [x] Updated `api.ts` to add `X-Organization-ID` header
- [ ] Create hook or utility to inject Clerk's `getToken` function
- [ ] Update all components that previously called `apiClient.setToken()`
- [ ] Update all components that previously called `apiClient.removeToken()`
- [ ] Update logout flow to clear `activeOrganizationId` from localStorage
- [ ] Update organization selection to set `activeOrganizationId` in localStorage
- [ ] Test API calls with Clerk authentication
- [ ] Test API calls with organization context

## Notes

- The API client maintains backward compatibility for components that don't pass a `getToken` function (it will simply not add the Authorization header)
- All existing API methods (get, post, put, delete, etc.) remain unchanged
- The base URL logic and error handling remain unchanged
