/**
 * Tournament Generation Utilities
 * Supports various tournament formats including Round Robin, Single Elimination, 
 * Double Elimination, Swiss System, and Group Stage + Playoffs
 */

/**
 * Generate Round Robin tournament
 * Every team plays every other team once
 */
function generateRoundRobin(teams, options = {}) {
  const {
    venue = 'TBD',
    startDate = new Date(),
    timeSlots = ['10:00', '12:00', '14:00', '16:00', '18:00'],
    daysOfWeek = [6, 0], // Saturday and Sunday
    gamesPerDay = 3
  } = options;

  if (teams.length < 2) {
    throw new Error('At least 2 teams required for Round Robin');
  }

  const games = [];
  const rounds = [];
  let currentDate = new Date(startDate);
  let gameCounter = 0;

  // Generate all possible matchups
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      // Find next available date
      while (!daysOfWeek.includes(currentDate.getDay()) || 
             gameCounter >= gamesPerDay) {
        if (gameCounter >= gamesPerDay) {
          currentDate.setDate(currentDate.getDate() + 1);
          gameCounter = 0;
        } else {
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      const game = {
        home_team_id: teams[i].id,
        away_team_id: teams[j].id,
        home_team_name: teams[i].name,
        away_team_name: teams[j].name,
        game_date: new Date(currentDate).toISOString().split('T')[0],
        game_time: timeSlots[gameCounter % timeSlots.length],
        location: venue,
        round: Math.floor(games.length / Math.floor(teams.length / 2)) + 1,
        tournament_type: 'round_robin'
      };

      games.push(game);
      gameCounter++;

      // If we've scheduled all games for this day, move to next day
      if (gameCounter >= gamesPerDay) {
        currentDate.setDate(currentDate.getDate() + 1);
        gameCounter = 0;
      }
    }
  }

  // Group games into rounds
  const gamesPerRound = Math.floor(teams.length / 2);
  for (let i = 0; i < games.length; i += gamesPerRound) {
    rounds.push({
      round: Math.floor(i / gamesPerRound) + 1,
      games: games.slice(i, i + gamesPerRound)
    });
  }

  return {
    type: 'round_robin',
    total_games: games.length,
    total_rounds: rounds.length,
    games,
    rounds,
    summary: {
      teams_count: teams.length,
      games_per_team: teams.length - 1,
      estimated_duration_days: Math.ceil(games.length / gamesPerDay),
      format: 'Every team plays every other team once'
    }
  };
}

/**
 * Generate Single Elimination tournament
 * Teams are eliminated after one loss
 */
function generateSingleElimination(teams, options = {}) {
  const {
    venue = 'TBD',
    startDate = new Date(),
    timeSlots = ['10:00', '12:00', '14:00', '16:00'],
    daysOfWeek = [6, 0], // Saturday and Sunday
    seedingMethod = 'random' // 'random', 'ranked', 'custom'
  } = options;

  if (teams.length < 2) {
    throw new Error('At least 2 teams required for Single Elimination');
  }

  // Seed teams
  let seededTeams = [...teams];
  if (seedingMethod === 'random') {
    seededTeams = shuffleArray([...teams]);
  } else if (seedingMethod === 'ranked') {
    seededTeams = teams.sort((a, b) => (a.rank || 1) - (b.rank || 1));
  }

  // Add byes if necessary (must be power of 2)
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(teams.length)));
  const byesNeeded = nextPowerOfTwo - teams.length;
  
  for (let i = 0; i < byesNeeded; i++) {
    seededTeams.push({ id: `bye-${i}`, name: 'BYE', is_bye: true });
  }

  const games = [];
  const rounds = [];
  let currentRound = 1;
  let currentTeams = [...seededTeams];
  let currentDate = new Date(startDate);
  let gameCounter = 0;

  while (currentTeams.length > 1) {
    const roundGames = [];
    const winners = [];

    // Create matchups for this round
    for (let i = 0; i < currentTeams.length; i += 2) {
      const team1 = currentTeams[i];
      const team2 = currentTeams[i + 1];

      // Handle byes
      if (team1.is_bye) {
        winners.push(team2);
        continue;
      }
      if (team2.is_bye) {
        winners.push(team1);
        continue;
      }

      // Find next available date
      while (!daysOfWeek.includes(currentDate.getDay())) {
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const game = {
        home_team_id: team1.id,
        away_team_id: team2.id,
        home_team_name: team1.name,
        away_team_name: team2.name,
        game_date: new Date(currentDate).toISOString().split('T')[0],
        game_time: timeSlots[gameCounter % timeSlots.length],
        location: venue,
        round: currentRound,
        round_name: getRoundName(currentRound, Math.log2(nextPowerOfTwo)),
        tournament_type: 'single_elimination'
      };

      roundGames.push(game);
      games.push(game);
      
      // Winner TBD - will be determined after game
      winners.push({ 
        id: `winner-${game.home_team_id}-${game.away_team_id}`,
        name: `Winner of ${team1.name} vs ${team2.name}`,
        is_placeholder: true,
        source_game: game
      });

      gameCounter++;
    }

    rounds.push({
      round: currentRound,
      round_name: getRoundName(currentRound, Math.log2(nextPowerOfTwo)),
      games: roundGames
    });

    currentTeams = winners;
    currentRound++;
    
    // Move to next day for next round
    currentDate.setDate(currentDate.getDate() + 1);
    gameCounter = 0;
  }

  return {
    type: 'single_elimination',
    total_games: games.length,
    total_rounds: rounds.length,
    games,
    rounds,
    summary: {
      teams_count: teams.length,
      byes_added: byesNeeded,
      max_games_per_team: Math.log2(nextPowerOfTwo),
      estimated_duration_days: rounds.length,
      format: 'Single elimination - lose and you are out'
    }
  };
}

