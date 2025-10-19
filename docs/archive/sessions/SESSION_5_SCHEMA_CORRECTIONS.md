# Schema Corrections for Session 5 (Seed Files)

**Generated**: 2025-10-18
**Purpose**: Provide complete schema corrections to Session 5 for fixing seed files
**Source**: Direct database query + IMPLEMENTATION_GAPS_DATABASE.md

---

## Critical Corrections Needed

### 1. Users Table - Column Name Correction

**ISSUE**: `002_test_users.js` references `is_active` column that doesn't exist

**CORRECT COLUMN**: `availability_status`

**Database Schema**:
```sql
availability_status TEXT DEFAULT 'active'

-- Check constraint:
CHECK (availability_status = ANY (ARRAY['active'::text, 'inactive'::text, 'on_break'::text]))
```

**Required Change in 002_test_users.js**:
```javascript
// ❌ WRONG:
is_active: true

// ✅ CORRECT:
availability_status: 'active'
```

**Valid Values**:
- `'active'` - User is available for assignments
- `'inactive'` - User is not available
- `'on_break'` - User is temporarily unavailable

---

## Complete Users Table Schema Reference

For reference when creating seed data, here are all columns in the `users` table:

### Core Identity Fields:
```javascript
{
  id: 'uuid',                    // Auto-generated
  email: 'string',               // Required, unique
  password_hash: 'string',       // Required (use bcrypt)
  name: 'string',                // Optional
  first_name: 'string',          // Optional
  last_name: 'string',           // Optional
}
```

### Contact Information:
```javascript
{
  phone: 'string',
  street_address: 'string',
  city: 'string',
  province_state: 'string',
  postal_code: 'string',
  postal_zip_code: 'string',
  location: 'string',
  country: 'string',
}
```

### Emergency Contact:
```javascript
{
  emergency_contact_name: 'string',
  emergency_contact_phone: 'string',
}
```

### Referee-Specific Fields:
```javascript
{
  is_referee: false,                    // Boolean
  referee_level_id: 'uuid',             // FK to referee_levels
  new_referee_level: 'Rookie|Junior|Senior',
  years_experience: 0,                  // Integer
  games_refereed_season: 0,             // Integer
  evaluation_score: 0.00,               // Decimal(4,2)
  wage_per_game: 0.00,                  // Decimal(8,2)
  year_started_refereeing: 2025,        // Integer
  certifications: {},                   // JSON
  specializations: {},                  // JSON
  is_white_whistle: false,              // Boolean
}
```

### Availability & Status:
```javascript
{
  availability_status: 'active',        // 'active' | 'inactive' | 'on_break'
  is_available: true,                   // Boolean (different from availability_status!)
  max_distance: 25,                     // Integer (km)
}
```

### Administrative:
```javascript
{
  roles: [],                            // Text array
  notes: 'string',                      // Text
  admin_notes: 'string',                // Text
  organization_id: '1',                 // String default
}
```

### Profile & Preferences:
```javascript
{
  date_of_birth: '1990-01-01',         // Date
  profile_photo_url: 'string',
  communication_preferences: {},        // JSON
  banking_info: {},                     // JSON
  profile_completion_percentage: 0,     // Integer
}
```

### Timestamps:
```javascript
{
  created_at: 'timestamp',              // Auto
  updated_at: 'timestamp',              // Auto
  registration_date: 'date',            // Auto (CURRENT_TIMESTAMP)
  last_login: 'timestamp',              // Nullable
}
```

---

## Other Seed File Checks

### 003_sample_locations.js
**Status**: Likely OK - verify these columns exist in `locations` table:
- `name` ✅
- `city` ✅
- `address` ✅
- `capacity` ✅
- `surface_type` ✅

**Action**: Session 5 should verify against actual locations table schema

### 004_sample_data.js
**Status**: Needs verification for:
- `leagues` table schema
- `teams` table schema
- `games` table schema

**Action**: Session 5 should verify all column references match actual database

---

## Recommended Approach for Session 5

1. **Fix 002_test_users.js immediately**:
   - Change `is_active: true` to `availability_status: 'active'`
   - Remove any other non-existent column references

2. **Verify 001_reference_data.js** (probably already correct):
   - Check `roles` table columns
   - Check `referee_levels` table columns

3. **Verify 003_sample_locations.js**:
   - Query `locations` table schema from database
   - Ensure all column names match

4. **Verify 004_sample_data.js**:
   - Query `leagues`, `teams`, `games` table schemas
   - Ensure all column names and FK references are correct

5. **Test each seed file individually**:
   ```bash
   npx knex seed:run --specific=001_reference_data.js
   npx knex seed:run --specific=002_test_users.js
   npx knex seed:run --specific=003_sample_locations.js
   npx knex seed:run --specific=004_sample_data.js
   ```

---

## Missing Tables Alert

**Note from IMPLEMENTATION_GAPS_DATABASE.md**: The following tables DO NOT EXIST yet in the database. Session 5 should NOT create seeds for these until migrations are run:

### Mentorship System (8 tables) - ❌ DO NOT SEED YET:
- `mentees`
- `mentors`
- `mentorship_assignments`
- `mentee_profiles`
- `mentee_notes`
- `mentee_documents`
- `mentorship_goals`
- `mentorship_sessions`

### RBAC Registry (3 tables) - ❌ DO NOT SEED YET:
- `rbac_registry_pages`
- `rbac_registry_stats`
- (rbac_pages exists but different structure)

### Compliance (1 table) - ❌ DO NOT SEED YET:
- `compliance_items`

**Action**: Session 5 should focus ONLY on seeding tables that currently exist in the database (116 tables documented in DATABASE_SCHEMA_COMPLETE.md).

---

## Summary for Session 5

**Primary Issue**: `is_active` → `availability_status`

**Required Fix**: Update `002_test_users.js` to use correct column name and valid values ('active', 'inactive', 'on_break')

**Secondary Tasks**:
1. Verify all 4 seed files against actual database schema
2. Fix any other column name mismatches
3. Ensure FK references are valid
4. Test each seed file runs successfully
5. Update SEED_DATA_GUIDE.md with any corrections made

**Do NOT**:
- Create seeds for tables that don't exist yet (mentees, mentors, compliance_items, etc.)
- Those will be added AFTER migrations create the missing tables

---

**Ready for Session 5 to resume and complete seed file corrections!** ✅
