const fs = require('fs');

// Load the schema data
const schemaData = JSON.parse(fs.readFileSync('./database-schema-complete.json', 'utf8'));

// Enhanced categorization with better patterns
function recategorizeTable(tableName, currentCategory) {
  // More specific patterns to improve categorization
  const betterPatterns = {
    'User Management': ['users', 'user_roles', 'user_referee_roles', 'user_earnings', 'user_location_distances', 'user_locations'],
    'Authentication & Security': ['audit_logs', 'access_control_audit', 'resource_access_logs', 'resource_audit_log'],
    'RBAC & Permissions': ['roles', 'role_', 'rbac_', 'resource_permissions', 'resource_category_permissions'],
    'Games & Assignments': ['games', 'game_', 'assignment', 'chunks', 'chunk_games'],
    'Teams & Leagues': ['teams', 'leagues', 'positions'],
    'Locations & Facilities': ['locations'],
    'Organizations': ['organizations', 'organization_', 'departments'],
    'Referees & Officials': ['referee_', 'incidents'],
    'Mentorship': ['mentorship'],
    'Communications': ['communication', 'internal_communications', 'notification', 'invitations'],
    'Financial': ['budget', 'expense', 'financial', 'payment', 'accounting', 'purchase_orders', 'journal_', 'cash_flow', 'chart_of_accounts', 'company_credit_cards', 'spending_limits', 'vendors'],
    'Employee Management': ['employees', 'employee_', 'job_positions', 'training_records'],
    'Documents & Content': ['documents', 'document_', 'content_', 'resources', 'resource_versions', 'resource_categories', 'resource_category_managers', 'posts', 'post_'],
    'Analytics & Reports': ['analytics', 'reports', 'kpis', 'insights', 'dashboards'],
    'AI & Machine Learning': ['ai_'],
    'Calendar & Scheduling': ['calendar'],
    'Assets & Resources': ['assets', 'asset_'],
    'Compliance & Tracking': ['compliance', 'risk_assessments'],
    'Approval Workflows': ['approval_'],
    'System & Configuration': ['knex_migrations']
  };

  for (const [category, patterns] of Object.entries(betterPatterns)) {
    for (const pattern of patterns) {
      if (tableName === pattern || tableName.startsWith(pattern) || tableName.includes(pattern)) {
        return category;
      }
    }
  }

  return currentCategory === 'Other' ? 'Other' : currentCategory;
}

// Recategorize all tables
const recategorizedTables = {};
const categories = {};

for (const [tableName, tableData] of Object.entries(schemaData.tables)) {
  const newCategory = recategorizeTable(tableName, tableData.category);
  tableData.category = newCategory;
  recategorizedTables[tableName] = tableData;

  if (!categories[newCategory]) {
    categories[newCategory] = [];
  }
  categories[newCategory].push(tableName);
}

schemaData.tables = recategorizedTables;
schemaData.categories = categories;

// Function to infer table relationships and cardinality
function inferRelationships(tableName, tableData) {
  const relationships = [];

  // Has Many relationships (based on foreign keys FROM other tables TO this table)
  const hasMany = schemaData.relationships.filter(rel => rel.to === tableName);
  const hasManyGrouped = {};
  hasMany.forEach(rel => {
    if (!hasManyGrouped[rel.from]) {
      hasManyGrouped[rel.from] = [];
    }
    hasManyGrouped[rel.from].push(rel);
  });

  // Belongs To relationships (foreign keys FROM this table TO other tables)
  const belongsTo = tableData.foreignKeys.map(fk => ({
    type: 'belongs_to',
    table: fk.referencesTable,
    via: fk.column
  }));

  // Has Many relationships
  const hasManyRels = Object.entries(hasManyGrouped).map(([table, rels]) => ({
    type: 'has_many',
    table: table,
    via: rels.map(r => r.fromColumn).join(', ')
  }));

  return [...belongsTo, ...hasManyRels];
}

