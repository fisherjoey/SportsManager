const knex = require('../src/config/database');

async function checkTables() {
  try {
    console.log('Checking existing tables in database...\n');
    
    // Get all tables
    const result = await knex.raw(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);
    
    const tables = result.rows.map(row => row.tablename);
    
    console.log('Existing tables:');
    tables.forEach(table => console.log(`  - ${table}`));
    
    // Check if leagues table exists
    const hasLeagues = tables.includes('leagues');
    console.log(`\nLeagues table exists: ${hasLeagues}`);
    
    // Check if audit_logs exists and its structure
    if (tables.includes('audit_logs')) {
      const auditLogColumns = await knex.raw(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'audit_logs' 
        AND column_name = 'user_id';
      `);
      
      if (auditLogColumns.rows.length > 0) {
        console.log(`\nAudit logs user_id type: ${auditLogColumns.rows[0].data_type}`);
      }
    }
    
    // Check knex_migrations table
    const migrations = await knex('knex_migrations').select('*').orderBy('id');
    console.log(`\nCompleted migrations: ${migrations.length}`);
    migrations.forEach(m => console.log(`  - ${m.name}`));
    
  } catch (error) {
    console.error('Error checking tables:', error.message);
  } finally {
    await knex.destroy();
  }
}

checkTables();