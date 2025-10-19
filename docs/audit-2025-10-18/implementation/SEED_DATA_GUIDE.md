# Seed Data Guide

**Date**: 2025-10-18
**Branch**: `feat/cerbos-only-migration`
**Database**: sports_management (PostgreSQL)

---

## Overview

This guide documents the consolidated, production-ready seed file strategy for the Sports Management application. The seed files are designed to be:

1. **Idempotent** - Can be run multiple times safely (where possible)
2. **Ordered** - Clear execution sequence prevents foreign key violations
3. **Documented** - Each file has clear purpose and usage notes
4. **Modular** - Reference data separate from test/sample data

---

## Seed File Structure

### Location

All new consolidated seed files are located in:
```
backend/seeds/data/
```

Old seed files have been archived to:
```
backend/seeds/_archive/
```

### File Naming Convention

Seeds follow a strict numeric prefix for execution order:
- `001_` - Critical reference data (MUST run first)
- `002_` - Test users (optional, for development)
- `003_` - Sample locations (optional, for development)
- `004_` - Sample game data (optional, for development)

---

## Seed File Execution Order

### CRITICAL: 001_reference_data.js ⚠️

**Purpose**: Seeds core reference data required for the application to function

**Status**: **REQUIRED** - Must always run on new databases

**Seeds**:
- ✅ **Roles** (6 system roles):
  - Super Admin
  - Admin
  - Assignment Manager
  - Referee Coordinator
  - Senior Referee
  - Junior Referee

- ✅ **Permissions** (43 permissions across categories):
  - Games (5 permissions)
  - Assignments (6 permissions)
  - Referees (4 permissions)
  - Reports (4 permissions)
  - Settings (3 permissions)
  - Roles (3 permissions)
  - Users (5 permissions)
  - Finance (4 permissions)
  - Communication (3 permissions)
  - Content (5 permissions)

- ✅ **Role-Permission Mappings** (automatically assigned)

- ✅ **Referee Levels** (6 CMBA levels):
  - Learning ($25/game)
  - Learning+ ($30/game)
  - Growing ($35/game)
  - Growing+ ($40/game)
  - Teaching ($45/game)
  - Expert ($50/game)

**Idempotency**: ✅ Yes - Clears and re-inserts data

**Run Command**:
```bash
# Run only this seed
npx knex seed:run --specific=data/001_reference_data.js
```

---

### OPTIONAL: 002_test_users.js

**Purpose**: Create test user accounts for each role type to enable development and testing

**Status**: **OPTIONAL** - For development/testing environments only

**Seeds**: 6 test users (one per role)

**Idempotency**: ✅ Yes - Checks if users exist before creating

**Test User Accounts**:

| Email | Password | Role | Is Referee |
|-------|----------|------|------------|
| `admin@sportsmanager.com` | `admin123` | Super Admin | No |
| `admin@cmba.ca` | `admin123` | Admin | No |
| `assignor@cmba.ca` | `admin123` | Assignment Manager | No |
| `coordinator@cmba.ca` | `admin123` | Referee Coordinator | No |
| `senior.ref@cmba.ca` | `referee123` | Senior Referee | Yes (Teaching level) |
| `referee@test.com` | `referee123` | Junior Referee | Yes (Growing level) |

**Features**:
- All users have complete profile information
- Referee users have `referee_profiles` records
- Users are assigned to appropriate roles via `user_roles` table
- Passwords are bcrypt hashed (saltRounds = 10 for development)

**Run Command**:
```bash
npx knex seed:run --specific=data/002_test_users.js
```

---

### OPTIONAL: 003_sample_locations.js

**Purpose**: Create sample sports venues/facilities for game assignments

**Status**: **OPTIONAL** - For development/testing environments only

**Seeds**: 10 realistic Calgary-area facilities

**Locations Included**:
1. Genesis Centre (Calgary)
2. Repsol Sport Centre (Calgary)
3. MNP Community Centre (Calgary)
4. Westside Recreation Centre (Calgary)
5. Cardel Rec South (Calgary)
6. Vivo Recreation Centre (Calgary)
7. Shouldice Athletic Park (Calgary)
8. Airdrie Recreation Centre (Airdrie)
9. Okotoks Recreation Centre (Okotoks)
10. Cochrane Spray Lake Sawmills Arena (Cochrane)

