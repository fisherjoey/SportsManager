# Sports Manager UML Architecture Diagram
**Generated Date:** September 28, 2025
**Version:** 1.0
**System:** Sports Manager Application (Frontend + Backend)

## System Overview UML Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        Mobile[Mobile App]
    end

    subgraph "Frontend - React Application"
        subgraph "UI Components"
            Pages[Pages/Views]
            Components[Reusable Components]
            Forms[Form Components]
            Tables[Table Components]
            Charts[Chart Components]
        end

        subgraph "State Management"
            AuthContext[Auth Context]
            AppContext[App Context]
            Redux[Redux Store]
            LocalStorage[Local Storage]
        end

        subgraph "Services"
            APIService[API Service]
            AuthService[Auth Service]
            WebSocketService[WebSocket Service]
        end
    end

    subgraph "Backend - Node.js/Express"
        subgraph "API Layer"
            AuthRoutes[Auth Routes]
            GameRoutes[Game Routes]
            RefereeRoutes[Referee Routes]
            AdminRoutes[Admin Routes]
            FinancialRoutes[Financial Routes]
        end

        subgraph "Middleware"
            AuthMiddleware[Auth Middleware]
            CerbosMiddleware[Cerbos Authorization]
            ValidationMiddleware[Validation Middleware]
            ErrorHandler[Error Handler]
            RateLimiter[Rate Limiter]
        end

        subgraph "Business Logic"
            GameService[Game Service]
            RefereeService[Referee Service]
            AssignmentService[Assignment Service]
            BudgetService[Budget Service]
            ExpenseService[Expense Service]
            NotificationService[Notification Service]
        end

        subgraph "Data Access"
            UserRepository[User Repository]
            GameRepository[Game Repository]
            RefereeRepository[Referee Repository]
            FinancialRepository[Financial Repository]
        end
    end

    subgraph "External Services"
        PostgreSQL[(PostgreSQL Database)]
        Cerbos[Cerbos Authorization]
        Redis[(Redis Cache)]
        S3[AWS S3 Storage]
        EmailService[Email Service]
        AIService[AI/OCR Service]
    end

    Browser --> Pages
    Mobile --> APIService
    Pages --> Components
    Components --> Forms
    Components --> Tables
    Components --> Charts
    Pages --> AuthContext
    Pages --> AppContext
    APIService --> AuthRoutes
    APIService --> GameRoutes
    APIService --> RefereeRoutes
    APIService --> AdminRoutes
    APIService --> FinancialRoutes

    AuthRoutes --> AuthMiddleware
    GameRoutes --> AuthMiddleware
    RefereeRoutes --> AuthMiddleware
    AdminRoutes --> AuthMiddleware
    FinancialRoutes --> AuthMiddleware

    AuthMiddleware --> CerbosMiddleware
    CerbosMiddleware --> ValidationMiddleware
    ValidationMiddleware --> GameService
    ValidationMiddleware --> RefereeService
    ValidationMiddleware --> AssignmentService
    ValidationMiddleware --> BudgetService

    GameService --> GameRepository
    RefereeService --> RefereeRepository
    AssignmentService --> GameRepository
    BudgetService --> FinancialRepository
    ExpenseService --> FinancialRepository

    GameRepository --> PostgreSQL
    RefereeRepository --> PostgreSQL
    FinancialRepository --> PostgreSQL
    UserRepository --> PostgreSQL

    CerbosMiddleware --> Cerbos
    AuthService --> Redis
    ExpenseService --> AIService
    NotificationService --> EmailService
    ExpenseService --> S3
