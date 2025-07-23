exports.seed = function(knex) {
  // Delete in correct order to respect foreign key constraints
  return knex('game_assignments').del()
    .then(function () {
      return knex('positions').del();
    })
    .then(function () {
      return knex('positions').insert([
        {
          name: 'Lead Official',
          description: 'Lead basketball official responsible for primary game control'
        },
        {
          name: 'Trail Official', 
          description: 'Trail basketball official providing secondary coverage'
        },
        {
          name: 'Center Official',
          description: 'Center basketball official for 3-person crew games'
        }
      ]);
    });
};