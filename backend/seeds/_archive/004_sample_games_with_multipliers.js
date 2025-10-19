exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('game_assignments').del();
  await knex('games').del();
  
  // Inserts seed entries with wage multipliers
  await knex('games').insert([
    {
      home_team_name: 'Eagles',
      away_team_name: 'Hawks',
      game_date: '2024-12-25',
      game_time: '10:00',
      location: 'Downtown Arena',
      postal_code: 'T1T1T1',
      level: 'Recreational',
      pay_rate: 25,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.5,
      wage_multiplier_reason: 'Holiday game bonus'
    },
    {
      home_team_name: 'Lions',
      away_team_name: 'Tigers',
      game_date: '2024-12-26',
      game_time: '14:00',
      location: 'Sports Complex',
      postal_code: 'T2T2T2',
      level: 'Recreational',
      pay_rate: 20,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.0,
      wage_multiplier_reason: null
    },
    {
      home_team_name: 'Warriors',
      away_team_name: 'Knights',
      game_date: '2024-12-27',
      game_time: '18:00',
      location: 'Championship Stadium',
      postal_code: 'T3T3T3',
      level: 'Elite',
      pay_rate: 50,
      refs_needed: 3,
      status: 'unassigned',
      wage_multiplier: 2.0,
      wage_multiplier_reason: 'Championship game'
    },
    {
      home_team_name: 'Sharks',
      away_team_name: 'Dolphins',
      game_date: '2024-12-28',
      game_time: '16:00',
      location: 'Riverside Park',
      postal_code: 'T4T4T4',
      level: 'Recreational',
      pay_rate: 25,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.25,
      wage_multiplier_reason: 'Playoff game'
    }
  ]);
};