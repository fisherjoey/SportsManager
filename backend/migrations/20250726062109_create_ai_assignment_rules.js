/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('ai_assignment_rules', function (table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.text('description');
      table.boolean('enabled').defaultTo(true);
      
      // Schedule configuration
      table.enu('schedule_type', ['manual', 'recurring', 'one-time']).notNullable().defaultTo('manual');
      table.enu('frequency', ['daily', 'weekly', 'monthly']).nullable();
      table.string('day_of_week').nullable();
      table.integer('day_of_month').nullable();
      table.time('schedule_time').nullable();
      table.date('start_date').nullable();
      table.date('end_date').nullable();
      table.timestamp('next_run').nullable();
      
      // Assignment criteria
      table.specificType('game_types', 'text[]').defaultTo('{}');
      table.specificType('age_groups', 'text[]').defaultTo('{}');
      table.integer('max_days_ahead').defaultTo(14);
      table.string('min_referee_level').defaultTo('Rookie');
      table.boolean('prioritize_experience').defaultTo(true);
      table.boolean('avoid_back_to_back').defaultTo(true);
      table.integer('max_distance').defaultTo(25);
      
      // AI System configuration
      table.enu('ai_system_type', ['algorithmic', 'llm']).notNullable().defaultTo('algorithmic');
      
      // Algorithmic settings
      table.integer('distance_weight').defaultTo(40);
      table.integer('skill_weight').defaultTo(30);
      table.integer('experience_weight').defaultTo(20);
      table.integer('partner_preference_weight').defaultTo(10);
      
      // LLM settings
      table.string('llm_model').defaultTo('gpt-4o');
      table.decimal('temperature', 2, 1).defaultTo(0.3);
      table.text('context_prompt');
      table.boolean('include_comments').defaultTo(true);
      
      // Tracking
      table.timestamp('last_run').nullable();
      table.enu('last_run_status', ['success', 'error', 'partial']).nullable();
      table.integer('assignments_created').defaultTo(0);
      table.integer('conflicts_found').defaultTo(0);
      
      table.timestamps(true, true);
      
      // Indexes
      table.index(['enabled']);
      table.index(['schedule_type']);
      table.index(['next_run']);
      table.index(['ai_system_type']);
    })
    .createTable('ai_assignment_partner_preferences', function (table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('rule_id').references('id').inTable('ai_assignment_rules').onDelete('CASCADE');
      table.uuid('referee1_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('referee2_id').references('id').inTable('users').onDelete('CASCADE');
      table.enu('preference_type', ['preferred', 'avoid']).notNullable();
      
      table.timestamps(true, true);
      
      // Indexes and constraints
      table.index(['rule_id']);
      table.index(['referee1_id']);
      table.index(['referee2_id']);
      table.unique(['rule_id', 'referee1_id', 'referee2_id']);
    })
    .createTable('ai_assignment_rule_runs', function (table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('rule_id').references('id').inTable('ai_assignment_rules').onDelete('CASCADE');
      table.timestamp('run_date').notNullable();
      table.enu('status', ['success', 'error', 'partial']).notNullable();
      table.enu('ai_system_used', ['algorithmic', 'llm']).notNullable();
      table.integer('games_processed').defaultTo(0);
      table.integer('assignments_created').defaultTo(0);
      table.integer('conflicts_found').defaultTo(0);
      table.decimal('duration_seconds', 8, 2).defaultTo(0);
      table.specificType('context_comments', 'text[]').defaultTo('{}');
      table.jsonb('run_details').defaultTo('{}');
      table.text('error_message').nullable();
      
      table.timestamps(true, true);
      
      // Indexes
      table.index(['rule_id']);
      table.index(['run_date']);
      table.index(['status']);
      table.index(['ai_system_used']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('ai_assignment_rule_runs')
    .dropTableIfExists('ai_assignment_partner_preferences')
    .dropTableIfExists('ai_assignment_rules');
};