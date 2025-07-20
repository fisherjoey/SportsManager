exports.seed = async function(knex) {
  // Get existing referees to avoid duplicates
  const existingReferees = await knex('referees').select('email');
  const existingEmails = existingReferees.map(r => r.email);
  
  // Additional referees with different availability patterns
  const additionalReferees = [
    {
      name: 'Emma Wilson',
      email: 'emma@referee.com',
      phone: '(555) 111-2222',
      level: 'Elite',
      location: 'Northside',
      postal_code: '67890',
      max_distance: 40,
      is_available: true
    },
    {
      name: 'Robert Chen',
      email: 'robert@referee.com',
      phone: '(555) 333-4444',
      level: 'Competitive',
      location: 'Eastside',
      postal_code: '13579',
      max_distance: 35,
      is_available: true
    },
    {
      name: 'Maria Rodriguez',
      email: 'maria@referee.com',
      phone: '(555) 555-6666',
      level: 'Recreational',
      location: 'Southside',
      postal_code: '24680',
      max_distance: 20,
      is_available: true
    },
    {
      name: 'James Kim',
      email: 'james@referee.com',
      phone: '(555) 777-8888',
      level: 'Elite',
      location: 'Central',
      postal_code: '12345',
      max_distance: 50,
      is_available: false // Currently unavailable
    },
    {
      name: 'Lisa Thompson',
      email: 'lisa@referee.com',
      phone: '(555) 999-0000',
      level: 'Competitive',
      location: 'Westside',
      postal_code: '54321',
      max_distance: 30,
      is_available: true
    }
  ];
  
  // Filter out referees that already exist
  const newReferees = additionalReferees.filter(ref => !existingEmails.includes(ref.email));
  
  if (newReferees.length === 0) {
    console.log('No new referees to add');
    return;
  }
  
  // First, we need to create users for these referees
  const users = [];
  for (const referee of newReferees) {
    users.push({
      email: referee.email,
      password_hash: '$2a$10$rQj9.TxzPCdYKIZUxJqxj.7BYhKl9KWZqKGEhAe.S9B1zNVhRBV8C', // "password" hashed
      role: 'referee'
    });
  }
  
  // Insert users
  const insertedUsers = await knex('users').insert(users).returning('*');
  
  // Create referee records
  const refereeRecords = [];
  for (let i = 0; i < newReferees.length; i++) {
    const referee = newReferees[i];
    const user = insertedUsers[i];
    
    refereeRecords.push({
      user_id: user.id,
      name: referee.name,
      email: referee.email,
      phone: referee.phone,
      level: referee.level,
      location: referee.location,
      postal_code: referee.postal_code,
      max_distance: referee.max_distance,
      is_available: referee.is_available
    });
  }
  
  // Insert referees
  const insertedReferees = await knex('referees').insert(refereeRecords).returning('*');
  
  // Create availability patterns for the new referees
  const availabilityData = [];
  const games = await knex('games').select('game_date', 'game_time').distinct();
  
  for (const referee of insertedReferees) {
    if (!referee.is_available) continue; // Skip unavailable referees
    
    for (const game of games) {
      const gameDate = new Date(game.game_date).toISOString().split('T')[0];
      const gameTime = game.game_time;
      const [gameHour, gameMinute] = gameTime.split(':').map(Number);
      
      let shouldBeAvailable = false;
      let startTime, endTime;
      
      switch (referee.name) {
        case 'Emma Wilson':
          // Available evenings and weekends
          if (gameHour >= 16 || new Date(gameDate).getDay() === 0 || new Date(gameDate).getDay() === 6) {
            shouldBeAvailable = true;
            startTime = gameHour >= 16 ? '16:00:00' : '08:00:00';
            endTime = '22:00:00';
          }
          break;
          
        case 'Robert Chen':
          // Available mornings and early afternoons
          if (gameHour >= 8 && gameHour <= 15) {
            shouldBeAvailable = true;
            startTime = '08:00:00';
            endTime = '15:30:00';
          }
          break;
          
        case 'Maria Rodriguez':
          // Available most times but not on certain days
          const dayOfWeek = new Date(gameDate).getDay();
          if (dayOfWeek !== 2 && dayOfWeek !== 4) { // Not Tuesday or Thursday
            shouldBeAvailable = true;
            startTime = '09:00:00';
            endTime = '18:00:00';
          }
          break;
          
        case 'Lisa Thompson':
          // Available afternoons and evenings
          if (gameHour >= 13 && gameHour <= 20) {
            shouldBeAvailable = true;
            startTime = '13:00:00';
            endTime = '21:00:00';
          }
          break;
      }
      
      if (shouldBeAvailable) {
        availabilityData.push({
          referee_id: referee.id,
          date: gameDate,
          start_time: startTime,
          end_time: endTime,
          is_available: true
        });
      }
    }
  }
  
  // Insert availability data
  if (availabilityData.length > 0) {
    await knex('referee_availability').insert(availabilityData);
  }
  
  console.log(`Added ${newReferees.length} new referees with availability patterns`);
};