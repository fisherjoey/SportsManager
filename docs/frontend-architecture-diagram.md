# Sports Manager Frontend Architecture Diagram

## Component Hierarchy Diagram

```mermaid
graph TB
    subgraph "Next.js App Router"
        App[app/layout.tsx<br/>Root Layout]
        App --> ThemeProvider[ThemeProvider]
        ThemeProvider --> ErrorBoundary[ErrorBoundary]
        ErrorBoundary --> AuthProvider[AuthProvider<br/>Authentication & RBAC]
        AuthProvider --> Routes[Route Pages]
    end

    subgraph "Page Routes"
        Routes --> HomePage[page.tsx<br/>Dashboard]
        Routes --> LoginPage[login/page.tsx]
        Routes --> GamesPage[games/page.tsx]
        Routes --> AdminPages[admin/*<br/>9 Admin Pages]
        Routes --> FinancialPages[financial-*/<br/>Financial Management]
        Routes --> ResourcesPages[resources/*<br/>Resource Center]
    end

    subgraph "Component Library"
        UIComponents[ui/<br/>67 Components]
        UIComponents --> FormComponents[Form Controls<br/>Button, Input, Select]
        UIComponents --> LayoutComponents[Layout<br/>Card, Dialog, Sheet]
        UIComponents --> DataComponents[Data Display<br/>Table, Badge, Avatar]
        UIComponents --> NavComponents[Navigation<br/>Breadcrumb, Menu]
        UIComponents --> FeedbackComponents[Feedback<br/>Alert, Toast, Progress]
    end

    subgraph "Feature Components"
        GameMgmt[Game Management]
        GameMgmt --> GamesTable[game-management.tsx]
        GameMgmt --> AssignmentBoard[game-assignment-board.tsx]
        GameMgmt --> AIAssignments[ai-assignments-*.tsx]

        RefereeMgmt[Referee Management]
        RefereeMgmt --> RefereeList[referee-management.tsx]
        RefereeMgmt --> Availability[availability-calendar.tsx]
        RefereeMgmt --> MyAssignments[my-assignments.tsx]

        AdminMgmt[Admin/RBAC]
        AdminMgmt --> RoleManager[admin/rbac/*]
        AdminMgmt --> UserManager[admin/users/*]
        AdminMgmt --> AccessControl[admin/access-control/*]

        FinancialMgmt[Financial Management]
        FinancialMgmt --> ExpenseTracking[expense-*.tsx]
        FinancialMgmt --> BudgetTracking[budget-tracker.tsx]
        FinancialMgmt --> ReceiptUpload[receipt-upload.tsx]

        ResourceMgmt[Resource Management]
        ResourceMgmt --> ResourceCentre[resource-centre.tsx]
        ResourceMgmt --> DocumentRepo[document-repository.tsx]
        ResourceMgmt --> CategoryMgmt[resource-centre/*]

        CommsMgmt[Communications]
        CommsMgmt --> Announcements[announcement-board.tsx]
        CommsMgmt --> Emergency[emergency-broadcast.tsx]
        CommsMgmt --> Notifications[notifications-bell.tsx]
    end

    subgraph "Data Layer"
        APIClient[lib/api.ts<br/>API Client]
        APIClient --> AuthAPI[Authentication]
        APIClient --> GameAPI[Games API]
        APIClient --> RefereeAPI[Referees API]
        APIClient --> AdminAPI[Admin API]
        APIClient --> FinancialAPI[Financial API]
        APIClient --> ResourceAPI[Resources API]
    end

    subgraph "Utilities & Hooks"
        CustomHooks[hooks/]
        CustomHooks --> UsePageAccess[usePageAccess]
        CustomHooks --> UsePermissions[usePermissions]
        CustomHooks --> UseDistance[use-distance]
        CustomHooks --> UseFormState[use-form-state]

        Utils[lib/utilities]
        Utils --> PermissionUtils[permissions.ts]
        Utils --> ThemeUtils[theme-colors.ts]
        Utils --> AddressUtils[address-*.ts]
        Utils --> AIUtils[ai-assignment-algorithm.ts]
    end

    %% Connections
    Routes --> GameMgmt
    Routes --> RefereeMgmt
    Routes --> AdminMgmt
    Routes --> FinancialMgmt
    Routes --> ResourceMgmt
    Routes --> CommsMgmt

    GameMgmt --> UIComponents
    RefereeMgmt --> UIComponents
    AdminMgmt --> UIComponents
    FinancialMgmt --> UIComponents
    ResourceMgmt --> UIComponents
    CommsMgmt --> UIComponents

    GameMgmt --> APIClient
    RefereeMgmt --> APIClient
    AdminMgmt --> APIClient
    FinancialMgmt --> APIClient
    ResourceMgmt --> APIClient
    CommsMgmt --> APIClient

    AuthProvider --> CustomHooks
    AuthProvider --> Utils
```

