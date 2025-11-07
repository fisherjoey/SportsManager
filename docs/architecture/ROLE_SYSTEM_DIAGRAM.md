# Role and User System Architecture Diagram

## System Overview

```mermaid
graph TB
    subgraph "Authentication Flow"
        A[User Login] --> B[Validate Credentials]
        B --> C[Fetch User Roles]
        C --> D[Get Permissions via Roles]
        D --> E[Generate JWT Token]
        E --> F[Return User + Permissions]
    end

    subgraph "Database Schema"
        U[users table]
        R[roles table]
        P[permissions table]
        RP[role_permissions table]
        UR[user_roles table]

        U -->|many-to-many| UR
        UR -->|many-to-many| R
        R -->|many-to-many| RP
        RP -->|many-to-many| P
    end

    subgraph "Middleware Stack"
        M1[authenticateToken]
        M2[requireRole]
        M3[requireAnyRole]
        M4[requirePermission]
        M5[permissionCheck auto]

        M1 --> M2
        M1 --> M3
        M1 --> M4
        M1 --> M5
    end
```

## Database Entity Relationship

```mermaid
erDiagram
    USERS {
        uuid id PK
        string email UK
        string password_hash
        string name
        string role "legacy field"
        string phone
        string postal_code
        number max_distance
        number wage_per_game
        boolean is_available
        timestamp created_at
        timestamp updated_at
    }

    ROLES {
        uuid id PK
        string name UK
        text description
        boolean is_active
        boolean is_system
        json referee_config
        string category
        timestamp created_at
    }

    PERMISSIONS {
        uuid id PK
        string name UK
        string category
        text description
        boolean is_system
        timestamp created_at
    }

    USER_ROLES {
        uuid id PK
        uuid user_id FK
        uuid role_id FK
        timestamp assigned_at
        uuid assigned_by FK
        timestamp expires_at
        boolean is_active
    }

    ROLE_PERMISSIONS {
        uuid id PK
        uuid role_id FK
        uuid permission_id FK
        timestamp created_at
        uuid created_by FK
    }

    USERS ||--o{ USER_ROLES : "has"
    ROLES ||--o{ USER_ROLES : "assigned to"
    ROLES ||--o{ ROLE_PERMISSIONS : "grants"
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : "granted by"
```

## Role Hierarchy

```mermaid
graph TD
    SA[Super Admin<br/>All Permissions]
    A[Admin<br/>System Management]

    subgraph "Referee Roles"
        HR[Head Referee<br/>Senior Management]
        SR[Senior Referee<br/>Can Mentor & Evaluate]
        JR[Junior Referee<br/>Standard Permissions]
        RR[Rookie Referee<br/>Limited Permissions]
        RC[Referee Coach<br/>Training & Evaluation]
    end

    SA --> A
    A --> HR
    HR --> SR
    SR --> JR
    JR --> RR
    HR --> RC

    style SA fill:#ff6b6b
    style A fill:#4ecdc4
    style HR fill:#45b7d1
    style SR fill:#96ceb4
    style RC fill:#ffd93d
```

## Permission Categories & Examples

```mermaid
mindmap
  root((Permissions))
    Games
      games:read
      games:create
      games:update
      games:delete
      games:publish
      games:self_assign
      games:recommend
    Assignments
      assignments:read
      assignments:create
      assignments:update
      assignments:delete
      assignments:accept
      assignments:approve
      assignments:override
      assignments:auto_assign
      assignments:approve.junior
    Referees
      referees:read
      referees:update
      referees:manage
      referees:evaluate
    Users
      users:read
      users:create
      users:update
      users:delete
      users:impersonate
    Mentorship
      mentorship:request
      mentorship:provide
    Evaluations
      evaluations:create
      evaluations:view.own
      evaluations:manage
    Roles & Admin
      roles:read
      roles:manage
      roles:assign
    Settings
      settings:read
      settings:update
      settings:organization
    Communication
      communication:send
      communication:broadcast
      communication:manage
    Reports
      reports:read
      reports:create
      reports:export
      reports:financial
    Training
      training:create
      certifications:approve
```

