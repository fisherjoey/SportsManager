# Seed Data Generator

Generates realistic, consistent seed data for database tables following project conventions.

## Description

This skill generates Knex seed files with realistic test data by:
- Analyzing table schemas to understand structure
- Respecting foreign key constraints and relationships
- Generating contextually appropriate fake data
- Ensuring data consistency across tables
- Following your project's seed file conventions
- Creating idempotent seed files

## When to use this skill

Use this skill when:
- Creating seed data for new tables (e.g., mentorship tables)
- Adding more test data to existing tables
- Setting up local development environments
- Creating data for testing specific scenarios
- Populating tables after migrations
- Generating demo data for presentations

## How to use this skill

**Examples:**
- "Generate seed data for mentorship tables"
- "Create seed file for communication_recipients table"
- "Generate 50 test games with assignments"
- "Create realistic user data for testing"
- "Generate seed data respecting all foreign keys"

## What this skill will do

### 1. Analyze Table Schema

Read table definition from:
- Migration files in `backend/src/migrations/`
- Existing database schema (if accessible)
- Documentation in `DATABASE_SCHEMA_COMPLETE.md`

Extract:
- Column names and types
- Required vs optional fields (NOT NULL)
- Foreign key relationships
- Unique constraints
- Default values
- Check constraints (enums, ranges)

### 2. Understand Data Context

Determine appropriate data based on table purpose:

**User/Person Data:**
- `first_name`, `last_name` → Realistic names
- `email` → Format: firstname.lastname@domain.com
- `phone` → Format: (XXX) XXX-XXXX or +1-XXX-XXX-XXXX
- `date_of_birth` → Age-appropriate dates
- `address` → Real Canadian addresses (your project context)

**Sports/Game Data:**
- `game_date` → Reasonable future/past dates
- `level` → Ref levels (Rookie, Junior, Senior, etc.)
- `division` → Appropriate divisions for sport
- `game_type` → Regular, Playoff, Tournament, etc.

**Financial Data:**
- `amount` → Realistic amounts for context
- `pay_rate` → Appropriate referee pay rates
- `budget` → Realistic budget amounts
- `status` → Appropriate workflow states

**Timestamps:**
- `created_at` → Reasonable date in past
- `updated_at` → Same or after created_at
- `deleted_at` → NULL (unless testing soft deletes)

### 3. Respect Relationships

Handle foreign keys correctly:

**Reference Existing Data:**
```javascript
// Get existing user IDs first
const existingUsers = await knex('users').select('id');
const userIds = existingUsers.map(u => u.id);

// Then use in seed data
mentee_id: userIds[0], // Reference valid user
```

**Create in Dependency Order:**
1. Independent tables first (users, organizations, roles)
2. Then dependent tables (teams, locations)
3. Finally relations (game_assignments, mentorships)

**Handle Many-to-Many:**
```javascript
// Create both sides of relationship
await knex('mentors').insert([...]);
await knex('mentees').insert([...]);
await knex('mentorship_assignments').insert([
  { mentor_id: mentor1.id, mentee_id: mentee1.id }
]);
```

### 4. Generate Realistic Data

Use context-appropriate fake data:

**Names & Contact:**
```javascript
// Realistic referee names
{ first_name: 'John', last_name: 'Smith', email: 'john.smith@cmba.ca' }
{ first_name: 'Sarah', last_name: 'Johnson', email: 'sarah.j@cmba.ca' }
```

**Sports-Specific:**
```javascript
// Realistic game data
{
  game_date: '2025-11-15',
  game_time: '19:00:00',
  home_team: 'U15 AAA Tigers',
  away_team: 'U15 AAA Lions',
  level: 'Junior',
  division: 'U15 AAA',
  game_type: 'Regular'
}
```

**Financial:**
```javascript
// Realistic expense data
{
  description: 'Referee uniform purchase',
  amount: 125.00,
  category: 'Equipment',
  status: 'approved',
  receipt_url: 'https://example.com/receipts/123.pdf'
}
```

### 5. Follow Project Conventions

Match existing seed file patterns:

**File Naming:**
```
backend/seeds/data/
  001_reference_data.js      (roles, levels, statuses)
  002_test_users.js          (6 test accounts)
  003_sample_locations.js    (10 venues)
  004_sample_data.js         (leagues, teams, games)
  005_mentorship_test_data.js (NEW - mentorship data)
```

**Seed File Structure:**
```javascript
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // 1. Clean existing data (idempotent)
  await knex('table_name').del();

  // 2. Insert new data with explicit IDs (UUIDs)
  const uuid1 = '123e4567-e89b-12d3-a456-426614174000';

  await knex('table_name').insert([
    {
      id: uuid1,
      name: 'Test Record',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);

  // 3. Log success
  console.log('✓ Seeded table_name with X records');
};
```

