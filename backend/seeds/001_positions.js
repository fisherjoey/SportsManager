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
          description: 'Lead basketball official responsible for primary game control and court management'
        },
        {
          name: 'Trail Official', 
          description: 'Trail basketball official providing secondary coverage and defensive positioning'
        },
        {
          name: 'Center Official',
          description: 'Center basketball official for 3-person crew games, covering paint area'
        },
        {
          name: 'Referee 1',
          description: 'Primary referee position for 2-person crew games'
        },
        {
          name: 'Referee 2',
          description: 'Secondary referee position for 2-person crew games'
        },
        {
          name: 'Linesman',
          description: 'Linesman position for specialized court coverage (alternative to center)'
        },
        {
          name: 'Evaluator',
          description: 'Senior official observing and evaluating referee performance'
        },
        {
          name: 'Mentor',
          description: 'Experienced official providing guidance and development support'
        }
      ]);
    });
};