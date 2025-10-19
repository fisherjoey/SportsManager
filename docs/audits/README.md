# Database Audits

This directory contains database audit reports and audit strategy documentation.

## 🎯 Quick Start

```bash
# Run a comprehensive database audit
cd backend
npm run db:audit

# Or directly
node scripts/audit-database.js
```

## 📁 What's Here

| File | Description |
|------|-------------|
| `DATABASE_AUDIT_STRATEGY.md` | Complete audit strategy and process documentation |
| `audit-report-YYYY-MM-DD.md` | Human-readable audit reports |
| `audit-report-YYYY-MM-DD.json` | Machine-readable audit data |

## 📊 Understanding Audit Reports

### Health Score

Your database receives a score from 0-100:

| Score | Status | Action |
|-------|--------|--------|
| 90-100 | 🟢 Excellent | Continue monitoring |
| 70-89 | 🟡 Good | Address warnings when possible |
| 50-69 | 🟠 Fair | Plan improvements this sprint |
| 0-49 | 🔴 Poor | **Immediate action required** |

### Issue Severity

**🔴 Critical (15 points each)**
- Must be fixed immediately
- Can cause data loss or corruption
- Examples: Missing primary keys, orphaned foreign keys

**🟡 Warning (5 points each)**
- Should be addressed soon
- May impact performance or maintainability
- Examples: Missing indexes, duplicate indexes

**ℹ️ Info (1 point each)**
- Nice to fix
- Best practice improvements
- Examples: Naming conventions, boolean defaults

## 🔍 What We Audit

### 1. Schema Structure
- Primary keys on all tables
- Valid foreign key references
- Indexes on foreign keys
- Normalization issues

### 2. Data Integrity
- Unique constraints
- Check constraints
- No orphaned records
- Referential integrity

### 3. Performance
- Index usage statistics
- Sequential scan ratios
- Table bloat
- Query patterns

### 4. Security
- Password hashing
- Sensitive data encryption
- Audit trails (created_at/updated_at)
- Access controls

### 5. Maintenance
- Vacuum statistics
- Dead tuple ratios
- Bloat estimates
- Autovacuum health

### 6. Scalability
- Table growth rates
- Partitioning opportunities
- JSONB indexing
- Capacity planning

### 7. Best Practices
- Naming conventions
- Timestamp types
- Boolean defaults
- Consistent patterns

## 📅 Audit Schedule

| Type | Frequency | Who | Duration |
|------|-----------|-----|----------|
| **Automated** | Daily | CI/CD | 30 seconds |
| **Full Audit** | Weekly | Scheduled | 2 minutes |
| **Manual Review** | Monthly | Lead Engineer | 1 hour |
| **Deep Dive** | Quarterly | DB Team | 4 hours |

## 🚨 Current Action Items

### Critical (Do Now)

1. **Missing Tables** - Create `positions` and `referee_levels` tables
2. **Orphaned FKs** - Fix foreign keys pointing to non-existent tables

### High Priority (This Sprint)

3. **Data Duplication** - Remove duplicate fields from users/referee_profiles
4. **Missing Indexes** - Add indexes to foreign key columns

### Medium Priority (This Month)

5. **Performance** - Optimize high sequential scan queries
6. **Audit Trails** - Add created_at/updated_at to remaining tables

## 📈 Trend Monitoring

Track these metrics over time:

```sql
-- Database size trend
SELECT
  current_date as date,
  pg_size_pretty(pg_database_size(current_database())) as size,
  pg_database_size(current_database()) as size_bytes;

-- Largest tables
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size,
  n_live_tup as rows
FROM pg_tables t
JOIN pg_stat_user_tables s ON t.tablename = s.relname
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC
LIMIT 10;
```

## 🛠️ Manual Checks

### When to Run Manual Checks

- Before major releases
- After significant schema changes
- When performance issues are reported
- During quarterly reviews

### Quick Health Check

```sql
-- 1. Check connections
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';

-- 2. Check cache hit ratio (should be >99%)
SELECT
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 as cache_hit_ratio
FROM pg_statio_user_tables;

-- 3. Check bloat
SELECT
  schemaname,
  tablename,
  n_dead_tup,
  n_live_tup,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY dead_pct DESC;

-- 4. Check slow queries (requires pg_stat_statements)
SELECT
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## 📝 After Running an Audit

1. **Review the Report**
   - Check overall score
   - Read critical issues first
   - Understand warnings

2. **Prioritize Actions**
   - Critical → immediate
   - Warnings → this sprint
   - Info → backlog

3. **Create Tickets**
   - One ticket per issue
   - Include recommendation from report
   - Assign priority label

4. **Track Progress**
   - Update audit strategy
   - Document fixes
   - Re-run audit to verify

5. **Learn & Improve**
   - Update migration templates
   - Add checks to code review
   - Improve development practices

## 🔗 Related Documentation

- [Database Audit Strategy](DATABASE_AUDIT_STRATEGY.md) - Complete audit process
- [Schema Documentation](../schema/README.md) - Current schema reference
- [Migration Guide](../migration/) - How to create migrations
- [Database Diagram](../architecture/database-diagram.md) - Visual overview

## 💡 Pro Tips

1. **Run audits in CI/CD** - Catch issues before production
2. **Set up alerts** - Get notified of critical issues
3. **Track trends** - Compare reports month-over-month
4. **Automate fixes** - Script common maintenance tasks
5. **Review regularly** - Monthly team review of audit reports

## 🆘 Troubleshooting

### Audit Script Fails

```bash
# Check database connection
psql -h localhost -U postgres -d sports_management -c "SELECT 1;"

# Check dependencies
cd backend && npm list pg

# Run with debug output
DEBUG=* node scripts/audit-database.js
```

### Low Score (<70)

1. Check critical issues first
2. Review warnings
3. Create action plan
4. Schedule fixes
5. Re-run audit after fixes

### False Positives

Some warnings may be intentional:
- Nullable foreign keys (optional relationships)
- Wide tables (aggregated views)
- Unused indexes (preparing for future features)

Document these in the strategy doc.

---

**Need help?** Review the [Database Audit Strategy](DATABASE_AUDIT_STRATEGY.md) for complete guidance.

**Found an issue?** Create a ticket and tag it `database-audit`.

**Have a suggestion?** Update the strategy doc and submit a PR.