## API Authorization Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthMiddleware
    participant PermissionCheck
    participant PermissionService
    participant Database
    participant Route Handler

    Client->>API: Request with JWT Token
    API->>AuthMiddleware: Validate Token
    AuthMiddleware->>AuthMiddleware: Decode JWT
    AuthMiddleware->>API: Attach user to request

    API->>PermissionCheck: Check endpoint permissions
    PermissionCheck->>PermissionCheck: Map endpoint to permission
    PermissionCheck->>PermissionService: Check user has permission

    PermissionService->>PermissionService: Check cache
    alt Cache miss
        PermissionService->>Database: Query user permissions
        Database->>PermissionService: Return permissions
        PermissionService->>PermissionService: Update cache
    end

    PermissionService->>PermissionCheck: Permission result

    alt Has permission
        PermissionCheck->>Route Handler: Continue to handler
        Route Handler->>Client: Success response
    else No permission
        PermissionCheck->>Client: 403 Forbidden
    end
```

## Service Layer Architecture

```mermaid
graph LR
    subgraph "Services"
        US[UserService]
        PS[PermissionService]
        RS[RefereeService]
        AS[AuthService]
    end

    subgraph "Core Functions"
        US --> GUR[getUserRoles]
        US --> IR[isReferee]
        US --> GRL[getRefereeLevel]
        US --> CM[canMentor]
        US --> CE[canEvaluate]

        PS --> GUP[getUserPermissions]
        PS --> HP[hasPermission]
        PS --> HAP[hasAnyPermission]
        PS --> CC[Cache Management]
    end

    subgraph "Database Access"
        GUR --> UR1[user_roles]
        IR --> UR2[user_roles]
        GRL --> UR3[user_roles]
        CM --> RPT[role_permissions]
        CE --> RPT2[role_permissions]
        GUP --> URT[user_roles + roles + permissions]
    end
```

## Caching Strategy

```mermaid
graph TD
    subgraph "Permission Cache"
        PC[Permission Cache<br/>TTL: 5 minutes]
        UPC[User Permissions Cache<br/>Key: user_permissions_userId]
        GPC[General Permission Cache]
    end

    subgraph "Cache Operations"
        R[Request] --> CH{Cache Hit?}
        CH -->|Yes| RC[Return Cached]
        CH -->|No| DB[Query Database]
        DB --> UC[Update Cache]
        UC --> RD[Return Data]
    end

    subgraph "Cache Cleanup"
        CI[Cleanup Interval<br/>Every 10 minutes]
        CI --> EC[Check Expiry]
        EC --> DC[Delete Expired]
    end
```

## Permission Mapping Example

```mermaid
graph LR
    subgraph "HTTP Request"
        M[Method: PUT]
        P[Path: /api/games/123]
    end

    subgraph "Normalization"
        N[Normalize Path]
        N --> NP[/api/games/:id]
    end

    subgraph "Permission Lookup"
        K[Key: PUT /api/games/:id]
        K --> PM[Permission: games:update]
    end

    subgraph "Authorization Check"
        PM --> UC{User has<br/>games:update?}
        UC -->|Yes| A[Allow]
        UC -->|No| D[Deny 403]
    end

    M --> N
    P --> N
    NP --> K
```

## Role Assignment Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Created: User Registration
    Created --> RoleAssigned: Assign Role
    RoleAssigned --> Active: is_active = true
    Active --> PermissionsGranted: Via role_permissions

    Active --> Expired: expires_at reached
    Active --> Deactivated: is_active = false

    Expired --> Renewed: Reassign Role
    Deactivated --> Reactivated: is_active = true

    Renewed --> Active
    Reactivated --> Active

    PermissionsGranted --> [*]: User has access
```

## Key Features

### 1. **Backward Compatibility**
- Legacy `role` field maintained in users table
- Supports both old (role string) and new (RBAC) systems
- Gradual migration path from simple to complex permissions

### 2. **Super Admin Bypass**
- Super Admin role automatically receives all permissions
- No need to explicitly assign permissions to Super Admin
- Checked first in permission service for efficiency

### 3. **Flexible Permission Assignment**
- Permissions can be grouped by category
- Roles can have multiple permissions
- Users can have multiple roles
- Temporal role assignments (with expiry)

### 4. **Performance Optimization**
- In-memory caching with 5-minute TTL
- Automatic cache cleanup every 10 minutes
- Efficient permission checking with early returns
- Indexed database queries for fast lookups

### 5. **Audit Trail**
- Role assignments tracked with assigned_by and assigned_at
- Permission changes logged
- Login attempts and successes recorded
- Critical security events monitored