
// Auto-generated seed file from current database
// Generated on: 2025-09-26T03:48:56.950Z

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
      console.log(`  Cleaned table: ${table}`);
    }
  }

  // Insert data in correct order
  console.log('\nInserting seed data...');
  for (const table of tableOrder) {
    if (seedData.tables[table] && seedData.tables[table].length > 0) {
      await knex(table).insert(seedData.tables[table]);
      console.log(`  Inserted ${seedData.tables[table].length} rows into ${table}`);
    }
  }

  // Insert remaining tables not in the ordered list
  for (const [table, data] of Object.entries(seedData.tables)) {
    if (!tableOrder.includes(table) && data.length > 0) {
      try {
        await knex(table).insert(data);
        console.log(`  Inserted ${data.length} rows into ${table}`);
      } catch (error) {
        console.error(`  Error inserting into ${table}:`, error.message);
      }
    }
  }

  console.log('\n✓ Database seeding completed');
};
