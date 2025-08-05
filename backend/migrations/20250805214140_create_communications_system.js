/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('internal_communications', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('title', 200).notNullable();
      table.text('content').notNullable();
      table.enum('type', ['announcement', 'memo', 'policy_update', 'emergency', 'newsletter']).notNullable();
      table.enum('priority', ['low', 'normal', 'high', 'urgent']).defaultTo('normal');
      table.uuid('author_id').references('id').inTable('users').notNullable();
      table.jsonb('target_audience').notNullable();
      table.timestamp('publish_date').defaultTo(knex.fn.now());
      table.timestamp('expiration_date').nullable();
      table.boolean('requires_acknowledgment').defaultTo(false);
      table.jsonb('attachments').nullable();
      table.jsonb('tags').nullable();
      table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('sent_at').nullable();
      
      // Indexes
      table.index(['status', 'publish_date']);
      table.index(['author_id']);
      table.index(['type']);
      table.index(['priority']);
    })
    .createTable('communication_recipients', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('communication_id').references('id').inTable('internal_communications').onDelete('CASCADE').notNullable();
      table.uuid('recipient_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
      table.enum('delivery_method', ['app', 'email', 'sms']).defaultTo('app');
      table.enum('delivery_status', ['pending', 'delivered', 'failed', 'read']).defaultTo('pending');
      table.timestamp('sent_at').nullable();
      table.timestamp('read_at').nullable();
      table.timestamp('acknowledged_at').nullable();
      table.boolean('acknowledged').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Indexes
      table.index(['communication_id']);
      table.index(['recipient_id']);
      table.index(['delivery_status']);
      table.index(['read_at']);
      table.index(['acknowledged_at']);
      
      // Unique constraint to prevent duplicate recipient entries
      table.unique(['communication_id', 'recipient_id']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTable('communication_recipients')
    .dropTable('internal_communications');
};