/**
 * @fileoverview Tournaments routes - TypeScript implementation
 * @description Handles tournament generation, game creation, format information, and estimation
 * endpoints with comprehensive TypeScript support and validation.
 */

import express, { Request, Response } from 'express';
import Joi from 'joi';
import { authenticateToken, requireRole } from '../middleware/auth';
import db from '../config/database';
import {
  generateRoundRobin,
  generateSingleElimination,
  generateSwissSystem,
  generateGroupStagePlayoffs
} from '../utils/tournament-generator';
import {
  TournamentRequest,
  TournamentType,
  SeedingMethod,
  TournamentOptions,
  TournamentResult,
  TournamentGame,
  TournamentFormat,
  TournamentEstimate,
  TournamentCreateRequest,
  TournamentCreateResult,
  TournamentTeam,
  TeamEntity,
  LeagueEntity,
  ServiceResult,
  UUID
} from '../types';

const router = express.Router();

// Validation schemas
const tournamentSchema = Joi.object({
  name: Joi.string().required(),
  league_id: Joi.string().uuid().required(),
  tournament_type: Joi.string().valid(
    TournamentType.ROUND_ROBIN,
    TournamentType.SINGLE_ELIMINATION,
    TournamentType.SWISS_SYSTEM,
    TournamentType.GROUP_STAGE_PLAYOFFS
  ).required(),
  team_ids: Joi.array().items(Joi.string().uuid()).min(2).required(),
  start_date: Joi.date().iso().required(),
  venue: Joi.string().default('TBD'),
  time_slots: Joi.array().items(Joi.string()).default(['10:00', '12:00', '14:00', '16:00']),
  days_of_week: Joi.array().items(Joi.number().integer().min(0).max(6)).default([6, 0]),
  games_per_day: Joi.number().integer().min(1).default(3),

  // Tournament-specific options
  rounds: Joi.number().integer().min(1).when('tournament_type', {
    is: TournamentType.SWISS_SYSTEM,
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  group_size: Joi.number().integer().min(2).when('tournament_type', {
    is: TournamentType.GROUP_STAGE_PLAYOFFS,
    then: Joi.number().integer().min(2).default(4),
    otherwise: Joi.optional()
  }),
  advance_per_group: Joi.number().integer().min(1).when('tournament_type', {
    is: TournamentType.GROUP_STAGE_PLAYOFFS,
    then: Joi.number().integer().min(1).default(2),
    otherwise: Joi.optional()
  }),
  seeding_method: Joi.string().valid(
    SeedingMethod.RANDOM,
    SeedingMethod.RANKED,
    SeedingMethod.CUSTOM
  ).default(SeedingMethod.RANDOM)
});

const createGamesSchema = Joi.object({
  games: Joi.array().items(Joi.object({
    home_team_id: Joi.string().required(),
    away_team_id: Joi.string().required(),
    league_id: Joi.string().uuid().required(),
    game_date: Joi.string().required(),
    game_time: Joi.string().required(),
    location: Joi.string().default('TBD'),
    venue: Joi.string().optional(),
    level: Joi.string().optional(),
    pay_rate: Joi.number().min(0).optional(),
    refs_needed: Joi.number().integer().min(1).optional(),
    postal_code: Joi.string().optional()
  })).min(1).required(),
  tournament_name: Joi.string().optional()
});

const estimateQuerySchema = Joi.object({
  tournament_type: Joi.string().valid(
    TournamentType.ROUND_ROBIN,
    TournamentType.SINGLE_ELIMINATION,
    TournamentType.SWISS_SYSTEM,
    TournamentType.GROUP_STAGE_PLAYOFFS
  ).required(),
  team_count: Joi.number().integer().min(1).required(),
  rounds: Joi.number().integer().min(1).optional(),
  group_size: Joi.number().integer().min(2).optional(),
  advance_per_group: Joi.number().integer().min(1).optional(),
  games_per_day: Joi.number().integer().min(1).default(3)
});

// Helper functions
function getPayRateForLevel(level: string): number {
  switch (level) {
    case 'Recreational': return 25;
    case 'Competitive': return 35;
    case 'Elite': return 50;
    default: return 25;
  }
}

function getRefereeCountForLevel(level: string): number {
  switch (level) {
    case 'Recreational': return 2;
    case 'Competitive': return 2;
    case 'Elite': return 3;
    default: return 2;
  }
}

/**
 * POST /api/tournaments/generate - Generate tournament schedule
 */
router.post('/generate', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { error, value } = tournamentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const tournamentRequest: TournamentRequest = value;
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
    } = tournamentRequest;

    // Verify league exists
    const league: LeagueEntity | undefined = await db('leagues').where('id', league_id).first();
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Get team details
    const teams: TeamEntity[] = await db('teams')
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
    let tournament: TournamentResult;
    const options: TournamentOptions = {
      venue: venue || 'TBD',
      startDate: new Date(start_date),
      timeSlots: time_slots || ['10:00', '12:00', '14:00', '16:00'],
      daysOfWeek: days_of_week || [6, 0],
      gamesPerDay: games_per_day || 3,
      seedingMethod: seeding_method || SeedingMethod.RANDOM
    };

    switch (tournament_type) {
      case TournamentType.ROUND_ROBIN:
        tournament = generateRoundRobin(teams, options);
        break;

      case TournamentType.SINGLE_ELIMINATION:
        tournament = generateSingleElimination(teams, options);
        break;

      case TournamentType.SWISS_SYSTEM:
        tournament = generateSwissSystem(teams, {
          ...options,
          rounds: rounds || Math.ceil(Math.log2(teams.length)) + 1
        });
        break;

      case TournamentType.GROUP_STAGE_PLAYOFFS:
        tournament = generateGroupStagePlayoffs(teams, {
          ...options,
          groupSize: group_size || 4,
          advancePerGroup: advance_per_group || 2
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid tournament type' });
    }

    // Add tournament metadata to games
    const gamesWithMetadata: TournamentGame[] = tournament.games.map(game => ({
      ...game,
      league_id,
      tournament_name: name,
      level: league.level || 'Recreational',
      pay_rate: getPayRateForLevel(league.level || 'Recreational'),
      refs_needed: getRefereeCountForLevel(league.level || 'Recreational'),
      status: 'unassigned',
      postal_code: 'T0T0T0'
    }));

    const result: ServiceResult = {
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
    };

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error generating tournament:', error);
    res.status(500).json({
      error: 'Failed to generate tournament',
      details: error.message
    });
  }
});

/**
 * POST /api/tournaments/create-games - Create actual games from tournament
 */
router.post('/create-games', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { error, value } = createGamesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { games, tournament_name }: TournamentCreateRequest = value;

    if (!games || !Array.isArray(games) || games.length === 0) {
      return res.status(400).json({ error: 'Games array is required' });
    }

    const trx = await db.transaction();

    try {
      const createdGames: any[] = [];

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
          location: gameData.location || gameData.venue || 'TBD',
          postal_code: gameData.postal_code || 'T0T0T0',
          level: gameData.level || 'Recreational',
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

      const result: ServiceResult<TournamentCreateResult> = {
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
      };

      res.status(201).json(result);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error: any) {
    console.error('Error creating tournament games:', error);
    res.status(500).json({ error: 'Failed to create tournament games' });
  }
});