```

## Frontend Component Architecture

```mermaid
classDiagram
    class App {
        +Router router
        +AuthProvider auth
        +ThemeProvider theme
        +render()
    }

    class AuthProvider {
        -User currentUser
        -String token
        +login(credentials)
        +logout()
        +refreshToken()
        +isAuthenticated()
    }

    class Layout {
        +Header header
        +Sidebar sidebar
        +Content content
        +Footer footer
        +render()
    }

    class Dashboard {
        -Statistics stats
        -Charts charts
        +loadDashboardData()
        +refreshStats()
        +render()
    }

    class GameManagement {
        -Game[] games
        -Filters filters
        +loadGames()
        +createGame(game)
        +updateGame(id, data)
        +deleteGame(id)
        +assignReferees(gameId, refs)
    }

    class RefereeManagement {
        -Referee[] referees
        -Availability[] availability
        +loadReferees()
        +createReferee(ref)
        +updateReferee(id, data)
        +checkAvailability(date)
        +assignToGame(refId, gameId)
    }

    class FinancialModule {
        -Budget[] budgets
        -Expense[] expenses
        -Receipt[] receipts
        +loadBudgets()
        +createBudget(budget)
        +uploadReceipt(file)
        +processExpense(receipt)
        +generateReports()
    }

    class AdminPanel {
        -User[] users
        -Role[] roles
        -Permission[] permissions
        +manageUsers()
        +manageRoles()
        +assignPermissions()
        +viewAuditLogs()
    }

    App --> AuthProvider
    App --> Layout
    Layout --> Dashboard
    Layout --> GameManagement
    Layout --> RefereeManagement
    Layout --> FinancialModule
    Layout --> AdminPanel

    GameManagement ..> APIService : uses
    RefereeManagement ..> APIService : uses
    FinancialModule ..> APIService : uses
    AdminPanel ..> APIService : uses
```

## Backend Service Architecture

```mermaid
classDiagram
    class ExpressServer {
        -Port port
        -Middleware[] middlewares
        -Routes[] routes
        +start()
        +stop()
        +configureMiddleware()
        +configureRoutes()
    }

    class AuthController {
        +login(req, res)
        +logout(req, res)
        +register(req, res)
        +refreshToken(req, res)
        +forgotPassword(req, res)
        +resetPassword(req, res)
    }

    class GameController {
        -GameService gameService
        +getAllGames(req, res)
        +getGame(req, res)
        +createGame(req, res)
        +updateGame(req, res)
        +deleteGame(req, res)
        +assignReferees(req, res)
        +bulkUpload(req, res)
    }

    class RefereeController {
        -RefereeService refereeService
        +getAllReferees(req, res)
        +getReferee(req, res)
        +createReferee(req, res)
        +updateReferee(req, res)
        +getAvailability(req, res)
        +setAvailability(req, res)
        +getAssignments(req, res)
    }

    class GameService {
        -GameRepository repository
        +findAll(filters)
        +findById(id)
        +create(gameData)
        +update(id, gameData)
        +delete(id)
        +assignReferees(gameId, refereeIds)
        +calculateWages(gameId)
        +checkConflicts(gameId, refereeId)
    }

    class RefereeService {
        -RefereeRepository repository
        +findAll(filters)
        +findById(id)
        +create(refereeData)
        +update(id, refereeData)
        +checkAvailability(refereeId, date)
        +getUpcomingGames(refereeId)
        +calculateDistance(refereeId, location)
    }

    class AssignmentService {
        -GameRepository gameRepo
        -RefereeRepository refRepo
        +createAssignment(gameId, refereeId)
        +removeAssignment(assignmentId)
        +suggestReferees(gameId)
        +autoAssign(gameId)
        +notifyReferee(assignmentId)
        +confirmAssignment(assignmentId)
    }

    class NotificationService {
        -EmailService emailService
        -SMSService smsService
        +sendAssignmentNotification(assignment)
        +sendReminderNotification(gameId)
        +sendCancellationNotification(gameId)
        +sendBulkNotifications(notifications)
    }

    ExpressServer --> AuthController
    ExpressServer --> GameController
    ExpressServer --> RefereeController

    GameController --> GameService
    RefereeController --> RefereeService
    GameController --> AssignmentService

    AssignmentService --> NotificationService
    GameService --> Database
    RefereeService --> Database
```

## Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant AuthService
    participant Backend
    participant Cerbos
    participant Database

    User->>Frontend: Enter credentials
    Frontend->>AuthService: login(email, password)
    AuthService->>Backend: POST /auth/login
    Backend->>Database: Verify credentials
    Database-->>Backend: User data
    Backend->>Backend: Generate JWT token
    Backend-->>AuthService: {token, user, roles}
    AuthService->>Frontend: Store token
    Frontend-->>User: Redirect to dashboard

    User->>Frontend: Request protected resource
    Frontend->>Backend: GET /api/games (with token)
    Backend->>Backend: Verify JWT token
    Backend->>Cerbos: Check permissions
    Cerbos->>Cerbos: Evaluate policies
    Cerbos-->>Backend: Allow/Deny
    Backend->>Database: Fetch data (if allowed)
    Database-->>Backend: Game data
    Backend-->>Frontend: Response data
    Frontend-->>User: Display games
```

