#!/usr/bin/env node
/**
 * Generate comprehensive database schema documentation
 * Reads from PostgreSQL database and generates:
 * - Markdown documentation
 * - Mermaid ERD diagram
 * - JSON schema export
 */

const path = require('path');
const fs = require('fs');

// Use pg from backend node_modules
const pgPath = path.join(__dirname, '..', 'backend', 'node_modules', 'pg');
const { Client } = require(pgPath);

// Database configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  database: process.env.DB_NAME || 'sports_management'
};

const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'schema');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const client = new Client(DB_CONFIG);

async function generateSchemaDocs() {
  console.log('🔍 Connecting to database...');
  await client.connect();

  console.log('📊 Fetching schema information...');

  // Get all tables
  const tablesResult = await client.query(`
    SELECT
      table_name,
      obj_description(
        (quote_ident(table_schema) || '.' || quote_ident(table_name))::regclass,
        'pg_class'
      ) as table_comment
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const tables = tablesResult.rows;
  console.log(`✓ Found ${tables.length} tables`);

  const schema = {};

  // For each table, get detailed information
  for (const table of tables) {
    const tableName = table.table_name;

    // Get columns with detailed info
    const columnsResult = await client.query(`
      SELECT
        c.column_name,
        c.data_type,
        c.character_maximum_length,
        c.is_nullable,
        c.column_default,
        pgd.description as column_comment,
        CASE
          WHEN pk.column_name IS NOT NULL THEN true
          ELSE false
        END as is_primary_key,
        CASE
          WHEN uq.column_name IS NOT NULL THEN true
          ELSE false
        END as is_unique
      FROM information_schema.columns c
      LEFT JOIN pg_catalog.pg_statio_all_tables st
        ON c.table_schema = st.schemaname
        AND c.table_name = st.relname
      LEFT JOIN pg_catalog.pg_description pgd
        ON pgd.objoid = st.relid
        AND pgd.objsubid = c.ordinal_position
      LEFT JOIN (
        SELECT ku.column_name, ku.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.column_name = pk.column_name AND c.table_name = pk.table_name
      LEFT JOIN (
        SELECT ku.column_name, ku.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'UNIQUE'
      ) uq ON c.column_name = uq.column_name AND c.table_name = uq.table_name
      WHERE c.table_name = $1
      ORDER BY c.ordinal_position
    `, [tableName]);

    // Get foreign keys
    const foreignKeysResult = await client.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = $1
    `, [tableName]);

    // Get indexes
    const indexesResult = await client.query(`
      SELECT
        i.relname as index_name,
        a.attname as column_name,
        ix.indisunique as is_unique,
        ix.indisprimary as is_primary
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relname = $1
        AND t.relkind = 'r'
        AND a.attnum > 0
      ORDER BY i.relname, a.attnum
    `, [tableName]);

    // Get check constraints
    const constraintsResult = await client.query(`
      SELECT
        con.conname as constraint_name,
        pg_get_constraintdef(con.oid) as constraint_definition
      FROM pg_catalog.pg_constraint con
      JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = $1
        AND con.contype = 'c'
    `, [tableName]);

    schema[tableName] = {
      comment: table.table_comment,
      columns: columnsResult.rows,
      foreign_keys: foreignKeysResult.rows,
      indexes: indexesResult.rows,
      constraints: constraintsResult.rows
    };
  }

  console.log('📝 Generating documentation...');

  // Generate outputs
  await generateMarkdown(schema);
  await generateMermaidERD(schema);
  await generateJSON(schema);
  await generateSQLDump();

  await client.end();
  console.log('✅ Schema documentation generated successfully!');
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
}

