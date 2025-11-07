# Database Schema Summary

**Project**: SportsManager
**Database**: `sports_management` (PostgreSQL 17)
**Generated**: October 18, 2025
**Branch**: `feat/cerbos-only-migration`

---

## Quick Stats

| Metric | Value |
|--------|-------|
| Total Tables | 116 |
| Total Columns | 1,643 |
| Total Indexes | 618 |
| Total Constraints | 1,122 |
| Foreign Key Relationships | 236 |
| Current Data | 435 rows |

---

## Documentation Files

### 1. DATABASE_SCHEMA_COMPLETE.md
**Purpose**: Comprehensive schema documentation with every table, column, relationship, index, and constraint.

**Contains**:
- Complete table definitions (all 116 tables)
- Column specifications with types, nullability, defaults
- Primary keys, foreign keys, unique constraints
- Index details and performance optimization
- Check constraints and business rules
- Table relationships and cardinality
- Row counts and data statistics

**When to use**:
- Understanding table structure
- Adding new columns or constraints
- Migration planning
- Database optimization
- API endpoint design

### 2. database-diagram-latest.md (also in docs/reports/)
**Purpose**: Visual Entity Relationship Diagrams using Mermaid

**Contains**:
- Complete ERD with all 116 tables
- Core entities diagram (simplified, key tables only)
- Relationship cardinality (one-to-many, many-to-many)
- Visual representation of foreign key relationships

**When to use**:
- High-level database understanding
- Onboarding new developers
- Architecture discussions
- Planning new features

### 3. database-schema-complete.json
**Purpose**: Machine-readable schema data for automation

**Contains**:
- Complete schema in JSON format
- Programmatically parseable structure
- Can be used for code generation
- Foundation for other analysis tools

**When to use**:
- Automated documentation generation
- Schema diff/comparison tools
- Code generators (models, types, migrations)
- API documentation automation

---

## Category Breakdown

### Top Categories by Table Count

| Category | Tables | Percentage |
|----------|--------|------------|
| **Financial** | 28 | 24% |
| **Documents & Content** | 22 | 19% |
| **RBAC & Permissions** | 13 | 11% |
| **Games & Assignments** | 9 | 8% |
| **User Management** | 6 | 5% |
| **Communications** | 5 | 4% |
| **Other Categories** | 33 | 29% |

---

## Core Entities

### User & Organization Management
- `users` - User accounts (6 rows)
- `organizations` - Multi-tenant organization records
- `user_roles` - RBAC role assignments (6 rows)
- `roles` - Role definitions (6 rows)
- `departments` - Organizational structure

### Games & Scheduling
- `games` - Game schedules (180 rows)
- `game_assignments` - Referee/official assignments (180 rows)
- `teams` - Sports teams (24 rows)
- `leagues` - League/competition organization (12 rows)
- `locations` - Venues and facilities (12 rows)

### Referees & Officials
- `referee_profiles` - Referee details
- `referee_levels` - Certification levels (6 rows)
- `referee_roles` - Official position types
- `user_referee_roles` - Role assignments

### Financial Management
- `budgets` - Budget planning
- `expense_data` - Expense tracking
- `expense_receipts` - Receipt storage
- `financial_transactions` - Transaction ledger
- `payment_methods` - Payment processing
- `purchase_orders` - PO management

### RBAC & Access Control
- `roles` - Role definitions
- `role_page_access` - Page-level permissions
- `role_api_access` - API endpoint permissions
- `role_features` - Feature toggles
- `resource_permissions` - Resource-level access

### Communications
- `notifications` - System notifications
- `communication_recipients` - Message delivery
- `internal_communications` - Internal messaging
- `invitations` - User invitations

### Content & Documents
- `documents` - Document storage
- `content_items` - Content management
- `posts` - Social/content posts
- `resources` - Shared resources

### AI & Machine Learning
- `ai_suggestions` - AI-powered recommendations
- `ai_assignment_rules` - Assignment automation
- `ai_processing_logs` - AI operation logs

---

## Key Design Patterns

### 1. Multi-Tenancy
**Pattern**: `organization_id` foreign key in most tables
**Purpose**: Isolate data between organizations
**Implementation**: Nearly all tables include `organization_id` column

