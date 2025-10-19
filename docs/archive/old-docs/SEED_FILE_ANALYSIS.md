# Seed File Analysis

**Date**: 2025-10-18
**Branch**: `feat/cerbos-only-migration`
**Database**: sports_management (PostgreSQL)

---

## Executive Summary

The current seed file structure has **28 seed files** with significant conflicts, duplications, and ordering issues. The files attempt to seed data multiple times with different approaches, causing:

1. **Data conflicts** - Multiple files clearing and re-inserting the same tables
2. **Foreign key violations** - Incorrect execution order
3. **Duplicate data** - Same records inserted multiple times with different values
4. **Inconsistent approaches** - Some files use modern RBAC, others use legacy `role` column
5. **Unclear execution order** - Files numbered inconsistently (001, 002, 003, 004, 005, 007, 008, 009, 010, 011, 014, 015, 016, 020, 021, 022, 990)

---

## Current Seed Files Inventory

### Files Found (28 total)

| File | Purpose | Status | Issues |
|------|---------|--------|--------|
| `001_full_database.js` | CONFLICT - Cannot read | ❌ | File read error - likely large/corrupt |
| `001_locations.js` | Seeds 113 CMBA locations | ✅ | **CONFLICT**: Duplicate with `001_seed_locations.js` |
| `001_positions.js` | Seeds job positions | ⚠️ | Unknown - not analyzed |
| `001_seed_locations.js` | Seeds 10 generic locations | ✅ | **CONFLICT**: Duplicate with `001_locations.js` |
| `002_users.js` | Seeds 25 referee users (legacy) | ⚠️ | Uses old schema with `role` column, conflicts with demo_users.js |
| `003_games.js` | Seeds games | ⚠️ | Unknown - likely conflicts with 990_minimal_games.js |
| `003_referee_levels.js` | Seeds 6 referee levels | ✅ | Good - comprehensive CMBA levels |
| `004_referee_availability.js` | Seeds referee availability | ⚠️ | Unknown - may not match user seeds |
| `004_sample_games_with_multipliers.js` | Seeds games with multipliers | ⚠️ | Likely duplicate of 003_games.js or 990_minimal_games.js |
| `005_additional_referees.js` | Seeds more referees | ⚠️ | Likely conflicts with 002_users.js |
| `007_team_structure_data.js` | Seeds team data | ⚠️ | Unknown structure |
| `008_leagues_and_teams.js` | Seeds leagues/teams | ⚠️ | **CONFLICT**: Likely duplicates 990_minimal_games.js |
| `009_cmba_full_season.js` | Seeds full CMBA season | ⚠️ | **CONFLICT**: Likely duplicates other game seeds |
| `010_cmba_full_season_comprehensive.js` | Comprehensive season seed | ⚠️ | **CONFLICT**: Duplicate of 009 |
| `011_enhanced_referee_data.js` | Enhanced referee data | ⚠️ | Likely conflicts with user seeds |
| `014_expense_categories.js` | Seeds expense categories | ⚠️ | Unknown - may be needed |
| `015_financial_management_seed.js` | Seeds financial data | ⚠️ | Unknown - may be needed |
| `016_rbac_system_seed.js` | **Seeds RBAC roles/permissions** | ✅ | **CRITICAL** - Must run first |
| `020_comprehensive_games_season.js` | Comprehensive game season | ⚠️ | **CONFLICT**: Duplicate game data |
| `021_simple_games_seed.js` | Simple games seed | ⚠️ | **CONFLICT**: Duplicate game data |
| `022_resource_centre_seed.js` | Resource center data | ⚠️ | Unknown - may be needed |
| `04_seed_access_control.js` | Seeds access control | ⚠️ | Unknown - may conflict with 016_rbac |
| `05_assign_user_roles.js` | Assigns roles to users | ⚠️ | Unknown - execution order critical |
| `990_minimal_games.js` | **Minimal game seed** | ✅ | Clean, simple approach |
| `budget_system_seed.js` | Budget system data | ⚠️ | Unknown - may be needed |
| `comprehensive_demo_users.js` | Comprehensive demo users | ⚠️ | **CONFLICT**: Duplicates demo_users.js |
| `demo_users.js` | **3 test users with RBAC** | ✅ | Good - uses modern RBAC |
| `enhanced_demo_users.js` | Enhanced demo users | ⚠️ | **CONFLICT**: Duplicates demo_users.js |

