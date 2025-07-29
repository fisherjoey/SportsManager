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

  // Update existing referees based on their level
  // Learning and Learning+ levels typically use white whistles
  // Use the old 'level' column to determine white whistle status
  await knex('referees')
    .whereIn('level', ['Recreational']) // Assuming Recreational maps to Learning levels
    .update({ is_white_whistle: true });
};

exports.down = async function(knex) {
  await knex.schema.table('referees', function(table) {
    table.dropColumn('roles');
    table.dropColumn('is_white_whistle');
  });
};