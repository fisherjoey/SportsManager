# Database Audit Strategy

**Version:** 1.0
**Last Updated:** September 30, 2025
**Owner:** Engineering Team

---

## 📋 Executive Summary

This document outlines the comprehensive database audit strategy for the Sports Manager application. With 51 tables, 72 foreign key relationships, and growing enterprise features, maintaining database health is critical for performance, reliability, and scalability.

**Current Status:**
- **Tables:** 51
- **Foreign Keys:** 72
- **Total Rows:** 3,535
- **Database Size:** ~500 MB
- **Health Score:** To be determined (run first audit)

---

## 🎯 Audit Philosophy & Goals

### Why We Audit

1. **Prevent Issues Before They Occur**
   - Catch schema problems early
   - Identify performance bottlenecks
   - Detect data integrity issues

2. **Maintain High Performance**
   - Ensure optimal query execution
   - Monitor index usage
   - Track table growth

3. **Ensure Data Quality**
   - Verify referential integrity
   - Check constraint enforcement
   - Validate business rules

4. **Plan for Growth**
   - Identify scaling opportunities
   - Forecast capacity needs
   - Optimize for future load

### Success Criteria

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Health Score | 90+ | <70 |
| Critical Issues | 0 | >3 |
| Missing Indexes on FKs | 0 | >5 |
| Dead Tuple Ratio | <5% | >20% |
| Unused Indexes | <10% | >25% |
| Query Response Time (p95) | <100ms | >500ms |

### Audit Frequency

| Audit Type | Frequency | Duration | Owner |
|------------|-----------|----------|-------|
| **Automated Quick Check** | Daily | ~30 seconds | CI/CD |
| **Full Automated Audit** | Weekly | ~2 minutes | Scheduled job |
| **Manual Review** | Monthly | ~1 hour | Lead Engineer |
| **Deep Dive Analysis** | Quarterly | ~4 hours | Database Team |
| **Capacity Planning** | Bi-annually | ~1 day | Architecture Team |

---

## 🔍 Audit Categories

### 1. Schema Structure

**What We Check:**
- ✅ All tables have primary keys
- ✅ Foreign keys point to valid tables/columns
- ✅ Foreign keys have supporting indexes
- ✅ No excessively wide tables (>30 columns)
- ✅ Proper normalization (no major duplication)
- ✅ Column data types are appropriate

**Critical Issues:**
- Missing primary keys
- Orphaned foreign keys (pointing to non-existent columns)
- Circular dependencies

**Common Warnings:**
- Wide tables (consider splitting)
- Missing indexes on foreign keys
- Inconsistent naming conventions

**Example Query:**
```sql
-- Find tables without primary keys
SELECT table_name
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_name = t.table_name
      AND tc.constraint_type = 'PRIMARY KEY'
  );
```

### 2. Data Integrity

**What We Check:**
- ✅ Unique constraints on appropriate columns
- ✅ Check constraints are enforced
- ✅ No duplicate indexes
- ✅ Foreign key relationships are valid
- ✅ Required fields (NOT NULL) are appropriate

**Critical Issues:**
- Duplicate records in unique columns
- Constraint violations
- Broken referential integrity

**Common Warnings:**
- Nullable foreign keys (may be intentional)
- Missing unique constraints on email/username/slug
- Inconsistent constraint naming

**Example Query:**
```sql
-- Find potential unique columns without constraints
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('email', 'username', 'slug', 'code')
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'UNIQUE'
      AND tc.table_name = columns.table_name
      AND kcu.column_name = columns.column_name
  );
```

### 3. Performance

**What We Check:**
- ✅ Index usage statistics
- ✅ Sequential scan ratios
- ✅ Table bloat levels
- ✅ Query execution patterns
- ✅ Connection pool usage
- ✅ Lock contention

**Critical Issues:**
- Large tables (>1GB) without indexes
- Frequent sequential scans on large tables
- Lock timeouts or deadlocks

