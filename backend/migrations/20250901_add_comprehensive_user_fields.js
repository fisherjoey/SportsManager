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

  // Get existing columns
  const existingColumns = await knex('users').columnInfo();

  await knex.schema.alterTable('users', function(table) {
    // Personal Information
    if (!existingColumns.first_name) table.string('first_name');
    if (!existingColumns.last_name) table.string('last_name');
    if (!existingColumns.date_of_birth) table.date('date_of_birth');

    // Contact Information
    if (!existingColumns.phone) table.string('phone');
    if (!existingColumns.street_address) table.string('street_address');
    if (!existingColumns.city) table.string('city');
    if (!existingColumns.province_state) table.string('province_state');
    if (!existingColumns.postal_zip_code) table.string('postal_zip_code');
    if (!existingColumns.country) table.string('country');

    // Emergency Contact
    if (!existingColumns.emergency_contact_name) table.string('emergency_contact_name');
    if (!existingColumns.emergency_contact_phone) table.string('emergency_contact_phone');

    // Professional Information
    if (!existingColumns.year_started_refereeing) table.integer('year_started_refereeing');
    if (!existingColumns.certifications) table.json('certifications');
    if (!existingColumns.specializations) table.json('specializations');
    if (!existingColumns.availability_status) table.enu('availability_status', ['active', 'inactive', 'on_break']).defaultTo('active');

    // System Information
    if (!existingColumns.organization_id) table.string('organization_id').defaultTo('1');
    if (!existingColumns.registration_date) table.date('registration_date').defaultTo(knex.fn.now());
    if (!existingColumns.last_login) table.timestamp('last_login');
    if (!existingColumns.profile_completion_percentage) table.integer('profile_completion_percentage').defaultTo(0);
    if (!existingColumns.admin_notes) table.text('admin_notes');
    if (!existingColumns.profile_photo_url) table.string('profile_photo_url');

    // Communication Preferences (JSON)
    if (!existingColumns.communication_preferences) table.json('communication_preferences');

    // Banking Information (JSON)
    if (!existingColumns.banking_info) table.json('banking_info');

    // Legacy fields for backward compatibility
    if (!existingColumns.name) table.string('name');
    if (!existingColumns.is_available) table.boolean('is_available').defaultTo(true);
    if (!existingColumns.is_referee) table.boolean('is_referee').defaultTo(false);
  });

  console.log('✅ Comprehensive user fields migration completed');
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