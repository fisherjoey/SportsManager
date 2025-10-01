# Schema Quick Reference Guide

**Last Updated:** September 30, 2025

## 🚀 Quick Commands

```bash
# Generate all schema documentation
npm run schema:docs

# Run from backend directory
cd backend && npm run schema:docs

# Or directly
node scripts/generate-schema-docs.js
```

## 📁 Where to Find Information

| Need | File | Description |
|------|------|-------------|
| Table structure | [CURRENT_SCHEMA.md](CURRENT_SCHEMA.md) | Complete table docs |
| Visual diagram | [schema-erd.md](schema-erd.md) | Mermaid ERD |
| Machine-readable | [schema.json](schema.json) | JSON export |
| SQL DDL | `schema.sql` | PostgreSQL dump |
| Comparison | [SCHEMA_COMPARISON.md](SCHEMA_COMPARISON.md) | All sources compared |

## 🎯 Common Tasks

### Find a Table
```bash
# Search in CURRENT_SCHEMA.md
grep "## table_name" docs/schema/CURRENT_SCHEMA.md

# Or use JSON
cat docs/schema/schema.json | jq '.tables.users'
```

### View Table Relationships
Open [schema-erd.md](schema-erd.md) in GitHub or any Mermaid viewer.

### Check Foreign Keys
```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'your_table_name';
```

### Check Indexes
```sql
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'your_table_name';
```

## 📊 Database Overview

### Statistics
- **Total Tables:** 51
- **Core Entities:** 8 (users, organizations, regions, roles, etc.)
- **Game Management:** 5 tables
- **RBAC System:** 10 tables
- **Content Management:** 13 tables
- **Workflow Engine:** 4 tables
- **Mentorship:** 3 tables

### Core Tables

#### Users & Auth
```
users → user_roles → roles
users → user_region_assignments → regions
users → referee_profiles (one-to-one)
users → organizations
```

#### Game Management
```
organizations → leagues → teams
games ← home_team_id (teams)
games ← away_team_id (teams)
games ← location_id (locations)
games → game_assignments → users
```

#### RBAC
```
roles → user_roles → users
roles → role_api_access
roles → role_page_access
roles → role_features
roles → role_data_scopes
```

## 🔧 Maintenance

### After Creating a Migration
```bash
# 1. Run migration
cd backend
npm run migrate

# 2. Update schema docs
npm run schema:docs

# 3. Commit changes
git add migrations/ ../docs/schema/
git commit -m "feat: add new feature with schema changes"
```

### Schema Version Control
```bash
# Create snapshot for release
cp docs/schema/CURRENT_SCHEMA.md docs/schema/snapshots/v1.0.0-schema.md

# Or SQL dump
pg_dump sports_management --schema-only > docs/schema/snapshots/v1.0.0.sql
```

## 🐛 Troubleshooting

### Generator Fails
```bash
# Check database connection
psql -h localhost -U postgres -d sports_management -c "SELECT 1;"

# Check pg module
cd backend && npm list pg
```

### Missing Tables
If documentation shows missing tables:
1. Check migration status: `npm run migrate:status`
2. Run pending migrations: `npm run migrate`
3. Regenerate docs: `npm run schema:docs`

### Outdated Documentation
If docs don't match database:
```bash
# Force regenerate
rm -rf docs/schema/*.md docs/schema/*.json
npm run schema:docs
```

## 📝 Best Practices

### DO
- ✅ Regenerate docs after migrations
- ✅ Review schema changes in PRs
- ✅ Commit generated docs to git
- ✅ Add comments to migrations
- ✅ Use consistent naming conventions

### DON'T
- ❌ Edit generated files manually
- ❌ Skip schema docs after migrations
- ❌ Create tables without migrations
- ❌ Use different field names for same concept
- ❌ Forget foreign key indexes

## 🔗 Related Resources

- [Migration Guide](../migration/) - How to create migrations
- [Database Diagram](../architecture/database-diagram.md) - High-level overview
- [API Documentation](../backend/ENTERPRISE-API-DOCUMENTATION.md) - API endpoints
- [Testing Guide](../testing/) - Database testing

## 📞 Need Help?

1. Check [SCHEMA_COMPARISON.md](SCHEMA_COMPARISON.md) for discrepancies
2. Review [CURRENT_SCHEMA.md](CURRENT_SCHEMA.md) for table details
3. Check migration files in `backend/migrations/`
4. Inspect actual database: `psql sports_management`

---

*Auto-generated documentation. Run `npm run schema:docs` to update.*