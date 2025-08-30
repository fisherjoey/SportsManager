exports.up = function(knex) {
  return knex.schema
    // Create resource categories table
    .createTable('resource_categories', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name', 100).notNullable();
      table.string('slug', 100).notNullable().unique();
      table.text('description');
      table.string('icon', 50); // Icon name for UI
      table.integer('order_index').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index('slug');
      table.index('is_active');
    })
    // Create resources table
    .createTable('resources', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('category_id').references('id').inTable('resource_categories').onDelete('SET NULL');
      table.string('title', 255).notNullable();
      table.text('description');
      table.string('type', 50).notNullable(); // document, link, video, image
      table.string('file_url', 500); // For uploaded files
      table.string('external_url', 500); // For external links
      table.string('file_name', 255);
      table.integer('file_size'); // In bytes
      table.string('mime_type', 100);
      table.jsonb('metadata').defaultTo('{}'); // Additional data like tags, author, etc
      table.integer('views').defaultTo(0);
      table.integer('downloads').defaultTo(0);
      table.boolean('is_featured').defaultTo(false);
      table.boolean('is_active').defaultTo(true);
      table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
      table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamps(true, true);
      
      table.index('category_id');
      table.index('type');
      table.index('is_featured');
      table.index('is_active');
      table.index('created_at');
    })
    // Create resource access log table for tracking views/downloads
    .createTable('resource_access_logs', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('resource_id').references('id').inTable('resources').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('action', 50).notNullable(); // view, download
      table.string('ip_address', 45);
      table.string('user_agent', 500);
      table.timestamp('accessed_at').defaultTo(knex.fn.now());
      
      table.index('resource_id');
      table.index('user_id');
      table.index('action');
      table.index('accessed_at');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('resource_access_logs')
    .dropTableIfExists('resources')
    .dropTableIfExists('resource_categories');
};