// Function to determine table purpose
function inferTablePurpose(tableName, tableData) {
  const purposes = {
    'users': 'Core user accounts and authentication credentials',
    'roles': 'RBAC role definitions',
    'user_roles': 'Junction table linking users to their assigned roles',
    'games': 'Game/match schedules and details',
    'game_assignments': 'Assignment of referees/officials to specific games',
    'teams': 'Sports teams information',
    'leagues': 'League/competition organization',
    'locations': 'Venues and facilities where games are held',
    'organizations': 'Multi-tenant organization records',
    'referees': 'Referee profiles and certifications',
    'mentorships': 'Mentorship program tracking',
    'budgets': 'Financial budget planning and tracking',
    'expenses': 'Expense records and claims',
    'employees': 'Employee/staff records',
    'documents': 'Document management and storage',
    'notifications': 'System notification delivery',
    'audit_logs': 'Security and compliance audit trail'
  };

  // Check for exact matches
  if (purposes[tableName]) {
    return purposes[tableName];
  }

  // Infer based on patterns
  if (tableName.endsWith('_logs')) return 'Logging and audit trail';
  if (tableName.includes('_audit')) return 'Audit tracking for compliance';
  if (tableName.endsWith('_receipts')) return 'Receipt storage and validation';
  if (tableName.endsWith('_approvals')) return 'Approval workflow tracking';
  if (tableName.endsWith('_analytics')) return 'Analytics and metrics tracking';
  if (tableName.includes('rbac_')) return 'RBAC system configuration';
  if (tableName.includes('ai_')) return 'AI/ML feature support';
  if (tableName.startsWith('post_')) return 'Social/content posting features';
  if (tableName.startsWith('content_')) return 'Content management system';

  // Generic purposes based on column patterns
  const hasTimestamps = tableData.columns.some(c => c.name === 'created_at' || c.name === 'updated_at');
  const hasStatus = tableData.columns.some(c => c.name === 'status');
  const hasUserId = tableData.columns.some(c => c.name === 'user_id');

  if (tableData.foreignKeys.length === 2 && tableData.columns.length <= 5) {
    return 'Junction table for many-to-many relationships';
  }

  return 'Data storage and management';
}

