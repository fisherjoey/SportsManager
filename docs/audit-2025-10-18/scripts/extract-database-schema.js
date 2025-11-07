const { Client } = require('pg');
const fs = require('fs');

// PostgreSQL connection configuration
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'sports_management',
  user: 'postgres',
  password: 'postgres123'
});

// Schema data structure
const schemaData = {
  metadata: {
    database: 'sports_management',
    extractedAt: new Date().toISOString(),
    totalTables: 0,
    totalColumns: 0,
    totalIndexes: 0,
    totalConstraints: 0
  },
  tables: {},
  relationships: [],
  categories: {}
};

// Categorization patterns
const categoryPatterns = {
  'User Management': ['users', 'user_roles', 'user_preferences', 'user_sessions', 'user_notes', 'user_availability'],
  'Authentication & Security': ['sessions', 'tokens', 'password_resets', 'api_keys', 'audit_logs'],
  'RBAC & Permissions': ['roles', 'permissions', 'role_permissions', 'user_permissions', 'cerbos', 'policies'],
  'Games & Assignments': ['games', 'game_assignments', 'game_fees', 'game_notes', 'game_officials', 'assignments', 'self_assignments'],
  'Teams & Leagues': ['teams', 'leagues', 'team_members', 'league_teams', 'seasons'],
  'Locations & Facilities': ['locations', 'location_contacts', 'facilities', 'venues'],
  'Organizations': ['organizations', 'organization_members', 'organization_settings', 'organization_invitations'],
  'Referees & Officials': ['referees', 'referee_levels', 'referee_certifications', 'referee_availability', 'referee_preferences', 'officials'],
  'Mentorship': ['mentorships', 'mentorship_sessions', 'mentee_games', 'mentorship_feedback', 'mentor_assignments'],
  'Communications': ['communications', 'messages', 'notifications', 'email_templates', 'sms_logs', 'communication_templates'],
  'Financial': ['invoices', 'payments', 'payment_methods', 'transactions', 'budgets', 'expenses', 'expense_receipts', 'purchase_orders', 'financial_reports', 'accounting', 'company_credit_cards'],
  'Employee Management': ['employees', 'employee_positions', 'employee_contracts', 'payroll', 'timesheets'],
  'Documents & Content': ['documents', 'document_templates', 'document_versions', 'content', 'posts', 'articles', 'media_files'],
  'Analytics & Reports': ['reports', 'analytics', 'metrics', 'dashboards', 'historic_patterns', 'statistics'],
  'AI & Machine Learning': ['ai_suggestions', 'ai_assignment_rules', 'ml_models', 'predictions', 'chunks', 'embeddings'],
  'Calendar & Scheduling': ['calendar_events', 'schedules', 'time_slots', 'availability', 'blackout_dates'],
  'Tournament Management': ['tournaments', 'tournament_brackets', 'tournament_games', 'tournament_teams'],
  'Assets & Resources': ['assets', 'equipment', 'inventory', 'asset_assignments'],
  'Compliance & Tracking': ['compliance_records', 'certifications', 'background_checks', 'insurance'],
  'System & Configuration': ['settings', 'configurations', 'system_logs', 'migrations', 'knex_migrations', 'knex_migrations_lock']
};

// Categorize table
function categorizeTable(tableName) {
  for (const [category, patterns] of Object.entries(categoryPatterns)) {
    for (const pattern of patterns) {
      if (tableName.includes(pattern) || pattern.includes(tableName)) {
        return category;
      }
    }
  }
  return 'Other';
}

// Get PostgreSQL data type mapping
function formatDataType(columnType, charMaxLength, numericPrecision, numericScale) {
  if (columnType === 'character varying') {
    return charMaxLength ? `varchar(${charMaxLength})` : 'varchar';
  }
  if (columnType === 'numeric' && numericPrecision) {
    return numericScale ? `numeric(${numericPrecision},${numericScale})` : `numeric(${numericPrecision})`;
  }
  if (columnType === 'timestamp without time zone') {
    return 'timestamp';
  }
  if (columnType === 'timestamp with time zone') {
    return 'timestamptz';
  }
  return columnType;
}