**Use Consistent IDs:**
- Use UUIDs (not auto-increment)
- Define IDs as constants for reference
- Use same IDs across seed files for consistency

**Idempotent Seeds:**
```javascript
// Delete existing data first
await knex('mentees').del();

// Or use upsert if supported
await knex('mentees')
  .insert(data)
  .onConflict('id')
  .merge();
```

### 6. Create Test Scenarios

Generate data for specific testing needs:

**Scenario 1: Mentorship Workflow**
```javascript
// 1 Mentor with 3 Mentees
const mentorId = 'uuid-mentor-1';
const menteeIds = ['uuid-mentee-1', 'uuid-mentee-2', 'uuid-mentee-3'];

// Create active, completed, and paused assignments
assignments: [
  { mentor_id: mentorId, mentee_id: menteeIds[0], status: 'active' },
  { mentor_id: mentorId, mentee_id: menteeIds[1], status: 'completed' },
  { mentor_id: mentorId, mentee_id: menteeIds[2], status: 'paused' }
]
```

**Scenario 2: Financial Dashboard**
```javascript
// Mix of approved, pending, and rejected expenses
expenses: [
  { amount: 50, status: 'approved', category_id: 'travel' },
  { amount: 125, status: 'pending_approval', category_id: 'equipment' },
  { amount: 200, status: 'rejected', category_id: 'other' }
]
```

**Scenario 3: Game Assignments**
```javascript
// Games with different assignment statuses
game_assignments: [
  { game_id: 'g1', user_id: 'ref1', status: 'accepted' },
  { game_id: 'g2', user_id: 'ref1', status: 'pending' },
  { game_id: 'g3', user_id: 'ref2', status: 'declined' }
]
```

## Output Format

Generate complete Knex seed file:

```javascript
/**
 * Seed data for mentorship system
 *
 * Creates:
 * - 5 mentors (linked to existing users)
 * - 10 mentees (linked to existing users)
 * - 15 mentorship assignments (various statuses)
 * - 10 mentee profiles with development goals
 *
 * Dependencies:
 * - Requires: 002_test_users.js (for user references)
 * - Creates data for: mentors, mentees, mentorship_assignments, mentee_profiles
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  console.log('🌱 Seeding mentorship system...');

  // ============================================
  // 1. Get existing user IDs (for foreign keys)
  // ============================================
  const existingUsers = await knex('users')
    .select('id', 'email')
    .whereIn('email', [
      'admin@sportsmanager.com',
      'admin@cmba.ca',
      'assignor@cmba.ca',
      'coordinator@cmba.ca',
      'senior.ref@cmba.ca',
      'referee@test.com'
    ]);

  if (existingUsers.length < 6) {
    console.warn('⚠️  Warning: Not enough users. Run 002_test_users.js first');
    return;
  }

  const userMap = {};
  existingUsers.forEach(u => {
    userMap[u.email] = u.id;
  });

  // ============================================
  // 2. Clean existing data (idempotent)
  // ============================================
  await knex('mentorship_assignments').del();
  await knex('mentee_profiles').del();
  await knex('mentees').del();
  await knex('mentors').del();

  // ============================================
  // 3. Define UUIDs for consistency
  // ============================================
  const mentorIds = {
    senior1: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    senior2: 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
    coordinator: 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f'
  };

  const menteeIds = [
    'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a',
    'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b',
    'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c',
    'a7b8c9d0-e1f2-0a1b-4c5d-6e7f8a9b0c1d',
    'b8c9d0e1-f2a3-1b2c-5d6e-7f8a9b0c1d2e'
  ];

  // ============================================
  // 4. Insert Mentors
  // ============================================
  await knex('mentors').insert([
    {
      id: mentorIds.senior1,
      user_id: userMap['senior.ref@cmba.ca'],
      first_name: 'Michael',
      last_name: 'Senior',
      email: 'senior.ref@cmba.ca',
      specialization: 'Game Management',
      bio: 'Experienced referee with 15 years in junior hockey. Specializes in teaching positioning and game management.',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: mentorIds.senior2,
      user_id: userMap['coordinator@cmba.ca'],
      first_name: 'Jennifer',
      last_name: 'Coordinator',
      email: 'coordinator@cmba.ca',
      specialization: 'Rules & Regulations',
      bio: 'Former provincial-level referee. Expert in rulebook interpretation and conflict resolution.',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);

  console.log('  ✓ Seeded 2 mentors');

  // ============================================
  // 5. Insert Mentees
  // ============================================
  await knex('mentees').insert([
    {
      id: menteeIds[0],
      user_id: userMap['referee@test.com'],
      first_name: 'Alex',
      last_name: 'Rookie',
      email: 'alex.rookie@cmba.ca',
      phone: '(403) 555-0101',
      date_of_birth: '2005-03-15',
      emergency_contact_name: 'Sarah Rookie',
      emergency_contact_phone: '(403) 555-0102',
      street_address: '123 Hockey Lane',
      city: 'Calgary',
      province: 'AB',
      postal_code: 'T2P 1A1',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: menteeIds[1],
      user_id: userMap['referee@test.com'], // Reuse for demo
      first_name: 'Jordan',
      last_name: 'Junior',
      email: 'jordan.junior@cmba.ca',
      phone: '(403) 555-0201',
      date_of_birth: '2004-07-22',
      emergency_contact_name: 'Pat Junior',
      emergency_contact_phone: '(403) 555-0202',
      street_address: '456 Rink Road',
      city: 'Calgary',
      province: 'AB',
      postal_code: 'T2P 2B2',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
    // ... (3 more mentees)
  ]);

  console.log('  ✓ Seeded 5 mentees');

  // ============================================
  // 6. Insert Mentorship Assignments
  // ============================================
  const today = new Date();
  const twoMonthsAgo = new Date(today);
  twoMonthsAgo.setMonth(today.getMonth() - 2);

  await knex('mentorship_assignments').insert([
    {
      id: 'assign-1',
      mentor_id: mentorIds.senior1,
      mentee_id: menteeIds[0],
      status: 'active',
      start_date: twoMonthsAgo.toISOString().split('T')[0],
      end_date: null,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: 'assign-2',
      mentor_id: mentorIds.senior1,
      mentee_id: menteeIds[1],
      status: 'active',
      start_date: twoMonthsAgo.toISOString().split('T')[0],
      end_date: null,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: 'assign-3',
      mentor_id: mentorIds.senior2,
      mentee_id: menteeIds[2],
      status: 'completed',
      start_date: '2024-09-01',
      end_date: '2025-09-30',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
    // ... (more assignments)
  ]);

  console.log('  ✓ Seeded 15 mentorship assignments');

  // ============================================
  // 7. Insert Mentee Profiles
  // ============================================
  await knex('mentee_profiles').insert([
    {
      id: 'profile-1',
      mentee_id: menteeIds[0],
      current_level: 'Rookie',
      development_goals: JSON.stringify([
        'Master positioning for two-referee system',
        'Improve penalty call confidence',
        'Learn advanced signals'
      ]),
      strengths: JSON.stringify([
        'Strong skating ability',
        'Good communication with players',
        'Punctual and professional'
      ]),
      areas_for_improvement: JSON.stringify([
        'Game management under pressure',
        'Offside calls in fast play',
        'Consistency in penalty enforcement'
      ]),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
    // ... (more profiles)
  ]);

  console.log('  ✓ Seeded 10 mentee profiles');

  console.log('✅ Mentorship system seeding complete!');
  console.log('');
  console.log('Test Accounts:');
  console.log('  Mentors: senior.ref@cmba.ca, coordinator@cmba.ca');
  console.log('  Mentees: alex.rookie@cmba.ca, jordan.junior@cmba.ca');
  console.log('');
};
```