## Game Assignment Workflow

```mermaid
stateDiagram-v2
    [*] --> Created: Game Created
    Created --> Unassigned: No Referees
    Unassigned --> UpForGrabs: Auto-assign Failed
    Unassigned --> Assigning: Manual Assignment
    UpForGrabs --> Claiming: Referee Claims
    Claiming --> Assigned: Claim Approved
    Assigning --> Assigned: Referees Selected
    Assigned --> Confirmed: Referees Accept
    Assigned --> Declined: Referee Declines
    Declined --> Reassigning: Find Replacement
    Reassigning --> Assigned: New Referee
    Confirmed --> InProgress: Game Day
    InProgress --> Completed: Game Finished
    Completed --> Paid: Wages Processed
    Paid --> [*]: Closed

    Assigned --> Cancelled: Game Cancelled
    Confirmed --> Cancelled: Game Cancelled
    Cancelled --> [*]: Closed
```

## Expense Processing Pipeline

```mermaid
flowchart LR
    subgraph Upload
        A[User Uploads Receipt] --> B[File Validation]
        B --> C[Store in S3]
    end

    subgraph OCR Processing
        C --> D[OCR Service]
        D --> E[Text Extraction]
        E --> F[AI Field Detection]
    end

    subgraph Data Extraction
        F --> G[Vendor Name]
        F --> H[Amount]
        F --> I[Date]
        F --> J[Line Items]
    end

    subgraph Validation
        G & H & I & J --> K[Confidence Check]
        K -->|High Confidence| L[Auto-Approve]
        K -->|Low Confidence| M[Manual Review]
    end

    subgraph Storage
        L --> N[Save to Database]
        M --> O[Review Queue]
        O -->|Approved| N
    end

    subgraph Reporting
        N --> P[Update Budget]
        N --> Q[Generate Reports]
        N --> R[Audit Trail]
    end
```

## Component Communication Patterns

```mermaid
classDiagram
    class APIService {
        -String baseURL
        -String token
        -Interceptors interceptors
        +get(endpoint, params)
        +post(endpoint, data)
        +put(endpoint, data)
        +delete(endpoint)
        +setAuthToken(token)
        +handleError(error)
    }

    class WebSocketService {
        -Socket connection
        -EventEmitter events
        +connect()
        +disconnect()
        +emit(event, data)
        +on(event, handler)
        +removeListener(event, handler)
    }

    class CacheService {
        -Map cache
        -Number ttl
        +get(key)
        +set(key, value, ttl)
        +delete(key)
        +clear()
        +has(key)
    }

    class StateManager {
        -Store store
        -Actions actions
        -Reducers reducers
        +dispatch(action)
        +getState()
        +subscribe(listener)
        +unsubscribe(listener)
    }

    class EventBus {
        -Map listeners
        +emit(event, data)
        +on(event, handler)
        +off(event, handler)
        +once(event, handler)
    }

    APIService --> CacheService : uses
    WebSocketService --> EventBus : uses
    StateManager --> EventBus : notifies
    Components --> APIService : calls
    Components --> StateManager : updates
    Components --> WebSocketService : subscribes
```

## Database Repository Pattern

```mermaid
classDiagram
    class BaseRepository {
        #Database db
        #String tableName
        +findAll(filters)
        +findById(id)
        +create(data)
        +update(id, data)
        +delete(id)
        +count(filters)
        +exists(id)
        #buildQuery(filters)
    }

    class UserRepository {
        +findByEmail(email)
        +findByRole(role)
        +updatePassword(id, hash)
        +assignRole(userId, roleId)
        +removeRole(userId, roleId)
        +getPermissions(userId)
    }

    class GameRepository {
        +findByDate(date)
        +findByStatus(status)
        +findByTeam(teamId)
        +findUpcoming(days)
        +findUnassigned()
        +updateStatus(id, status)
        +getWithAssignments(id)
    }

    class RefereeRepository {
        +findAvailable(date, time)
        +findByLevel(level)
        +findByDistance(postal, maxDistance)
        +updateAvailability(id, availability)
        +getAssignmentHistory(id)
        +calculateStats(id)
    }

    class FinancialRepository {
        +findBudgetsByPeriod(periodId)
        +findExpensesByCategory(categoryId)
        +calculateTotals(filters)
        +getVarianceReport(budgetId)
        +processReceipt(receiptData)
    }

    BaseRepository <|-- UserRepository
    BaseRepository <|-- GameRepository
    BaseRepository <|-- RefereeRepository
    BaseRepository <|-- FinancialRepository
```

