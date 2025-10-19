# Database Documentation Index

**SportsManager Database Documentation**
**Generated**: October 18, 2025

---

## 📚 Documentation Files

### 1. **DATABASE_SCHEMA_SUMMARY.md** ⭐ START HERE
**Size**: 13 KB
**Purpose**: Quick overview and navigation guide
**Best for**:
- Getting oriented
- Understanding the big picture
- Finding specific information quickly
- Onboarding new developers

**Contains**:
- Quick stats (116 tables, 1,643 columns)
- File guide and navigation
- Category breakdown
- Core entities overview
- Design patterns explained
- Common queries
- Troubleshooting tips

---

### 2. **DATABASE_SCHEMA_COMPLETE.md** 📖 REFERENCE
**Size**: 243 KB
**Purpose**: Comprehensive technical reference
**Best for**:
- Detailed table information
- Migration planning
- API endpoint design
- Understanding relationships
- Database optimization

**Contains**:
- Every table documented (all 116)
- All columns with types, constraints
- All foreign keys and relationships
- All indexes and constraints
- Row counts and statistics
- Technical implementation details

---

### 3. **database-diagram-latest.md** 🎨 VISUAL
**Size**: 15 KB
**Purpose**: Entity Relationship Diagrams
**Best for**:
- Visual learners
- Architecture discussions
- Understanding relationships
- Presentations

**Contains**:
- Complete ERD (all 116 tables)
- Core entities diagram (simplified)
- Mermaid diagram code
- Relationship visualization

**Also available at**: `docs/reports/database-diagram-latest.md`

---

### 4. **database-schema-complete.json** 🤖 DATA
**Size**: 670 KB
**Purpose**: Machine-readable schema data
**Best for**:
- Automation scripts
- Code generation
- Schema comparison
- Programmatic access

**Contains**:
- Complete schema in JSON format
- All metadata, tables, columns
- Relationships and constraints
- Can be parsed by scripts

---

## 🛠️ Scripts

### `extract-database-schema.js`
**Purpose**: Query PostgreSQL and extract complete schema
**Usage**:
```bash
node extract-database-schema.js
```
**Output**: `database-schema-complete.json`

### `generate-schema-documentation.js`
**Purpose**: Generate markdown documentation from JSON schema
**Usage**:
```bash
node generate-schema-documentation.js
```
**Output**:
- `DATABASE_SCHEMA_COMPLETE.md`
- `database-diagram-latest.md`

### Complete Workflow
```bash
# Step 1: Extract schema from database
node extract-database-schema.js

# Step 2: Generate documentation
node generate-schema-documentation.js

# Step 3: Review output
# - DATABASE_SCHEMA_COMPLETE.md (detailed reference)
# - database-diagram-latest.md (ERD diagrams)
```

---

## 📊 Quick Stats

| Metric | Value |
|--------|-------|
| **Total Tables** | 116 |
| **Total Columns** | 1,643 |
| **Total Indexes** | 618 |
| **Total Constraints** | 1,122 |
| **Foreign Key Relationships** | 236 |
| **Current Data Rows** | 435 |

---

## 🗂️ Table Categories

| Category | Tables | Key Tables |
|----------|--------|------------|
| **Financial** | 28 | budgets, expenses, transactions, accounting |
| **Documents & Content** | 22 | documents, content_items, posts, resources |
| **RBAC & Permissions** | 13 | roles, permissions, rbac_pages, rbac_endpoints |
| **Games & Assignments** | 9 | games, game_assignments, assignment_patterns |
| **User Management** | 6 | users, user_roles, user_locations |
| **Communications** | 5 | notifications, communications, invitations |
| **Others** | 33 | Various supporting tables |

---

## 🎯 Common Use Cases

### I want to understand a specific table
1. Open **DATABASE_SCHEMA_COMPLETE.md**
2. Search for the table name (Ctrl+F)
3. Review columns, relationships, constraints

### I want to see how tables relate
1. Open **database-diagram-latest.md**
2. View the ERD diagrams
3. Follow the relationship arrows

### I need to design an API endpoint
1. Check **DATABASE_SCHEMA_COMPLETE.md** for table structure
2. Identify relationships (belongs_to, has_many)
3. Map columns to API fields
4. Use constraints for validation rules

### I need to write a migration
1. Review **DATABASE_SCHEMA_COMPLETE.md** for current schema
2. Check existing indexes and constraints
3. Follow naming conventions from existing tables
4. Test against constraints

### I want to generate TypeScript types
1. Load **database-schema-complete.json**
2. Parse table definitions
3. Map PostgreSQL types to TypeScript types
4. Generate interfaces/types

---

## 🔍 Finding Information

### Search Patterns

**Find a table**:
- Search for: `` `table_name` ``
- Example: `` `users` ``, `` `games` ``