async function extractSchema() {
  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    console.log('Connected successfully!\n');

    // 1. Get all tables
    console.log('Step 1: Fetching all tables...');
    const tablesQuery = `
      SELECT
        table_name,
        table_schema
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    const tablesResult = await client.query(tablesQuery);
    const tables = tablesResult.rows;
    schemaData.metadata.totalTables = tables.length;
    console.log(`Found ${tables.length} tables\n`);

    // 2. For each table, get detailed information
    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`Processing table: ${tableName}`);

      schemaData.tables[tableName] = {
        name: tableName,
        category: categorizeTable(tableName),
        columns: [],
        primaryKeys: [],
        foreignKeys: [],
        uniqueConstraints: [],
        checkConstraints: [],
        indexes: [],
        rowCount: 0
      };

      // Get columns
      const columnsQuery = `
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          numeric_precision,
          numeric_scale,
          is_nullable,
          column_default,
          ordinal_position
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
        ORDER BY ordinal_position;
      `;
      const columnsResult = await client.query(columnsQuery, [tableName]);

      for (const col of columnsResult.rows) {
        const column = {
          name: col.column_name,
          type: formatDataType(
            col.data_type,
            col.character_maximum_length,
            col.numeric_precision,
            col.numeric_scale
          ),
          nullable: col.is_nullable === 'YES',
          default: col.column_default,
          position: col.ordinal_position
        };
        schemaData.tables[tableName].columns.push(column);
        schemaData.metadata.totalColumns++;
      }

      // Get primary key constraints
      const pkQuery = `
        SELECT
          kcu.column_name,
          tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = $1
        ORDER BY kcu.ordinal_position;
      `;
      const pkResult = await client.query(pkQuery, [tableName]);
      schemaData.tables[tableName].primaryKeys = pkResult.rows.map(r => ({
        column: r.column_name,
        constraintName: r.constraint_name
      }));

      // Get foreign key constraints
      const fkQuery = `
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          tc.constraint_name,
          rc.update_rule,
          rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
          AND rc.constraint_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = $1;
      `;
      const fkResult = await client.query(fkQuery, [tableName]);

      for (const fk of fkResult.rows) {
        const foreignKey = {
          column: fk.column_name,
          referencesTable: fk.foreign_table_name,
          referencesColumn: fk.foreign_column_name,
          constraintName: fk.constraint_name,
          onUpdate: fk.update_rule,
          onDelete: fk.delete_rule
        };
        schemaData.tables[tableName].foreignKeys.push(foreignKey);

        // Also add to relationships array
        schemaData.relationships.push({
          from: tableName,
          fromColumn: fk.column_name,
          to: fk.foreign_table_name,
          toColumn: fk.foreign_column_name,
          constraintName: fk.constraint_name,
          onUpdate: fk.update_rule,
          onDelete: fk.delete_rule
        });
      }

      // Get unique constraints
      const uniqueQuery = `
        SELECT
          tc.constraint_name,
          array_agg(kcu.column_name ORDER BY kcu.ordinal_position) as columns
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'UNIQUE'
          AND tc.table_schema = 'public'
          AND tc.table_name = $1
        GROUP BY tc.constraint_name;
      `;
      const uniqueResult = await client.query(uniqueQuery, [tableName]);
      schemaData.tables[tableName].uniqueConstraints = uniqueResult.rows.map(r => ({
        name: r.constraint_name,
        columns: r.columns
      }));

      // Get check constraints
      const checkQuery = `
        SELECT
          cc.constraint_name,
          cc.check_clause
        FROM information_schema.check_constraints cc
        JOIN information_schema.table_constraints tc
          ON cc.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1;
      `;
      const checkResult = await client.query(checkQuery, [tableName]);
      schemaData.tables[tableName].checkConstraints = checkResult.rows.map(r => ({
        name: r.constraint_name,
        definition: r.check_clause
      }));

      // Get indexes
      const indexQuery = `
        SELECT
          i.relname as index_name,
          a.attname as column_name,
          ix.indisunique as is_unique,
          ix.indisprimary as is_primary,
          am.amname as index_type
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        JOIN pg_am am ON i.relam = am.oid
        WHERE t.relkind = 'r'
          AND t.relname = $1
        ORDER BY i.relname, a.attnum;
      `;
      const indexResult = await client.query(indexQuery, [tableName]);

      // Group indexes by index name
      const indexMap = {};
      for (const idx of indexResult.rows) {
        if (!indexMap[idx.index_name]) {
          indexMap[idx.index_name] = {
            name: idx.index_name,
            columns: [],
            unique: idx.is_unique,
            primary: idx.is_primary,
            type: idx.index_type
          };
        }
        indexMap[idx.index_name].columns.push(idx.column_name);
      }
      schemaData.tables[tableName].indexes = Object.values(indexMap);
      schemaData.metadata.totalIndexes += Object.keys(indexMap).length;

      // Get approximate row count
      try {
        const countQuery = `SELECT COUNT(*) as count FROM "${tableName}";`;
        const countResult = await client.query(countQuery);
        schemaData.tables[tableName].rowCount = parseInt(countResult.rows[0].count);
      } catch (err) {
        console.log(`  Warning: Could not count rows for ${tableName}: ${err.message}`);
        schemaData.tables[tableName].rowCount = 0;
      }

      // Add to category
      const category = schemaData.tables[tableName].category;
      if (!schemaData.categories[category]) {
        schemaData.categories[category] = [];
      }
      schemaData.categories[category].push(tableName);
    }

    // Calculate total constraints
    schemaData.metadata.totalConstraints = Object.values(schemaData.tables).reduce((sum, table) => {
      return sum +
        table.primaryKeys.length +
        table.foreignKeys.length +
        table.uniqueConstraints.length +
        table.checkConstraints.length;
    }, 0);

    // Save to JSON file
    const jsonOutputPath = './database-schema-complete.json';
    fs.writeFileSync(jsonOutputPath, JSON.stringify(schemaData, null, 2));
    console.log(`\n✅ Schema data saved to: ${jsonOutputPath}`);

    // Generate summary
    console.log('\n' + '='.repeat(80));
    console.log('DATABASE SCHEMA EXTRACTION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Database: ${schemaData.metadata.database}`);
    console.log(`Extracted at: ${schemaData.metadata.extractedAt}`);
    console.log(`Total Tables: ${schemaData.metadata.totalTables}`);
    console.log(`Total Columns: ${schemaData.metadata.totalColumns}`);
    console.log(`Total Indexes: ${schemaData.metadata.totalIndexes}`);
    console.log(`Total Constraints: ${schemaData.metadata.totalConstraints}`);
    console.log(`Total Relationships: ${schemaData.relationships.length}`);
    console.log('\nTables by Category:');

    const sortedCategories = Object.entries(schemaData.categories).sort((a, b) => b[1].length - a[1].length);
    for (const [category, tables] of sortedCategories) {
      console.log(`  ${category}: ${tables.length} tables`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\nNext step: Run node generate-schema-documentation.js to create markdown files');

  } catch (error) {
    console.error('Error extracting schema:', error);
    throw error;
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

// Run the extraction
extractSchema().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
