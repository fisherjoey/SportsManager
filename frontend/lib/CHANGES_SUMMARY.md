# API Client Changes - Before and After

## File Modified
`C:\dev\Synced\SportsManager\frontend\lib\api.ts`

## Summary of Changes

### 1. Imports
**BEFORE:**
```typescript
import { AvailabilityWindow, AvailabilityResponse, PagePermissionsResponse, PageAccessCheckResponse } from './types'
import { setAuthToken, getAuthToken, deleteAuthToken } from './cookies'
```

**AFTER:**
```typescript
import { AvailabilityWindow, AvailabilityResponse, PagePermissionsResponse, PageAccessCheckResponse } from './types'
```

### 2. Class Properties and Constructor
**BEFORE:**
```typescript
class ApiClient {
  private token: string | null = null

  constructor() {
    this.token = typeof window !== 'undefined' ? getAuthToken() : null
  }
```

**AFTER:**
```typescript
class ApiClient {
  private getToken: (() => Promise<string | null>) | null = null

  constructor(getToken?: () => Promise<string | null>) {
    this.getToken = getToken || null
  }
```

### 3. Removed Methods
The following methods were completely removed:

```typescript
// REMOVED
setToken(token: string) { ... }
initializeToken() { ... }
removeToken() { ... }
getToken() { ... }
```

### 4. Request Method
**BEFORE:**
```typescript
private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Always check for the latest token from cookies
  if (typeof window !== 'undefined') {
    const currentToken = getAuthToken()
    if (currentToken !== this.token) {
      this.token = currentToken
    }
  }

  const baseURL = this.getBaseURL()
  const url = `${baseURL}${endpoint}`
  const method = options.method || 'GET'

  console.log(`[API Client] ${method} request to:`, url)

  const headers: HeadersInit = {
    ...options.headers
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json'
  }

  if (this.token) {
    headers.Authorization = `Bearer ${this.token}`
  }

  // ... rest of method
}
```

**AFTER:**
```typescript
private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Get token from Clerk
  const token = this.getToken ? await this.getToken() : null

  // Get active organization from localStorage
  const orgId = typeof window !== 'undefined' ? localStorage.getItem('activeOrganizationId') : null

  const baseURL = this.getBaseURL()
  const url = `${baseURL}${endpoint}`
  const method = options.method || 'GET'

  console.log(`[API Client] ${method} request to:`, url)

  const headers: HeadersInit = {
    ...options.headers
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (orgId) {
    headers['X-Organization-ID'] = orgId
  }

  // ... rest of method
}
```

## Key Differences

1. **Token Source**: Changed from cookie-based (`getAuthToken()`) to function injection (Clerk's `getToken()`)
2. **Token Storage**: No longer stores token in instance variable
3. **Organization Context**: Added `X-Organization-ID` header from localStorage
4. **API Surface**: Removed `setToken()`, `removeToken()`, `initializeToken()`, and `getToken()` public methods
5. **Constructor**: Now accepts optional `getToken` function parameter
6. **downloadReceipt Method**: Fixed to use async token getter and proper baseURL method

## Additional Fixes

### downloadReceipt Method
**BEFORE:**
```typescript
async downloadReceipt(id: string) {
  const token = this.getToken()
  const response = await fetch(`${this.baseURL}/expenses/receipts/${id}/download`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  // ...
}
```

**AFTER:**
```typescript
async downloadReceipt(id: string) {
  const token = this.getToken ? await this.getToken() : null
  const baseURL = this.getBaseURL()
  const response = await fetch(`${baseURL}/expenses/receipts/${id}/download`, {
    method: 'GET',
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  })
  // ...
}
```

## What Stayed the Same

- All API endpoint methods (getGames, getTeams, etc.) - unchanged
- Error handling logic - unchanged
- Base URL determination logic - unchanged
- Request configuration and fetch logic - unchanged
- Export structure - unchanged (`export const apiClient = new ApiClient()`)

## Backward Compatibility

The changes are partially backward compatible:
- Existing code that calls API methods will continue to work
- Code that calls `setToken()`, `removeToken()`, or `initializeToken()` will fail (these methods no longer exist)
- The default export `apiClient` still works but won't have authentication until you inject the `getToken` function
