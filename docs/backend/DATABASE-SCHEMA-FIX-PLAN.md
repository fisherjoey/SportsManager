# 🔧 Database Schema Fix Plan - Comprehensive Testing Alignment

## 📋 **Executive Summary**

The comprehensive test suite revealed several schema mismatches between expected test database structure and actual implementation. This plan addresses all identified issues to achieve 95%+ test success rate.

---

## 🔍 **Issues Identified**

### **Critical Issues (Blocking Tests)**

1. **Missing `referees` Table**
   - **Impact**: 25+ tests failing in assignments and CRUD operations
   - **Root Cause**: Tests expect separate `referees` table, but current schema uses `users` table directly
   - **Error**: `relation "referees" does not exist`

2. **Missing `referee_availability` Table**
   - **Impact**: 8+ availability-related tests failing
   - **Root Cause**: Tests expect dedicated availability tracking table
   - **Error**: `Table referee_availability should exist`

### **Data Type Mismatches**

3. **Text vs Character Varying Issues**
   - **Fields Affected**: `users.role`, `games.level`, `games.status`
   - **Expected**: `character varying`
   - **Actual**: `text`
   - **Impact**: 6+ schema validation tests failing

4. **Game Assignments Schema Mismatch**
   - **Expected**: `referee_id` field
   - **Actual**: `user_id` field
   - **Impact**: Assignment tests failing due to field name mismatch

---

## 🎯 **Fix Strategy**

### **Phase 1: Critical Table Creation (High Priority)**

#### **1.1 Create Missing `referees` Table**
```sql
-- Option A: Create referees as view/mapping table
CREATE TABLE referees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance  
CREATE INDEX idx_referees_user_id ON referees(user_id);
```

#### **1.2 Create Missing `referee_availability` Table**
```sql
CREATE TABLE referee_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    time_from TIME NOT NULL,
    time_to TIME NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    max_games INTEGER,
    preferred_locations TEXT[],
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_referee_availability_user_id ON referee_availability(user_id);
CREATE INDEX idx_referee_availability_dates ON referee_availability(date_from, date_to);
```

### **Phase 2: Data Type Corrections (Medium Priority)**

#### **2.1 Fix Character Varying Issues**
```sql
-- Fix users.role
ALTER TABLE users 
ALTER COLUMN role TYPE VARCHAR(50);

-- Update constraint if needed
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'referee', 'evaluator', 'mentor'));

-- Fix games.level  
ALTER TABLE games
ALTER COLUMN level TYPE VARCHAR(50);

-- Fix games.status
ALTER TABLE games  
ALTER COLUMN status TYPE VARCHAR(50);
```

#### **2.2 Add Compatibility Fields**
```sql
-- Add referee_id to game_assignments for test compatibility
ALTER TABLE game_assignments 
ADD COLUMN referee_id UUID REFERENCES referees(id) ON DELETE CASCADE;

-- Create trigger to auto-populate referee_id from user_id
CREATE OR REPLACE FUNCTION sync_assignment_referee_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NOT NULL THEN
        SELECT id INTO NEW.referee_id 
        FROM referees 
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_assignment_referee_id
    BEFORE INSERT OR UPDATE ON game_assignments
    FOR EACH ROW EXECUTE FUNCTION sync_assignment_referee_id();
```

### **Phase 3: Data Migration (Medium Priority)**

#### **3.1 Populate `referees` Table**
```sql
-- Migrate existing referee users to referees table
INSERT INTO referees (user_id, created_at, updated_at)
SELECT id, created_at, updated_at 
FROM users 
WHERE role = 'referee'
ON CONFLICT DO NOTHING;
```

#### **3.2 Update Existing Assignments**
```sql
-- Update existing game_assignments with referee_id
UPDATE game_assignments 
SET referee_id = r.id
FROM referees r
WHERE game_assignments.user_id = r.user_id
AND game_assignments.referee_id IS NULL;
```

### **Phase 4: Test Database Seeds Update (Low Priority)**

#### **4.1 Update Test Seeds**
```sql
-- Update seeds/test/001_test_data.js to populate referees table
-- After users insertion:
const refereeUsers = await knex('users').where('role', 'referee').select('*');
const refereeRecords = refereeUsers.map(user => ({
    user_id: user.id,
    created_at: user.created_at,
    updated_at: user.updated_at
}));
await knex('referees').insert(refereeRecords);
```

