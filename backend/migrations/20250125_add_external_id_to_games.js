/**
 * @fileoverview Migration to add external_id column to games table
 * @description Adds external_id column for tracking games imported from external calendar systems
 */

exports.up = function(knex) {
  return knex.schema.hasColumn('games', 'external_id').then(exists => {
    if (!exists) {
      return knex.schema.table('games', function(table) {
        table.string('external_id', 255).index();
        table.comment('External ID for tracking games imported from calendar systems');
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.hasColumn('games', 'external_id').then(exists => {
    if (exists) {
      return knex.schema.table('games', function(table) {
        table.dropColumn('external_id');
      });
    }
  });
};