**Common Warnings:**
- Unused indexes (wasting space)
- High sequential scan ratio
- Missing indexes on frequently joined columns

**Key Metrics:**
```sql
-- Tables with high sequential scans
SELECT
  schemaname,
  tablename,
  seq_scan,
  idx_scan,
  n_live_tup,
  ROUND(100.0 * seq_scan / NULLIF(seq_scan + idx_scan, 0), 2) as seq_scan_pct
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 1000
  AND seq_scan > idx_scan
ORDER BY seq_scan DESC
LIMIT 10;
```

### 4. Security

**What We Check:**
- ✅ Sensitive data encryption
- ✅ Password hashing (column names end with _hash)
- ✅ Audit trail columns (created_at, updated_at)
- ✅ Row-level security policies (if applicable)
- ✅ Column-level permissions

**Critical Issues:**
- Plaintext passwords
- Sensitive data without encryption
- Missing audit trails

**Common Warnings:**
- Tables without created_at/updated_at
- Sensitive columns without explicit access controls
- Missing soft delete patterns

**Best Practices:**
```sql
-- Verify password columns are hashed
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name LIKE '%password%'
  AND column_name NOT LIKE '%hash%';
-- Should return 0 rows!
```

### 5. Maintenance

**What We Check:**
- ✅ Last vacuum times
- ✅ Last analyze times
- ✅ Dead tuple ratios
- ✅ Bloat estimates
- ✅ Autovacuum configuration

**Critical Issues:**
- Dead tuple ratio >20%
- Tables never vacuumed
- Autovacuum not running

**Common Warnings:**
- Large tables not vacuumed recently (>7 days)
- High dead tuple ratios (10-20%)
- Bloated indexes

**Maintenance Commands:**
```sql
-- Check vacuum status
SELECT
  schemaname,
  tablename,
  last_vacuum,
  last_autovacuum,
  n_live_tup,
  n_dead_tup,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_pct
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY dead_pct DESC;

-- Manual vacuum if needed
VACUUM ANALYZE tablename;
```

### 6. Scalability

**What We Check:**
- ✅ Table growth rates
- ✅ Partitioning opportunities
- ✅ JSONB index strategies
- ✅ Archive/purge strategies
- ✅ Capacity forecasting

**Critical Issues:**
- Tables growing exponentially without partitioning
- JSONB columns without GIN indexes

**Common Warnings:**
- Tables >100k rows (consider partitioning)
- Unbounded growth (logs, audit trails)
- No data retention policy

**Growth Monitoring:**
```sql
-- Table sizes and row counts
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  n_live_tup as rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
```

### 7. Best Practices

**What We Check:**
- ✅ Naming conventions (snake_case)
- ✅ TIMESTAMP WITH TIME ZONE usage
- ✅ Boolean defaults
- ✅ UUID vs SERIAL for PKs
- ✅ JSONB vs normalized tables
- ✅ Enum vs lookup tables

**Common Issues:**
- Inconsistent naming (camelCase, spaces)
- TIMESTAMP WITHOUT TIME ZONE
- Boolean columns without defaults
- Mixed PK strategies

---

## 🤖 Automation Strategy

### Automated Audit Script

**Location:** `scripts/audit-database.js`

**Usage:**
```bash
# Run full audit
node scripts/audit-database.js

# Or via npm
npm run db:audit
```

**Outputs:**
- `docs/audits/audit-report-YYYY-MM-DD.md` - Human-readable report
- `docs/audits/audit-report-YYYY-MM-DD.json` - Machine-readable data

### CI/CD Integration

#### GitHub Actions Workflow