## Component Architecture Layers

```mermaid
graph LR
    subgraph "Presentation Layer"
        Pages[Next.js Pages]
        Components[React Components]
        UI[UI Components]
    end

    subgraph "State Management"
        Context[Context Providers]
        LocalState[Component State]
        ServerState[Server State/Cache]
    end

    subgraph "Business Logic"
        Hooks[Custom Hooks]
        Utils[Utility Functions]
        Validators[Validation]
    end

    subgraph "Data Access"
        API[API Client]
        Types[TypeScript Types]
        Services[Service Layer]
    end

    subgraph "Infrastructure"
        Auth[Authentication]
        Routing[Next.js Routing]
        ErrorHandling[Error Boundaries]
    end

    Pages --> Components
    Components --> UI
    Components --> Context
    Components --> LocalState
    Context --> Hooks
    Hooks --> API
    API --> Services
    Services --> ServerState
    Utils --> Validators
    Auth --> API
    Routing --> Pages
    ErrorHandling --> Components
```

## Key Component Relationships

```mermaid
classDiagram
    class AuthProvider {
        +user: User
        +permissions: Permission[]
        +roles: Role[]
        +login(credentials): Promise
        +logout(): void
        +hasPermission(permission): boolean
        +hasRole(role): boolean
        +checkPageAccess(path): boolean
    }

    class DataTable {
        +columns: ColumnDef[]
        +data: any[]
        +pagination: PaginationState
        +sorting: SortingState
        +filtering: FilterState
        +onRowClick(row): void
        +onSelectionChange(rows): void
    }

    class GameManagement {
        +games: Game[]
        +filters: GameFilters
        +selectedGame: Game
        +createGame(data): Promise
        +updateGame(id, data): Promise
        +deleteGame(id): Promise
        +assignReferees(gameId, referees): Promise
    }

    class RefereeManagement {
        +referees: Referee[]
        +availability: Availability[]
        +updateAvailability(data): Promise
        +getRefereeStats(id): Promise
        +bulkImport(data): Promise
    }

    class ExpenseTracking {
        +expenses: Expense[]
        +categories: Category[]
        +uploadReceipt(file): Promise
        +categorizeExpense(id, category): Promise
        +approveExpense(id): Promise
        +generateReport(filters): Promise
    }

    class ResourceCentre {
        +resources: Resource[]
        +categories: ResourceCategory[]
        +uploadResource(file): Promise
        +updateResource(id, data): Promise
        +downloadResource(id): Promise
        +shareResource(id, users): Promise
    }

    class NotificationSystem {
        +notifications: Notification[]
        +unreadCount: number
        +sendNotification(data): Promise
        +markAsRead(id): Promise
        +clearAll(): void
    }

    class AIAssignmentEngine {
        +suggestions: AISuggestion[]
        +generateSuggestions(gameId): Promise
        +acceptSuggestion(id): Promise
        +rejectSuggestion(id, reason): Promise
        +trainModel(feedback): Promise
    }

    AuthProvider --> GameManagement : authorizes
    AuthProvider --> RefereeManagement : authorizes
    AuthProvider --> ExpenseTracking : authorizes
    AuthProvider --> ResourceCentre : authorizes

    GameManagement --> DataTable : uses
    RefereeManagement --> DataTable : uses
    ExpenseTracking --> DataTable : uses
    ResourceCentre --> DataTable : uses

    GameManagement --> AIAssignmentEngine : requests suggestions
    GameManagement --> NotificationSystem : sends notifications
    RefereeManagement --> NotificationSystem : sends notifications

    ExpenseTracking --> AIAssignmentEngine : categorization
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant Component
    participant Hook
    participant APIClient
    participant Backend
    participant Database

    User->>Component: User Interaction
    Component->>Hook: Call Custom Hook
    Hook->>Hook: Check Permissions
    Hook->>APIClient: API Request
    APIClient->>APIClient: Add Auth Token
    APIClient->>Backend: HTTP Request
    Backend->>Backend: Validate Request
    Backend->>Database: Query Data
    Database-->>Backend: Return Data
    Backend-->>APIClient: HTTP Response
    APIClient-->>Hook: Parsed Response
    Hook-->>Component: Update State
    Component-->>User: Update UI
```

## Mobile-Responsive Architecture