function generateMarkdown(schema) {
  let md = '# Database Schema Documentation\n\n';
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += `**Database:** ${DB_CONFIG.database}\n\n`;
  md += `**Total Tables:** ${Object.keys(schema).length}\n\n`;

  md += '## Table of Contents\n\n';
  for (const tableName of Object.keys(schema).sort()) {
    md += `- [${tableName}](#${tableName.toLowerCase().replace(/_/g, '-')})\n`;
  }
  md += '\n---\n\n';

  // Table details
  for (const [tableName, info] of Object.entries(schema).sort()) {
    md += `## ${tableName}\n\n`;

    if (info.comment) {
      md += `> ${info.comment}\n\n`;
    }

    md += '### Columns\n\n';
    md += '| Column | Type | Nullable | Default | Constraints |\n';
    md += '|--------|------|----------|---------|-------------|\n';

    for (const col of info.columns) {
      const type = col.character_maximum_length
        ? `${col.data_type}(${col.character_maximum_length})`
        : col.data_type;

      const constraints = [];
      if (col.is_primary_key) constraints.push('PK');
      if (col.is_unique) constraints.push('UNIQUE');

      const defaultVal = col.column_default
        ? col.column_default.substring(0, 30) + (col.column_default.length > 30 ? '...' : '')
        : '-';

      md += `| ${col.column_name} | ${type} | ${col.is_nullable} | ${defaultVal} | ${constraints.join(', ') || '-'} |\n`;
    }

    if (info.foreign_keys.length > 0) {
      md += '\n### Foreign Keys\n\n';
      md += '| Column | References | On Delete | On Update |\n';
      md += '|--------|------------|-----------|----------|\n';
      for (const fk of info.foreign_keys) {
        md += `| ${fk.column_name} | ${fk.foreign_table_name}.${fk.foreign_column_name} | ${fk.delete_rule} | ${fk.update_rule} |\n`;
      }
    }

    if (info.indexes.length > 0) {
      md += '\n### Indexes\n\n';
      const indexMap = {};
      for (const idx of info.indexes) {
        if (!indexMap[idx.index_name]) {
          indexMap[idx.index_name] = {
            columns: [],
            is_unique: idx.is_unique,
            is_primary: idx.is_primary
          };
        }
        indexMap[idx.index_name].columns.push(idx.column_name);
      }

      md += '| Index Name | Columns | Type |\n';
      md += '|------------|---------|------|\n';
      for (const [name, data] of Object.entries(indexMap)) {
        const type = data.is_primary ? 'PRIMARY KEY' : data.is_unique ? 'UNIQUE' : 'INDEX';
        md += `| ${name} | ${data.columns.join(', ')} | ${type} |\n`;
      }
    }

    if (info.constraints.length > 0) {
      md += '\n### Check Constraints\n\n';
      for (const con of info.constraints) {
        md += `- **${con.constraint_name}**: \`${con.constraint_definition}\`\n`;
      }
    }

    md += '\n---\n\n';
  }

  // Write to file
  const outputPath = path.join(OUTPUT_DIR, 'CURRENT_SCHEMA.md');
  fs.writeFileSync(outputPath, md);
  console.log(`✓ Generated: ${outputPath}`);
}

function generateMermaidERD(schema) {
  let mermaid = '```mermaid\nerDiagram\n';

  // Define all tables first
  for (const [tableName, info] of Object.entries(schema)) {
    mermaid += `  ${tableName.toUpperCase()} {\n`;

    for (const col of info.columns.slice(0, 10)) { // Limit columns for readability
      const type = col.data_type.toUpperCase();
      const constraints = [];
      if (col.is_primary_key) constraints.push('PK');
      if (col.is_unique) constraints.push('UK');
      if (col.is_nullable === 'NO') constraints.push('NOT NULL');

      const constraintStr = constraints.length > 0 ? ` "${constraints.join(',')}"` : '';
      mermaid += `    ${type} ${col.column_name}${constraintStr}\n`;
    }

    if (info.columns.length > 10) {
      mermaid += `    string ..._${info.columns.length - 10}_more_columns\n`;
    }

    mermaid += '  }\n\n';
  }

  // Define relationships
  for (const [tableName, info] of Object.entries(schema)) {
    for (const fk of info.foreign_keys) {
      // Determine relationship cardinality
      const isUnique = info.columns.find(c => c.column_name === fk.column_name)?.is_unique;
      const relationship = isUnique ? '||--||' : '}o--||';

      mermaid += `  ${tableName.toUpperCase()} ${relationship} ${fk.foreign_table_name.toUpperCase()} : "${fk.column_name}"\n`;
    }
  }

  mermaid += '```\n';

  // Write to file
  const outputPath = path.join(OUTPUT_DIR, 'schema-erd.md');
  const fullDoc = `# Database Entity Relationship Diagram\n\n**Generated:** ${new Date().toISOString()}\n\n${mermaid}`;
  fs.writeFileSync(outputPath, fullDoc);
  console.log(`✓ Generated: ${outputPath}`);
}

function generateJSON(schema) {
  const outputPath = path.join(OUTPUT_DIR, 'schema.json');
  const jsonOutput = {
    generated_at: new Date().toISOString(),
    database: DB_CONFIG.database,
    tables: schema
  };
  fs.writeFileSync(outputPath, JSON.stringify(jsonOutput, null, 2));
  console.log(`✓ Generated: ${outputPath}`);
}

async function generateSQLDump() {
  // Use pg_dump for accurate SQL representation
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);

  const outputPath = path.join(OUTPUT_DIR, 'schema.sql');
  const dumpCommand = `PGPASSWORD=${DB_CONFIG.password} "${process.env.PGBIN || 'C:/Program Files/PostgreSQL/17/bin'}/pg_dump" -h ${DB_CONFIG.host} -U ${DB_CONFIG.user} --schema-only --no-owner --no-privileges ${DB_CONFIG.database}`;

  try {
    const { stdout } = await execPromise(dumpCommand);
    fs.writeFileSync(outputPath, stdout);
    console.log(`✓ Generated: ${outputPath}`);
  } catch (error) {
    console.error('⚠️  Could not generate SQL dump:', error.message);
  }
}

// Run the generator
generateSchemaDocs().catch(error => {
  console.error('❌ Error generating schema documentation:', error);
  process.exit(1);
});