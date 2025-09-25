/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Content Categories (hierarchical)
    .createTable('content_categories', function(table) {
      table.increments('id').primary();
      table.string('name', 255).notNullable();
      table.string('slug', 255).notNullable().unique();
      table.text('description');
      table.string('color', 7); // Hex color code
      table.string('icon', 50); // Icon name
      table.integer('parent_id').unsigned().references('id').inTable('content_categories');
      table.boolean('is_active').defaultTo(true);
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['parent_id']);
      table.index(['slug']);
      table.index(['is_active']);
    })
    
    // Main content items
    .createTable('content_items', function(table) {
      table.increments('id').primary();
      table.string('title', 500).notNullable();
      table.string('slug', 500).notNullable();
      table.text('description');
      table.text('content').notNullable(); // HTML content from TinyMCE
      table.text('content_plain'); // Plain text for search
      table.enum('type', ['document', 'video', 'link', 'mixed']).defaultTo('document');
      table.enum('status', ['draft', 'published', 'archived', 'deleted']).defaultTo('draft');
      table.enum('visibility', ['public', 'private', 'restricted']).defaultTo('public');
      table.integer('category_id').unsigned().references('id').inTable('content_categories');
      table.uuid('author_id').references('id').inTable('users');
      table.json('search_keywords'); // Array of keywords for search
      table.boolean('is_featured').defaultTo(false);
      table.datetime('published_at');
      table.timestamps(true, true);
      
      table.index(['slug']);
      table.index(['status']);
      table.index(['visibility']);
      table.index(['category_id']);
      table.index(['author_id']);
      table.index(['published_at']);
      table.index(['status', 'visibility', 'published_at']);
      
      // Ensure slug uniqueness per status (allow same slug for deleted items)
      table.unique(['slug', 'status']);
    })
    
    // Content versions for history tracking
    .createTable('content_versions', function(table) {
      table.increments('id').primary();
      table.integer('content_item_id').unsigned().notNullable().references('id').inTable('content_items');
      table.integer('version_number').notNullable();
      table.string('title', 500).notNullable();
      table.text('content').notNullable();
      table.text('description');
      table.json('search_keywords');
      table.uuid('created_by').references('id').inTable('users');
      table.string('change_summary', 500);
      table.datetime('created_at').defaultTo(knex.fn.now());
      
      table.index(['content_item_id', 'version_number']);
      table.unique(['content_item_id', 'version_number']);
    })
    
    // File attachments
    .createTable('content_attachments', function(table) {
      table.increments('id').primary();
      table.integer('content_item_id').unsigned().references('id').inTable('content_items');
      table.string('file_name', 255).notNullable();
      table.string('file_path', 500).notNullable();
      table.string('file_url', 500).notNullable();
      table.string('file_hash', 64).notNullable(); // SHA-256 hash
      table.integer('file_size').unsigned().notNullable();
      table.string('mime_type', 100).notNullable();
      table.enum('attachment_type', ['image', 'video', 'audio', 'document', 'archive', 'other']).notNullable();
      table.boolean('is_embedded').defaultTo(false); // Embedded in TinyMCE content
      table.string('alt_text', 500); // For images
      table.uuid('uploaded_by').references('id').inTable('users');
      table.timestamps(true, true);
      
      table.index(['content_item_id']);
      table.index(['file_hash']);
      table.index(['attachment_type']);
      table.index(['is_embedded']);
    })
    
    // Content tags (many-to-many)
    .createTable('content_tags', function(table) {
      table.increments('id').primary();
      table.string('name', 100).notNullable().unique();
      table.string('slug', 100).notNullable().unique();
      table.string('color', 7);
      table.integer('usage_count').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['slug']);
      table.index(['usage_count']);
    })
    
    .createTable('content_item_tags', function(table) {
      table.increments('id').primary();
      table.integer('content_item_id').unsigned().notNullable().references('id').inTable('content_items');
      table.integer('tag_id').unsigned().notNullable().references('id').inTable('content_tags');
      table.timestamps(true, true);
      
      table.unique(['content_item_id', 'tag_id']);
      table.index(['content_item_id']);
      table.index(['tag_id']);
    })
    
    // Search index for full-text search
    .createTable('content_search_index', function(table) {
      table.integer('content_item_id').primary().references('id').inTable('content_items');
      table.specificType('search_vector', 'tsvector'); // PostgreSQL full-text search
      table.datetime('last_indexed_at').defaultTo(knex.fn.now());
      
      table.index(['search_vector'], null, 'gin'); // GIN index for tsvector
    })
    
    // Permissions for content access
    .createTable('content_permissions', function(table) {
      table.increments('id').primary();
      table.integer('content_item_id').unsigned().notNullable().references('id').inTable('content_items');
      table.uuid('user_id').references('id').inTable('users');
      table.string('role_name', 50); // Alternative to user_id for role-based permissions
      table.enum('permission_level', ['read', 'write', 'delete', 'publish']).notNullable();
      table.uuid('granted_by').references('id').inTable('users');
      table.datetime('granted_at').defaultTo(knex.fn.now());
      table.datetime('expires_at');
      
      table.index(['content_item_id']);
      table.index(['user_id']);
      table.index(['role_name']);
      
      // Either user_id OR role_name, not both
      table.check('(user_id IS NOT NULL AND role_name IS NULL) OR (user_id IS NULL AND role_name IS NOT NULL)');
    })
    
    // Analytics for content views and downloads
    .createTable('content_analytics', function(table) {
      table.increments('id').primary();
      table.integer('content_item_id').unsigned().notNullable().references('id').inTable('content_items');
      table.uuid('user_id').references('id').inTable('users');
      table.string('ip_address', 45); // IPv6 support
      table.string('user_agent', 500);
      table.enum('action', ['view', 'download', 'share']).notNullable();
      table.integer('time_spent').unsigned(); // Seconds spent reading
      table.datetime('created_at').defaultTo(knex.fn.now());
      
      table.index(['content_item_id', 'action']);
      table.index(['created_at']);
    })
    
    // Monthly analytics summary
    .createTable('content_analytics_monthly', function(table) {
      table.increments('id').primary();
      table.integer('content_item_id').unsigned().notNullable().references('id').inTable('content_items');
      table.integer('year').notNullable();
      table.integer('month').notNullable(); // 1-12
      table.integer('view_count').defaultTo(0);
      table.integer('download_count').defaultTo(0);
      table.integer('unique_viewers').defaultTo(0);
      table.integer('total_time_spent').defaultTo(0); // Total seconds
      table.decimal('bounce_rate', 5, 2).defaultTo(0); // Percentage
      table.datetime('last_updated').defaultTo(knex.fn.now());
      
      table.unique(['content_item_id', 'year', 'month']);
      table.index(['year', 'month']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('content_analytics_monthly')
    .dropTableIfExists('content_analytics')
    .dropTableIfExists('content_permissions')
    .dropTableIfExists('content_search_index')
    .dropTableIfExists('content_item_tags')
    .dropTableIfExists('content_tags')
    .dropTableIfExists('content_attachments')
    .dropTableIfExists('content_versions')
    .dropTableIfExists('content_items')
    .dropTableIfExists('content_categories');
};