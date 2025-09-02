/**
 * Add comprehensive user fields migration
 * 
 * Adds all the missing user fields to support the enhanced user management frontend:
 * - Personal information (first_name, last_name, date_of_birth)
 * - Contact information (phone, address fields, emergency contacts)
 * - Professional information (year_started_refereeing, certifications, specializations)
 * - System information (availability_status, communication preferences, banking info)
 */

exports.up = async function(knex) {
  console.log('Adding comprehensive user fields...');

  await knex.schema.alterTable('users', function(table) {
    // Personal Information
    table.string('first_name');
    table.string('last_name');
    table.date('date_of_birth');
    
    // Contact Information  
    table.string('phone');
    table.string('street_address');
    table.string('city');
    table.string('province_state');
    table.string('postal_zip_code');
    table.string('country');
    
    // Emergency Contact
    table.string('emergency_contact_name');
    table.string('emergency_contact_phone');
    
    // Professional Information
    table.integer('year_started_refereeing');
    table.json('certifications'); // Array of certification strings
    table.json('specializations'); // Array of specialization strings
    table.enu('availability_status', ['active', 'inactive', 'on_break']).defaultTo('active');
    
    // System Information
    table.string('organization_id').defaultTo('1');
    table.date('registration_date').defaultTo(knex.fn.now());
    table.timestamp('last_login');
    table.integer('profile_completion_percentage').defaultTo(0);
    table.text('admin_notes');
    table.string('profile_photo_url');
    
    // Communication Preferences (JSON)
    table.json('communication_preferences');
    
    // Banking Information (JSON)
    table.json('banking_info');
    
    // Legacy fields for backward compatibility
    table.string('name'); // Computed from first_name + last_name
    table.boolean('is_available').defaultTo(true);
    table.boolean('is_referee').defaultTo(false);
    
    // Add indexes for frequently queried fields
    table.index('first_name');
    table.index('last_name');
    table.index('phone');
    table.index('postal_zip_code');
    table.index('availability_status');
    table.index('year_started_refereeing');
    table.index('is_available');
    table.index('is_referee');
  });

  console.log('✅ Comprehensive user fields added successfully');
  console.log('   Added personal, contact, professional, and system fields');
  console.log('   Added JSON fields for preferences and banking info');
  console.log('   Added indexes for performance optimization');
};

exports.down = async function(knex) {
  console.log('Removing comprehensive user fields...');

  await knex.schema.alterTable('users', function(table) {
    // Remove all the fields we added
    table.dropColumn('first_name');
    table.dropColumn('last_name');
    table.dropColumn('date_of_birth');
    table.dropColumn('phone');
    table.dropColumn('street_address');
    table.dropColumn('city');
    table.dropColumn('province_state');
    table.dropColumn('postal_zip_code');
    table.dropColumn('country');
    table.dropColumn('emergency_contact_name');
    table.dropColumn('emergency_contact_phone');
    table.dropColumn('year_started_refereeing');
    table.dropColumn('certifications');
    table.dropColumn('specializations');
    table.dropColumn('availability_status');
    table.dropColumn('organization_id');
    table.dropColumn('registration_date');
    table.dropColumn('last_login');
    table.dropColumn('profile_completion_percentage');
    table.dropColumn('admin_notes');
    table.dropColumn('profile_photo_url');
    table.dropColumn('communication_preferences');
    table.dropColumn('banking_info');
    table.dropColumn('name');
    table.dropColumn('is_available');
    table.dropColumn('is_referee');
  });

  console.log('✅ Comprehensive user fields removed');
};