# Sports Management API Documentation

## Overview

The Sports Management API is a comprehensive RESTful service for managing sports leagues, referee assignments, games, teams, and budgets. This API provides all the functionality needed to run a complete sports organization management system.

## Base URLs

- **Development**: `http://localhost:3001/api`
- **Production**: `https://api.sportsmanagement.app`

## Authentication

All API endpoints (except `/health` and authentication endpoints) require JWT authentication.

### How to Authenticate

1. **Login** to get a JWT token:
   ```
   POST /api/auth/login
   ```

2. **Include the token** in all subsequent requests:
   ```
   Authorization: Bearer <your-jwt-token>
   ```

### Token Management

- Tokens expire after 7 days (configurable)
- Include the token in the `Authorization` header with the `Bearer` prefix
- Tokens contain user ID, email, role, and permissions

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Login endpoint**: 5 requests per minute
- **Registration endpoint**: 3 requests per hour
- **Password reset**: 3 requests per hour
- **Assignment operations**: 100 requests per minute
- **General endpoints**: 1000 requests per hour

When rate limits are exceeded, you'll receive a `429 Too Many Requests` response.

## Error Handling

All API errors follow a consistent format:

```json
{
  "error": "Brief error message",
  "message": "Detailed error description",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

- **200**: Success
- **201**: Created successfully
- **204**: Success with no content
- **400**: Bad request (validation error)
- **401**: Unauthorized (missing or invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Resource not found
- **409**: Conflict (duplicate resource, assignment conflicts)
- **429**: Too many requests (rate limit exceeded)
- **500**: Internal server error

## Data Models

### Core Entity Hierarchy

```
Organization
├── Leagues
    ├── Teams
    └── Games
        └── Assignments (Referees)
```

### User Roles

- **Admin**: Full system access, can manage all resources
- **Manager**: Limited administrative access to assigned resources
- **Referee**: Can view assignments and update availability

## API Endpoints

### Health Check

#### GET /health

Check the API and database health status.

**Security**: No authentication required

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-08-01T12:00:00Z",
  "service": "sports-management-backend",
  "database": "connected"
}
```

---

## Authentication

### POST /auth/login

Authenticate a user and receive a JWT token.

**Security**: No authentication required

**Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "admin@example.com",
    "role": "admin",
    "roles": ["admin"],
    "name": "Administrator",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Errors**:
- `401`: Invalid credentials
- `429`: Too many login attempts

### POST /auth/register

Register a new user (admin or referee).

**Security**: No authentication required

**Request Body**:
```json
{
  "email": "referee@example.com",
  "password": "password123",
  "role": "referee",
  "name": "John Referee",
  "phone": "555-0123",
  "postal_code": "12345",
  "max_distance": 30
}
```

**Response**: Same as login response

**Errors**:
- `400`: Validation error or email already exists
- `429`: Too many registration attempts

### GET /auth/me

Get the current user's profile.

**Response**:
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "referee@example.com",
    "role": "referee",
    "name": "John Referee",
    "phone": "555-0123",
    "postal_code": "12345",
    "max_distance": 30,
    "is_available": true,
    "wage_per_game": 75.00
  }
}
```

---

## User Management

### GET /users

Get all users (admin only).

**Parameters**:
- `role` (optional): Filter by user role (`admin`, `referee`, `manager`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)

**Response**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "email": "user@example.com",
        "role": "referee",
        "name": "John Doe",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

### GET /users/{id}

Get a specific user by ID.

**Security**: Users can only view their own profile unless they're admin.

**Response**:
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "role": "referee",
    "name": "John Doe"
  }
}
```

---

## Referee Management

### GET /referees

Get all referees with optional filtering.

**Parameters**:
- `level`: Filter by referee level
- `postal_code`: Filter by postal code
- `is_available`: Filter by availability (`true`/`false`)
- `white_whistle`: Filter by white whistle certification (`true`/`false`)
- `search`: Search by name or email
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "John Referee",
      "email": "john@example.com",
      "phone": "555-0123",
      "postal_code": "12345",
      "is_available": true,
      "wage_per_game": 75.00,
      "level_name": "Senior",
      "years_experience": 5,
      "games_refereed_season": 25,
      "evaluation_score": 8.5,
      "white_whistle": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