```mermaid
graph TB
    subgraph "Desktop View"
        DTable[Data Table<br/>Full columns]
        DSidebar[Expanded Sidebar]
        DFilters[Inline Filters]
        DActions[Action Buttons]
    end

    subgraph "Mobile View"
        MCards[Card Layout<br/>Key info only]
        MDrawer[Drawer Navigation]
        MSheet[Filter Sheet]
        MMenu[Dropdown Actions]
    end

    subgraph "Responsive Components"
        ResponsiveTable[ResponsiveTable]
        ResponsiveSidebar[App Sidebar]
        ResponsiveFilters[Filter Components]
    end

    ResponsiveTable --> DTable
    ResponsiveTable --> MCards
    ResponsiveSidebar --> DSidebar
    ResponsiveSidebar --> MDrawer
    ResponsiveFilters --> DFilters
    ResponsiveFilters --> MSheet
```

## State Management Pattern

```mermaid
graph TB
    subgraph "Global State"
        AuthState[Authentication State<br/>User, Roles, Permissions]
        ThemeState[Theme State<br/>Light/Dark Mode]
        NotificationState[Notification State<br/>Toast Queue]
    end

    subgraph "Feature State"
        GameState[Game Management State]
        RefereeState[Referee State]
        ExpenseState[Expense State]
        ResourceState[Resource State]
    end

    subgraph "Local State"
        FormState[Form State<br/>Input values, validation]
        UIState[UI State<br/>Modals, drawers, tabs]
        TableState[Table State<br/>Sorting, filtering, pagination]
    end

    subgraph "Server State"
        APICache[API Response Cache]
        OptimisticUpdates[Optimistic Updates]
        BackgroundSync[Background Sync]
    end

    AuthState --> FeatureState
    GameState --> LocalState
    RefereeState --> LocalState
    ExpenseState --> LocalState
    ResourceState --> LocalState

    LocalState --> ServerState
    ServerState --> APICache
```

## Component Communication Patterns

```mermaid
graph LR
    subgraph "Props Drilling"
        Parent1[Parent Component]
        Child1[Child Component]
        Parent1 -->|props| Child1
    end

    subgraph "Context API"
        Provider[Context Provider]
        Consumer1[Consumer A]
        Consumer2[Consumer B]
        Provider -->|context| Consumer1
        Provider -->|context| Consumer2
    end

    subgraph "Event Bus"
        Emitter[Event Emitter]
        Listener1[Listener A]
        Listener2[Listener B]
        Emitter -->|events| Listener1
        Emitter -->|events| Listener2
    end

    subgraph "Custom Hooks"
        Hook[useSharedState]
        Component1[Component A]
        Component2[Component B]
        Hook -->|state| Component1
        Hook -->|state| Component2
    end
```

## Performance Optimization Strategies

### Code Splitting
- Route-based splitting via Next.js App Router
- Dynamic imports for heavy components
- Lazy loading for optional features

### Rendering Optimization
- React.memo for expensive components
- useMemo/useCallback for computed values
- Virtual scrolling for large lists

### Data Management
- API response caching
- Optimistic UI updates
- Pagination and infinite scroll
- Debounced search inputs

### Asset Optimization
- Next.js Image optimization
- Icon tree-shaking
- CSS purging with Tailwind
- Font subsetting

## Security Architecture

### Client-Side Security
1. **Authentication**: JWT token management
2. **Authorization**: RBAC with permission checking
3. **Input Validation**: Client-side validation
4. **XSS Prevention**: Sanitized user inputs
5. **Protected Routes**: Route guards

### API Security
1. **Token Refresh**: Automatic token renewal
2. **Request Signing**: CSRF protection
3. **Rate Limiting**: Client-side throttling
4. **Error Handling**: Sanitized error messages

## Testing Architecture

### Component Testing
- Unit tests for utilities
- Component testing with React Testing Library
- Integration tests for features
- E2E tests with Playwright

### Test Coverage Areas
- Authentication flows
- RBAC permission checks
- Form validation
- API interactions
- Error boundaries
- Mobile responsiveness

## Build and Deployment

### Build Process
```
1. TypeScript compilation
2. Next.js build optimization
3. Static asset generation
4. API route compilation
5. Production bundle creation
```

### Deployment Architecture
- Static assets → CDN
- Server-side rendering → Node.js server
- API routes → Serverless functions
- Database → PostgreSQL
- Cache → Redis
- File storage → Cloud storage

This comprehensive frontend architecture demonstrates a sophisticated, enterprise-grade sports management application with strong emphasis on user experience, performance, security, and maintainability.