---

## Key Conflicts Identified

### 1. **Location Data Conflicts**
- `001_locations.js` - 113 CMBA-specific locations (comprehensive)
- `001_seed_locations.js` - 10 generic Calgary locations
- **Issue**: Both files clear the `locations` table and insert different datasets

### 2. **User/Referee Data Conflicts**
- `002_users.js` - 25 referees using **legacy** `role` column
- `demo_users.js` - 3 users using **modern RBAC** with `user_roles` table
- `comprehensive_demo_users.js` - Unknown user count
- `enhanced_demo_users.js` - Unknown user count
- `005_additional_referees.js` - More referees
- `011_enhanced_referee_data.js` - Enhanced referee data
- **Issue**: Multiple approaches to user creation; legacy vs RBAC conflict

### 3. **Game Data Conflicts**
- `003_games.js` - Games seed
- `004_sample_games_with_multipliers.js` - Games with wage multipliers
- `008_leagues_and_teams.js` - Leagues + teams + games
- `009_cmba_full_season.js` - Full CMBA season
- `010_cmba_full_season_comprehensive.js` - Comprehensive season
- `020_comprehensive_games_season.js` - Another comprehensive season
- `021_simple_games_seed.js` - Simple games
- `990_minimal_games.js` - Minimal games (6 leagues, 36 teams, ~270 games)
- **Issue**: All files clear and re-insert leagues, teams, and games

### 4. **RBAC/Permissions Conflicts**
- `016_rbac_system_seed.js` - Creates roles and permissions (system roles)
- `04_seed_access_control.js` - Unknown access control seeding
- `05_assign_user_roles.js` - Assigns roles to users
- **Issue**: Execution order critical; unclear dependencies

### 5. **Schema Migration Issues**
The database schema has evolved:
- **Legacy approach**: Users have a `role` column (text)
- **Modern approach**: Users have roles via `user_roles` join table
- **Current schema**: Has BOTH `users.role` column (removed from schema) AND `user_roles` table

### 6. **Deleted Seed File**
- `000_initial_setup.js` - DELETED (shown in git status)
- **Issue**: Unknown what this file did; may have been initialization

---

## Database Schema Analysis

### Core Tables (Related to Seeds)