/**
 * Generate Swiss System tournament
 * Teams play a fixed number of rounds, paired by similar records
 */
function generateSwissSystem(teams, options = {}) {
  const {
    venue = 'TBD',
    startDate = new Date(),
    timeSlots = ['10:00', '12:00', '14:00', '16:00'],
    daysOfWeek = [6, 0], // Saturday and Sunday
    rounds: totalRounds = Math.ceil(Math.log2(teams.length)) + 1
  } = options;

  if (teams.length < 4) {
    throw new Error('At least 4 teams required for Swiss System');
  }

  const games = [];
  const rounds = [];
  let currentDate = new Date(startDate);

  // Initialize team records
  const teamRecords = teams.map(team => ({
    ...team,
    wins: 0,
    losses: 0,
    opponents: []
  }));

  for (let round = 1; round <= totalRounds; round++) {
    // Sort teams by record (wins desc, then by tiebreakers)
    teamRecords.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      // Add more tiebreaker logic here if needed
      return (a.rank || 1) - (b.rank || 1);
    });

    const roundGames = [];
    const pairedTeams = new Set();

    // Pair teams with similar records
    for (let i = 0; i < teamRecords.length; i++) {
      if (pairedTeams.has(teamRecords[i].id)) continue;

      const team1 = teamRecords[i];
      let team2 = null;

      // Find best opponent for team1
      for (let j = i + 1; j < teamRecords.length; j++) {
        const candidate = teamRecords[j];
        if (pairedTeams.has(candidate.id)) continue;
        if (team1.opponents.includes(candidate.id)) continue;

        team2 = candidate;
        break;
      }

      // If no ideal opponent, pair with next available
      if (!team2) {
        for (let j = i + 1; j < teamRecords.length; j++) {
          const candidate = teamRecords[j];
          if (!pairedTeams.has(candidate.id)) {
            team2 = candidate;
            break;
          }
        }
      }

      if (team2) {
        // Find next available date
        while (!daysOfWeek.includes(currentDate.getDay())) {
          currentDate.setDate(currentDate.getDate() + 1);
        }

        const game = {
          home_team_id: team1.id,
          away_team_id: team2.id,
          home_team_name: team1.name,
          away_team_name: team2.name,
          game_date: new Date(currentDate).toISOString().split('T')[0],
          game_time: timeSlots[roundGames.length % timeSlots.length],
          location: venue,
          round: round,
          tournament_type: 'swiss_system'
        };

        roundGames.push(game);
        games.push(game);
        
        pairedTeams.add(team1.id);
        pairedTeams.add(team2.id);
        
        // Update opponent lists
        team1.opponents.push(team2.id);
        team2.opponents.push(team1.id);
      }
    }

    rounds.push({
      round: round,
      games: roundGames
    });

    // Move to next round date
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    type: 'swiss_system',
    total_games: games.length,
    total_rounds: rounds.length,
    games,
    rounds,
    summary: {
      teams_count: teams.length,
      rounds: totalRounds,
      games_per_team: totalRounds,
      estimated_duration_days: totalRounds,
      format: `Swiss system - ${totalRounds} rounds, paired by similar records`
    }
  };
}

/**
 * Generate Group Stage + Playoffs tournament
 * Teams divided into groups, top teams advance to elimination playoffs
 */
