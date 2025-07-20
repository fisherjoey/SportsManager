exports.seed = function(knex) {
  return knex('positions').del()
    .then(function () {
      return knex('positions').insert([
        {
          name: 'Referee 1',
          description: 'Primary Referee'
        },
        {
          name: 'Referee 2', 
          description: 'Secondary Referee'
        },
        {
          name: 'Referee 3',
          description: 'Third Referee (Optional)'
        }
      ]);
    });
};