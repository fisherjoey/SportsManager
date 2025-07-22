exports.up = async function(knex) {
  // Add roles array column to users table
  await knex.schema.table('users', function(table) {
    // Using text array - PostgreSQL native support, clean and efficient
    table.specificType('roles', 'text[]').defaultTo('{}');
  });

  // Migrate existing role data to roles array
  // Admin users get ['admin'] array
  await knex('users')
    .where('role', 'admin')
    .update({ 
      roles: knex.raw("ARRAY['admin']::text[]")
    });

  // Referee users get ['referee'] array  
  await knex('users')
    .where('role', 'referee')
    .update({ 
      roles: knex.raw("ARRAY['referee']::text[]")
    });
  
  // Note: We keep the existing 'role' column for backward compatibility
  // It can be removed in a future migration once all code is updated
};

exports.down = async function(knex) {
  // Simply drop the roles column - existing role column provides fallback
  await knex.schema.table('users', function(table) {
    table.dropColumn('roles');
  });
};