function generateGroupStagePlayoffs(teams, options = {}) {
  const {
    venue = 'TBD',
    startDate = new Date(),
    timeSlots = ['10:00', '12:00', '14:00', '16:00'],
    daysOfWeek = [6, 0],
    groupSize = 4,
    advancePerGroup = 2,
    playoffFormat = 'single_elimination'
  } = options;

  if (teams.length < 4) {
    throw new Error('At least 4 teams required for Group Stage + Playoffs');
  }

  const games = [];
  const rounds = [];
  let currentDate = new Date(startDate);

  // Divide teams into groups
  const numGroups = Math.ceil(teams.length / groupSize);
  const groups = [];
  
  for (let i = 0; i < numGroups; i++) {
    const groupTeams = teams.slice(i * groupSize, (i + 1) * groupSize);
    groups.push({
      id: i + 1,
      name: `Group ${String.fromCharCode(65 + i)}`, // Group A, B, C...
      teams: groupTeams
    });
  }

  let roundCounter = 1;

  // Generate group stage games (round robin within each group)
  for (const group of groups) {
    if (group.teams.length < 2) continue;

    // Generate round robin for this group
    for (let i = 0; i < group.teams.length; i++) {
      for (let j = i + 1; j < group.teams.length; j++) {
        // Find next available date
        while (!daysOfWeek.includes(currentDate.getDay())) {
          currentDate.setDate(currentDate.getDate() + 1);
        }

        const game = {
          home_team_id: group.teams[i].id,
          away_team_id: group.teams[j].id,
          home_team_name: group.teams[i].name,
          away_team_name: group.teams[j].name,
          game_date: new Date(currentDate).toISOString().split('T')[0],
          game_time: timeSlots[games.length % timeSlots.length],
          location: venue,
          round: roundCounter,
          group_id: group.id,
          group_name: group.name,
          stage: 'group_stage',
          tournament_type: 'group_stage_playoffs'
        };

        games.push(game);
      }
    }
  }

  // Create rounds for group stage
  const groupGames = games.filter(g => g.stage === 'group_stage');
  const gamesPerRound = Math.ceil(groupGames.length / 3); // Spread across ~3 rounds
  
  for (let i = 0; i < groupGames.length; i += gamesPerRound) {
    rounds.push({
      round: roundCounter++,
      stage: 'group_stage',
      games: groupGames.slice(i, i + gamesPerRound)
    });
  }

  // Generate playoff bracket (placeholder teams - will be filled after group stage)
  const advancingTeams = [];
  for (const group of groups) {
    for (let i = 0; i < Math.min(advancePerGroup, group.teams.length); i++) {
      advancingTeams.push({
        id: `${group.name}-${i + 1}`,
        name: `${group.name} ${i === 0 ? '1st' : i === 1 ? '2nd' : `${i + 1}th`}`,
        is_placeholder: true,
        group_id: group.id,
        group_position: i + 1
      });
    }
  }

  // Generate playoff games if we have enough advancing teams
  if (advancingTeams.length >= 2) {
    currentDate.setDate(currentDate.getDate() + 2); // Gap between group stage and playoffs
    
    const playoffTournament = generateSingleElimination(advancingTeams, {
      venue,
      startDate: currentDate,
      timeSlots,
      daysOfWeek
    });

    // Add playoff games
    playoffTournament.games.forEach(game => {
      games.push({
        ...game,
        stage: 'playoffs',
        tournament_type: 'group_stage_playoffs',
        round: roundCounter + game.round - 1
      });
    });

    // Add playoff rounds
    playoffTournament.rounds.forEach(round => {
      rounds.push({
        ...round,
        round: roundCounter++,
        stage: 'playoffs'
      });
    });
  }

  return {
    type: 'group_stage_playoffs',
    total_games: games.length,
    total_rounds: rounds.length,
    games,
    rounds,
    groups,
    summary: {
      teams_count: teams.length,
      groups_count: groups.length,
      teams_per_group: groupSize,
      advancing_per_group: advancePerGroup,
      group_stage_games: groupGames.length,
      playoff_games: games.length - groupGames.length,
      estimated_duration_days: rounds.length + 1,
      format: `${numGroups} groups of ~${groupSize} teams, top ${advancePerGroup} advance to ${playoffFormat} playoffs`
    }
  };
}

// Helper functions
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function getRoundName(round, totalRounds) {
  const roundsFromEnd = totalRounds - round + 1;
  
  switch (roundsFromEnd) {
    case 1: return 'Final';
    case 2: return 'Semi-Final';
    case 3: return 'Quarter-Final';
    case 4: return 'Round of 16';
    case 5: return 'Round of 32';
    default: return `Round ${round}`;
  }
}

// Export all functions
module.exports = {
  generateRoundRobin,
  generateSingleElimination,
  generateSwissSystem,
  generateGroupStagePlayoffs,
  
  // Utility exports
  shuffleArray,
  getRoundName
};