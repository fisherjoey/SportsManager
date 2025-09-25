const db = require('./src/config/database');

async function createContentTables() {
  try {
    console.log('Creating content management tables...');
    
    // Create content_categories table
    await db.schema.createTable('content_categories', function(table) {
      table.increments('id').primary();
      table.string('name', 255).notNullable().unique();
      table.string('slug', 255).notNullable().unique();
      table.text('description');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
    console.log('✅ Created content_categories table');

    // Create content_items table
    await db.schema.createTable('content_items', function(table) {
      table.increments('id').primary();
      table.string('title', 255).notNullable();
      table.string('slug', 255).notNullable().unique();
      table.text('content').notNullable();
      table.text('description');
      table.integer('category_id').references('id').inTable('content_categories');
      table.string('type', 50).defaultTo('document');
      table.string('status', 50).defaultTo('draft');
      table.string('visibility', 50).defaultTo('public');
      table.uuid('author_id').references('id').inTable('users');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
    console.log('✅ Created content_items table');

    // Insert default categories
    await db('content_categories').insert([
      {
        name: 'General Information',
        slug: 'general-information',
        description: 'Meeting schedules, announcements, and organizational updates'
      },
      {
        name: 'Referee Resources',
        slug: 'referee-resources', 
        description: 'Training materials, assessment tools, and development resources'
      },
      {
        name: 'Member Services',
        slug: 'member-services',
        description: 'Tools and resources for active members'
      },
      {
        name: 'Training',
        slug: 'training',
        description: 'Educational content and skill development materials'
      }
    ]);
    console.log('✅ Inserted default categories');

    console.log('✅ Content management system ready!');
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Content tables already exist');
    } else {
      console.error('Error creating content tables:', error);
    }
  } finally {
    await db.destroy();
  }
}

createContentTables();