// Generate markdown documentation
function generateMarkdown() {
  const lines = [];

  lines.push('# Database Schema - Complete Documentation');
  lines.push('');
  lines.push('**Database**: `sports_management`');
  lines.push(`**Generated**: ${new Date(schemaData.metadata.extractedAt).toLocaleString()}`);
  lines.push(`**PostgreSQL Version**: 17`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Summary section
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Total Tables | ${schemaData.metadata.totalTables} |`);
  lines.push(`| Total Columns | ${schemaData.metadata.totalColumns} |`);
  lines.push(`| Total Indexes | ${schemaData.metadata.totalIndexes} |`);
  lines.push(`| Total Constraints | ${schemaData.metadata.totalConstraints} |`);
  lines.push(`| Total Relationships | ${schemaData.relationships.length} |`);
  lines.push('');

  // Calculate total rows
  const totalRows = Object.values(schemaData.tables).reduce((sum, t) => sum + t.rowCount, 0);
  lines.push(`**Total Records**: ${totalRows.toLocaleString()} rows across all tables`);
  lines.push('');

  // Tables by category
  lines.push('### Tables by Category');
  lines.push('');
  const sortedCategories = Object.entries(schemaData.categories).sort((a, b) => b[1].length - a[1].length);

  lines.push('| Category | Count | Tables |');
  lines.push('|----------|-------|--------|');

  for (const [category, tables] of sortedCategories) {
    const tablesList = tables.sort().join(', ');
    lines.push(`| ${category} | ${tables.length} | ${tablesList} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  // Schema by category
  lines.push('## Schema by Category');
  lines.push('');

  for (const [category, tables] of sortedCategories) {
    lines.push(`### ${category}`);
    lines.push('');
    lines.push(`**Tables**: ${tables.length}`);
    lines.push('');

    // Sort tables alphabetically within category
    const sortedTables = tables.sort();

    for (const tableName of sortedTables) {
      const tableData = schemaData.tables[tableName];

      lines.push(`#### \`${tableName}\``);
      lines.push('');

      // Purpose
      const purpose = inferTablePurpose(tableName, tableData);
      lines.push(`**Purpose**: ${purpose}`);
      lines.push('');

      // Row count
      if (tableData.rowCount > 0) {
        lines.push(`**Records**: ${tableData.rowCount.toLocaleString()} rows`);
        lines.push('');
      }

      // Relationships
      const relationships = inferRelationships(tableName, tableData);
      if (relationships.length > 0) {
        lines.push('**Relationships**:');
        const belongsTo = relationships.filter(r => r.type === 'belongs_to');
        const hasMany = relationships.filter(r => r.type === 'has_many');

        if (belongsTo.length > 0) {
          lines.push('- **Belongs to**:');
          belongsTo.forEach(rel => {
            lines.push(`  - \`${rel.table}\` (via \`${rel.via}\`)`);
          });
        }

        if (hasMany.length > 0) {
          lines.push('- **Has many**:');
          hasMany.forEach(rel => {
            lines.push(`  - \`${rel.table}\` (via \`${rel.via}\`)`);
          });
        }
        lines.push('');
      }

      // Columns table
      lines.push('**Columns**:');
      lines.push('');
      lines.push('| Column | Type | Nullable | Default | Constraints |');
      lines.push('|--------|------|----------|---------|-------------|');

      for (const col of tableData.columns) {
        const isPK = tableData.primaryKeys.some(pk => pk.column === col.name);
        const isFK = tableData.foreignKeys.some(fk => fk.column === col.name);
        const isUnique = tableData.uniqueConstraints.some(uc => uc.columns.includes(col.name));

        const constraints = [];
        if (isPK) constraints.push('PRIMARY KEY');
        if (isFK) {
          const fk = tableData.foreignKeys.find(fk => fk.column === col.name);
          constraints.push(`FK → \`${fk.referencesTable}(${fk.referencesColumn})\``);
        }
        if (isUnique && !isPK) constraints.push('UNIQUE');

        const nullable = col.nullable ? 'Yes' : 'No';
        const defaultVal = col.default ? `\`${col.default}\`` : '-';
        const constraintsStr = constraints.length > 0 ? constraints.join(', ') : '-';

        lines.push(`| \`${col.name}\` | \`${col.type}\` | ${nullable} | ${defaultVal} | ${constraintsStr} |`);
      }

      lines.push('');

      // Indexes
      if (tableData.indexes.length > 0) {
        lines.push('**Indexes**:');
        lines.push('');
        tableData.indexes.forEach(idx => {
          const type = idx.primary ? 'PRIMARY KEY' : idx.unique ? 'UNIQUE INDEX' : 'INDEX';
          const cols = idx.columns.join(', ');
          lines.push(`- **${type}**: \`${idx.name}\` on (\`${cols}\`)`);
        });
        lines.push('');
      }

      // Foreign Key Details
      if (tableData.foreignKeys.length > 0) {
        lines.push('**Foreign Keys**:');
        lines.push('');
        tableData.foreignKeys.forEach(fk => {
          lines.push(`- \`${fk.column}\` → \`${fk.referencesTable}(${fk.referencesColumn})\``);
          if (fk.onDelete && fk.onDelete !== 'NO ACTION') {
            lines.push(`  - ON DELETE: ${fk.onDelete}`);
          }
          if (fk.onUpdate && fk.onUpdate !== 'NO ACTION') {
            lines.push(`  - ON UPDATE: ${fk.onUpdate}`);
          }
        });
        lines.push('');
      }

      // Check Constraints
      if (tableData.checkConstraints.length > 0) {
        lines.push('**Check Constraints**:');
        lines.push('');
        tableData.checkConstraints.forEach(cc => {
          lines.push(`- \`${cc.name}\`: ${cc.definition}`);
        });
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }
  }

  // Relationship summary
  lines.push('## Relationship Diagram Overview');
  lines.push('');
  lines.push('### Key Relationships');
  lines.push('');

  // Group relationships by category
  const coreRelationships = [
    { from: 'users', to: 'organizations', description: 'Users belong to organizations' },
    { from: 'users', to: 'roles', via: 'user_roles', description: 'Users have many roles (RBAC)' },
    { from: 'game_assignments', to: 'games', description: 'Officials assigned to games' },
    { from: 'game_assignments', to: 'users', description: 'Users assigned as officials' },
    { from: 'games', to: 'teams', description: 'Games involve teams' },
    { from: 'games', to: 'leagues', description: 'Games belong to leagues' },
    { from: 'games', to: 'locations', description: 'Games held at locations' },
    { from: 'mentorships', to: 'users', description: 'Mentor-mentee relationships' },
    { from: 'expenses', to: 'users', description: 'User expense tracking' },
    { from: 'budgets', to: 'organizations', description: 'Organization budget management' }
  ];

  lines.push('#### Core Entity Relationships');
  lines.push('');
  coreRelationships.forEach(rel => {
    if (rel.via) {
      lines.push(`- **${rel.from}** ↔ **${rel.to}** (via \`${rel.via}\`) - ${rel.description}`);
    } else {
      lines.push(`- **${rel.from}** → **${rel.to}** - ${rel.description}`);
    }
  });

  lines.push('');
  lines.push('---');
  lines.push('');

  // Data statistics
  lines.push('## Data Statistics');
  lines.push('');
  lines.push('### Tables with Data');
  lines.push('');

  const tablesWithData = Object.entries(schemaData.tables)
    .filter(([name, data]) => data.rowCount > 0)
    .sort((a, b) => b[1].rowCount - a[1].rowCount);

  if (tablesWithData.length > 0) {
    lines.push('| Table | Category | Rows | Avg Row Size |');
    lines.push('|-------|----------|------|--------------|');

    tablesWithData.forEach(([name, data]) => {
      lines.push(`| \`${name}\` | ${data.category} | ${data.rowCount.toLocaleString()} | - |`);
    });

    lines.push('');
  } else {
    lines.push('*No data currently in database - freshly migrated schema*');
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Technical notes
  lines.push('## Technical Notes');
  lines.push('');
  lines.push('### Primary Key Strategy');
  lines.push('- **Type**: UUID (v4)');
  lines.push('- **Generator**: `gen_random_uuid()` or `uuid_generate_v4()`');
  lines.push('- **Benefits**: Distributed system support, no ID collision, harder to enumerate');
  lines.push('');

  lines.push('### Timestamp Strategy');
  lines.push('- **Creation**: `created_at` (timestamptz, default CURRENT_TIMESTAMP)');
  lines.push('- **Updates**: `updated_at` (timestamptz, updated via triggers or application)');
  lines.push('- **Timezone**: All timestamps stored with timezone (timestamptz)');
  lines.push('');

  lines.push('### Foreign Key Actions');
  lines.push('- **Default**: NO ACTION (database enforces referential integrity)');
  lines.push('- **CASCADE**: Used selectively for dependent data cleanup');
  lines.push('- **SET NULL**: Used where relationship is optional');
  lines.push('');

  lines.push('### Indexing Strategy');
  lines.push('- **Primary Keys**: Automatically indexed');
  lines.push('- **Foreign Keys**: Indexed for join performance');
  lines.push('- **Lookup Fields**: Email, phone, username, code fields indexed');
  lines.push('- **Composite Indexes**: Used for common query patterns');
  lines.push('');

  lines.push('---');
  lines.push('');

  // Footer
  lines.push('## Maintenance Notes');
  lines.push('');
  lines.push('### Schema Updates');
  lines.push('- Managed via Knex.js migrations');
  lines.push('- Migration files located in `backend/migrations/`');
  lines.push('- Run migrations: `npm run migrate:latest`');
  lines.push('- Rollback: `npm run migrate:rollback`');
  lines.push('');

  lines.push('### Regenerating This Documentation');
  lines.push('```bash');
  lines.push('# Extract schema from database');
  lines.push('node extract-database-schema.js');
  lines.push('');
  lines.push('# Generate markdown documentation');
  lines.push('node generate-schema-documentation.js');
  lines.push('```');
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push(`*Generated automatically from PostgreSQL database on ${new Date().toLocaleString()}*`);

  return lines.join('\n');
}

// Generate Mermaid ERD
function generateMermaidERD() {
  const lines = [];

  lines.push('# Database Entity Relationship Diagram');
  lines.push('');
  lines.push(`**Database**: sports_management`);
  lines.push(`**Generated**: ${new Date().toLocaleString()}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## Complete ERD');
  lines.push('');
  lines.push('```mermaid');
  lines.push('erDiagram');
  lines.push('');

  // Group tables by category for better organization
  for (const [category, tables] of Object.entries(schemaData.categories).sort()) {
    if (category === 'System & Configuration') continue; // Skip system tables

    lines.push(`  %% ${category}`);

    for (const tableName of tables.sort()) {
      const tableData = schemaData.tables[tableName];

      // Table definition
      lines.push(`  ${tableName} {`);

      // Add key columns (PK, FK, important fields)
      const importantColumns = tableData.columns.filter(col => {
        const isPK = tableData.primaryKeys.some(pk => pk.column === col.name);
        const isFK = tableData.foreignKeys.some(fk => fk.column === col.name);
        const isImportant = ['name', 'email', 'status', 'type', 'code', 'title'].includes(col.name);
        return isPK || isFK || isImportant;
      });

      // Limit to first 8 columns to keep diagram readable
      const displayColumns = importantColumns.slice(0, 8);

      for (const col of displayColumns) {
        const isPK = tableData.primaryKeys.some(pk => pk.column === col.name);
        const pkMarker = isPK ? ' PK' : '';
        const fkMarker = tableData.foreignKeys.some(fk => fk.column === col.name) ? ' FK' : '';
        lines.push(`    ${col.type} ${col.name}${pkMarker}${fkMarker}`);
      }

      if (importantColumns.length > 8) {
        lines.push(`    string "... ${tableData.columns.length - 8} more columns"`);
      }

      lines.push(`  }`);
    }

    lines.push('');
  }

  // Add relationships
  lines.push('  %% Relationships');
  lines.push('');

  // Filter to show only important relationships
  const importantTables = new Set([
    'users', 'roles', 'user_roles', 'organizations',
    'games', 'game_assignments', 'teams', 'leagues', 'locations',
    'referees', 'referee_levels', 'referee_profiles',
    'mentorships', 'budgets', 'expenses',
    'employees', 'documents', 'notifications'
  ]);

  const displayRelationships = schemaData.relationships.filter(rel =>
    importantTables.has(rel.from) && importantTables.has(rel.to)
  );

  for (const rel of displayRelationships) {
    // Determine cardinality
    const fromTable = schemaData.tables[rel.from];
    const isJunctionTable = fromTable.foreignKeys.length >= 2 && fromTable.columns.length <= 5;

    let cardinality = '||--o{'; // Default: one to many

    if (isJunctionTable) {
      cardinality = '}o--o{'; // Many to many (junction)
    }

    lines.push(`  ${rel.from} ${cardinality} ${rel.to} : "${rel.fromColumn}"`);
  }

  lines.push('```');
  lines.push('');

  lines.push('---');
  lines.push('');

  // Core entities diagram
  lines.push('## Core Entities (Simplified)');
  lines.push('');
  lines.push('This diagram shows only the most critical tables and relationships:');
  lines.push('');
  lines.push('```mermaid');
  lines.push('erDiagram');
  lines.push('');

  const coreEntities = {
    users: ['id', 'email', 'name', 'organization_id'],
    roles: ['id', 'name', 'code'],
    user_roles: ['user_id', 'role_id'],
    organizations: ['id', 'name', 'code'],
    games: ['id', 'league_id', 'location_id', 'date', 'status'],
    game_assignments: ['id', 'game_id', 'user_id', 'position'],
    teams: ['id', 'name', 'league_id'],
    leagues: ['id', 'name', 'organization_id'],
    locations: ['id', 'name', 'city', 'state']
  };

  for (const [tableName, columns] of Object.entries(coreEntities)) {
    const tableData = schemaData.tables[tableName];
    if (!tableData) continue;

    lines.push(`  ${tableName} {`);
    for (const colName of columns) {
      const col = tableData.columns.find(c => c.name === colName);
      if (!col) continue;

      const isPK = tableData.primaryKeys.some(pk => pk.column === col.name);
      const pkMarker = isPK ? ' PK' : '';
      const fkMarker = tableData.foreignKeys.some(fk => fk.column === col.name) ? ' FK' : '';
      lines.push(`    ${col.type} ${col.name}${pkMarker}${fkMarker}`);
    }
    lines.push(`  }`);
  }

  lines.push('');
  lines.push('  users ||--o{ user_roles : has');
  lines.push('  roles ||--o{ user_roles : has');
  lines.push('  organizations ||--o{ users : contains');
  lines.push('  organizations ||--o{ leagues : owns');
  lines.push('  leagues ||--o{ games : schedules');
  lines.push('  leagues ||--o{ teams : contains');
  lines.push('  locations ||--o{ games : hosts');
  lines.push('  games ||--o{ game_assignments : has');
  lines.push('  users ||--o{ game_assignments : assigned_to');
  lines.push('```');
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push(`*Generated automatically on ${new Date().toLocaleString()}*`);

  return lines.join('\n');
}

// Generate documentation files
console.log('Generating DATABASE_SCHEMA_COMPLETE.md...');
const markdownContent = generateMarkdown();
fs.writeFileSync('./DATABASE_SCHEMA_COMPLETE.md', markdownContent);
console.log('✅ DATABASE_SCHEMA_COMPLETE.md created');

console.log('\nGenerating database-diagram-latest.md...');
const mermaidContent = generateMermaidERD();
fs.writeFileSync('./database-diagram-latest.md', mermaidContent);
console.log('✅ database-diagram-latest.md created');

console.log('\n' + '='.repeat(80));
console.log('DOCUMENTATION GENERATION COMPLETE');
console.log('='.repeat(80));
console.log('\nFiles created:');
console.log('1. DATABASE_SCHEMA_COMPLETE.md - Comprehensive schema documentation');
console.log('2. database-diagram-latest.md - Mermaid ERD diagrams');
console.log('\nNext steps:');
console.log('1. Review the documentation');
console.log('2. Update docs/reports/database-diagram-latest.md if needed');
console.log('3. Use this as foundation for frontend-backend audit');
console.log('='.repeat(80));
