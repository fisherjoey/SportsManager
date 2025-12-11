/**
 * Mentorship System Migration
 *
 * Creates database tables for the mentorship system:
 * - mentees: Mentee records linked to users
 * - mentors: Mentor records linked to users
 * - mentorship_assignments: Mentor-mentee pairings
 * - mentee_profiles: Development profiles for mentees
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Create mentees table (if not exists)
  if (!(await knex.schema.hasTable('mentees'))) {
    await knex.schema.createTable('mentees', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('first_name', 255).notNullable();
      table.string('last_name', 255).notNullable();
      table.string('email', 255).notNullable();
      table.string('phone', 50);
      table.date('date_of_birth');
      table.text('profile_photo_url');
      table.string('emergency_contact_name', 255);
      table.string('emergency_contact_phone', 50);
      table.text('street_address');
      table.string('city', 100);
      table.string('province_state', 100);
      table.string('postal_zip_code', 20);
      table.timestamps(true, true);

      table.index(['user_id']);
      table.index(['email']);
    });
    console.log('✓ Created mentees table');
  } else {
    console.log('⏭ mentees table already exists, skipping');
  }

  // 2. Create mentors table (if not exists)
  if (!(await knex.schema.hasTable('mentors'))) {
    await knex.schema.createTable('mentors', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('first_name', 255).notNullable();
      table.string('last_name', 255).notNullable();
      table.string('email', 255).notNullable();
      table.text('specialization');
      table.text('bio');
      table.timestamps(true, true);

      table.index(['user_id']);
      table.index(['email']);
    });
    console.log('✓ Created mentors table');
  } else {
    console.log('⏭ mentors table already exists, skipping');
  }

  // 3. Create mentorship_assignments table (if not exists)
  if (!(await knex.schema.hasTable('mentorship_assignments'))) {
    await knex.schema.createTable('mentorship_assignments', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('mentor_id').notNullable().references('id').inTable('mentors').onDelete('CASCADE');
      table.uuid('mentee_id').notNullable().references('id').inTable('mentees').onDelete('CASCADE');
      table.string('status', 50).notNullable().defaultTo('active');
      table.date('start_date').notNullable();
      table.date('end_date');
      table.timestamps(true, true);

      table.index(['mentor_id']);
      table.index(['mentee_id']);
      table.index(['status']);
      table.unique(['mentor_id', 'mentee_id']);
    });

    // Add check constraint for status
    await knex.raw(`
      ALTER TABLE mentorship_assignments
      ADD CONSTRAINT mentorship_assignments_status_check
      CHECK (status IN ('active', 'completed', 'paused', 'terminated'))
    `);
    console.log('✓ Created mentorship_assignments table');
  } else {
    console.log('⏭ mentorship_assignments table already exists, skipping');
  }

  // 4. Create mentee_profiles table (if not exists)
  if (!(await knex.schema.hasTable('mentee_profiles'))) {
    await knex.schema.createTable('mentee_profiles', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('mentee_id').notNullable().references('id').inTable('mentees').onDelete('CASCADE').unique();
      table.string('current_level', 100);
      table.jsonb('development_goals').defaultTo('[]');
      table.jsonb('strengths').defaultTo('[]');
      table.jsonb('areas_for_improvement').defaultTo('[]');
      table.timestamps(true, true);

      table.index(['mentee_id']);
      table.index(['current_level']);
    });
    console.log('✓ Created mentee_profiles table');
  } else {
    console.log('⏭ mentee_profiles table already exists, skipping');
  }

  console.log('✓ Mentorship tables migration complete');
};

exports.down = async function(knex) {
  // Drop in reverse order due to FK dependencies
  await knex.schema.dropTableIfExists('mentee_profiles');
  await knex.schema.dropTableIfExists('mentorship_assignments');
  await knex.schema.dropTableIfExists('mentors');
  await knex.schema.dropTableIfExists('mentees');
  console.log('✓ Dropped mentorship tables');
};
