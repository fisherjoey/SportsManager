# Sports Management App - Database Schema Diagram

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        enum role "admin, referee"
        text_array roles
        varchar name
        varchar phone
        varchar location
        varchar postal_code
        integer max_distance
        boolean is_available
        decimal wage_per_game
        uuid referee_level_id FK
        integer years_experience
        integer games_refereed_season
        decimal evaluation_score
        text notes
        timestamp created_at
        timestamp updated_at
    }

    REFEREE_LEVELS {
        uuid id PK
        varchar name UK "Learning, Growing, Teaching"
        decimal wage_amount
        text description
        json allowed_divisions
        json experience_requirements
        json capability_requirements
        timestamp created_at
        timestamp updated_at
    }

    POSITIONS {
        uuid id PK
        varchar name UK "Referee 1, Referee 2, Referee 3"
        text description
        timestamp created_at
        timestamp updated_at
    }

    LEAGUES {
        uuid id PK
        varchar organization "Okotoks, Calgary"
        varchar age_group "U11, U13, U15"
        varchar gender "Boys, Girls, Mixed"
        varchar division "Division 1, Division 2, Premier"
        varchar season "Winter 2025, Spring 2025"
        varchar level "Recreational, Competitive, Elite"
        timestamp created_at
        timestamp updated_at
    }

    TEAMS {
        uuid id PK
        varchar name
        uuid league_id FK
        integer rank
        varchar location
        varchar contact_email
        varchar contact_phone
        timestamp created_at
        timestamp updated_at
    }

    GAMES {
        uuid id PK
        uuid home_team_id FK
        uuid away_team_id FK
        uuid league_id FK
        date game_date
        time game_time
        varchar location
        varchar postal_code
        enum level "Recreational, Competitive, Elite"
        enum game_type "Community, Club, Tournament, Private Tournament"
        decimal pay_rate
        integer refs_needed
        decimal wage_multiplier
        text wage_multiplier_reason
        enum status "assigned, unassigned, up-for-grabs, completed, cancelled"
        timestamp created_at
        timestamp updated_at
    }

    GAME_ASSIGNMENTS {
        uuid id PK
        uuid game_id FK
        uuid user_id FK
        uuid position_id FK
        timestamp assigned_at
        uuid assigned_by FK
        enum status "assigned, accepted, declined, completed"
        decimal calculated_wage
        timestamp created_at
        timestamp updated_at
    }

    REFEREE_AVAILABILITY {
        uuid id PK
        uuid referee_id FK
        date date
        time start_time
        time end_time
        boolean is_available
        varchar reason
        varchar pattern_type "single, weekly, daily"
        integer max_games_per_period
        varchar preferred_locations
        varchar preferred_partners
        text notes
        integer priority_level
        boolean is_flexible
        timestamp created_at
        timestamp updated_at
    }

    AVAILABILITY_PATTERNS {
        uuid id PK
        uuid referee_id FK
        varchar name
        json days_of_week
        time start_time
        time end_time
        date effective_from
        date effective_until
        boolean is_active
        integer max_games_per_week
        integer max_distance_km
        text notes
        timestamp created_at
        timestamp updated_at
    }

    INVITATIONS {
        uuid id PK
        varchar email UK
        varchar first_name
        varchar last_name
        varchar role
        uuid invited_by FK
        varchar token UK
        timestamp expires_at
        boolean used
        timestamp used_at
        timestamp created_at
        timestamp updated_at
    }

    %% Relationships
    USERS ||--o{ GAME_ASSIGNMENTS : "assigned_to"
    USERS ||--o{ REFEREE_AVAILABILITY : "has_availability"
    USERS ||--o{ AVAILABILITY_PATTERNS : "has_patterns"
    USERS }o--|| REFEREE_LEVELS : "has_level"
    USERS ||--o{ INVITATIONS : "invited_by"

    LEAGUES ||--o{ TEAMS : "contains"
    LEAGUES ||--o{ GAMES : "organizes"

    TEAMS ||--o{ GAMES : "plays_home"
    TEAMS ||--o{ GAMES : "plays_away"

    GAMES ||--o{ GAME_ASSIGNMENTS : "assigned_referees"

    POSITIONS ||--o{ GAME_ASSIGNMENTS : "position_type"

    GAME_ASSIGNMENTS }o--|| USERS : "assigned_by"
```

## Key Database Features

### 🔗 **Core Relationships**
- **Users**: Central entity handling both admins and referees
- **Games**: Connected to teams, leagues, and referee assignments
- **Teams**: Organized within leagues with proper normalization

### 📊 **Data Integrity**
- UUID primary keys throughout for better distribution
- Unique constraints on critical combinations
- Foreign key constraints with proper cascade rules
- Enum types for controlled vocabulary

### 🚀 **Performance Optimizations**
- Indexes on frequently queried fields (game_date, location, etc.)
- Normalized structure reducing data duplication
- Efficient many-to-many relationships through junction tables

### 🔄 **Recent Schema Evolution**
1. **Team/League Restructuring**: Migrated from JSON to proper entities
2. **User Consolidation**: Merged referees into users table
3. **Enhanced Roles**: Added array-based role system
4. **Availability Patterns**: Support for recurring availability rules
5. **Game Types**: Added Community, Club, Tournament classifications

### 💡 **Advanced Features**
- **Flexible Availability**: Both single dates and recurring patterns
- **Wage Calculation**: Automatic wage calculation with multipliers
- **Assignment Tracking**: Full lifecycle of referee assignments
- **Invitation System**: Secure user onboarding workflow

This schema supports comprehensive sports league management with proper data integrity, performance optimization, and flexibility for complex referee assignment workflows.