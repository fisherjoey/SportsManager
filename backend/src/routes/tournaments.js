const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  generateRoundRobin,
  generateSingleElimination,
  generateSwissSystem,
  generateGroupStagePlayoffs
} = require('../utils/tournament-generator');

const tournamentSchema = Joi.object({
  name: Joi.string().required(),
  league_id: Joi.string().uuid().required(),
  tournament_type: Joi.string().valid(
    'round_robin', 
    'single_elimination', 
    'swiss_system', 
    'group_stage_playoffs'
  ).required(),
  team_ids: Joi.array().items(Joi.string().uuid()).min(2).required(),
  start_date: Joi.date().iso().required(),
  venue: Joi.string().default('TBD'),
  time_slots: Joi.array().items(Joi.string()).default(['10:00', '12:00', '14:00', '16:00']),
  days_of_week: Joi.array().items(Joi.number().integer().min(0).max(6)).default([6, 0]),
  games_per_day: Joi.number().integer().min(1).default(3),
  
  // Tournament-specific options
  rounds: Joi.number().integer().min(1).when('tournament_type', {
    is: 'swiss_system',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  group_size: Joi.number().integer().min(2).when('tournament_type', {
    is: 'group_stage_playoffs',
    then: Joi.number().integer().min(2).default(4),
    otherwise: Joi.optional()
  }),
  advance_per_group: Joi.number().integer().min(1).when('tournament_type', {
    is: 'group_stage_playoffs',
    then: Joi.number().integer().min(1).default(2),
    otherwise: Joi.optional()
  }),
  seeding_method: Joi.string().valid('random', 'ranked', 'custom').default('random')
});

// POST /api/tournaments/generate - Generate tournament schedule
router.post('/generate', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { error, value } = tournamentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {
      name,
      league_id,
      tournament_type,
      team_ids,
      start_date,
      venue,
      time_slots,
      days_of_week,
      games_per_day,
      rounds,
      group_size,
      advance_per_group,
      seeding_method
    } = value;

    // Verify league exists
    const league = await db('leagues').where('id', league_id).first();
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Get team details
    const teams = await db('teams')
      .whereIn('id', team_ids)
      .where('league_id', league_id)
      .orderBy('rank', 'asc');

    if (teams.length !== team_ids.length) {
      return res.status(400).json({ 
        error: 'Some teams not found or not in the specified league' 
      });
    }

    if (teams.length < 2) {
      return res.status(400).json({ 
        error: 'At least 2 teams required for tournament' 
      });
    }

    // Generate tournament based on type
    let tournament;
    const options = {
      venue,
      startDate: new Date(start_date),
      timeSlots: time_slots,
      daysOfWeek: days_of_week,
      gamesPerDay: games_per_day,
      seedingMethod: seeding_method
    };

    switch (tournament_type) {
      case 'round_robin':
        tournament = generateRoundRobin(teams, options);
        break;
      
      case 'single_elimination':
        tournament = generateSingleElimination(teams, options);
        break;
      
      case 'swiss_system':
        tournament = generateSwissSystem(teams, { ...options, rounds });
        break;
      
      case 'group_stage_playoffs':
        tournament = generateGroupStagePlayoffs(teams, {
          ...options,
          groupSize: group_size,
          advancePerGroup: advance_per_group
        });
        break;
      
      default:
        return res.status(400).json({ error: 'Invalid tournament type' });
    }

    // Add tournament metadata to games
    const gamesWithMetadata = tournament.games.map(game => ({
      ...game,
      league_id,
      tournament_name: name,
      level: league.level,
      pay_rate: getPayRateForLevel(league.level),
      refs_needed: getRefereeCountForLevel(league.level),
      status: 'unassigned',
      postal_code: 'T0T0T0' // Default postal code
    }));

    res.status(201).json({
      success: true,
      data: {
        tournament: {
          name,
          type: tournament_type,
          league,
          teams: teams.map(team => ({
            id: team.id,
            name: team.name,
            rank: team.rank
          })),
          ...tournament,
          games: gamesWithMetadata
        }
      },
      message: `Tournament generated: ${tournament.total_games} games across ${tournament.total_rounds} rounds`
    });
  } catch (error) {
    console.error('Error generating tournament:', error);
    res.status(500).json({ 
      error: 'Failed to generate tournament',
      details: error.message 
    });
  }
});

// POST /api/tournaments/create-games - Create actual games from tournament
router.post('/create-games', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { games, tournament_name } = req.body;
    
    if (!games || !Array.isArray(games) || games.length === 0) {
      return res.status(400).json({ error: 'Games array is required' });
    }

    const trx = await db.transaction();
    
    try {
      const createdGames = [];
      
      for (const gameData of games) {
        // Skip placeholder/bye games
        if (gameData.home_team_id?.startsWith('bye-') || 
            gameData.away_team_id?.startsWith('bye-') ||
            gameData.home_team_id?.startsWith('winner-') ||
            gameData.away_team_id?.startsWith('winner-')) {
          continue;
        }

        const gameToCreate = {
          home_team_id: gameData.home_team_id,
          away_team_id: gameData.away_team_id,
          league_id: gameData.league_id,
          game_date: gameData.game_date,
          game_time: gameData.game_time,
          location: gameData.location || gameData.venue,
          postal_code: gameData.postal_code || 'T0T0T0',
          level: gameData.level,
          pay_rate: gameData.pay_rate || 25,
          refs_needed: gameData.refs_needed || 2,
          status: 'unassigned',
          wage_multiplier: 1.0,
          wage_multiplier_reason: null
        };

        const [createdGame] = await trx('games').insert(gameToCreate).returning('*');
        createdGames.push(createdGame);
      }
      
      await trx.commit();
      
      res.status(201).json({
        success: true,
        data: {
          created: createdGames,
          summary: {
            requested: games.length,
            created: createdGames.length,
            skipped: games.length - createdGames.length
          }
        },
        message: `Created ${createdGames.length} games from tournament`
      });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error creating tournament games:', error);
    res.status(500).json({ error: 'Failed to create tournament games' });
  }
});