**Location Data Includes**:
- Complete address information (street, city, province, postal code)
- Latitude/longitude coordinates
- Capacity
- Contact information (name, phone, email)
- Hourly and game rates
- Parking spaces
- Facilities (JSON: arenas, dressing rooms, concession, pro shop)
- Accessibility features (JSON: wheelchair accessible, parking, elevator)
- Notes

**Idempotency**: ⚠️ Partial - Clears existing locations

**Note**: For a comprehensive CMBA location list (113 locations), see:
```
backend/seeds/_archive/001_locations.js
```

**Run Command**:
```bash
npx knex seed:run --specific=data/003_sample_locations.js
```

---

### OPTIONAL: 004_sample_data.js

**Purpose**: Create sample leagues, teams, and games for development and testing

**Status**: **OPTIONAL** - For development/testing environments only

**Prerequisites**: Requires `003_sample_locations.js` to be run first

**Seeds**:
- ✅ **6 Leagues**:
  - CMBA U18 Boys Division 1 (Competitive)
  - CMBA U18 Girls Division 1 (Competitive)
  - CMBA U16 Boys Division 1 (Competitive)
  - CMBA U16 Girls Division 1 (Recreational)
  - CMBA U14 Boys Division 1 (Recreational)
  - CMBA U14 Girls Division 1 (Recreational)

- ✅ **36 Teams** (6 teams per league):
  - Calgary North Warriors
  - Calgary South Eagles
  - Calgary East Thunder
  - Calgary West Storm
  - Airdrie Knights
  - Okotoks Titans
  - (Plus Phoenix and Dragons variations)

- ✅ **~270 Games** (round-robin schedule):
  - Each team plays every other team in their league twice (home/away)
  - Season: 2024-25
  - Date range: February 1 - April 2025
  - Game times: 6:00 PM and 7:30 PM
  - Locations: Rotates through seeded venues
  - Status: unassigned (ready for referee assignment)
  - Pay rate: $45/game
  - Refs needed: 2 per game

**Idempotency**: ⚠️ No - Clears and re-inserts all game data

**Run Command**:
```bash
npx knex seed:run --specific=data/004_sample_data.js
```

---

## Running Seeds

### Run All Seeds (Recommended for Fresh Database)

```bash
# After running migrations
npm run migrate:latest

# Run all seeds in order
npm run seed:run
```

This will execute seeds in alphabetical/numeric order:
1. `001_reference_data.js`
2. `002_test_users.js`
3. `003_sample_locations.js`
4. `004_sample_data.js`

### Run Specific Seeds

```bash
# Run only reference data (required)
npx knex seed:run --specific=data/001_reference_data.js

# Run only test users
npx knex seed:run --specific=data/002_test_users.js

# Run only locations
npx knex seed:run --specific=data/003_sample_locations.js

# Run only game data
npx knex seed:run --specific=data/004_sample_data.js
```

### Reset and Reseed Database

```bash
# Rollback all migrations
npm run migrate:rollback:all

# Run migrations
npm run migrate:latest

# Run all seeds
npm run seed:run
```

---

## Database State After Seeding

### After Running ALL Seeds

**Reference Data**:
- ✅ 6 roles created
- ✅ 43 permissions created
- ✅ 6 referee levels created
- ✅ Role-permission mappings complete

**Test Data**:
- ✅ 6 test users created
- ✅ 2 referee profiles created
- ✅ 10 locations created
- ✅ 6 leagues created
- ✅ 36 teams created
- ✅ ~270 games created

**Ready for**:
- ✅ User authentication (6 test accounts)
- ✅ RBAC testing (all roles represented)
- ✅ Game assignment workflow
- ✅ Referee management
- ✅ Frontend development

---

## Reference Data Details

### Roles and Permissions

#### Super Admin
**Code**: `SUPER_ADMIN`
**Category**: system
**Permissions**: ALL (43 permissions)
**Description**: Full system access. Can manage other admins and system settings.

#### Admin
**Code**: `ADMIN`
**Category**: system
**Permissions**: 32 permissions (all except roles:*, users:impersonate)
**Description**: Administrative access to most functions. Cannot manage roles or impersonate users.

