/**
 * Mentoring System Migration
 * 
 * Creates comprehensive database tables for the mentoring system:
 * - mentorships: Main mentorship relationships between users
 * - mentorship_notes: Notes and progress tracking for mentorships
 * - mentorship_documents: Document storage and sharing within mentorships
 * 
 * This system supports:
 * - Mentor-mentee relationships with status tracking
 * - Rich text notes with categorization and privacy controls
 * - Document management with file metadata
 * - Complete audit trail with timestamps
 */

exports.up = async function(knex) {
  // Create mentorships table - core mentorship relationships
  await knex.schema.createTable('mentorships', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      .comment('Primary key for mentorship relationship');
    
    table.uuid('mentor_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE')
      .comment('User ID of the mentor');
    
    table.uuid('mentee_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE')
      .comment('User ID of the mentee');
    
    table.date('start_date').notNullable()
      .comment('Date when the mentorship relationship began');
    
    table.date('end_date').nullable()
      .comment('Date when the mentorship relationship ended (null for active)');
    
    table.enu('status', ['active', 'paused', 'completed', 'terminated'])
      .notNullable().defaultTo('active')
      .comment('Current status of the mentorship relationship');
    
    table.text('notes').nullable()
      .comment('General notes about the mentorship relationship');
    
    table.timestamps(true, true);
    
    // Constraints
    table.unique(['mentor_id', 'mentee_id'], 'unique_mentor_mentee_pair');
    table.check('mentor_id != mentee_id', [], 'mentor_mentee_different');
    
    // Indexes for performance
    table.index(['mentor_id'], 'idx_mentorships_mentor');
    table.index(['mentee_id'], 'idx_mentorships_mentee');
    table.index(['status'], 'idx_mentorships_status');
    table.index(['start_date'], 'idx_mentorships_start_date');
    table.index(['end_date'], 'idx_mentorships_end_date');
  });

  // Create mentorship_notes table - progress tracking and communication
  await knex.schema.createTable('mentorship_notes', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      .comment('Primary key for mentorship note');
    
    table.uuid('mentorship_id').notNullable()
      .references('id').inTable('mentorships').onDelete('CASCADE')
      .comment('Reference to the mentorship relationship');
    
    table.uuid('author_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE')
      .comment('User ID of the note author (typically the mentor)');
    
    table.string('title', 255).notNullable()
      .comment('Title or subject of the note');
    
    table.text('content', 'longtext').notNullable()
      .comment('Rich text content from TinyMCE editor');
    
    table.enu('note_type', ['progress', 'concern', 'achievement', 'general'])
      .notNullable().defaultTo('general')
      .comment('Categorization of the note type');
    
    table.boolean('is_private').notNullable().defaultTo(false)
      .comment('Whether this note is private to the mentor or visible to mentee');
    
    table.timestamps(true, true);
    
    // Indexes for performance
    table.index(['mentorship_id'], 'idx_mentorship_notes_mentorship');
    table.index(['author_id'], 'idx_mentorship_notes_author');
    table.index(['note_type'], 'idx_mentorship_notes_type');
    table.index(['is_private'], 'idx_mentorship_notes_privacy');
    table.index(['created_at'], 'idx_mentorship_notes_created');
  });

  // Create mentorship_documents table - document management
  await knex.schema.createTable('mentorship_documents', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      .comment('Primary key for mentorship document');
    
    table.uuid('mentorship_id').notNullable()
      .references('id').inTable('mentorships').onDelete('CASCADE')
      .comment('Reference to the mentorship relationship');
    
    table.string('document_name', 255).notNullable()
      .comment('Original filename of the uploaded document');
    
    table.string('document_path', 500).notNullable()
      .comment('Storage path or URL for the document');
    
    table.string('document_type', 100).notNullable()
      .comment('MIME type of the document (e.g., application/pdf)');
    
    table.bigInteger('file_size').notNullable()
      .comment('File size in bytes');
    
    table.uuid('uploaded_by').notNullable()
      .references('id').inTable('users').onDelete('CASCADE')
      .comment('User ID of who uploaded the document');
    
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
      .comment('When the document was uploaded');
    
    // Indexes for performance
    table.index(['mentorship_id'], 'idx_mentorship_documents_mentorship');
    table.index(['uploaded_by'], 'idx_mentorship_documents_uploader');
    table.index(['document_type'], 'idx_mentorship_documents_type');
    table.index(['created_at'], 'idx_mentorship_documents_created');
    table.index(['file_size'], 'idx_mentorship_documents_size');
  });

  console.log('✓ Mentoring system tables created successfully');
  console.log('  - mentorships: Core mentorship relationships');
  console.log('  - mentorship_notes: Progress tracking and communication');
  console.log('  - mentorship_documents: Document management and sharing');
};

exports.down = async function(knex) {
  // Drop tables in reverse order to handle foreign key constraints
  await knex.schema.dropTableIfExists('mentorship_documents');
  await knex.schema.dropTableIfExists('mentorship_notes');
  await knex.schema.dropTableIfExists('mentorships');
  
  console.log('✓ Mentoring system tables dropped successfully');
};