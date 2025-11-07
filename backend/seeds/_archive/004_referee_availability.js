exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('referee_availability').del();
  
  // Get all referees
  const referees = await knex('referees').select('id', 'name');
  
  // Get all games to understand the time slots needed
  const games = await knex('games').select('game_date', 'game_time').distinct();
  
  const availabilityData = [];
  
  // For each referee, create availability windows
  for (const referee of referees) {
    // Create availability for each game date
    for (const game of games) {
      const gameDate = new Date(game.game_date).toISOString().split('T')[0];
      const gameTime = game.game_time;
      
      // Parse game time to determine availability window
      const [gameHour, gameMinute] = gameTime.split(':').map(Number);
      
      // Create different availability patterns for different referees
      const refName = referee.name;
      
      if (refName === 'Mike Johnson') {
        // Mike is available most mornings and afternoons
        if (gameHour >= 9 && gameHour <= 16) {
          availabilityData.push({
            referee_id: referee.id,
            date: gameDate,
            start_time: '09:00:00',
            end_time: '17:00:00',
            is_available: true
          });
        }
      } else if (refName === 'Sarah Davis') {
        // Sarah is available afternoons and evenings
        if (gameHour >= 12 && gameHour <= 20) {
          availabilityData.push({
            referee_id: referee.id,
            date: gameDate,
            start_time: '12:00:00',
            end_time: '21:00:00',
            is_available: true
          });
        }
      } else if (refName === 'John Doe') {
        // John is available all day but not on certain dates
        const dayOfWeek = new Date(gameDate).getDay();
        // Not available on Sundays (0)
        if (dayOfWeek !== 0) {
          availabilityData.push({
            referee_id: referee.id,
            date: gameDate,
            start_time: '08:00:00',
            end_time: '22:00:00',
            is_available: true
          });
        }
      } else {
        // Other referees have varied availability
        // Create some available, some not
        const random = Math.random();
        if (random > 0.3) { // 70% chance of being available
          const startHour = Math.max(8, gameHour - 2);
          const endHour = Math.min(22, gameHour + 4);
          
          availabilityData.push({
            referee_id: referee.id,
            date: gameDate,
            start_time: `${startHour.toString().padStart(2, '0')}:00:00`,
            end_time: `${endHour.toString().padStart(2, '0')}:00:00`,
            is_available: true
          });
        }
      }
    }
    
    // Add some general availability for weekends
    const weekendDates = [
      '2024-12-28', '2024-12-29', // Saturday, Sunday
      '2025-01-04', '2025-01-05', // Saturday, Sunday
      '2025-01-11', '2025-01-12'  // Saturday, Sunday
    ];
    
    for (const date of weekendDates) {
      if (referee.name === 'Mike Johnson') {
        availabilityData.push({
          referee_id: referee.id,
          date: date,
          start_time: '10:00:00',
          end_time: '18:00:00',
          is_available: true
        });
      } else if (referee.name === 'Sarah Davis') {
        availabilityData.push({
          referee_id: referee.id,
          date: date,
          start_time: '14:00:00',
          end_time: '20:00:00',
          is_available: true
        });
      }
    }
  }
  
  // Insert the availability data
  if (availabilityData.length > 0) {
    await knex('referee_availability').insert(availabilityData);
  }
};