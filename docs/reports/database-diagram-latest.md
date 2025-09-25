# Sports Management App - Database Schema Diagram

## Complete Entity Relationship Diagram

```mermaid
erDiagram
    %% Core User Management
    users {
        uuid id PK
        string email UK
        string password_hash
        enum role "admin, referee"
        text[] roles "Array of roles"
        boolean white_whistle
        timestamp created_at
        timestamp updated_at
    }

    invitations {
        uuid id PK
        string email UK
        string first_name
        string last_name
        string role
        uuid invited_by FK
        string token UK
        timestamp expires_at
        boolean used
        timestamp used_at
        timestamp created_at
        timestamp updated_at
    }

    user_locations {
        uuid id PK
        uuid user_id FK UK
        string full_address
        string street_number
        string street_name
        string city
        string province
        string postal_code
        string country
        decimal latitude
        decimal longitude
        string geocoding_provider
        decimal geocoding_confidence
        string address_type
        json raw_geocoding_data
        timestamp created_at
        timestamp updated_at
    }

    %% Referee Management
    referees {
        uuid id PK
        uuid user_id FK
        string name
        string email UK
        string phone
        enum level "Recreational, Competitive, Elite"
        string location
        string postal_code
        integer max_distance
        boolean is_available
        timestamp created_at
        timestamp updated_at
    }

    referee_levels {
        uuid id PK
        string name UK
        decimal wage_amount
        text description
        json allowed_divisions
        json experience_requirements
        json capability_requirements
        timestamp created_at
        timestamp updated_at
    }

    referee_availability {
        uuid id PK
        uuid referee_id FK
        date date
        time start_time
        time end_time
        boolean is_available
        string reason
        timestamp created_at
        timestamp updated_at
    }

    positions {
        uuid id PK
        string name UK
        text description
        timestamp created_at
        timestamp updated_at
    }

    %% Sports League Structure
    leagues {
        uuid id PK
        string organization
        string age_group
        string gender
        string division
        string season
        string level
        timestamp created_at
        timestamp updated_at
    }

    teams {
        uuid id PK
        string name
        uuid league_id FK
        integer rank
        string location
        string contact_email
        string contact_phone
        timestamp created_at
        timestamp updated_at
    }

    locations {
        uuid id PK
        string name
        string address
        string city
        string province
        string postal_code
        string country
        decimal latitude
        decimal longitude
        integer capacity
        string contact_name
        string contact_phone
        string contact_email
        decimal rental_rate
        integer parking_spaces
        json facilities
        json accessibility_features
        text notes
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    user_location_distances {
        uuid id PK
        uuid user_id FK
        uuid location_id FK
        integer distance_meters
        string distance_text
        integer drive_time_seconds
        string drive_time_text
        integer drive_time_minutes
        string calculation_provider
        timestamp calculated_at
        json route_data
        boolean calculation_successful
        text calculation_error
        integer calculation_attempts
        timestamp last_calculation_attempt
        boolean needs_recalculation
        timestamp created_at
        timestamp updated_at
    }

    %% Games and Assignments
    games {
        uuid id PK
        uuid home_team_id FK
        uuid away_team_id FK
        uuid league_id FK
        uuid location_id FK
        string home_team_name
        string away_team_name
        date game_date
        time game_time
        string location
        string postal_code
        enum level "Recreational, Competitive, Elite"
        enum game_type "Community, Club, Tournament, Private Tournament"
        decimal pay_rate
        integer refs_needed
        decimal wage_multiplier
        decimal cost_per_game
        decimal cost_per_referee
        enum status "assigned, unassigned, up-for-grabs, completed, cancelled"
        timestamp created_at
        timestamp updated_at
    }

    game_assignments {
        uuid id PK
        uuid game_id FK
        uuid referee_id FK
        uuid position_id FK
        timestamp assigned_at
        uuid assigned_by FK
        enum status "assigned, accepted, declined, completed"
        decimal calculated_wage
        timestamp created_at
        timestamp updated_at
    }

    %% Game Chunking System
    game_chunks {
        uuid id PK
        string name
        string location
        date date
        time start_time
        time end_time
        uuid assigned_referee_id FK
        integer total_referees_needed
        integer game_count
        text notes
        enum status "unassigned, assigned, completed, cancelled"
        uuid created_by FK
        uuid assigned_by FK
        timestamp assigned_at
        timestamp created_at
        timestamp updated_at
    }

    chunk_games {
        uuid id PK
        uuid chunk_id FK
        uuid game_id FK
        integer sort_order
        timestamp created_at
        timestamp updated_at
    }

    %% AI Assignment System
    ai_suggestions {
        uuid id PK
        uuid game_id FK
        uuid referee_id FK
        decimal confidence_score
        text reasoning
        decimal proximity_score
        decimal availability_score
        decimal experience_score
        decimal performance_score
        enum status "pending, accepted, rejected, expired"
        text rejection_reason
        uuid created_by FK
        uuid processed_by FK
        timestamp processed_at
        timestamp created_at
        timestamp updated_at
    }

    assignment_patterns {
        uuid id PK
        uuid referee_id FK
        string pattern_type
        json pattern_data
        integer frequency
        decimal success_rate
        timestamp last_used
        boolean active
        timestamp created_at
        timestamp updated_at
    }

    %% Budget Management System
    budget_periods {
        uuid id PK
        uuid organization_id FK
        string name
        text description
        date start_date
        date end_date
        enum status "draft, active, closed, archived"
        boolean is_template
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    budget_categories {
        uuid id PK
        uuid organization_id FK
        string name
        string code UK
        text description
        uuid parent_id FK
        integer sort_order
        boolean active
        enum category_type "revenue, operating_expenses, payroll, equipment, facilities, travel, marketing, admin, other"
        string color_code
        timestamp created_at
        timestamp updated_at
    }

    budgets {
        uuid id PK
        uuid organization_id FK
        uuid budget_period_id FK
        uuid category_id FK
        string name
        text description
        decimal allocated_amount
        decimal committed_amount
        decimal actual_spent
        decimal reserved_amount
        decimal available_amount
        enum status "draft, approved, active, locked, closed"
        json variance_rules
        json seasonal_patterns
        uuid owner_id FK
        timestamp created_at
        timestamp updated_at
    }

    budget_allocations {
        uuid id PK
        uuid budget_id FK
        integer allocation_year
        integer allocation_month
        decimal allocated_amount
        decimal actual_amount
        text notes
        timestamp created_at
        timestamp updated_at
    }

    budget_approvals {
        uuid id PK
        uuid budget_id FK
        uuid requested_by FK
        uuid approver_id FK
        enum approval_type "initial, revision, increase, transfer"
        enum status "pending, approved, rejected, requires_info"
        decimal requested_amount
        decimal approved_amount
        text request_notes
        text approval_notes
        timestamp requested_at
        timestamp approved_at
        timestamp rejected_at
    }

    %% Expense Management System
    expense_categories {
        uuid id PK
        uuid organization_id FK
        string name UK
        string code UK
        text description
        string color_code
        string icon
        uuid parent_category_id FK
        integer sort_order
        json keywords
        json vendor_patterns
        json amount_ranges
        boolean ai_enabled
        boolean requires_approval
        decimal approval_threshold
        boolean reimbursable
        boolean taxable
        boolean active
        json metadata
        timestamp created_at
        timestamp updated_at
    }

    expense_receipts {
        uuid id PK
        uuid user_id FK
        uuid organization_id FK
        string original_filename
        string file_path
        string file_type
        string mime_type
        integer file_size
        string file_hash
        enum processing_status "uploaded, processing, processed, failed, manual_review"
        text processing_notes
        text raw_ocr_text
        json ai_confidence_scores
        json processing_metadata
        timestamp uploaded_at
        timestamp processed_at
        timestamp created_at
        timestamp updated_at
    }

    expense_data {
        uuid id PK
        uuid receipt_id FK
        uuid user_id FK
        uuid organization_id FK
        uuid reimbursement_user_id FK
        string vendor_name
        text vendor_address
        string vendor_phone
        decimal total_amount
        decimal tax_amount
        decimal subtotal_amount
        date transaction_date
        string transaction_time
        string receipt_number
        string payment_method
        uuid category_id FK
        string category_name
        text description
        json line_items
        string business_purpose
        string project_code
        string department
        boolean reimbursable
        boolean is_reimbursable
        text reimbursement_notes
        json ai_extracted_fields
        decimal extraction_confidence
        json field_confidence_scores
        boolean requires_manual_review
        boolean manually_corrected
        json corrections_made
        uuid corrected_by FK
        timestamp corrected_at
        timestamp extracted_at
        timestamp created_at
        timestamp updated_at
    }

    expense_approvals {
        uuid id PK
        uuid expense_data_id FK
        uuid submitted_by FK
        uuid approver_id FK
        enum status "pending, approved, rejected, requires_info"
        text approval_notes
        text rejection_reason
        timestamp submitted_at
        timestamp approved_at
        timestamp rejected_at
        timestamp created_at
        timestamp updated_at
    }

    expense_reimbursements {
        uuid id PK
        uuid expense_data_id FK
        uuid receipt_id FK
        uuid reimbursement_user_id FK
        uuid organization_id FK
        decimal approved_amount
        decimal reimbursed_amount
        enum status "pending, scheduled, paid, cancelled, disputed"
        string payment_method
        string payment_reference
        date scheduled_pay_date
        date paid_date
        uuid processed_by FK
        text processing_notes
        json payment_details
        string pay_period
        boolean included_in_payroll
        uuid payroll_batch_id
        timestamp scheduled_at
        timestamp paid_at
        timestamp created_at
        timestamp updated_at
    }

    user_earnings {
        uuid id PK
        uuid user_id FK
        uuid organization_id FK
        enum earning_type "referee_pay, reimbursement, bonus, adjustment, other"
        decimal amount
        string description
        uuid reference_id
        string reference_type
        string pay_period
        date earned_date
        date pay_date
        enum payment_status "pending, scheduled, paid, cancelled"
        uuid processed_by FK
        text notes
        timestamp created_at
        timestamp updated_at
    }

    %% Payment System
    payment_methods {
        uuid id PK
        uuid user_id FK
        string method_type
        string provider
        json method_data
        boolean is_default
        boolean active
        timestamp created_at
        timestamp updated_at
    }

    purchase_orders {
        uuid id PK
        uuid organization_id FK
        string po_number UK
        uuid requested_by FK
        uuid approved_by FK
        decimal total_amount
        enum status "draft, pending, approved, rejected, completed"
        json line_items
        text notes
        timestamp created_at
        timestamp updated_at
    }

    company_credit_cards {
        uuid id PK
        uuid organization_id FK
        string card_name
        string last_four_digits
        string card_type
        uuid assigned_to FK
        boolean active
        decimal credit_limit
        timestamp created_at
        timestamp updated_at
    }

    %% System Management
    organization_settings {
        uuid id PK
        string organization_name
        enum payment_model "INDIVIDUAL, FLAT_RATE"
        decimal default_game_rate
        timestamp created_at
        timestamp updated_at
    }

    ai_processing_logs {
        uuid id PK
        uuid receipt_id FK
        string processing_stage
        enum status "started, completed, failed"
        json input_data
        json output_data
        text error_message
        decimal processing_time_ms
        timestamp created_at
    }

    audit_logs {
        integer id PK
        string event_type
        uuid user_id FK
        string user_email
        string ip_address
        text user_agent
        string resource_type
        string resource_id
        text old_values
        text new_values
        text additional_data
        enum severity "low, medium, high, critical"
        boolean success
        text error_message
        string request_path
        string request_method
        timestamp created_at
    }

    %% Relationships
    users ||--o{ invitations : "invited_by"
    users ||--o| user_locations : "has_location"
    users ||--o{ user_location_distances : "calculates_distances"
    users ||--o{ referees : "referee_profile"
    users ||--o{ game_assignments : "assigned_to"
    users ||--o{ game_assignments : "assigned_by"
    users ||--o{ game_chunks : "assigned_referee"
    users ||--o{ ai_suggestions : "suggested_for"
    users ||--o{ expense_receipts : "uploaded_by"
    users ||--o{ expense_data : "submitted_by"
    users ||--o{ user_earnings : "earns"

    locations ||--o{ user_location_distances : "distance_to"
    locations ||--o{ games : "played_at"

    leagues ||--o{ teams : "contains"
    teams ||--o{ games : "home_team"
    teams ||--o{ games : "away_team"

    games ||--o{ game_assignments : "assigned_referees"
    games ||--o{ chunk_games : "in_chunk"
    games ||--o{ ai_suggestions : "suggestions_for"

    positions ||--o{ game_assignments : "referee_position"

    referees ||--o{ referee_availability : "availability"
    referees ||--o{ assignment_patterns : "patterns"

    game_chunks ||--o{ chunk_games : "contains_games"

    budget_periods ||--o{ budgets : "budgets_in_period"
    budget_categories ||--o{ budgets : "budget_category"
    budget_categories ||--o{ budget_categories : "parent_category"
    budgets ||--o{ budget_allocations : "monthly_allocations"
    budgets ||--o{ budget_approvals : "approval_workflow"

    expense_categories ||--o{ expense_data : "categorized_as"
    expense_categories ||--o{ expense_categories : "parent_category"
    expense_receipts ||--o{ expense_data : "extracted_data"
    expense_receipts ||--o{ ai_processing_logs : "processing_logs"
    expense_data ||--o{ expense_approvals : "approval_workflow"
    expense_data ||--o{ expense_reimbursements : "reimbursement"
```