#### Assignment Manager
**Code**: `ASSIGNMENT_MANAGER`
**Category**: operational
**Permissions**: 13 permissions (games:read, assignments:*, referees:read/update, reports:read/create, communication:send)
**Description**: Manages game assignments and referee scheduling.

#### Referee Coordinator
**Code**: `REFEREE_COORDINATOR`
**Category**: operational
**Permissions**: 13 permissions (games:read, assignments:read, referees:*, reports:read/create, communication:*, content:read/create/update)
**Description**: Coordinates referee activities, evaluations, and development.

#### Senior Referee
**Code**: `SENIOR_REFEREE`
**Category**: referee_type
**Permissions**: 6 permissions (games:read, assignments:read, referees:read/evaluate, reports:read, content:read)
**Description**: Experienced referee. Can evaluate other referees.
**Referee Config**: `{ level: "Senior", can_evaluate: true, min_experience_years: 5 }`

#### Junior Referee
**Code**: `JUNIOR_REFEREE`
**Category**: referee_type
**Permissions**: 4 permissions (games:read, assignments:read, referees:read, content:read)
**Description**: Basic referee role.
**Referee Config**: `{ level: "Junior", can_evaluate: false }`

### Referee Levels (CMBA System)

| Level | Wage | Min Years | Min Games/Season | Description |
|-------|------|-----------|------------------|-------------|
| Learning | $25 | 0 | 0 | Rookies with no experience. White whistle. |
| Learning+ | $30 | 1 | 20 | 2nd year officials showing progression. White/black whistle. |
| Growing | $35 | 2 | 30 | 3rd/4th year officials. 2nd Year Clinic. Black whistle. |
| Growing+ | $40 | 3 | 40 | 3rd/4th Year Clinic attendees. Moving to higher divisions. |
| Teaching | $45 | 5 | 50 | Senior officials. Committee approval required. |
| Expert | $50 | 7 | 60 | Strongest senior officials. Exec director approval required. |

---

## Test User Authentication

### Login Credentials

After running `002_test_users.js`, you can log in with these accounts:

#### Administrative Accounts
```
Email: admin@sportsmanager.com
Password: admin123
Role: Super Admin
Access: Full system access
```

```
Email: admin@cmba.ca
Password: admin123
Role: Admin
Access: Most administrative functions
```

```
Email: assignor@cmba.ca
Password: admin123
Role: Assignment Manager
Access: Game assignments and referee scheduling
```

```
Email: coordinator@cmba.ca
Password: admin123
Role: Referee Coordinator
Access: Referee management and evaluations
```

#### Referee Accounts
```
Email: senior.ref@cmba.ca
Password: referee123
Role: Senior Referee
Level: Teaching ($45/game)
Access: Can evaluate other referees
```

```
Email: referee@test.com
Password: referee123
Role: Junior Referee
Level: Growing ($35/game)
Access: Basic referee functions
```

---

## Troubleshooting

### Issue: Foreign Key Violations

**Cause**: Seeds running out of order

**Solution**: Ensure seeds run in numeric order (001, 002, 003, 004)
```bash
# Clear and restart
npm run migrate:rollback:all
npm run migrate:latest
npm run seed:run
```

### Issue: Duplicate Key Errors

**Cause**: Attempting to re-run non-idempotent seeds

**Solution**: Seeds 001 and 002 are idempotent. Seeds 003 and 004 clear data first.
```bash
# For 003 and 004, they will clear existing data
npx knex seed:run --specific=data/003_sample_locations.js
npx knex seed:run --specific=data/004_sample_data.js
```

### Issue: Cannot Log In with Test Users

**Cause**: Seeds not run or users not created

**Solution**:
```bash
# Verify users exist
psql -d sports_management -c "SELECT email, name FROM users;"

# Verify roles assigned
psql -d sports_management -c "SELECT u.email, r.name FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id;"

# Re-run user seed if needed
npx knex seed:run --specific=data/002_test_users.js
```

### Issue: Games Not Showing Up

**Cause**: Locations seed not run before games seed

**Solution**:
```bash
# Run in correct order
npx knex seed:run --specific=data/003_sample_locations.js
npx knex seed:run --specific=data/004_sample_data.js
```

---

## Verification Commands

### Verify Reference Data

