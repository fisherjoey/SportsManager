exports.up = function(knex) {
  return knex.schema.createTable('leagues', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('organization').notNullable(); // e.g. 'Okotoks', 'Calgary'
    table.string('age_group').notNullable(); // e.g. 'U11', 'U13', 'U15'
    table.string('gender').notNullable(); // 'Boys', 'Girls'  
    table.string('division').notNullable(); // e.g. 'Division 1', 'Division 2', 'Premier'
    table.string('season').notNullable(); // e.g. 'Winter 2025', 'Spring 2025'
    table.string('level').notNullable(); // 'Recreational', 'Competitive', 'Elite'
    table.timestamps(true, true);
    
    // Indexes for common queries
    table.index(['organization', 'age_group', 'gender']);
    table.index(['season']);
    table.index(['level']);
    
    // Unique constraint to prevent duplicate leagues
    table.unique(['organization', 'age_group', 'gender', 'division', 'season']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('leagues');
};