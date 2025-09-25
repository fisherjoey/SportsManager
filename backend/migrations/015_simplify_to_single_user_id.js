exports.up = async function(knex) {
  // Add referee fields to users table
  await knex.schema.table('users', function(table) {
    table.string('name');
    table.string('phone');
    table.string('location');
    table.string('postal_code');
    table.integer('max_distance').defaultTo(25);
    table.boolean('is_available').defaultTo(true);
    table.decimal('wage_per_game', 8, 2);
    table.uuid('referee_level_id').references('id').inTable('referee_levels');
    table.integer('years_experience');
    table.integer('games_refereed_season').defaultTo(0);
    table.decimal('evaluation_score', 4, 2);
    table.text('notes');
  });

  // Copy data from referees table to users table
  const referees = await knex('referees').select('*');
  for (const referee of referees) {
    await knex('users').where('id', referee.user_id).update({
      name: referee.name,
      phone: referee.phone,
      location: referee.location,
      postal_code: referee.postal_code,
      max_distance: referee.max_distance,
      is_available: referee.is_available,
      wage_per_game: referee.wage_per_game,
      referee_level_id: referee.referee_level_id,
      years_experience: referee.years_experience,
      games_refereed_season: referee.games_refereed_season,
      evaluation_score: referee.evaluation_score,
      notes: referee.notes
    });
  }

  // Update game_assignments to reference user_id instead of referee_id
  await knex.schema.table('game_assignments', function(table) {
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
  });

  // Copy referee_id to user_id in game_assignments
  const assignments = await knex('game_assignments')
    .join('referees', 'game_assignments.referee_id', 'referees.id')
    .select('game_assignments.id', 'referees.user_id');
  
  for (const assignment of assignments) {
    await knex('game_assignments')
      .where('id', assignment.id)
      .update({ user_id: assignment.user_id });
  }

  // Drop the old referee_id column and constraints
  await knex.schema.table('game_assignments', function(table) {
    table.dropForeign('referee_id');
    table.dropUnique(['game_id', 'referee_id']);
    table.dropIndex(['referee_id']);
    table.dropColumn('referee_id');
  });

  // Add new constraints for user_id
  await knex.schema.table('game_assignments', function(table) {
    table.unique(['game_id', 'user_id']);
    table.index(['user_id']);
  });

  // Drop dependent tables first
  await knex.schema.dropTableIfExists('referee_availability');
  
  // Drop the referees table
  await knex.schema.dropTable('referees');
};

exports.down = async function(knex) {
  // Recreate referees table
  await knex.schema.createTable('referees', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('email').notNullable();
    table.string('phone').nullable();
    table.string('location').nullable();
    table.string('postal_code').notNullable();
    table.integer('max_distance').defaultTo(25);
    table.boolean('is_available').defaultTo(true);
    table.decimal('wage_per_game', 8, 2);
    table.uuid('referee_level_id').references('id').inTable('referee_levels');
    table.integer('years_experience');
    table.integer('games_refereed_season').defaultTo(0);
    table.decimal('evaluation_score', 4, 2);
    table.text('notes');
    table.timestamps(true, true);
  });

  // Copy data back from users to referees
  const users = await knex('users').where('role', 'referee').select('*');
  for (const user of users) {
    await knex('referees').insert({
      user_id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      location: user.location,
      postal_code: user.postal_code,
      max_distance: user.max_distance,
      is_available: user.is_available,
      wage_per_game: user.wage_per_game,
      referee_level_id: user.referee_level_id,
      years_experience: user.years_experience,
      games_refereed_season: user.games_refereed_season,
      evaluation_score: user.evaluation_score,
      notes: user.notes
    });
  }

  // Add referee_id back to game_assignments
  await knex.schema.table('game_assignments', function(table) {
    table.uuid('referee_id').references('id').inTable('referees').onDelete('CASCADE');
  });

  // Copy user_id back to referee_id
  const assignments = await knex('game_assignments')
    .join('referees', 'game_assignments.user_id', 'referees.user_id')
    .select('game_assignments.id', 'referees.id as referee_id');
  
  for (const assignment of assignments) {
    await knex('game_assignments')
      .where('id', assignment.id)
      .update({ referee_id: assignment.referee_id });
  }

  // Drop user_id column and constraints
  await knex.schema.table('game_assignments', function(table) {
    table.dropForeign('user_id');
    table.dropUnique(['game_id', 'user_id']);
    table.dropIndex(['user_id']);
    table.dropColumn('user_id');
  });

  // Re-add referee_id constraints
  await knex.schema.table('game_assignments', function(table) {
    table.unique(['game_id', 'referee_id']);
    table.index(['referee_id']);
  });

  // Remove referee fields from users table
  await knex.schema.table('users', function(table) {
    table.dropColumn('name');
    table.dropColumn('phone');
    table.dropColumn('location');
    table.dropColumn('postal_code');
    table.dropColumn('max_distance');
    table.dropColumn('is_available');
    table.dropColumn('wage_per_game');
    table.dropColumn('referee_level_id');
    table.dropColumn('years_experience');
    table.dropColumn('games_refereed_season');
    table.dropColumn('evaluation_score');
    table.dropColumn('notes');
  });
};