```bash
# Check roles
PGPASSWORD=postgres123 psql -U postgres -d sports_management -c "SELECT name, code, category FROM roles ORDER BY name;"

# Check permissions count
PGPASSWORD=postgres123 psql -U postgres -d sports_management -c "SELECT COUNT(*) as total_permissions FROM permissions;"

# Check referee levels
PGPASSWORD=postgres123 psql -U postgres -d sports_management -c "SELECT name, wage_amount FROM referee_levels ORDER BY wage_amount;"
```

### Verify Test Users

```bash
# Check users
PGPASSWORD=postgres123 psql -U postgres -d sports_management -c "SELECT email, name, is_referee FROM users ORDER BY email;"

# Check user roles
PGPASSWORD=postgres123 psql -U postgres -d sports_management -c "SELECT u.email, r.name as role FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id ORDER BY u.email;"

# Check referee profiles
PGPASSWORD=postgres123 psql -U postgres -d sports_management -c "SELECT u.email, rp.wage_amount, rp.certification_level FROM users u JOIN referee_profiles rp ON u.id = rp.user_id ORDER BY u.email;"
```

### Verify Sample Data

```bash
# Check locations
PGPASSWORD=postgres123 psql -U postgres -d sports_management -c "SELECT COUNT(*) as total_locations FROM locations;"

# Check leagues, teams, games
PGPASSWORD=postgres123 psql -U postgres -d sports_management -c "SELECT
  (SELECT COUNT(*) FROM leagues) as leagues,
  (SELECT COUNT(*) FROM teams) as teams,
  (SELECT COUNT(*) FROM games) as games;"

# Check game details
PGPASSWORD=postgres123 psql -U postgres -d sports_management -c "SELECT game_date, game_time, location, status FROM games LIMIT 10;"
```

---

## Maintenance

### Archived Seeds

Old seed files have been moved to `backend/seeds/_archive/` for reference:
- These files are NOT executed by `npm run seed:run`
- They are kept for historical reference
- See `SEED_FILE_ANALYSIS.md` for details on what each archived file did

### Adding New Seeds

When adding new seed files:
1. Use numeric prefix (005_, 006_, etc.)
2. Place in `backend/seeds/data/` directory
3. Document in this guide
4. Consider idempotency
5. Check foreign key dependencies

### Updating Reference Data

To update roles or permissions:
1. Edit `backend/seeds/data/001_reference_data.js`
2. Re-run the seed:
   ```bash
   npx knex seed:run --specific=data/001_reference_data.js
   ```
3. Note: This will CLEAR and RE-INSERT all RBAC data

---

## Production Considerations

### DO NOT RUN in Production

The following seeds should **NEVER** be run in production:
- ❌ `002_test_users.js` - Contains insecure test passwords
- ❌ `003_sample_locations.js` - Clears real location data
- ❌ `004_sample_data.js` - Clears real game data

### Production Seeds

For production deployments:
- ✅ `001_reference_data.js` - Safe to run on initial deployment
- ✅ Create production-specific user seed with secure passwords
- ✅ Import real location data (not sample data)
- ✅ Never seed game data in production

---

## Summary

### Quick Start (Development)

```bash
# Fresh database setup
npm run migrate:latest
npm run seed:run

# Log in with any test user
# Email: admin@sportsmanager.com
# Password: admin123
```

### Files Created

| File | Purpose | Required | Idempotent |
|------|---------|----------|------------|
| `001_reference_data.js` | Roles, permissions, referee levels | ✅ Yes | ✅ Yes |
| `002_test_users.js` | Test user accounts | ⚠️ Dev only | ✅ Yes |
| `003_sample_locations.js` | Sample venues | ⚠️ Dev only | ⚠️ Partial |
| `004_sample_data.js` | Sample games | ⚠️ Dev only | ❌ No |

### Data Counts After Full Seed

- 6 roles
- 43 permissions
- 6 referee levels
- 6 test users
- 2 referee profiles
- 10 locations
- 6 leagues
- 36 teams
- ~270 games

---

## Questions?

For issues or questions about seed data:
1. Check `SEED_FILE_ANALYSIS.md` for historical context
2. Review individual seed files for inline documentation
3. Verify database schema matches expected structure
4. Check migrations are up to date

---

**Last Updated**: 2025-10-18
**Maintained By**: Development Team
**Documentation**: `SEED_FILE_ANALYSIS.md`, `SEED_DATA_GUIDE.md`
