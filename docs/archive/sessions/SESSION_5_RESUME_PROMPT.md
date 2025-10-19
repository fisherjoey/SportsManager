# Session 5 Resume Instructions

**Context**: Session 5 was paused after discovering schema mismatches (specifically `is_active` vs `availability_status` in the users table)

**Status**: Schema corrections have been identified and documented

**Action Required**: Resume Session 5 and provide the corrections

---

## Copy-Paste Prompt for Session 5

```
You discovered that the users table doesn't have an is_active column - it has availability_status instead.

I've now completed a full database schema analysis. Here are the complete corrections you need:

CRITICAL FIX:
- Column name: is_active → availability_status
- Valid values: 'active', 'inactive', 'on_break' (NOT boolean true/false)
- This affects 002_test_users.js

COMPLETE SCHEMA REFERENCE:
I've created SESSION_5_SCHEMA_CORRECTIONS.md with:
1. Complete users table schema (all 43 columns documented)
2. Correct column names and data types
3. Valid values for enum fields
4. What tables DON'T exist yet (mentees, mentors, etc.) - don't seed those

TASKS:
1. Fix 002_test_users.js:
   - Change is_active: true → availability_status: 'active'
   - Verify all other column names match actual schema

2. Verify 001_reference_data.js against actual schema (probably fine)

3. Verify 003_sample_locations.js:
   - Check locations table schema
   - Ensure all columns exist

4. Verify 004_sample_data.js:
   - Check leagues, teams, games table schemas
   - Ensure all FK references are valid

5. Test each seed individually:
   npx knex seed:run --specific=001_reference_data.js
   npx knex seed:run --specific=002_test_users.js
   npx knex seed:run --specific=003_sample_locations.js
   npx knex seed:run --specific=004_sample_data.js

6. Update SEED_DATA_GUIDE.md with any corrections made

IMPORTANT:
- DO NOT create seeds for tables that don't exist yet (mentees, mentors, mentorship_assignments, compliance_items, rbac_registry_pages, etc.)
- Focus on the 116 tables that currently exist in the database
- Make seeds idempotent (use ON CONFLICT DO NOTHING)

Please read SESSION_5_SCHEMA_CORRECTIONS.md for complete details, then fix all seed files and test them.
```

---

## What Session 5 Should Deliver (Updated)

1. ✅ **Fixed 002_test_users.js** - with correct availability_status
2. ✅ **Verified 001_reference_data.js** - already correct or fixed
3. ✅ **Verified 003_sample_locations.js** - all columns match schema
4. ✅ **Verified 004_sample_data.js** - all columns match schema
5. ✅ **All seeds tested individually** - all run without errors
6. ✅ **Updated SEED_DATA_GUIDE.md** - documents any corrections made
7. ✅ **Session 5 completion report** - summary of changes

---

## Expected Outcome

After Session 5 completes:
- 4 working, idempotent seed files
- All schema mismatches resolved
- Seeds can be run safely: `npx knex seed:run`
- Database populated with reference data, test users, sample locations, sample games

Then we can proceed to Session 6 for final documentation synthesis.

---

**Ready to resume Session 5!**