### 2. RBAC (Role-Based Access Control)
**Pattern**: `roles` → `user_roles` → `users`
**Purpose**: Flexible permission management
**Integration**: Cerbos policy engine for authorization

### 3. Audit Trail
**Pattern**: Timestamp columns + audit log tables
**Implementation**:
- `created_at`, `updated_at` on all tables
- Dedicated audit tables: `audit_logs`, `access_control_audit`, `resource_audit_log`
- Soft deletes where appropriate

### 4. UUID Primary Keys
**Pattern**: `uuid` type with `gen_random_uuid()` default
**Benefits**:
- Distributed system support
- No ID enumeration attacks
- Merge-friendly for replicas

### 5. Polymorphic Relationships
**Pattern**: `resource_type` + `resource_id` columns
**Examples**:
- `notifications` can reference any entity
- `documents` can be attached to multiple entity types

### 6. Junction Tables
**Pattern**: Many-to-many relationships
**Examples**:
- `user_roles` (users ↔ roles)
- `game_assignments` (games ↔ users)
- `content_item_tags` (content ↔ tags)

---

## Relationship Highlights

### Core Relationships

```
organizations
    ↓ (has many)
users
    ↓ (has many)
games, expenses, budgets, etc.

users ↔ roles
    (via user_roles)

games ← game_assignments → users
    (officials assigned to games)

games → teams, leagues, locations
    (game details)
```

### Total Foreign Key Relationships: 236

**Most Connected Tables**:
1. `users` - Central to most relationships
2. `organizations` - Multi-tenant root
3. `games` - Core business entity
4. `expense_data` - Complex financial relationships
5. `budgets` - Financial planning hub

---

## Index Strategy

### Total Indexes: 618

**Index Types**:
1. **Primary Key Indexes** (116) - Automatic on all tables
2. **Foreign Key Indexes** (236+) - For join performance
3. **Unique Indexes** - Email, usernames, codes
4. **Composite Indexes** - Common query patterns
5. **Partial Indexes** - Filtered for specific queries

**Example Patterns**:
- `users`: Indexed on email, organization_id
- `games`: Indexed on league_id, location_id, date, status
- `game_assignments`: Composite index on (game_id, user_id)
- `expenses`: Indexed on user_id, organization_id, created_at

---

## Data Integrity

### Constraints: 1,122 Total

**Types**:
1. **Primary Keys** (116) - Uniqueness guarantee
2. **Foreign Keys** (236) - Referential integrity
3. **Unique Constraints** - Prevent duplicates
4. **Check Constraints** - Business rule enforcement
5. **NOT NULL Constraints** - Required fields

**Example Check Constraints**:
- `games.status` must be in ['scheduled', 'in_progress', 'completed', 'cancelled']
- `expense_data.total_amount` must be positive
- `budget_periods.end_date` must be after `start_date`

---

## Current Data Status

**Total Records**: 435 rows

**Populated Tables**:
- `games`: 180 rows
- `game_assignments`: 180 rows
- `teams`: 24 rows
- `leagues`: 12 rows
- `locations`: 12 rows
- `users`: 6 rows
- `roles`: 6 rows
- `user_roles`: 6 rows
- `referee_levels`: 6 rows

**Status**: Minimal seed data, ready for full data migration

---

## Migration Strategy

### Current State
- ✅ Schema fully migrated (116 tables)
- ✅ Indexes created (618 total)
- ✅ Constraints enforced (1,122 total)
- ⚠️ Minimal seed data (435 rows)
- ⚠️ Need comprehensive seed files

### Next Steps
1. **Seed Data Consolidation**
   - Fix seed file conflicts
   - Create comprehensive seed strategy
   - Add reference data (roles, permissions, etc.)
   - Add sample data for development

2. **Validation**
   - Test all foreign key relationships
   - Verify constraint enforcement
   - Validate index performance
   - Check multi-tenant isolation

3. **Documentation Updates**
   - Update API documentation with schema
   - Create data dictionaries
   - Document business rules
   - Add migration guides

---

## Common Queries

### Find all tables for a category
```sql
-- User Management tables
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('users', 'user_roles', 'user_referee_roles', 'user_earnings', 'user_locations');
```