---

## 📊 **Implementation Plan**

### **Timeline: 2-3 Hours Total**

| Phase | Duration | Tasks | Priority |
|-------|----------|-------|----------|
| **Phase 1** | 45 min | Create missing tables, indexes | 🔴 Critical |
| **Phase 2** | 60 min | Fix data types, add compatibility | 🟡 High |
| **Phase 3** | 30 min | Data migration, populate tables | 🟡 High |
| **Phase 4** | 45 min | Update seeds, validate tests | 🟢 Medium |

### **Step-by-Step Execution**

#### **Step 1: Create Migration Files (15 min)**
```bash
# Create new migration
knex migrate:make fix_comprehensive_test_schema

# File: migrations/XXX_fix_comprehensive_test_schema.js
```

#### **Step 2: Implement Schema Changes (30 min)**
- Add missing tables
- Fix data type mismatches  
- Create compatibility triggers

#### **Step 3: Data Migration (15 min)**
- Populate referees table from existing users
- Update assignment references
- Validate foreign key integrity

#### **Step 4: Update Test Infrastructure (30 min)**
- Modify test seeds
- Update test setup/teardown
- Add data population helpers

#### **Step 5: Test Validation (45 min)**
- Run comprehensive test suite
- Fix any remaining schema issues
- Validate 95%+ success rate

---

## 🎯 **Expected Outcomes**

### **After Phase 1 (Critical Fixes)**
- ✅ All "table does not exist" errors resolved
- ✅ 25+ assignment tests now executable
- ✅ Database operations tests functional

### **After Phase 2 (Data Type Fixes)**  
- ✅ Schema validation tests passing
- ✅ Data type consistency achieved
- ✅ Test compatibility maintained

### **After Phase 3 (Data Migration)**
- ✅ Existing data preserved and accessible
- ✅ Referential integrity maintained
- ✅ Legacy system compatibility

### **After Phase 4 (Test Updates)**
- ✅ **Target: 95%+ test success rate**
- ✅ All comprehensive tests executable
- ✅ Clean test database state

---

## 🔒 **Risk Mitigation**

### **Data Safety**
- ✅ All changes use `CREATE` and `ALTER` (no data loss)
- ✅ Foreign key constraints preserve integrity
- ✅ Triggers maintain compatibility between old/new schema
- ✅ Rollback plan available via migration system

### **Production Impact**
- ✅ Changes are additive (existing code continues working)
- ✅ Gradual migration strategy (old and new schema coexist)
- ✅ Compatibility layer ensures zero breaking changes

### **Testing Safety**
- ✅ Test database isolation (no production impact)
- ✅ Automated rollback via Knex migrations
- ✅ Comprehensive validation before deployment

---

## 📋 **Validation Checklist**

### **Pre-Implementation**
- [ ] Database backup created
- [ ] Migration files prepared
- [ ] Rollback strategy documented

### **Post-Implementation**  
- [ ] All 22 expected tables exist
- [ ] Schema validation tests pass (100%)
- [ ] CRUD operation tests pass (95%+)
- [ ] API route tests executable (90%+)
- [ ] Data integrity maintained
- [ ] No production system impact

---

## 🚀 **Next Steps**

1. **Immediate (Today)**
   - Create migration file with Phase 1 changes
   - Test on clean database instance
   - Validate table creation

2. **Short Term (Tomorrow)**
   - Implement data type fixes
   - Run comprehensive test suite
   - Document any additional issues

3. **Medium Term (This Week)**
   - Optimize test performance
   - Add additional test coverage
   - Create monitoring for schema drift

---

## 📈 **Success Metrics**

- **Primary Goal**: 95%+ comprehensive test success rate
- **Secondary Goals**:
  - All critical table existence tests passing
  - Schema validation tests at 100%
  - API functionality tests at 90%+
- **Quality Metrics**:
  - Zero data loss during migration
  - Maintained referential integrity
  - Production compatibility preserved

---

*This plan addresses all identified schema issues systematically while maintaining data integrity and production compatibility. Estimated implementation time: 2-3 hours for complete resolution.*