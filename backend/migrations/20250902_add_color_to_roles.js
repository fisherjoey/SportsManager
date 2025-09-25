/**
 * Add color field to roles table
 * 
 * Adds a color field to roles to allow visual customization in the UI.
 * Colors will be used in badges and role displays throughout the application.
 */

exports.up = async function(knex) {
  await knex.schema.table('roles', function(table) {
    table.string('color', 7).defaultTo('#6B7280').comment('Hex color code for role badges and display');
  });

  console.log('✓ Added color field to roles table');
};

exports.down = async function(knex) {
  await knex.schema.table('roles', function(table) {
    table.dropColumn('color');
  });

  console.log('✓ Removed color field from roles table');
};