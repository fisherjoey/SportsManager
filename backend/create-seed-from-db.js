require('dotenv').config();
const knex = require('knex');
const fs = require('fs');
const path = require('path');

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    database: process.env.DB_NAME || 'sports_manager'
  }
});

async function extractDatabase() {
  try {
    console.log('Extracting database to seed file...\n');

    // Get all tables (excluding knex migration tables)
    const tables = await db('information_schema.tables')
      .select('table_name')
      .where('table_schema', 'public')
      .whereNotIn('table_name', ['knex_migrations', 'knex_migrations_lock'])
      .orderBy('table_name');

    const seedData = {
      timestamp: new Date().toISOString(),
      tables: {}
    };

    // Extract data from each table
    for (const { table_name } of tables) {
      console.log(`Extracting table: ${table_name}`);

      const data = await db(table_name).select('*');
      seedData.tables[table_name] = data;

      console.log(`  - ${data.length} rows`);
    }

    // Save to seed file
    const seedDir = path.join(__dirname, 'seeds');
    if (!fs.existsSync(seedDir)) {
      fs.mkdirSync(seedDir);
    }

    const seedFile = path.join(seedDir, 'full_database.json');
    fs.writeFileSync(seedFile, JSON.stringify(seedData, null, 2));

    console.log(`\n✓ Database extracted to: ${seedFile}`);
    console.log(`  File size: ${(fs.statSync(seedFile).size / 1024).toFixed(2)} KB`);

    // Also create a Knex seed file
    const knexSeedFile = path.join(seedDir, '001_full_database.js');
    const knexSeedContent = `
// Auto-generated seed file from current database
// Generated on: ${new Date().toISOString()}

const seedData = require('./full_database.json');

exports.seed = async function(knex) {
  // Get table names in order (considering foreign keys)
  const tableOrder = [
    'users',
    'roles',
    'permissions',
    'teams',
    'games',
    'referees',
    'user_roles',
    'role_permissions',
    'referee_game_assignments',
    'mentorships',
    'evaluations',
    'communications',
    'expenses',
    // Add other tables as needed
  ];

  // Delete all existing data in reverse order
  console.log('Cleaning existing data...');
  for (const table of [...tableOrder].reverse()) {
    if (seedData.tables[table]) {
      await knex(table).del();
      console.log(\`  Cleaned table: \${table}\`);
    }
  }

  // Insert data in correct order
  console.log('\\nInserting seed data...');
  for (const table of tableOrder) {
    if (seedData.tables[table] && seedData.tables[table].length > 0) {
      await knex(table).insert(seedData.tables[table]);
      console.log(\`  Inserted \${seedData.tables[table].length} rows into \${table}\`);
    }
  }

  // Insert remaining tables not in the ordered list
  for (const [table, data] of Object.entries(seedData.tables)) {
    if (!tableOrder.includes(table) && data.length > 0) {
      try {
        await knex(table).insert(data);
        console.log(\`  Inserted \${data.length} rows into \${table}\`);
      } catch (error) {
        console.error(\`  Error inserting into \${table}:\`, error.message);
      }
    }
  }

  console.log('\\n✓ Database seeding completed');
};
`;

    fs.writeFileSync(knexSeedFile, knexSeedContent);
    console.log(`✓ Knex seed file created: ${knexSeedFile}`);

    process.exit(0);
  } catch (error) {
    console.error('Error extracting database:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

extractDatabase();