/**
 * Migration: Add code field to roles table
 * This field will store the Cerbos-compatible role identifier
 * while the name field remains the display name
 */

exports.up = async function(knex) {
  // Add code column to roles table
  await knex.schema.alterTable('roles', (table) => {
    table.string('code', 50).after('name');
    table.index('code', 'roles_code_index');
    table.unique('code', 'roles_code_unique');
  });

  // Generate codes for existing roles by converting names
  const roles = await knex('roles').select('id', 'name');

  for (const role of roles) {
    // Convert display name to code format
    // "Super Admin" -> "super_admin"
    // "Assignment Manager" -> "assignment_manager"
    const code = role.name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    await knex('roles')
      .where('id', role.id)
      .update({ code });
  }

  // Make code column NOT NULL after populating
  await knex.schema.alterTable('roles', (table) => {
    table.string('code', 50).notNullable().alter();
  });

  console.log('✅ Added code field to roles table');
};

exports.down = async function(knex) {
  await knex.schema.alterTable('roles', (table) => {
    table.dropColumn('code');
  });

  console.log('✅ Removed code field from roles table');
};