```yaml
# .github/workflows/database-audit.yml
name: Database Audit

on:
  schedule:
    - cron: '0 8 * * 1' # Every Monday at 8 AM
  workflow_dispatch: # Manual trigger

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Dependencies
        run: cd backend && npm install

      - name: Run Database Audit
        env:
          DB_HOST: ${{ secrets.DB_HOST }}
          DB_USER: ${{ secrets.DB_USER }}
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
          DB_NAME: ${{ secrets.DB_NAME }}
        run: node scripts/audit-database.js

      - name: Upload Audit Report
        uses: actions/upload-artifact@v3
        with:
          name: audit-report
          path: docs/audits/audit-report-*.md

      - name: Check Critical Issues
        run: |
          CRITICAL=$(cat docs/audits/audit-report-*.json | jq '.summary.critical | length')
          if [ "$CRITICAL" -gt "0" ]; then
            echo "❌ $CRITICAL critical issues found!"
            exit 1
          fi
```

### Alert Thresholds

| Condition | Action | Notification |
|-----------|--------|--------------|
| Score <50 | Block deployment | Slack + Email |
| Score 50-69 | Require review | Slack alert |
| Critical issues >0 | Create Jira ticket | Team notification |
| Warnings >20 | Add to sprint backlog | Weekly summary |

### Scheduled Jobs

```bash
# Add to crontab (production server)

# Daily quick check (weekdays at 6 AM)
0 6 * * 1-5 cd /app && node scripts/audit-database.js --quick

# Weekly full audit (Mondays at 2 AM)
0 2 * * 1 cd /app && node scripts/audit-database.js --full

# Monthly vacuum analysis (1st of month at 3 AM)
0 3 1 * * cd /app && npm run db:maintenance
```

---

## 👤 Manual Review Process

### Monthly Review Checklist

**Duration:** 1 hour
**Owner:** Lead Engineer
**When:** First Monday of each month

- [ ] Review latest audit report
- [ ] Check top 10 slowest queries
- [ ] Analyze table growth trends
- [ ] Review new indexes created
- [ ] Verify backup integrity
- [ ] Check replication lag (if applicable)
- [ ] Update capacity forecast
- [ ] Document any concerns

### Quarterly Deep Dive

**Duration:** 4 hours
**Owner:** Database Team + Lead Engineer
**When:** End of quarter

#### Agenda

1. **Schema Evolution Review** (60 min)
   - Review all migrations from quarter
   - Identify normalization opportunities
   - Check for technical debt
   - Plan refactoring if needed

2. **Performance Analysis** (90 min)
   - Analyze slow query log
   - Review index usage statistics
   - Identify optimization opportunities
   - Test query plan changes
   - Benchmark critical queries

3. **Capacity Planning** (45 min)
   - Review growth trends
   - Forecast 6-month capacity needs
   - Plan for partitioning/archival
   - Update infrastructure requirements

4. **Security & Compliance** (30 min)
   - Review audit trail coverage
   - Check data retention compliance
   - Verify backup/restore procedures
   - Update security documentation

5. **Action Items** (15 min)
   - Prioritize findings
   - Create Jira tickets
   - Assign owners
   - Set deadlines

### Annual Architecture Review

**Duration:** 2 days
**Owner:** Architecture Team
**When:** Q4

- Complete database redesign evaluation
- Multi-tenancy architecture review
- Sharding/partitioning strategy
- Migration to newer PostgreSQL version
- Disaster recovery testing
- Complete security audit

---

## 📊 Scoring System

### Score Calculation

```javascript
// Starting score
let score = 100;

// Deduct points for issues
score -= criticalIssues.length * 15;  // -15 per critical
score -= warnings.length * 5;         // -5 per warning
score -= infoItems.length * 1;        // -1 per info

// Bonus points for passing checks (max +20)
score += Math.min(passedChecks.length * 2, 20);

// Clamp to 0-100
score = Math.max(0, Math.min(100, score));
```

### Severity Classification

#### Critical (15 points each)
- Tables without primary keys
- Orphaned foreign keys
- Broken referential integrity
- Large tables without indexes
- Autovacuum not running
- Security vulnerabilities

#### Warning (5 points each)
- Missing indexes on foreign keys
- Duplicate indexes
- High sequential scan ratio
- Tables without audit columns
- Dead tuple ratio >10%
- Nullable unique fields

