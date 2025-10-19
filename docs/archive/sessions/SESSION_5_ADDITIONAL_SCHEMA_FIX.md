# Additional Schema Fix for Session 5

**Issue Found**: `referee_profiles` table also has schema mismatch

## referee_profiles Table - Correct Schema

The `referee_profiles` table does NOT have an `availability_status` column.

Looking at the error, the seed is trying to insert `availability_status` into `referee_profiles`, but that column doesn't exist in that table.

## Solution

The `referee_profiles` table likely doesn't need `availability_status` at all - that column is in the `users` table.

**For 002_test_users.js**:

When creating referee profiles, **remove** `availability_status` from the referee_profiles insert. It should only be in the users table insert.

**Example Fix**:
```javascript
// ✅ CORRECT - users table
await knex('users').insert({
  email: 'referee@sportsmanager.com',
  availability_status: 'active',  // ✅ This is correct here
  // ... other fields
});

// ✅ CORRECT - referee_profiles table (NO availability_status)
await knex('referee_profiles').insert({
  user_id: userId,
  certification_level: 'Level 1',
  years_experience: 5,
  // ❌ DO NOT include: availability_status
  // ... other fields
});
```

## referee_profiles Table Schema

(Will be provided by the psql query above)

The seed should only insert columns that actually exist in the referee_profiles table.

**Action**: Remove `availability_status` from referee_profiles inserts in 002_test_users.js
