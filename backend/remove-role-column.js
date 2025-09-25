const db = require('./src/config/database');

async function removeRoleColumn() {
  try {
    console.log('Removing legacy role column from users table...');
    
    // Check if column exists first
    const columnExists = await db.schema.hasColumn('users', 'role');
    
    if (columnExists) {
      await db.schema.alterTable('users', table => {
        table.dropColumn('role');
      });
      console.log('✅ Successfully removed role column');
    } else {
      console.log('ℹ️ Role column does not exist (already removed)');
    }
    
    // List remaining columns
    const userColumns = await db('information_schema.columns')
      .where({ table_name: 'users' })
      .select('column_name')
      .orderBy('ordinal_position');
    
    console.log('\nRemaining columns in users table:');
    userColumns.forEach(col => console.log('  -', col.column_name));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

removeRoleColumn();