## Error Handling Architecture

```mermaid
flowchart TD
    A[Client Request] --> B{Validation Layer}
    B -->|Valid| C[Controller]
    B -->|Invalid| D[Validation Error]

    C --> E{Business Logic}
    E -->|Success| F[Database Operation]
    E -->|Business Error| G[Business Logic Error]

    F -->|Success| H[Success Response]
    F -->|DB Error| I[Database Error]

    D --> J[Error Handler Middleware]
    G --> J
    I --> J

    J --> K{Error Type}
    K -->|Validation| L[400 Bad Request]
    K -->|Auth| M[401 Unauthorized]
    K -->|Permission| N[403 Forbidden]
    K -->|Not Found| O[404 Not Found]
    K -->|Business| P[422 Unprocessable]
    K -->|Database| Q[500 Internal Error]
    K -->|Unknown| R[500 Internal Error]

    L & M & N & O & P & Q & R --> S[Error Response]
    S --> T[Client]
    H --> T

    J --> U[Log Error]
    U --> V[(Error Logs)]
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        LB[Load Balancer]

        subgraph "Frontend Cluster"
            FE1[React App Instance 1]
            FE2[React App Instance 2]
            CDN[CDN for Static Assets]
        end

        subgraph "Backend Cluster"
            BE1[Node.js Instance 1]
            BE2[Node.js Instance 2]
            BE3[Node.js Instance 3]
        end

        subgraph "Data Layer"
            PG_Primary[(PostgreSQL Primary)]
            PG_Replica[(PostgreSQL Replica)]
            Redis[(Redis Cache)]
        end

        subgraph "Services"
            Cerbos[Cerbos Service]
            S3[S3 Storage]
            Email[Email Service]
        end

        subgraph "Monitoring"
            Logs[Log Aggregation]
            Metrics[Metrics Collection]
            Alerts[Alert System]
        end
    end

    Users --> LB
    LB --> FE1
    LB --> FE2
    FE1 --> CDN
    FE2 --> CDN

    FE1 --> BE1
    FE1 --> BE2
    FE1 --> BE3
    FE2 --> BE1
    FE2 --> BE2
    FE2 --> BE3

    BE1 --> PG_Primary
    BE2 --> PG_Primary
    BE3 --> PG_Replica

    BE1 --> Redis
    BE2 --> Redis
    BE3 --> Redis

    BE1 --> Cerbos
    BE2 --> Cerbos
    BE3 --> Cerbos

    BE1 --> S3
    BE2 --> S3
    BE3 --> S3

    BE1 --> Email

    BE1 --> Logs
    BE2 --> Logs
    BE3 --> Logs

    Logs --> Metrics
    Metrics --> Alerts
```

## Key Design Patterns Used

### 1. **Frontend Patterns**
- **Component Composition**: Building complex UIs from simple components
- **Container/Presenter**: Separating logic from presentation
- **Higher-Order Components**: Adding functionality to components
- **Custom Hooks**: Reusing stateful logic
- **Context API**: Managing global state
- **Render Props**: Sharing code between components

### 2. **Backend Patterns**
- **MVC Architecture**: Model-View-Controller separation
- **Repository Pattern**: Abstracting data access
- **Service Layer**: Business logic encapsulation
- **Middleware Chain**: Request processing pipeline
- **Dependency Injection**: Loose coupling
- **Factory Pattern**: Object creation
- **Strategy Pattern**: Algorithm selection
- **Observer Pattern**: Event-driven architecture

### 3. **Database Patterns**
- **Active Record**: ORM pattern
- **Data Mapper**: Separating domain from persistence
- **Unit of Work**: Transaction management
- **Query Builder**: Dynamic SQL generation
- **Migration Pattern**: Schema versioning