### GET /referees/{id}

Get detailed information about a specific referee.

**Response**: Extended referee information including recent assignments and performance metrics.

---

## League Management

### GET /leagues

Get all leagues with optional filtering.

**Parameters**:
- `organization`: Filter by organization name
- `age_group`: Filter by age group (e.g., "U12", "U14")
- `gender`: Filter by gender (`Boys`, `Girls`, `Mixed`)
- `division`: Filter by division
- `season`: Filter by season
- `level`: Filter by level (`Recreational`, `Competitive`, `Elite`)
- `page`: Page number
- `limit`: Items per page

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "organization": "Metro Soccer Association",
      "age_group": "U12",
      "gender": "Boys",
      "division": "Division 1",
      "season": "Fall 2024",
      "level": "Competitive",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /leagues

Create a new league (admin only).

**Request Body**:
```json
{
  "organization": "Metro Soccer Association",
  "age_group": "U12",
  "gender": "Boys",
  "division": "Division 1",
  "season": "Fall 2024",
  "level": "Competitive"
}
```

### GET /leagues/{id}

Get a specific league by ID.

### PUT /leagues/{id}

Update an existing league (admin only).

### DELETE /leagues/{id}

Delete a league (admin only).

---

## Team Management

### GET /teams

Get all teams with optional filtering.

**Parameters**:
- `league_id`: Filter by league ID
- `organization`: Filter by organization
- `age_group`: Filter by age group
- `gender`: Filter by gender
- `season`: Filter by season
- `search`: Search by team name
- `page`: Page number
- `limit`: Items per page

### POST /teams

Create a new team (admin only).

**Request Body**:
```json
{
  "name": "Lightning Bolts",
  "league_id": "123e4567-e89b-12d3-a456-426614174000",
  "rank": 1,
  "location": "North Field Complex",
  "contact_email": "coach@lightning.com",
  "contact_phone": "555-0123"
}
```

### GET /teams/{id}

Get a specific team by ID.

### PUT /teams/{id}

Update an existing team (admin only).

### DELETE /teams/{id}

Delete a team (admin only).

---

## Game Management

### GET /games

Get all games with optional filtering.