// GET /api/tournaments/formats - Get available tournament formats
router.get('/formats', (req, res) => {
  const formats = [
    {
      id: 'round_robin',
      name: 'Round Robin',
      description: 'Every team plays every other team once',
      min_teams: 2,
      max_teams: 20,
      pros: ['Fair - everyone plays same number of games', 'Best team usually wins', 'No eliminations'],
      cons: ['Many games required', 'Can be time consuming'],
      games_formula: 'n(n-1)/2 where n = number of teams',
      suitable_for: 'Regular season play, small tournaments'
    },
    {
      id: 'single_elimination',
      name: 'Single Elimination',
      description: 'Teams are eliminated after one loss',
      min_teams: 2,
      max_teams: 64,
      pros: ['Fast tournament format', 'Clear winner', 'Exciting elimination games'],
      cons: ['Unlucky early elimination possible', 'Fewer games for most teams'],
      games_formula: 'n-1 where n = number of teams',
      suitable_for: 'Playoffs, championship tournaments'
    },
    {
      id: 'swiss_system',
      name: 'Swiss System',
      description: 'Fixed number of rounds, teams paired by similar records',
      min_teams: 4,
      max_teams: 50,
      pros: ['No eliminations', 'Balanced competition', 'Reasonable number of games'],
      cons: ['Complex pairing algorithm', 'May not determine clear winner'],
      games_formula: 'n*r/2 where n = teams, r = rounds',
      suitable_for: 'Large tournaments, chess-style competitions'
    },
    {
      id: 'group_stage_playoffs',
      name: 'Group Stage + Playoffs',
      description: 'Groups play round robin, top teams advance to elimination playoffs',
      min_teams: 4,
      max_teams: 32,
      pros: ['Combines benefits of both formats', 'More games in group stage', 'Exciting playoffs'],
      cons: ['Complex structure', 'Many games required'],
      games_formula: 'Group stage: g*(g-1)/2 per group + Playoff: (advancing teams - 1)',
      suitable_for: 'Major tournaments, world cup style'
    }
  ];

  res.json({
    success: true,
    data: { formats }
  });
});

// GET /api/tournaments/estimate - Estimate tournament requirements
router.get('/estimate', (req, res) => {
  try {
    const {
      tournament_type,
      team_count,
      rounds, // for swiss system
      group_size, // for group stage
      advance_per_group, // for group stage
      games_per_day = 3
    } = req.query;

    if (!tournament_type || !team_count) {
      return res.status(400).json({ 
        error: 'tournament_type and team_count are required' 
      });
    }

    const teams = parseInt(team_count);
    let estimate = {};

    switch (tournament_type) {
      case 'round_robin':
        estimate = {
          total_games: teams * (teams - 1) / 2,
          games_per_team: teams - 1,
          estimated_days: Math.ceil((teams * (teams - 1) / 2) / games_per_day),
          rounds: teams - 1
        };
        break;

      case 'single_elimination':
        const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(teams)));
        estimate = {
          total_games: nextPowerOfTwo - 1,
          max_games_per_team: Math.log2(nextPowerOfTwo),
          estimated_days: Math.ceil(Math.log2(nextPowerOfTwo)),
          rounds: Math.log2(nextPowerOfTwo),
          byes_needed: nextPowerOfTwo - teams
        };
        break;

      case 'swiss_system':
        const swissRounds = parseInt(rounds) || Math.ceil(Math.log2(teams)) + 1;
        estimate = {
          total_games: (teams * swissRounds) / 2,
          games_per_team: swissRounds,
          estimated_days: Math.ceil(swissRounds),
          rounds: swissRounds
        };
        break;

      case 'group_stage_playoffs':
        const groupSz = parseInt(group_size) || 4;
        const advancePerGrp = parseInt(advance_per_group) || 2;
        const numGroups = Math.ceil(teams / groupSz);
        const groupGames = numGroups * (groupSz * (groupSz - 1) / 2);
        const advancingTeams = numGroups * advancePerGrp;
        const playoffGames = advancingTeams > 1 ? advancingTeams - 1 : 0;
        
        estimate = {
          total_games: groupGames + playoffGames,
          group_stage_games: groupGames,
          playoff_games: playoffGames,
          groups: numGroups,
          advancing_teams: advancingTeams,
          estimated_days: Math.ceil((groupGames + playoffGames) / games_per_day) + 1,
          max_games_per_team: (groupSz - 1) + Math.log2(Math.pow(2, Math.ceil(Math.log2(advancingTeams))))
        };
        break;

      default:
        return res.status(400).json({ error: 'Invalid tournament type' });
    }

    res.json({
      success: true,
      data: {
        tournament_type,
        team_count: teams,
        estimate
      }
    });
  } catch (error) {
    console.error('Error estimating tournament:', error);
    res.status(500).json({ error: 'Failed to estimate tournament' });
  }
});

// Helper functions
function getPayRateForLevel(level) {
  switch (level) {
    case 'Recreational': return 25;
    case 'Competitive': return 35;
    case 'Elite': return 50;
    default: return 25;
  }
}

function getRefereeCountForLevel(level) {
  switch (level) {
    case 'Recreational': return 2;
    case 'Competitive': return 2;
    case 'Elite': return 3;
    default: return 2;
  }
}

module.exports = router;