## Key Entity Relationships Summary

### Core User & Authentication System
- **users**: Central user table with role-based access (admin/referee)
- **invitations**: Invitation system for onboarding new users
- **user_locations**: Geocoded user addresses for distance calculations
- **user_location_distances**: Pre-calculated distances between users and game locations

### Sports Management Core
- **leagues**: Hierarchical league structure (organization → age group → gender → division → season)
- **teams**: Teams belonging to specific leagues with rankings
- **games**: Game scheduling with team references, locations, and payment details
- **locations**: Game venues with full address and facility information

### Referee Management
- **referees**: Extended referee profiles linked to users
- **referee_levels**: Referee skill/wage levels (Learning, Growing, Teaching)
- **referee_availability**: Time-based availability tracking
- **positions**: Referee positions (e.g., Head Referee, Assistant)

### Assignment System
- **game_assignments**: Individual referee assignments to games
- **game_chunks**: Grouped sequential games at same location
- **chunk_games**: Junction table linking games to chunks
- **ai_suggestions**: AI-powered assignment recommendations
- **assignment_patterns**: Historical assignment pattern analysis

### Financial Management
#### Budget System
- **budget_periods**: Annual/seasonal budget timeframes
- **budget_categories**: Hierarchical expense categories
- **budgets**: Actual budget allocations with spending tracking
- **budget_allocations**: Monthly/quarterly budget breakdowns
- **budget_approvals**: Budget approval workflow