**Find a relationship**:
- Search for: "Belongs to" or "Has many"
- Example: Search "users (via user_id)"

**Find a column**:
- Search for: "| `column_name`"
- Example: "| `email`"

**Find foreign keys**:
- Search for: "FK →"
- Example: "FK → `organizations(id)`"

---

## 📋 Quick Reference Tables

### Core Entities
- **Users**: `users`, `user_roles`, `user_locations`
- **Organizations**: `organizations`, `departments`, `organization_settings`
- **Games**: `games`, `game_assignments`, `game_fees`
- **Teams & Leagues**: `teams`, `leagues`, `positions`
- **Locations**: `locations`
- **Referees**: `referee_profiles`, `referee_levels`, `referee_roles`

### Financial
- **Budgets**: `budgets`, `budget_periods`, `budget_categories`
- **Expenses**: `expense_data`, `expense_receipts`, `expense_categories`
- **Accounting**: `accounting_integrations`, `journal_entries`, `financial_transactions`

### RBAC & Security
- **Access Control**: `roles`, `role_page_access`, `role_api_access`
- **Permissions**: `resource_permissions`, `role_features`
- **Audit**: `audit_logs`, `access_control_audit`, `resource_audit_log`

---

## 🔧 Database Connection

### psql CLI
```bash
PGPASSWORD=postgres123 "C:/Program Files/PostgreSQL/17/bin/psql.exe" \
  -U postgres -h localhost -p 5432 -d sports_management
```

### Connection String
```
postgresql://postgres:postgres123@localhost:5432/sports_management
```

### Common Commands
```sql
-- List all tables
\dt

-- Describe a table
\d table_name

-- Show table sizes
\dt+

-- List all indexes
\di

-- List all foreign keys
SELECT * FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY';
```

---

## 📅 Update Schedule

### When to regenerate documentation:

**After migrations**:
```bash
npm run migrate:latest
node extract-database-schema.js
node generate-schema-documentation.js
```

**After schema changes**:
- Added/removed tables
- Modified columns
- Changed constraints
- Updated indexes

**Recommended frequency**:
- After major feature branches merge
- Before major releases
- Monthly (or as needed)

---

## 🚀 Integration with Audit Process

### Frontend-Backend Audit Flow

```
1. Frontend Requirements (FRONTEND_API_REQUIREMENTS.md)
   ↓
2. Database Schema (DATABASE_SCHEMA_COMPLETE.md) ← YOU ARE HERE
   ↓
3. Backend Implementation (to be analyzed)
   ↓
4. Gap Analysis (to be created)
```

### Using Schema for API Design

**Example: Games API**

From `games` table schema:
```typescript
// Table: games
// Columns: id, league_id, location_id, home_team_id, away_team_id,
//          scheduled_at, status, notes, created_at, updated_at

// API Endpoint Design
GET    /api/games              // List games
GET    /api/games/:id          // Get single game
POST   /api/games              // Create game
PUT    /api/games/:id          // Update game
DELETE /api/games/:id          // Delete game

// Nested endpoints (from relationships)
GET    /api/games/:id/assignments  // Get game assignments
POST   /api/games/:id/assignments  // Assign officials
GET    /api/leagues/:id/games      // Get league games
GET    /api/locations/:id/games    // Get location games

// Request/Response type
interface Game {
  id: string;
  league_id: string;
  location_id: string;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}
```

---

## 📝 Notes

### Schema Features
- ✅ UUID primary keys (distributed-ready)
- ✅ Timestamptz for all dates (timezone-aware)
- ✅ Foreign key constraints (referential integrity)
- ✅ Check constraints (business rules)
- ✅ Composite indexes (query optimization)
- ✅ Multi-tenant support (organization_id)

### Data Status
- ⚠️ Minimal seed data (435 rows)
- ⚠️ Need comprehensive seed files
- ✅ Schema fully migrated
- ✅ Constraints enforced

---

## 🆘 Troubleshooting

### Documentation looks outdated
```bash
# Regenerate from current database
node extract-database-schema.js
node generate-schema-documentation.js
```

### Can't find a table
1. Check `DATABASE_SCHEMA_COMPLETE.md` (use Ctrl+F)
2. Table might be in a different category
3. Table might have been renamed or removed

### Need more detail
- `DATABASE_SCHEMA_SUMMARY.md` → Overview
- `DATABASE_SCHEMA_COMPLETE.md` → Full details
- `database-schema-complete.json` → Raw data

---

## 📞 Support

For questions about:
- **Schema design**: Review `DATABASE_SCHEMA_COMPLETE.md`
- **Relationships**: Check `database-diagram-latest.md`
- **Specific table**: Search in `DATABASE_SCHEMA_COMPLETE.md`
- **Automation**: Use `database-schema-complete.json`

---

*Generated automatically on October 18, 2025*
*Next update: After schema changes or migrations*
