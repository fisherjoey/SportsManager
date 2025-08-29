# API Response Structure Documentation

## Auth Endpoints

### POST /api/auth/login
**Success Response (200):**
```json
{
  "token": "jwt_token_string",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin|referee",
    "roles": ["admin"] | ["referee"],
    "name": "User Name",
    "phone": "555-1234",
    "location": "City, State",
    "postal_code": "12345",
    "max_distance": 25,
    "is_available": true,
    "wage_per_game": 50.00,
    "referee_level_id": "uuid",
    "years_experience": 5,
    "games_refereed_season": 10,
    "evaluation_score": 4.5,
    "notes": "Additional notes",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- 400 Bad Request: `{ "error": "\"field\" is required", ... }`
- 401 Unauthorized: `{ "error": "Invalid credentials", ... }`

### POST /api/auth/register
**Success Response (201):**
```json
{
  "token": "jwt_token_string",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "referee",
    "name": "User Name",
    "phone": "555-1234",
    "location": "City, State",
    "postal_code": "12345",
    "max_distance": 25,
    "is_available": true
  }
}
```

**Error Responses:**
- 400 Bad Request: 
  - Missing fields: `{ "error": "\"field\" is required", ... }`
  - Duplicate email: `{ "error": "Email already registered", ... }`
  - Invalid email: `{ "error": "\"email\" must be a valid email", ... }`

### GET /api/auth/me
**Headers Required:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin|referee",
    "roles": ["admin"] | ["referee"],
    "name": "User Name",
    "phone": "555-1234",
    "location": "City, State",
    "postal_code": "12345",
    "max_distance": 25,
    "is_available": true,
    "wage_per_game": 50.00,
    "referee_level_id": "uuid",
    "years_experience": 5,
    "games_refereed_season": 10,
    "evaluation_score": 4.5,
    "notes": "Additional notes",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- 401 Unauthorized: `{ "error": "Access token required", ... }`
- 403 Forbidden: `{ "error": "Invalid or expired token", ... }`
- 404 Not Found: `{ "error": "User not found", ... }`

## Error Response Structure

All error responses follow this structure:
```json
{
  "error": "Error message",
  "timestamp": "2024-01-01T00:00:00Z",
  "path": "/api/endpoint",
  "method": "GET|POST|PUT|DELETE",
  "type": "validation_error|authentication_error|...",  // For operational errors
  "details": { ... }  // For validation errors with field-specific details
}
```

## Important Notes

1. **No Nested Data Structure**: The API returns flat response structures, not nested in `data` or with `success` flags.

2. **Status Codes**:
   - 200: Success (GET, PUT, DELETE)
   - 201: Created (POST)
   - 400: Bad Request (validation errors)
   - 401: Unauthorized (no token or authentication required)
   - 403: Forbidden (invalid/expired token or insufficient permissions)
   - 404: Not Found
   - 500: Internal Server Error

3. **Token Format**: JWT tokens are passed in the Authorization header as `Bearer <token>`

4. **Role System**: The system supports both legacy `role` field and new `roles` array for backward compatibility.

5. **Required Fields for Referee Registration**:
   - email
   - password (min 6 characters)
   - role
   - name (when role is 'referee')
   - postal_code (when role is 'referee')

## Test User Credentials

For testing purposes, the following users are seeded in the test database:
- Admin: `admin@test.com` / `password123`
- Referee: `referee@test.com` / `password123`
- John Doe: `john.doe@test.com` / `password123`

---

*Last Updated: 2025-08-29*
*This documentation reflects the actual API behavior as verified by working tests.*