## Best Practices Applied

### ✅ Idempotent
- Deletes existing data first
- Can run multiple times safely
- No duplicate ID errors

### ✅ Documented
- Clear JSDoc header
- Comments explain each section
- Lists dependencies
- Shows test accounts

### ✅ Realistic Data
- Contextually appropriate names
- Valid email formats
- Realistic Canadian addresses
- Appropriate dates and times

### ✅ Foreign Key Safe
- Gets existing user IDs first
- Checks if dependencies exist
- Warns if missing required data
- Creates in dependency order

### ✅ Consistent IDs
- UUIDs defined as constants
- Reusable across files
- Easy to reference in tests

### ✅ Logging
- Progress indicators
- Success confirmations
- Warning messages
- Test account info

## Integration with Project

### File Location
Save as: `backend/seeds/data/005_mentorship_test_data.js`

### Run Command
```bash
# Run all seeds
npm run seed

# Run specific seed
npx knex seed:run --specific=data/005_mentorship_test_data.js
```

### Dependencies
- Requires: `001_reference_data.js`, `002_test_users.js`
- Before: Any seeds that depend on mentorship data

### Documentation
Update `docs/audit-2025-10-18/implementation/SEED_DATA_GUIDE.md` with:
- New seed file entry
- Test account credentials
- Data volumes
- Dependencies

## Success Criteria

This skill succeeds when:
- Seed file runs without errors
- All foreign keys are valid
- Data is contextually realistic
- File follows project conventions
- Idempotent (can run multiple times)
- Properly documented
- Logs progress clearly

## Notes

- Always test seeds on local DB first
- Check foreign key constraints
- Use realistic data for better testing
- Consider data volumes (don't over-seed)
- Document test account credentials
- Follow existing seed file patterns
- Make seeds idempotent
- Use UUIDs consistently