### Check relationship integrity
```sql
-- Find orphaned records
SELECT g.* FROM games g
LEFT JOIN leagues l ON g.league_id = l.id
WHERE l.id IS NULL;
```

### Analyze table sizes
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Scripts

### Extract Schema
```bash
node extract-database-schema.js
```
**Output**: `database-schema-complete.json`

### Generate Documentation
```bash
node generate-schema-documentation.js
```
**Output**:
- `DATABASE_SCHEMA_COMPLETE.md`
- `database-diagram-latest.md`

### Query Database
```bash
PGPASSWORD=postgres123 "C:/Program Files/PostgreSQL/17/bin/psql.exe" \
  -U postgres -h localhost -p 5432 -d sports_management
```

---

## Frontend-Backend Integration

### API Endpoint Design
**Use schema to design endpoints**:
- Table name → Resource endpoint (`/api/games`, `/api/users`)
- Relationships → Nested endpoints (`/api/games/:id/assignments`)
- Columns → Request/response fields
- Constraints → Validation rules

### TypeScript Type Generation
**Generate types from schema**:
- Table → Interface
- Column → Property with type
- Nullable → Optional property
- Enums → Union types

**Example**:
```typescript
// From 'users' table
interface User {
  id: string;           // uuid
  email: string;        // varchar(255), NOT NULL, UNIQUE
  name: string;         // varchar(255), NOT NULL
  organization_id: string; // uuid, FK → organizations
  created_at: Date;     // timestamptz
  updated_at?: Date;    // timestamptz, nullable
}
```

---

## Performance Considerations

### Indexed for Performance
- ✅ All foreign keys indexed
- ✅ Lookup fields indexed (email, codes)
- ✅ Common filter fields indexed (status, dates)
- ✅ Composite indexes for multi-column queries

### Optimization Opportunities
- Consider partitioning large tables (games, assignments, transactions)
- Add partial indexes for common filtered queries
- Implement caching for reference data (roles, locations)
- Use materialized views for complex reports

---

## Security & Compliance

### Data Protection
- **PII Handling**: Users, employees, referees contain PII
- **Financial Data**: Expenses, budgets, transactions are sensitive
- **Audit Trail**: All changes tracked in audit tables
- **Soft Deletes**: Important records retained for compliance

### Access Control
- **Multi-tenant Isolation**: `organization_id` on all tables
- **RBAC**: Role-based permissions via Cerbos
- **Row-Level Security**: Planned via Cerbos policies
- **Audit Logging**: `access_control_audit`, `resource_audit_log`

---

## Troubleshooting

### Common Issues

**Foreign Key Violations**
```sql
-- Find invalid foreign key references
SELECT * FROM game_assignments ga
LEFT JOIN games g ON ga.game_id = g.id
WHERE g.id IS NULL;
```

**Duplicate Entries**
```sql
-- Find duplicate emails
SELECT email, COUNT(*)
FROM users
GROUP BY email
HAVING COUNT(*) > 1;
```

**Missing Indexes**
```sql
-- Find tables without indexes on foreign keys
SELECT
  tc.table_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = tc.table_name
    AND indexdef LIKE '%' || kcu.column_name || '%'
  );
```

---

## Resources

### Documentation
- **Complete Schema**: `DATABASE_SCHEMA_COMPLETE.md`
- **ERD Diagrams**: `database-diagram-latest.md` or `docs/reports/database-diagram-latest.md`
- **JSON Schema**: `database-schema-complete.json`

### Migration Files
- **Location**: `backend/migrations/`
- **Run**: `npm run migrate:latest`
- **Rollback**: `npm run migrate:rollback`

### Seed Files
- **Location**: `backend/seeds/`
- **Run**: `npm run seed:run`

---

## Changelog

### 2025-10-18
- ✅ Extracted complete schema from PostgreSQL
- ✅ Generated comprehensive documentation
- ✅ Created Mermaid ERD diagrams
- ✅ Documented all 116 tables, 1,643 columns
- ✅ Cataloged 236 relationships, 618 indexes
- ✅ Updated `docs/reports/database-diagram-latest.md`

---

*This summary is auto-generated from the PostgreSQL database. For complete details, see `DATABASE_SCHEMA_COMPLETE.md`.*
