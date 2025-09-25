/**
 * Enhanced RBAC with Referee System - Phase 1
 * 
 * Adds referee-specific enhancements to the existing RBAC system:
 * - Adds category and referee_config columns to roles table
 * - Creates referee_profiles table for individual referee data
 * - Adds database constraints and validation functions
 * 
 * This migration builds on the existing RBAC foundation without breaking changes.
 */

exports.up = async function(knex) {
  console.log('Starting referee system enhancement...');

  // Step 1: Add referee-specific columns to existing roles table
  await knex.schema.alterTable('roles', function(table) {
    table.string('category', 50).comment('Role category (referee_type, referee_capability, system, etc.)');
    table.jsonb('referee_config').comment('Referee-specific configuration (wage rates, requirements, etc.)');
  });

  // Add indexes for the new columns
  await knex.schema.alterTable('roles', function(table) {
    table.index(['category']);
  });

  console.log('✓ Enhanced roles table with referee columns');

  // Step 2: Create referee_profiles table
  await knex.schema.createTable('referee_profiles', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');

    // Individual Compensation
    table.decimal('wage_amount', 8, 2).notNullable().comment('Individual negotiated wage per game');
    table.string('wage_currency', 3).defaultTo('CAD').comment('Currency code');
    table.string('payment_method', 20).defaultTo('direct_deposit').comment('Preferred payment method');

    // Experience & Qualifications
    table.integer('years_experience').notNullable().defaultTo(0).comment('Years of refereeing experience');
    table.decimal('evaluation_score', 5, 2).comment('Performance evaluation score (0-100)');

    // Certifications
    table.string('certification_number', 50).comment('Official certification number');
    table.date('certification_date').comment('Date certification was obtained');
    table.date('certification_expiry').comment('Date certification expires');
    table.string('certification_level', 50).comment('Certification level or type');

    // Individual Flags & Preferences
    table.boolean('is_white_whistle').defaultTo(false).comment('White whistle flag (Junior referees only)');
    table.integer('max_weekly_games').defaultTo(10).comment('Maximum games per week preference');
    table.jsonb('preferred_positions').comment('Array of preferred positions ["Referee", "AR1", "AR2", "4th Official"]');
    table.jsonb('availability_pattern').comment('Weekly availability preferences');

    // Contact & Emergency
    table.jsonb('emergency_contact').comment('Emergency contact information {name, phone, relationship}');
    table.jsonb('special_qualifications').comment('Additional certifications, languages, skills, etc.');

    // Admin Notes
    table.text('notes').comment('Administrative notes about the referee');
    table.boolean('is_active').defaultTo(true).comment('Whether the referee profile is active');

    // Audit Trail
    table.timestamps(true, true);

    // Add constraints
    table.check('?? >= 0 AND ?? <= 100', ['evaluation_score', 'evaluation_score']);
    table.check('?? > 0', ['wage_amount']);
    table.check('?? >= 0', ['years_experience']);
    table.check('?? > 0', ['max_weekly_games']);
  });

  // Add indexes for performance
  await knex.schema.alterTable('referee_profiles', function(table) {
    table.index(['user_id']);
    table.index(['is_active']);
    table.index(['wage_amount']);
    table.index(['years_experience']);
  });

  console.log('✓ Created referee_profiles table');

  // Step 3: Create validation function for referee role constraints
  await knex.raw(`
    CREATE OR REPLACE FUNCTION validate_referee_roles()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Check if user has a referee profile
      IF EXISTS (SELECT 1 FROM referee_profiles WHERE user_id = NEW.user_id AND is_active = true) THEN
        -- Count referee_type roles for this user
        IF (
          SELECT COUNT(*)
          FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = NEW.user_id
            AND ur.is_active = true
            AND r.category = 'referee_type'
        ) > 1 THEN
          RAISE EXCEPTION 'Referees can have at most one referee_type role';
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE TRIGGER referee_role_validation
      AFTER INSERT OR UPDATE ON user_roles
      FOR EACH ROW EXECUTE FUNCTION validate_referee_roles();
  `);

  console.log('✓ Created referee role validation trigger');

  // Step 4: Create validation function for referee profile constraints
  await knex.raw(`
    CREATE OR REPLACE FUNCTION validate_referee_profile()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Check if user has at least one referee_type role
      IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = NEW.user_id
          AND ur.is_active = true
          AND r.category = 'referee_type'
      ) THEN
        RAISE EXCEPTION 'User must have a referee_type role to have an active referee profile';
      END IF;

      -- Validate white whistle logic: only Junior referees can have white whistle flag
      IF NEW.is_white_whistle = true THEN
        IF NOT EXISTS (
          SELECT 1 FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = NEW.user_id
            AND ur.is_active = true
            AND r.category = 'referee_type'
            AND r.name = 'Junior Referee'
        ) THEN
          RAISE EXCEPTION 'Only Junior Referees can have the white whistle flag set to true';
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE TRIGGER referee_profile_validation
      BEFORE INSERT OR UPDATE ON referee_profiles
      FOR EACH ROW EXECUTE FUNCTION validate_referee_profile();
  `);

  console.log('✓ Created referee profile validation trigger');

  console.log('✅ Referee system enhancement migration completed successfully');
};

exports.down = async function(knex) {
  console.log('Rolling back referee system enhancement...');

  // Drop triggers and functions
  await knex.raw('DROP TRIGGER IF EXISTS referee_profile_validation ON referee_profiles;');
  await knex.raw('DROP TRIGGER IF EXISTS referee_role_validation ON user_roles;');
  await knex.raw('DROP FUNCTION IF EXISTS validate_referee_profile();');
  await knex.raw('DROP FUNCTION IF EXISTS validate_referee_roles();');

  // Drop referee_profiles table
  await knex.schema.dropTableIfExists('referee_profiles');

  // Remove columns from roles table
  await knex.schema.alterTable('roles', function(table) {
    table.dropColumn('referee_config');
    table.dropColumn('category');
  });

  console.log('✓ Referee system enhancement rollback completed');
};