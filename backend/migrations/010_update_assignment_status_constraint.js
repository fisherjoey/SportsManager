exports.up = function(knex) {
  return knex.raw(`
    ALTER TABLE game_assignments 
    DROP CONSTRAINT game_assignments_status_check,
    ADD CONSTRAINT game_assignments_status_check 
    CHECK (status = ANY (ARRAY['pending'::text, 'assigned'::text, 'accepted'::text, 'declined'::text, 'completed'::text]))
  `);
};

exports.down = function(knex) {
  return knex.raw(`
    ALTER TABLE game_assignments 
    DROP CONSTRAINT game_assignments_status_check,
    ADD CONSTRAINT game_assignments_status_check 
    CHECK (status = ANY (ARRAY['assigned'::text, 'accepted'::text, 'declined'::text, 'completed'::text]))
  `);
};