#### Users Table
- Has `password_hash`, `email`, `name`, `phone`, `postal_code`
- Has `referee_level_id` (FK to `referee_levels`)
- Has `is_available`, `wage_per_game`, `years_experience`
- **NO `role` column** (legacy code references it, but doesn't exist in current schema)
- Connected to `referee_profiles` table via FK

#### Roles Table
- Modern RBAC structure
- Has `id` (UUID), `name`, `description`, `code`
- Has `category` (for grouping roles)
- Has `referee_config` (JSONB for referee-specific configuration)
- Has `is_system`, `is_active`, `color`

#### User_Roles Table
- Join table: `user_id` + `role_id`
- Has `assigned_by`, `assigned_at`
- Supports many-to-many user-role relationships

#### Referee_Levels Table
- Stores referee level definitions
- Seeded by `003_referee_levels.js`
- 6 levels: Learning, Learning+, Growing, Growing+, Teaching, Expert

#### Referee_Profiles Table
- Separate profile table for referee-specific data
- FK to `users.id`
- Has `wage_amount`, `payment_method`, `years_experience`, `certification_level`

#### Locations Table
- Has `name`, `address`, `city`, `province`, `postal_code`, `country`
- Has `latitude`, `longitude`, `capacity`
- Has `facilities` (JSONB), `accessibility_features` (JSONB)
- Has `hourly_rate`, `game_rate`, `parking_spaces`

#### Games Table
- Has `home_team_id`, `away_team_id`, `league_id`
- Has `game_date`, `game_time`, `location`, `postal_code`
- Has `level`, `pay_rate`, `refs_needed`, `status`
- Has `wage_multiplier`, `game_type`

---

## Root Causes

### 1. **Iterative Development Without Cleanup**
Files were created iteratively as features were added, but old seeds weren't removed.

### 2. **Schema Evolution**
The application migrated from:
- Simple role column → RBAC system
- This left orphaned seed files using the old approach

### 3. **No Seed Strategy**
No clear documentation on:
- Which seeds to run
- In what order
- Which are obsolete

### 4. **Testing/Development Seeds Mixed**
Some seeds are for:
- Reference data (roles, permissions, levels) → **Required**
- Test data (sample users, games) → **Optional**
- Development data (full seasons) → **Optional**

---

## Resolution Strategy

### Goal
Create **4 consolidated, idempotent seed files** that:
1. Can be run multiple times safely
2. Have clear, logical execution order
3. Support both minimal and full data seeding
4. Use modern RBAC approach
5. Match current database schema

### Proposed Seed Files

#### `001_reference_data.js` (CRITICAL - Always run)
**Purpose**: Core reference data required for application to function

**Seeds**:
- Roles (Super Admin, Admin, Assignment Manager, Referee Coordinator, Senior Referee, Referee)
- Permissions (games:*, assignments:*, referees:*, reports:*, etc.)
- Role-Permission mappings
- Referee levels (Learning, Learning+, Growing, Growing+, Teaching, Expert)
- Expense categories (if needed)

**Idempotency**: Use `ON CONFLICT DO NOTHING` or check existence before insert

#### `002_test_users.js` (OPTIONAL - For development/testing)
**Purpose**: Create test user accounts for each role type

**Seeds**:
- Super Admin user (`admin@sportsmanager.com`)
- Admin user (`admin@cmba.ca`)
- Assignment Manager user (`assignor@cmba.ca`)
- Referee Coordinator user (`coordinator@cmba.ca`)
- Senior Referee user (`senior.ref@cmba.ca`)
- Junior Referee user (`referee@test.com`)

**Idempotency**: Check if user exists by email before insert

#### `003_sample_locations.js` (OPTIONAL - For development/testing)
**Purpose**: Create sample venues for game assignment

**Options**:
- **Minimal**: 10 generic Calgary locations
- **Full**: 113 CMBA-specific locations

**Decision**: Use 113 CMBA locations (more realistic)

**Idempotency**: Clear and re-insert, or use `ON CONFLICT DO NOTHING`

#### `004_sample_data.js` (OPTIONAL - For development/testing)
**Purpose**: Create sample leagues, teams, and games for testing

**Seeds**:
- 6 leagues (U14, U16, U18 Boys/Girls)
- 36 teams (6 per league)
- ~270 games (round-robin schedule)

**Idempotency**: Clear and re-insert game data only

---

## Implementation Plan

### Phase 1: Create New Consolidated Seeds
1. Create `001_reference_data.js` from `016_rbac_system_seed.js` + `003_referee_levels.js`
2. Create `002_test_users.js` from `demo_users.js` (modernized)
3. Create `003_sample_locations.js` from `001_locations.js` (113 CMBA locations)
4. Create `004_sample_data.js` from `990_minimal_games.js`

### Phase 2: Archive Old Seeds
Move old seeds to `backend/seeds/_archive/` folder:
- Keep them for reference
- Prevent accidental execution
- Document what each did

### Phase 3: Test Execution
```bash
# Clear database
npm run migrate:rollback:all

# Run migrations
npm run migrate:latest

# Run seeds
npm run seed:run

# Verify data
npm run verify:seeds (create this script)
```

### Phase 4: Document
Create `SEED_DATA_GUIDE.md` with:
- What each seed does
- When to run each seed
- Test user credentials
- How to reset database

---

## Specific Technical Issues

### Issue 1: Legacy `role` Column
**Problem**: `002_users.js` tries to insert `role: 'admin'` or `role: 'referee'`
**Current Schema**: Users table has NO `role` column
**Solution**: Use `user_roles` table instead

### Issue 2: Missing Permissions Table
**Problem**: Some seeds may reference `permissions` table
**Current Schema**: Table exists with proper structure
**Solution**: Ensure permissions are seeded first

### Issue 3: Foreign Key Violations
**Problem**: Seed order causes FK violations (e.g., users before roles)
**Solution**: Strict ordering:
1. Reference data (roles, permissions, levels)
2. Users
3. User-role assignments
4. Locations
5. Leagues, teams, games

### Issue 4: Duplicate Location Data
**Problem**: Two files seed completely different location sets
**Solution**: Choose ONE source of truth (113 CMBA locations)

### Issue 5: Password Hashing Performance
**Problem**: `bcrypt.hash()` with `saltRounds = 12` is slow for many users
**Solution**:
- For development seeds, use lower saltRounds (10)
- Or pre-hash passwords and store the hash

---

## Test User Credentials (Proposed)

After running consolidated seeds:

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| admin@sportsmanager.com | admin123 | Super Admin | Full system access |
| admin@cmba.ca | admin123 | Admin | Administrative access |
| assignor@cmba.ca | admin123 | Assignment Manager | Game assignment management |
| coordinator@cmba.ca | admin123 | Referee Coordinator | Referee management |
| senior.ref@cmba.ca | referee123 | Senior Referee | Experienced referee |
| referee@test.com | referee123 | Referee | Basic referee |

---

## Success Criteria

Seeds are successful when:

1. ✅ Can run `npm run seed:run` multiple times without errors
2. ✅ All test users can log in with documented credentials
3. ✅ Each user has correct role and permissions
4. ✅ Sample data (locations, games) is present
5. ✅ No foreign key violations
6. ✅ Execution completes in < 30 seconds
7. ✅ Clear documentation of what was seeded

---

## Next Steps

1. ✅ Create consolidated seed files (4 files)
2. ✅ Move old seeds to `_archive/` folder
3. ✅ Test seed execution on clean database
4. ✅ Document in `SEED_DATA_GUIDE.md`
5. ✅ Update `package.json` scripts if needed
6. ✅ Verify all test users can authenticate
7. ✅ Verify Cerbos policies work with seeded roles

---

## Files to Archive

Move to `backend/seeds/_archive/`:

- `000_initial_setup.js` (already deleted)
- `001_full_database.js`
- `001_positions.js`
- `002_users.js`
- `003_games.js`
- `004_referee_availability.js`
- `004_sample_games_with_multipliers.js`
- `005_additional_referees.js`
- `007_team_structure_data.js`
- `008_leagues_and_teams.js`
- `009_cmba_full_season.js`
- `010_cmba_full_season_comprehensive.js`
- `011_enhanced_referee_data.js`
- `014_expense_categories.js`
- `015_financial_management_seed.js`
- `020_comprehensive_games_season.js`
- `021_simple_games_seed.js`
- `022_resource_centre_seed.js`
- `04_seed_access_control.js`
- `05_assign_user_roles.js`
- `budget_system_seed.js`
- `comprehensive_demo_users.js`
- `enhanced_demo_users.js`

**Keep these as source material**:
- `016_rbac_system_seed.js` → Use for 001_reference_data.js
- `003_referee_levels.js` → Use for 001_reference_data.js
- `demo_users.js` → Use for 002_test_users.js
- `001_locations.js` → Use for 003_sample_locations.js
- `990_minimal_games.js` → Use for 004_sample_data.js

---

## Notes

- The application has moved to a full RBAC system - all seeds must use it
- Cerbos policies require specific role names and structures
- Some financial features may require `014_expense_categories.js` data
- Resource center may require `022_resource_centre_seed.js` data
- Consider creating `005_optional_features.js` for expense categories, resources, etc.
