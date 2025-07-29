exports.up = async function(knex) {
  // Add roles and white_whistle fields to referees table
  await knex.schema.table('referees', function(table) {
    // Using text array for roles - similar to users table
    table.specificType('roles', 'text[]').defaultTo(knex.raw("'{Referee}'"));
    
    // Boolean field for white whistle indicator
    table.boolean('is_white_whistle').defaultTo(false);
  });

  // Set default roles for existing referees
  await knex('referees').update({ 
    roles: knex.raw("'{Referee}'") 
  });

  // Note: The 'level' column no longer exists in the referees table
  // All existing referees will have is_white_whistle = false by default
  // This can be manually updated later based on business requirements
};

exports.down = async function(knex) {
  await knex.schema.table('referees', function(table) {
    table.dropColumn('roles');
    table.dropColumn('is_white_whistle');
  });
};