**Parameters**:
- `status`: Filter by game status (`scheduled`, `assigned`, `completed`, `cancelled`)
- `level`: Filter by game level
- `game_type`: Filter by game type (`Community`, `Club`, `Tournament`, `Private Tournament`)
- `date_from`: Filter games from this date (YYYY-MM-DD)
- `date_to`: Filter games until this date (YYYY-MM-DD)
- `postal_code`: Filter by location postal code
- `page`: Page number
- `limit`: Items per page

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "home_team_name": "Lightning Bolts",
      "away_team_name": "Thunder Cats",
      "game_date": "2024-08-15",
      "game_time": "14:00",
      "location": "Central Sports Complex",
      "level": "Competitive",
      "game_type": "Community",
      "pay_rate": 75.00,
      "refs_needed": 2,
      "status": "scheduled"
    }
  ]
}
```

### POST /games

Create a new game (admin only).

**Request Body**:
```json
{
  "home_team_id": "123e4567-e89b-12d3-a456-426614174000",
  "away_team_id": "123e4567-e89b-12d3-a456-426614174001",
  "league_id": "123e4567-e89b-12d3-a456-426614174002",
  "game_date": "2024-08-15",
  "game_time": "14:00",
  "location": "Central Sports Complex",
  "postal_code": "12345",
  "level": "Competitive",
  "game_type": "Community",
  "division": "Division 1",
  "season": "Fall 2024",
  "pay_rate": 75.00,
  "refs_needed": 2,
  "wage_multiplier": 1.0
}
```

### GET /games/{id}

Get a specific game by ID.

### PUT /games/{id}

Update an existing game (admin only).

### DELETE /games/{id}

Delete a game (admin only).

---

## Assignment Management

Assignment management is the core functionality for assigning referees to games.

### GET /assignments

Get all assignments with optional filtering.

**Parameters**:
- `game_id`: Filter by game ID
- `referee_id`: Filter by referee ID
- `status`: Filter by status (`pending`, `accepted`, `declined`, `completed`)
- `page`: Page number
- `limit`: Items per page

**Response**:
```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "gameId": "123e4567-e89b-12d3-a456-426614174001",
        "refereeId": "123e4567-e89b-12d3-a456-426614174002",
        "positionId": "123e4567-e89b-12d3-a456-426614174003",
        "status": "pending",
        "assignedAt": "2024-08-01T12:00:00Z",
        "calculatedWage": 75.00,
        "game": {
          "id": "123e4567-e89b-12d3-a456-426614174001",
          "homeTeam": "Lightning Bolts",
          "awayTeam": "Thunder Cats",
          "date": "2024-08-15",
          "time": "14:00",
          "location": "Central Sports Complex",
          "level": "Competitive",
          "payRate": 75.00,
          "finalWage": 75.00
        }
      }
    ]
  }
}
```

### POST /assignments

Create a new assignment.

**Request Body**:
```json
{
  "game_id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174001",
  "position_id": "123e4567-e89b-12d3-a456-426614174002",
  "assigned_by": "123e4567-e89b-12d3-a456-426614174003"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "assignment": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "game_id": "123e4567-e89b-12d3-a456-426614174001",
      "user_id": "123e4567-e89b-12d3-a456-426614174002",
      "status": "pending",
      "calculated_wage": 75.00
    },
    "wageBreakdown": {
      "baseWage": 75.00,
      "multiplier": 1.0,
      "paymentModel": "INDIVIDUAL",
      "finalWage": 75.00
    }
  },
  "warnings": [
    "Referee has limited availability for this time slot"
  ]
}
```

**Errors**:
- `404`: Game, referee, or position not found
- `409`: Assignment conflict (position already filled, referee already assigned, time conflict, etc.)

### GET /assignments/{id}

Get a specific assignment by ID.

### DELETE /assignments/{id}

Remove an assignment.

### PATCH /assignments/{id}/status

Update assignment status.

**Request Body**:
```json
{
  "status": "accepted"
}
```

### POST /assignments/bulk-update

Update multiple assignment statuses (admin only).

**Request Body**:
```json
{
  "updates": [
    {
      "assignment_id": "123e4567-e89b-12d3-a456-426614174000",
      "status": "accepted"
    },
    {
      "assignment_id": "123e4567-e89b-12d3-a456-426614174001",
      "status": "declined"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "updatedAssignments": [...],
    "summary": {
      "totalRequested": 2,
      "successfulUpdates": 2,
      "failedUpdates": 0
    }
  }
}
```

### DELETE /assignments/bulk-remove

Remove multiple assignments (admin only).

**Request Body**:
```json
{
  "assignment_ids": [
    "123e4567-e89b-12d3-a456-426614174000",
    "123e4567-e89b-12d3-a456-426614174001"
  ]
}
```

### POST /assignments/check-conflicts

Check for conflicts before creating an assignment.

**Request Body**: Same as POST /assignments

**Response**:
```json
{
  "success": true,
  "data": {
    "hasConflicts": false,
    "conflicts": [],
    "warnings": [
      "Referee has limited availability for this time slot"
    ],
    "errors": [],
    "isQualified": true,
    "canAssign": true
  }
}
```

### GET /assignments/available-referees/{game_id}

Get available referees for a specific game.

**Response**:
```json
{
  "success": true,
  "data": {
    "referees": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "John Referee",
        "availabilityScore": 0.85,
        "availabilityStatus": "available",
        "availabilityNote": "Specifically available for this time",
        "level_name": "Senior",
        "years_experience": 5
      }
    ],
    "gameTime": {
      "date": "2024-08-15",
      "startTime": "14:00",
      "endTime": "16:30"
    },
    "summary": {
      "total": 25,
      "available": 15,
      "notSpecified": 8,
      "unknown": 2
    }
  }
}
```

---

## AI Assignment Suggestions

### POST /ai-suggestions/generate

Generate AI-powered referee assignment suggestions.

**Request Body**:
```json
{
  "game_ids": [
    "123e4567-e89b-12d3-a456-426614174000",
    "123e4567-e89b-12d3-a456-426614174001"
  ],
  "factors": {
    "proximity_weight": 0.3,
    "availability_weight": 0.4,
    "experience_weight": 0.2,
    "performance_weight": 0.1
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "game_id": "123e4567-e89b-12d3-a456-426614174000",
        "referee_id": "123e4567-e89b-12d3-a456-426614174001",
        "position_id": "123e4567-e89b-12d3-a456-426614174002",
        "confidence_score": 0.85,
        "factors": {
          "proximity_score": 0.9,
          "availability_score": 0.8,
          "experience_score": 0.85,
          "performance_score": 0.9
        },
        "conflict_warnings": []
      }
    ],
    "summary": {
      "total_suggestions": 10,
      "games_processed": 2,
      "average_confidence": 0.78
    }
  }
}
```

---

## Budget Management

### GET /budgets

Get all budgets accessible to the current user.

**Parameters**:
- `status`: Filter by status (`active`, `locked`, `archived`)
- `budget_period_id`: Filter by budget period
- `page`: Page number
- `limit`: Items per page

### POST /budgets

Create a new budget.

**Request Body**:
```json
{
  "name": "Q1 2024 Operations",
  "description": "First quarter operational budget",
  "organization_id": "123e4567-e89b-12d3-a456-426614174000",
  "owner_id": "123e4567-e89b-12d3-a456-426614174001",
  "budget_period_id": "123e4567-e89b-12d3-a456-426614174002",
  "total_amount": 50000.00
}
```

### GET /budgets/{id}

Get a specific budget by ID.

### PUT /budgets/{id}

Update an existing budget.

### DELETE /budgets/{id}

Delete a budget.

---

## Best Practices

### Pagination

Most list endpoints support pagination:
- Use `page` parameter for page number (starts at 1)
- Use `limit` parameter for items per page (max 100)
- Check the `pagination` object in responses for navigation info

### Filtering

Many endpoints support filtering:
- Use query parameters to filter results
- Combine multiple filters for precise queries
- Use search parameters for text-based searching

### Error Handling

Always check the HTTP status code:
- 2xx: Success
- 4xx: Client error (check your request)
- 5xx: Server error (retry with exponential backoff)

### Rate Limiting

Respect rate limits:
- Monitor `X-RateLimit-*` headers
- Implement exponential backoff for retries
- Use bulk operations where available

### Security

- Never expose JWT tokens in logs or URLs
- Regenerate tokens periodically
- Use HTTPS in production
- Validate all input data

### Performance

- Use appropriate page sizes for large datasets
- Cache frequently accessed data
- Use specific field selection where available
- Implement request timeouts

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check that your JWT token is valid and not expired
   - Ensure the Authorization header format: `Bearer <token>`

2. **403 Forbidden**
   - Check user permissions for the requested operation
   - Some operations require admin role

3. **404 Not Found**
   - Verify the resource ID exists
   - Check if you have access to the resource

4. **409 Conflict**
   - For assignments: Check for time conflicts or duplicate assignments
   - For creation: Check for unique constraint violations

5. **429 Too Many Requests**
   - Implement exponential backoff
   - Check rate limiting documentation

### Getting Help

- Review this documentation for endpoint details
- Check the OpenAPI specification for complete schema information
- Use the Postman collection for testing
- Contact support for additional assistance

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- Complete CRUD operations for all entities
- JWT authentication and authorization
- AI-powered assignment suggestions
- Bulk operations support
- Comprehensive error handling
- Rate limiting implementation