# Database Schema Documentation

This directory contains auto-generated database schema documentation for the Sports Manager application.

## 📁 Files

| File | Description | Format |
|------|-------------|--------|
| `CURRENT_SCHEMA.md` | Complete table documentation with columns, constraints, indexes | Markdown |
| `schema-erd.md` | Entity Relationship Diagram (Mermaid format) | Mermaid ERD |
| `schema.json` | Machine-readable schema export | JSON |
| `schema.sql` | PostgreSQL schema dump (DDL only) | SQL |

## 🔄 Regenerating Documentation

### Automatic Generation

Run this command from the project root:

```bash
npm run schema:docs
```

Or from the backend directory:

```bash
cd backend && npm run schema:docs
```

### Manual Generation

```bash
node scripts/generate-schema-docs.js
```

### Environment Variables

The generator uses these environment variables (with defaults):

```bash
DB_HOST=localhost        # Database host
DB_PORT=5432            # Database port
DB_USER=postgres        # Database user
DB_PASSWORD=postgres123 # Database password
DB_NAME=sports_management # Database name
```

## 📊 Schema Overview

**Last Generated:** 2025-09-30

**Database:** sports_management

**Total Tables:** 51

**Total Rows:** ~3,535 (as of 2025-09-30)

**Database Size:** 17 MB

**Foreign Keys:** 72 relationships

**Normalization Level:** 3NF (Third Normal Form) with one intentional denormalization*

### Database Health Metrics

- **Audit Score:** 88/100 (Last audit: 2025-09-30)
- **Critical Issues:** 0
- **Warnings:** 4
- **Performance:** Good for current scale (3k-50k rows)
- **Largest Tables:**
  - `audit_logs` (2,659 rows)
  - `rbac_scan_history` (396 rows)
  - `games` (239 rows)

*Note: Minor denormalization exists between `users` and `referee_profiles` tables for performance optimization of referee-specific fields (years_experience, evaluation_score, wage_per_game).*

### Core Table Groups

#### User Management
- `users` - Core user accounts
- `user_roles` - Role assignments
- `user_region_assignments` - Regional access control
- `referee_profiles` - Extended referee information

#### RBAC (Role-Based Access Control)
- `roles` - Role definitions
- `role_api_access` - API endpoint permissions
- `role_page_access` - Frontend page permissions
- `role_features` - Feature flags by role
- `role_data_scopes` - Data filtering rules
- `rbac_pages`, `rbac_endpoints`, `rbac_functions` - RBAC registry

#### Game Management
- `games` - Game schedule and details
- `game_assignments` - Referee assignments to games
- `teams` - Team information
- `leagues` - League structure
- `locations` - Venue information

#### Organization & Multi-tenancy
- `organizations` - Organization hierarchy
- `regions` - Regional subdivision

#### Content Management
- `content_items` - Rich content articles
- `content_categories` - Content categorization
- `content_tags` - Tagging system
- `content_versions` - Version history
- `content_analytics` - Usage tracking
- `posts` - Social posts/updates

#### Mentorship System
- `mentorships` - Mentor-mentee relationships
- `mentorship_notes` - Session notes
- `mentorship_documents` - Shared resources

#### Resources
- `resources` - Resource library
- `resource_categories` - Resource organization
- `resource_access_logs` - Access tracking

#### Communication
- `internal_communications` - Internal messaging
- `communication_recipients` - Message delivery

#### Workflow Engine
- `workflow_definitions` - Workflow templates
- `workflow_instances` - Active workflows
- `workflow_step_executions` - Step tracking
- `workflow_approvals` - Approval tracking

#### Audit & Compliance
- `audit_logs` - System audit trail
- `access_control_audit` - RBAC audit log
- `resource_access_logs` - Resource access tracking

## 🔍 Finding Information

### View All Tables
Open [CURRENT_SCHEMA.md](CURRENT_SCHEMA.md) for complete documentation.

### View Relationships
Open [schema-erd.md](schema-erd.md) to see the entity relationship diagram.

### Search Schema
Use the JSON export for programmatic access:
```javascript
const schema = require('./schema.json');
console.log(schema.tables.users.columns);
```

## 🚀 Best Practices

### When to Regenerate

Regenerate schema documentation when:
- ✅ After running new migrations
- ✅ Before major releases
- ✅ When schema questions arise
- ✅ During code reviews involving DB changes

### Version Control

- ✅ **DO** commit `CURRENT_SCHEMA.md`, `schema-erd.md`, and `schema.json`
- ✅ **DO** review schema changes in pull requests
- ❌ **DON'T** commit `schema.sql` (too large, changes frequently)
- ❌ **DON'T** manually edit generated files

### Staying in Sync

Add this to your workflow:

```bash
# After running migrations
npm run migrate
npm run schema:docs
git add docs/schema
git commit -m "docs: update schema after migration XXX"
```

## 📝 Schema Change Process

1. **Create Migration**
   ```bash
   cd backend
   npx knex migrate:make descriptive_migration_name
   ```

2. **Run Migration**
   ```bash
   npm run migrate
   ```

3. **Update Documentation**
   ```bash
   npm run schema:docs
   ```

4. **Commit Changes**
   ```bash
   git add backend/migrations/ docs/schema/
   git commit -m "feat: add new feature with schema changes"
   ```

## 🔗 Related Documentation

- [Database Diagram](../architecture/database-diagram.md) - High-level overview
- [UML Architecture](../architecture/uml-architecture-diagram.md) - System architecture
- [Migration Guide](../migration/) - Migration best practices
- [Database Audit Reports](../audits/) - Health and performance audits

## ⚙️ Generator Details

The schema documentation generator:
- Connects directly to PostgreSQL
- Reads schema metadata from `information_schema`
- Extracts columns, foreign keys, indexes, and constraints
- Generates multiple output formats
- Runs in ~10 seconds for 51 tables

**Source:** [scripts/generate-schema-docs.js](../../scripts/generate-schema-docs.js)

## 📅 Changelog

| Date | Tables | Description |
|------|--------|-------------|
| 2025-09-30 | 51 | Initial automated schema documentation |

---

*This documentation is auto-generated. Do not edit manually.*