### 4. **Security Patterns**
- **JWT Authentication**: Stateless auth
- **RBAC**: Role-based access control
- **Policy-based Authorization**: Cerbos integration
- **Input Validation**: Request sanitization
- **Rate Limiting**: API protection
- **CORS Configuration**: Cross-origin security

## API Endpoint Structure

### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/register` - New user registration
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/reset-password` - Complete password reset

### Game Management Endpoints
- `GET /api/games` - List all games
- `GET /api/games/:id` - Get game details
- `POST /api/games` - Create new game
- `PUT /api/games/:id` - Update game
- `DELETE /api/games/:id` - Delete game
- `POST /api/games/:id/assign` - Assign referees
- `POST /api/games/bulk` - Bulk upload games
- `GET /api/games/upcoming` - Get upcoming games
- `GET /api/games/unassigned` - Get unassigned games

### Referee Management Endpoints
- `GET /api/referees` - List all referees
- `GET /api/referees/:id` - Get referee details
- `POST /api/referees` - Create new referee
- `PUT /api/referees/:id` - Update referee
- `DELETE /api/referees/:id` - Delete referee
- `GET /api/referees/:id/availability` - Get availability
- `POST /api/referees/:id/availability` - Set availability
- `GET /api/referees/:id/assignments` - Get assignments
- `GET /api/referees/available` - Find available referees

### Financial Management Endpoints
- `GET /api/budgets` - List budgets
- `POST /api/budgets` - Create budget
- `PUT /api/budgets/:id` - Update budget
- `GET /api/expenses` - List expenses
- `POST /api/expenses` - Create expense
- `POST /api/receipts/upload` - Upload receipt
- `GET /api/receipts/:id/process` - Process receipt
- `GET /api/reports/financial` - Generate reports

### Admin Endpoints
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/roles` - List roles
- `POST /api/admin/roles` - Create role
- `PUT /api/admin/roles/:id` - Update role
- `POST /api/admin/roles/:id/permissions` - Assign permissions
- `GET /api/admin/audit-logs` - View audit logs

## Technology Stack

### Frontend
- **React 18.x**: UI framework
- **TypeScript**: Type safety
- **Redux Toolkit**: State management
- **React Router**: Navigation
- **Material-UI**: Component library
- **Axios**: HTTP client
- **Socket.io Client**: Real-time updates
- **Chart.js**: Data visualization
- **Formik**: Form handling
- **Yup**: Validation

### Backend
- **Node.js 18.x**: Runtime
- **Express 4.x**: Web framework
- **TypeScript**: Type safety
- **PostgreSQL 15.x**: Database
- **Prisma**: ORM
- **Redis**: Caching
- **JWT**: Authentication
- **Cerbos**: Authorization
- **Multer**: File uploads
- **Socket.io**: WebSockets
- **Bull**: Job queues
- **Winston**: Logging

### DevOps & Tools
- **Docker**: Containerization
- **Docker Compose**: Local development
- **GitHub Actions**: CI/CD
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Jest**: Testing
- **Supertest**: API testing
- **Cypress**: E2E testing

## Performance Optimizations

1. **Frontend Optimizations**
   - Code splitting and lazy loading
   - React.memo for component optimization
   - Virtual scrolling for large lists
   - Image lazy loading
   - Service Worker caching
   - Bundle size optimization

2. **Backend Optimizations**
   - Database query optimization
   - Redis caching strategy
   - Connection pooling
   - Async/await patterns
   - Rate limiting
   - Response compression

3. **Database Optimizations**
   - Strategic indexing
   - Query optimization
   - Materialized views
   - Partitioning for large tables
   - Connection pooling
   - Read replicas

## Security Measures

1. **Authentication & Authorization**
   - JWT with refresh tokens
   - Cerbos policy-based access
   - Role-based permissions
   - Session management
   - Password hashing (bcrypt)

2. **Data Protection**
   - Input validation
   - SQL injection prevention
   - XSS protection
   - CSRF tokens
   - Rate limiting
   - HTTPS enforcement

3. **Monitoring & Auditing**
   - Comprehensive audit logs
   - Error tracking
   - Performance monitoring
   - Security alerts
   - Compliance reporting

---
*Document Last Updated: January 28, 2025*
*Application Version: 1.0.0*
*Architecture Version: 1.0*