/**
 * GET /api/tournaments/formats - Get available tournament formats
 */
router.get('/formats', (req: Request, res: Response) => {
  const formats: TournamentFormat[] = [
    {
      id: TournamentType.ROUND_ROBIN,
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
      id: TournamentType.SINGLE_ELIMINATION,
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
      id: TournamentType.SWISS_SYSTEM,
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
      id: TournamentType.GROUP_STAGE_PLAYOFFS,
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

  const result: ServiceResult<{ formats: TournamentFormat[] }> = {
    success: true,
    data: { formats }
  };

  res.json(result);
});

/**
 * GET /api/tournaments/estimate - Estimate tournament requirements
 */
router.get('/estimate', (req: Request, res: Response) => {
  try {
    const { error, value } = estimateQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {
      tournament_type,
      team_count,
      rounds,
      group_size = 4,
      advance_per_group = 2,
      games_per_day = 3
    } = value;

    if (!tournament_type || !team_count) {
      return res.status(400).json({
        error: 'tournament_type and team_count are required'
      });
    }

    const teams = parseInt(team_count);
    let estimate: any = {};

    switch (tournament_type) {
      case TournamentType.ROUND_ROBIN:
        estimate = {
          total_games: teams * (teams - 1) / 2,
          games_per_team: teams - 1,
          estimated_days: Math.ceil((teams * (teams - 1) / 2) / games_per_day),
          rounds: teams - 1
        };
        break;

      case TournamentType.SINGLE_ELIMINATION:
        const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(teams)));
        estimate = {
          total_games: nextPowerOfTwo - 1,
          max_games_per_team: Math.log2(nextPowerOfTwo),
          estimated_days: Math.ceil(Math.log2(nextPowerOfTwo)),
          rounds: Math.log2(nextPowerOfTwo),
          byes_needed: nextPowerOfTwo - teams
        };
        break;

      case TournamentType.SWISS_SYSTEM:
        const swissRounds = parseInt(rounds) || Math.ceil(Math.log2(teams)) + 1;
        estimate = {
          total_games: (teams * swissRounds) / 2,
          games_per_team: swissRounds,
          estimated_days: Math.ceil(swissRounds),
          rounds: swissRounds
        };
        break;

      case TournamentType.GROUP_STAGE_PLAYOFFS:
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

    const result: ServiceResult<TournamentEstimate> = {
      success: true,
      data: {
        tournament_type: tournament_type as TournamentType,
        team_count: teams,
        estimate
      }
    };

    res.json(result);
  } catch (error: any) {
    console.error('Error estimating tournament:', error);
    res.status(500).json({ error: 'Failed to estimate tournament' });
  }
});

export default router;