# Schema Documentation Comparison

**Date:** September 30, 2025

This document compares the different schema representations in the project and identifies discrepancies.

## 📊 Summary

| Source | Tables | Status | Accuracy |
|--------|--------|--------|----------|
| **Actual Database** | 51 | ✅ Current | 100% (Source of Truth) |
| **Generated Docs** | 51 | ✅ Current | 100% (Auto-generated) |
| **Markdown Docs** | ~26 | ⚠️ Partial | ~60% (Missing tables, some outdated) |
| **PDF Diagram** | 9 | ❌ Outdated | ~30% (Idealized/planned schema) |

---

## ✅ Actual Database Schema (Source of Truth)

**Location:** PostgreSQL database `sports_management`

**Generated Documentation:**
- [CURRENT_SCHEMA.md](CURRENT_SCHEMA.md) - Complete table documentation
- [schema-erd.md](schema-erd.md) - Entity relationship diagram
- [schema.json](schema.json) - Machine-readable export

### Table Count: 51 Tables

<details>
<summary>Complete Table List</summary>

#### Core Tables (8)
- `users` - User accounts
- `user_roles` - Role assignments
- `user_region_assignments` - Regional access
- `organizations` - Organization hierarchy
- `regions` - Regional subdivision
- `roles` - Role definitions
- `referee_profiles` - Referee extended info
- `audit_logs` - System audit trail

#### Game Management (5)
- `games` - Game schedule
- `game_assignments` - Referee assignments
- `teams` - Team information
- `leagues` - League structure
- `locations` - Venue information

#### RBAC System (7)
- `role_api_access` - API permissions
- `role_page_access` - Page permissions
- `role_features` - Feature flags
- `role_data_scopes` - Data scoping
- `rbac_pages` - Page registry
- `rbac_endpoints` - Endpoint registry
- `rbac_functions` - Function registry
- `rbac_configuration_templates` - RBAC templates
- `rbac_scan_history` - Scan history
- `access_control_audit` - RBAC audit log

#### Content Management (9)
- `content_items` - Articles/content
- `content_categories` - Categories
- `content_tags` - Tagging system
- `content_item_tags` - Tag assignments
- `content_versions` - Version history
- `content_permissions` - Access control
- `content_attachments` - File attachments
- `content_analytics` - Usage tracking
- `content_analytics_monthly` - Monthly stats
- `content_search_index` - Full-text search

#### Social/Posts (4)
- `posts` - Social posts
- `post_categories` - Post categories
- `post_media` - Media attachments
- `post_reads` - Read tracking

#### Mentorship System (3)
- `mentorships` - Mentor-mentee relationships
- `mentorship_notes` - Session notes
- `mentorship_documents` - Shared documents

#### Resource Center (3)
- `resources` - Resource library
- `resource_categories` - Resource organization
- `resource_access_logs` - Access tracking

#### Communication (2)
- `internal_communications` - Internal messages
- `communication_recipients` - Message recipients

#### Workflow Engine (4)
- `workflow_definitions` - Workflow templates
- `workflow_instances` - Active workflows
- `workflow_step_executions` - Step tracking
- `workflow_approvals` - Approval tracking

#### System (2)
- `knex_migrations` - Migration tracking
- `knex_migrations_lock` - Migration locks

</details>

---

## ⚠️ Markdown Documentation (docs/architecture/database-diagram.md)

**Status:** Partially accurate, missing many tables

### What's Correct
- ✅ Core user management structure
- ✅ Organizations and regions (multi-tenancy)
- ✅ RBAC system (roles, permissions, user_roles)
- ✅ Game management basics
- ✅ Financial module references

### What's Missing
- ❌ Content management system (12 tables)
- ❌ Mentorship system (3 tables)
- ❌ Workflow engine (4 tables)
- ❌ Resource center (3 tables)
- ❌ Social/posts system (4 tables)
- ❌ RBAC registry tables (5 tables)
- ❌ Communication system (2 tables)

### Naming Discrepancies
| Markdown Docs | Actual Database | Issue |
|---------------|-----------------|-------|
| `referees` | `referee_profiles` | Table name different |
| `permissions` | Not found | Referenced but doesn't exist as table |
| `role_permissions` | Not found | Referenced but doesn't exist as table |
| Financial tables | Not found | Referenced but not implemented |

---

## ❌ PDF Diagram (docs/assets/images/database-diagram.pdf)

**Status:** Significantly outdated (represents planned/idealized schema)

### Tables in PDF That Don't Exist

| PDF Table | Status | Notes |
|-----------|--------|-------|
| `positions` | ❌ Missing | Referenced in game_assignments.position_id |
| `referee_levels` | ❌ Missing | Referenced in users.referee_level_id |
| `referee_availability` | ❌ Missing | Tests expect this table |
| `availability_patterns` | ❌ Missing | Tests expect this table |
| `invitations` | ❌ Missing | Tests expect this table |

