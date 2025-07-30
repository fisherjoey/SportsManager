/**
 * Migration: Create Posts System
 * Creates tables for posts, media attachments, and read receipts
 */

exports.up = function(knex) {
  return knex.schema
    // Create posts table
    .createTable('posts', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('title', 255).notNullable();
      table.text('content').notNullable();
      table.text('excerpt').nullable();
      table.string('status', 20).defaultTo('draft'); // draft, published, archived
      table.string('category', 50).nullable(); // Announcements, Rules, Events, etc.
      table.json('tags').nullable(); // Array of tags
      table.uuid('author_id').references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('published_at').nullable();
      table.timestamps(true, true); // created_at, updated_at
      
      // Indexes
      table.index('status');
      table.index('category');
      table.index('author_id');
      table.index('published_at');
      table.index('created_at');
    })
    
    // Create post media attachments table
    .createTable('post_media', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('post_id').references('id').inTable('posts').onDelete('CASCADE');
      table.string('file_name', 255).notNullable();
      table.string('file_url', 500).notNullable();
      table.string('file_type', 50).notNullable(); // image/jpeg, video/mp4, etc.
      table.integer('file_size').nullable(); // size in bytes
      table.string('alt_text', 255).nullable(); // for accessibility
      table.integer('sort_order').defaultTo(0); // for ordering multiple media
      table.timestamps(true, true);
      
      // Indexes
      table.index('post_id');
      table.index('file_type');
    })
    
    // Create post read receipts table
    .createTable('post_reads', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('post_id').references('id').inTable('posts').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('read_at').defaultTo(knex.fn.now());
      
      // Unique constraint to prevent duplicate reads
      table.unique(['post_id', 'user_id']);
      
      // Indexes
      table.index('post_id');
      table.index('user_id');
      table.index('read_at');
    })
    
    // Create post categories table for better organization
    .createTable('post_categories', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name', 100).notNullable().unique();
      table.string('slug', 100).notNullable().unique();
      table.string('description', 255).nullable();
      table.string('icon', 50).nullable(); // lucide icon name
      table.string('color', 7).nullable(); // hex color code
      table.integer('sort_order').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      // Indexes
      table.index('slug');
      table.index('is_active');
      table.index('sort_order');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('post_reads')
    .dropTableIfExists('post_media')
    .dropTableIfExists('post_categories')
    .dropTableIfExists('posts');
};