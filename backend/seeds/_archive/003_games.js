exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('games').del();

  // Insert sample games
  await knex('games').insert([
    {
      home_team_name: 'Lions FC',
      away_team_name: 'Tigers United',
      game_date: '2024-12-25',
      game_time: '10:00',
      location: 'Central Park Stadium',
      postal_code: '12345',
      level: 'Recreational',
      pay_rate: 75.00,
      status: 'unassigned'
    },
    {
      home_team_name: 'Eagles SC',
      away_team_name: 'Hawks FC',
      game_date: '2024-12-26',
      game_time: '14:30',
      location: 'Westside Sports Complex',
      postal_code: '54321',
      level: 'Competitive',
      pay_rate: 100.00,
      status: 'unassigned'
    },
    {
      home_team_name: 'Wolves United',
      away_team_name: 'Bears FC',
      game_date: '2024-12-27',
      game_time: '16:00',
      location: 'Riverside Field',
      postal_code: '67890',
      level: 'Elite',
      pay_rate: 150.00,
      status: 'unassigned'
    }
  ]);
};