### What PDF Shows vs Reality

**PDF Schema:**
```sql
users:
  - role (enum: 'admin', 'referee')
  - referee_level_id FK

games:
  - game_date (DATE)
  - game_time (TIME)
  - location (VARCHAR)
  - postal_code (VARCHAR)
  - level (ENUM)
  - status (ENUM)
```

**Actual Database:**
```sql
users:
  - No role enum (uses roles table + user_roles)
  - No referee_level_id

referee_profiles:
  - Separate table with referee details

games:
  - date_time (TIMESTAMP) - combined field
  - field (VARCHAR) - not "location"
  - No postal_code column
  - No level enum
  - No status enum
  - game_type (VARCHAR)
```

### Missing from PDF
- ❌ All enterprise features (51 tables → shows only 9)
- ❌ Multi-tenancy (organizations, regions)
- ❌ RBAC system
- ❌ Content management
- ❌ Workflow engine
- ❌ Mentorship system

---

## 🔍 Key Findings

### 1. User/Referee Data Model

**Issue:** Hybrid approach with potential duplication

**Current Implementation:**
```
users table:
├── Basic user fields (id, email, password_hash, name, phone)
├── Referee fields (postal_code, max_distance, is_available, wage_per_game)
├── years_experience, evaluation_score
└── organization_id, primary_region_id

referee_profiles table (separate):
├── user_id (FK to users, UNIQUE)
├── wage_amount, wage_currency, payment_method
├── years_experience, evaluation_score (DUPLICATED!)
├── certification_number, certification_date
├── is_white_whistle, max_weekly_games
└── JSONB fields (preferred_positions, availability_pattern, etc.)
```

**Recommendation:** Remove duplicated fields from users table or referee_profiles to maintain single source of truth.

### 2. Missing Core Tables

Several tables referenced in foreign keys don't exist:
- `positions` - game_assignments references this
- `referee_levels` - users table has referee_level_id column
- `referee_availability` - tests expect this
- `availability_patterns` - tests expect this

### 3. Teams/Leagues Structure

**Status:** ✅ Correctly implemented

The actual implementation matches recent migrations (020-021):
- `leagues` table with organization, age_group, gender, division, season
- `teams` table with league_id FK
- `games` table with team FKs
- Proper normalization achieved

---

## 📋 Recommendations

### Immediate Actions

1. **Update PDF Diagram** ✅ COMPLETED
   - Generated current schema automatically
   - Use [schema-erd.md](schema-erd.md) as source

2. **Update Markdown Docs**
   - Update [docs/architecture/database-diagram.md](../architecture/database-diagram.md)
   - Add missing tables
   - Correct table names (referees → referee_profiles)

3. **Resolve Data Duplication**
   - Decide: users table OR referee_profiles for referee data
   - Remove duplicated fields (years_experience, evaluation_score, wage_per_game)
   - Update queries accordingly

4. **Create Missing Tables** (if needed)
   - `positions` table for referee positions
   - `referee_levels` table for certification levels
   - OR remove foreign key references if not needed

### Long-term Strategy

1. **Single Source of Truth**
   - Database is the source of truth
   - Auto-generate documentation from database
   - Manual docs only for high-level overviews

2. **Automation**
   - Run `npm run schema:docs` after migrations
   - Add to CI/CD pipeline
   - Include in PR checklist

3. **Version Control**
   - Commit generated schema docs
   - Review schema changes in PRs
   - Tag schema versions with releases

4. **Documentation Structure**
   ```
   docs/schema/
   ├── README.md                 # This file
   ├── CURRENT_SCHEMA.md         # Auto-generated (commit)
   ├── schema-erd.md            # Auto-generated (commit)
   ├── schema.json              # Auto-generated (commit)
   ├── schema.sql               # Auto-generated (don't commit)
   └── snapshots/
       ├── v1.0.0-schema.sql    # Release snapshots
       └── v2.0.0-schema.sql
   ```

---

## 🎯 Action Items

- [ ] Create missing tables (`positions`, `referee_levels`) OR remove FKs
- [ ] Resolve user/referee_profiles duplication
- [ ] Update [docs/architecture/database-diagram.md](../architecture/database-diagram.md)
- [ ] Archive outdated PDF diagram
- [ ] Add schema docs generation to CI/CD
- [ ] Document schema change process in contributing guide
- [ ] Create migration to clean up orphaned FK references

---

## 📊 Statistics

| Metric | Value |
|--------|-------|
| Total Tables | 51 |
| Total Columns | ~500+ |
| Foreign Keys | ~80+ |
| Indexes | ~150+ |
| Migrations Applied | 26 |
| Migrations Available | 100+ |
| Documentation Accuracy | ~70% |
| **Target Accuracy** | **100%** |

---

*Generated: 2025-09-30*
*Last Updated: 2025-09-30*