#### Info (1 point each)
- Naming convention inconsistencies
- Boolean columns without defaults
- TIMESTAMP without timezone
- Wide tables (may be intentional)

### Score Interpretation

| Score | Rating | Status | Action |
|-------|--------|--------|--------|
| 90-100 | 🟢 Excellent | Healthy | Continue monitoring |
| 70-89 | 🟡 Good | Acceptable | Address warnings |
| 50-69 | 🟠 Fair | Needs attention | Plan improvements |
| 0-49 | 🔴 Poor | Critical | Immediate action |

---

## 🚨 Action Items from Current State

### Known Issues (As of Sept 2025)

#### 1. Missing Referenced Tables (CRITICAL)

**Issue:** Foreign keys reference non-existent tables

**Affected:**
- `game_assignments.position_id` → `positions` (doesn't exist)
- `users.referee_level_id` → `referee_levels` (doesn't exist)

**Action Plan:**
```sql
-- Option A: Create missing tables
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert standard positions
INSERT INTO positions (name, sort_order) VALUES
  ('Referee 1', 1),
  ('Referee 2', 2),
  ('Referee 3', 3);

CREATE TABLE referee_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  wage_amount DECIMAL(8,2) NOT NULL,
  description TEXT,
  allowed_divisions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Option B: Remove orphaned foreign key columns
ALTER TABLE game_assignments DROP COLUMN position_id;
ALTER TABLE users DROP COLUMN referee_level_id;
```

**Timeline:** This week
**Owner:** Backend team
**Priority:** P0

#### 2. Data Duplication (HIGH)

**Issue:** `users` and `referee_profiles` duplicate fields

**Duplicated Fields:**
- `years_experience`
- `evaluation_score`
- `wage_per_game` vs `wage_amount`

**Action Plan:**
```sql
-- Migration: Remove duplication
-- Step 1: Verify referee_profiles is complete
SELECT COUNT(*) FROM users WHERE is_available IS NOT NULL;
SELECT COUNT(*) FROM referee_profiles;

-- Step 2: Copy missing data to referee_profiles
UPDATE referee_profiles rp
SET
  years_experience = u.years_experience,
  evaluation_score = u.evaluation_score
FROM users u
WHERE rp.user_id = u.id
  AND rp.years_experience IS NULL;

-- Step 3: Remove from users table
ALTER TABLE users
  DROP COLUMN years_experience,
  DROP COLUMN evaluation_score,
  DROP COLUMN wage_per_game;
```

**Timeline:** Next sprint
**Owner:** Backend team
**Priority:** P1

#### 3. Missing Indexes on Foreign Keys (MEDIUM)

**Issue:** Several foreign keys lack supporting indexes

**Action Plan:**
```sql
-- Run audit to identify missing indexes
-- Then create them:
CREATE INDEX CONCURRENTLY idx_game_assignments_position_id
  ON game_assignments(position_id);

CREATE INDEX CONCURRENTLY idx_users_referee_level_id
  ON users(referee_level_id);
-- etc.
```

**Timeline:** Next month
**Owner:** Database team
**Priority:** P2

#### 4. Audit Trail Gaps (LOW)

**Issue:** Some tables missing created_at/updated_at

**Action Plan:**
```sql
-- Add timestamps to tables missing them
ALTER TABLE table_name
  ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add trigger for updated_at
CREATE TRIGGER update_table_name_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Timeline:** Q1 2026
**Owner:** Backend team
**Priority:** P3

---

## 🗓️ Long-term Maintenance Plan

### Backup Strategy

| Type | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Full Backup | Daily at 2 AM | 30 days | S3 + Local |
| Incremental | Every 6 hours | 7 days | S3 |
| WAL Archiving | Continuous | 7 days | S3 |
| Snapshot | Before deployments | 48 hours | Local |

**Recovery Testing:**
- Monthly: Restore to dev environment
- Quarterly: Full disaster recovery drill
- Annually: Complete failover test

### Index Maintenance

**Monthly Tasks:**
```sql
-- Reindex heavily updated tables
REINDEX TABLE CONCURRENTLY audit_logs;
REINDEX TABLE CONCURRENTLY game_assignments;

-- Update statistics
ANALYZE;
```

**Quarterly Tasks:**
```sql
-- Check for bloated indexes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey';

-- Remove unused indexes (after verification)
-- DROP INDEX CONCURRENTLY index_name;
```

### Statistics Updates

**Automatic:**
- Autovacuum configured for automatic analyze
- Track table modifications

**Manual (when needed):**
```sql
-- After bulk imports/updates
ANALYZE table_name;

-- Full database
ANALYZE;
```

### Growth Monitoring

**Weekly Review:**
```sql
-- Table size growth
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size,
  (pg_total_relation_size('public.'||tablename) / 1024 / 1024 / 1024.0) as size_gb
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;
```

**Growth Thresholds:**
- Alert if any table grows >20% in one week
- Plan partitioning if table exceeds 100 GB
- Consider archival if table exceeds 1M rows

### Archival Strategy

**Candidates for Archival:**
- `audit_logs` - Keep 90 days, archive older
- `access_control_audit` - Keep 90 days, archive older
- `content_analytics` - Aggregate to monthly, archive raw data

**Archival Process:**
```sql
-- Move old data to archive table
INSERT INTO audit_logs_archive
SELECT * FROM audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete archived data
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';

-- Vacuum to reclaim space
VACUUM FULL audit_logs;
```

---

## 🛠️ Tools & Resources

### Audit Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/audit-database.js` | Full database audit | `node scripts/audit-database.js` |
| `scripts/generate-schema-docs.js` | Schema documentation | `npm run schema:docs` |

### PostgreSQL System Views

```sql
-- Query statistics
SELECT * FROM pg_stat_statements
WHERE calls > 1000
ORDER BY total_exec_time DESC
LIMIT 20;

-- Table statistics
SELECT * FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Index usage
SELECT * FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Database size
SELECT
  pg_size_pretty(pg_database_size(current_database())) as db_size;

-- Connection stats
SELECT * FROM pg_stat_activity
WHERE datname = current_database();
```

### External Tools

1. **pgBadger** - Log analyzer
   ```bash
   pgbadger /var/log/postgresql/postgresql.log -o report.html
   ```

2. **pg_stat_statements** - Query tracking
   ```sql
   CREATE EXTENSION pg_stat_statements;
   ```

3. **pgAdmin** - GUI administration
   - Visual query plans
   - Server monitoring
   - Query tool

4. **DataGrip / DBeaver** - Database IDE
   - Schema visualization
   - Query optimization
   - Data export/import

### Monitoring Queries

```sql
-- Slow queries (requires pg_stat_statements)
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- >100ms average
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Blocking queries
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_query,
  blocking_activity.query AS blocking_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity
  ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity
  ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- Cache hit ratio (should be >99%)
SELECT
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;
```

---

## 📚 References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostgreSQL Wiki: Performance Optimization](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Database Reliability Engineering (O'Reilly)](https://www.oreilly.com/library/view/database-reliability-engineering/9781491925935/)
- Project: [Schema Documentation](../schema/README.md)
- Project: [Migration Guide](../migration/)

---

## 📅 Review Schedule

| Review Type | Next Review | Owner |
|-------------|-------------|-------|
| Strategy Document | Q1 2026 | Architecture Team |
| Audit Thresholds | Monthly | Lead Engineer |
| Tool Updates | Quarterly | DevOps |
| Process Improvements | After major incidents | Team Lead |

---

*This strategy is a living document. Update as the database evolves and as we learn from audits and incidents.*

**Last Updated:** September 30, 2025
**Next Review:** December 31, 2025
**Document Owner:** Lead Engineer