#### Expense Management
- **expense_categories**: AI-enabled expense categorization
- **expense_receipts**: Receipt file management with OCR processing
- **expense_data**: Extracted expense information with AI confidence scores
- **expense_approvals**: Expense approval workflow
- **expense_reimbursements**: Reimbursement payment tracking
- **user_earnings**: Consolidated earnings tracking (referee pay + reimbursements)

### System Administration
- **organization_settings**: Organization-wide configuration
- **audit_logs**: Comprehensive system activity logging
- **ai_processing_logs**: AI processing performance tracking

## Database Design Features

### Performance Optimizations
- Comprehensive indexing on frequently queried columns
- Composite indexes for complex queries
- UUID primary keys for distributed system compatibility
- Proper foreign key constraints with cascading deletes

### Data Integrity
- Enum constraints for status fields
- Unique constraints preventing data duplication
- Check constraints for valid data ranges
- Foreign key relationships maintaining referential integrity

### Scalability Features
- Hierarchical category structures for flexibility
- JSON fields for flexible metadata storage
- Separate tables for historical tracking
- Audit logging for compliance and debugging

### AI Integration
- Confidence scoring for AI-extracted data
- Processing status tracking
- Manual correction workflow
- Performance logging for AI operations

This database schema supports a comprehensive sports management platform with referee assignment, financial tracking, and AI-powered automation capabilities.