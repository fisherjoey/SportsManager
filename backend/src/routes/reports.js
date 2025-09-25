const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Validation schemas
const reportQuerySchema = Joi.object({
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  referee_id: Joi.string().uuid(),
  location_id: Joi.string().uuid(),
  league_id: Joi.string().uuid(),
  level: Joi.string(),
  game_type: Joi.string(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50)
});

const performanceQuerySchema = Joi.object({
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  referee_id: Joi.string().uuid(),
  metrics: Joi.array().items(Joi.string().valid(
    'assignments_count', 'acceptance_rate', 'completion_rate', 
    'total_earnings', 'average_wage', 'games_per_week'
  )).default(['assignments_count', 'acceptance_rate', 'completion_rate']),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50)
});

// GET /api/reports/referee-performance - Get referee performance metrics
router.get('/referee-performance', authenticateToken, async (req, res) => {
  try {
    const { error, value } = performanceQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { start_date, end_date, referee_id, metrics, page, limit } = value;
    const offset = (page - 1) * limit;

    // Build base query for referee performance
    let baseQuery = db('users')
      .leftJoin('game_assignments', 'users.id', 'game_assignments.user_id')
      .leftJoin('games', 'game_assignments.game_id', 'games.id')
      .where('users.role', 'referee');

    // Apply filters
    if (referee_id) {
      baseQuery = baseQuery.where('users.id', referee_id);
    }

    if (start_date) {
      baseQuery = baseQuery.where('games.game_date', '>=', start_date);
    }

    if (end_date) {
      baseQuery = baseQuery.where('games.game_date', '<=', end_date);
    }

    // Get referee performance data
    const performanceData = await baseQuery
      .select(
        'users.id as referee_id',
        'users.name as referee_name',
        'users.email as referee_email',
        'users.is_available',
        'users.wage_per_game',
        db.raw('COUNT(CASE WHEN game_assignments.id IS NOT NULL THEN 1 END) as total_assignments'),
        `${db.raw('COUNT(CASE WHEN game_assignments.status = ? THEN 1 END', ['accepted'])  } as accepted_assignments`,
        `${db.raw('COUNT(CASE WHEN game_assignments.status = ? THEN 1 END', ['declined'])  } as declined_assignments`,
        `${db.raw('COUNT(CASE WHEN game_assignments.status = ? THEN 1 END', ['completed'])  } as completed_assignments`,
        db.raw('COALESCE(SUM(game_assignments.calculated_wage), 0) as total_earnings'),
        db.raw('COALESCE(AVG(game_assignments.calculated_wage), 0) as average_wage'),
        db.raw('COUNT(DISTINCT games.game_date) as unique_game_days')
      )
      .groupBy('users.id', 'users.name', 'users.email', 'users.is_available', 'users.wage_per_game')
      .orderBy('total_assignments', 'desc')
      .limit(limit)
      .offset(offset);

    // Calculate derived metrics
    const enrichedData = performanceData.map(referee => {
      const totalAssignments = parseInt(referee.total_assignments) || 0;
      const acceptedAssignments = parseInt(referee.accepted_assignments) || 0;
      const declinedAssignments = parseInt(referee.declined_assignments) || 0;
      const completedAssignments = parseInt(referee.completed_assignments) || 0;

      // Calculate rates
      const acceptanceRate = totalAssignments > 0 ? 
        ((acceptedAssignments / totalAssignments) * 100).toFixed(2) : '0.00';
      const completionRate = acceptedAssignments > 0 ? 
        ((completedAssignments / acceptedAssignments) * 100).toFixed(2) : '0.00';
      const declineRate = totalAssignments > 0 ? 
        ((declinedAssignments / totalAssignments) * 100).toFixed(2) : '0.00';

      // Calculate games per week (assuming data spans multiple weeks)
      const uniqueGameDays = parseInt(referee.unique_game_days) || 0;
      const gamesPerWeek = uniqueGameDays > 0 ? 
        (totalAssignments / Math.max(1, uniqueGameDays / 7)).toFixed(2) : '0.00';

      return {
        refereeId: referee.referee_id,
        refereeName: referee.referee_name,
        refereeEmail: referee.referee_email,
        isAvailable: referee.is_available,
        wagePerGame: parseFloat(referee.wage_per_game) || 0,
        metrics: {
          assignmentsCount: totalAssignments,
          acceptedAssignments,
          declinedAssignments,
          completedAssignments,
          acceptanceRate: parseFloat(acceptanceRate),
          completionRate: parseFloat(completionRate),
          declineRate: parseFloat(declineRate),
          totalEarnings: parseFloat(referee.total_earnings) || 0,
          averageWage: parseFloat(referee.average_wage) || 0,
          uniqueGameDays,
          gamesPerWeek: parseFloat(gamesPerWeek)
        }
      };
    });

    // Get total count for pagination
    const totalCountQuery = await db('users')
      .leftJoin('game_assignments', 'users.id', 'game_assignments.user_id')
      .leftJoin('games', 'game_assignments.game_id', 'games.id')
      .where('users.role', 'referee');

    if (referee_id) {
      totalCountQuery.where('users.id', referee_id);
    }
    if (start_date) {
      totalCountQuery.where('games.game_date', '>=', start_date);
    }
    if (end_date) {
      totalCountQuery.where('games.game_date', '<=', end_date);
    }

    const [{ count: totalCount }] = await totalCountQuery
      .countDistinct('users.id as count');

    res.json({
      success: true,
      data: {
        refereePerformance: enrichedData,
        pagination: {
          page,
          limit,
          total: parseInt(totalCount),
          pages: Math.ceil(totalCount / limit)
        },
        filters: {
          start_date,
          end_date,
          referee_id,
          metrics
        }
      }
    });

  } catch (error) {
    console.error('Error generating referee performance report:', error);
    res.status(500).json({ 
      error: 'Failed to generate referee performance report',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/reports/assignment-patterns - Get assignment pattern analysis
router.get('/assignment-patterns', authenticateToken, async (req, res) => {
  try {
    const { error, value } = reportQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { start_date, end_date, referee_id, location_id, league_id, level } = value;

    // Build base query
    let baseQuery = db('game_assignments')
      .join('games', 'game_assignments.game_id', 'games.id')
      .join('users', 'game_assignments.user_id', 'users.id')
      .join('positions', 'game_assignments.position_id', 'positions.id')
      .leftJoin('locations', 'games.location_id', 'locations.id')
      .leftJoin('teams as home_team', 'games.home_team_id', 'home_team.id')
      .leftJoin('teams as away_team', 'games.away_team_id', 'away_team.id')
      .leftJoin('leagues', 'home_team.league_id', 'leagues.id');

    // Apply filters
    if (start_date) {
      baseQuery = baseQuery.where('games.game_date', '>=', start_date);
    }
    if (end_date) {
      baseQuery = baseQuery.where('games.game_date', '<=', end_date);
    }
    if (referee_id) {
      baseQuery = baseQuery.where('game_assignments.user_id', referee_id);
    }
    if (location_id) {
      baseQuery = baseQuery.where('games.location_id', location_id);
    }
    if (league_id) {
      baseQuery = baseQuery.where('leagues.id', league_id);
    }
    if (level) {
      baseQuery = baseQuery.where('games.level', level);
    }

    // Get assignment patterns by day of week
    const dayOfWeekPatterns = await baseQuery.clone()
      .select(
        db.raw('EXTRACT(DOW FROM games.game_date) as day_of_week'),
        db.raw('COUNT(*) as assignment_count'),
        db.raw('COUNT(DISTINCT game_assignments.user_id) as unique_referees')
      )
      .groupBy(db.raw('EXTRACT(DOW FROM games.game_date)'))
      .orderBy('day_of_week');

    // Get assignment patterns by time of day
    const timePatterns = await baseQuery.clone()
      .select(
        db.raw('EXTRACT(HOUR FROM games.game_time) as hour_of_day'),
        db.raw('COUNT(*) as assignment_count'),
        db.raw('COUNT(DISTINCT game_assignments.user_id) as unique_referees')
      )
      .groupBy(db.raw('EXTRACT(HOUR FROM games.game_time)'))
      .orderBy('hour_of_day');

    // Get assignment patterns by location
    const locationPatterns = await baseQuery.clone()
      .select(
        'locations.id as location_id',
        'locations.name as location_name',
        'locations.address as location_address',
        db.raw('COUNT(*) as assignment_count'),
        db.raw('COUNT(DISTINCT game_assignments.user_id) as unique_referees'),
        db.raw('AVG(game_assignments.calculated_wage) as average_wage')
      )
      .groupBy('locations.id', 'locations.name', 'locations.address')
      .orderBy('assignment_count', 'desc')
      .limit(20);

    // Get frequent referee-position combinations
    const refereePositionPatterns = await baseQuery.clone()
      .select(
        'users.id as referee_id',
        'users.name as referee_name',
        'positions.id as position_id',
        'positions.name as position_name',
        db.raw('COUNT(*) as assignment_count')
      )
      .groupBy('users.id', 'users.name', 'positions.id', 'positions.name')
      .having(db.raw('COUNT(*)'), '>', 1)
      .orderBy('assignment_count', 'desc')
      .limit(50);

    // Get referee pairs (referees who often work together)
    const refereePairsQuery = `
      SELECT 
        r1.id as referee1_id,
        r1.name as referee1_name,
        r2.id as referee2_id,
        r2.name as referee2_name,
        COUNT(*) as games_together
      FROM game_assignments ga1
      JOIN game_assignments ga2 ON ga1.game_id = ga2.game_id AND ga1.user_id < ga2.user_id
      JOIN users r1 ON ga1.user_id = r1.id
      JOIN users r2 ON ga2.user_id = r2.id
      JOIN games g ON ga1.game_id = g.id
      WHERE 1=1
      ${start_date ? `AND g.game_date >= '${  start_date  }'` : ''}
      ${end_date ? `AND g.game_date <= '${  end_date  }'` : ''}
      GROUP BY r1.id, r1.name, r2.id, r2.name
      HAVING COUNT(*) > 2
      ORDER BY games_together DESC
      LIMIT 20
    `;

    const refereePairs = await db.raw(refereePairsQuery);

    // Format day of week data
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const formattedDayPatterns = dayOfWeekPatterns.map(pattern => ({
      dayOfWeek: parseInt(pattern.day_of_week),
      dayName: dayNames[parseInt(pattern.day_of_week)],
      assignmentCount: parseInt(pattern.assignment_count),
      uniqueReferees: parseInt(pattern.unique_referees)
    }));

    res.json({
      success: true,
      data: {
        assignmentPatterns: {
          dayOfWeek: formattedDayPatterns,
          timeOfDay: timePatterns.map(p => ({
            hour: parseInt(p.hour_of_day),
            assignmentCount: parseInt(p.assignment_count),
            uniqueReferees: parseInt(p.unique_referees)
          })),
          locations: locationPatterns.map(p => ({
            locationId: p.location_id,
            locationName: p.location_name,
            locationAddress: p.location_address,
            assignmentCount: parseInt(p.assignment_count),
            uniqueReferees: parseInt(p.unique_referees),
            averageWage: parseFloat(p.average_wage) || 0
          })),
          refereePositions: refereePositionPatterns.map(p => ({
            refereeId: p.referee_id,
            refereeName: p.referee_name,
            positionId: p.position_id,
            positionName: p.position_name,
            assignmentCount: parseInt(p.assignment_count)
          })),
          refereePairs: refereePairs.rows?.map(p => ({
            referee1Id: p.referee1_id,
            referee1Name: p.referee1_name,
            referee2Id: p.referee2_id,
            referee2Name: p.referee2_name,
            gamesTogether: parseInt(p.games_together)
          })) || []
        },
        filters: {
          start_date,
          end_date,
          referee_id,
          location_id,
          league_id,
          level
        }
      }
    });

  } catch (error) {
    console.error('Error generating assignment patterns report:', error);
    res.status(500).json({ 
      error: 'Failed to generate assignment patterns report',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/reports/financial-summary - Get financial summary report
router.get('/financial-summary', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = reportQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { start_date, end_date, referee_id, location_id, league_id, level, game_type } = value;

    // Build base query
    let baseQuery = db('game_assignments')
      .join('games', 'game_assignments.game_id', 'games.id')
      .join('users', 'game_assignments.user_id', 'users.id')
      .leftJoin('locations', 'games.location_id', 'locations.id')
      .leftJoin('teams as home_team', 'games.home_team_id', 'home_team.id')
      .leftJoin('teams as away_team', 'games.away_team_id', 'away_team.id')
      .leftJoin('leagues', 'home_team.league_id', 'leagues.id')
      .whereIn('game_assignments.status', ['accepted', 'completed']);

    // Apply filters
    if (start_date) {
      baseQuery = baseQuery.where('games.game_date', '>=', start_date);
    }
    if (end_date) {
      baseQuery = baseQuery.where('games.game_date', '<=', end_date);
    }
    if (referee_id) {
      baseQuery = baseQuery.where('game_assignments.user_id', referee_id);
    }
    if (location_id) {
      baseQuery = baseQuery.where('games.location_id', location_id);
    }
    if (league_id) {
      baseQuery = baseQuery.where('leagues.id', league_id);
    }
    if (level) {
      baseQuery = baseQuery.where('games.level', level);
    }
    if (game_type) {
      baseQuery = baseQuery.where('games.game_type', game_type);
    }

    // Overall financial summary
    const overallSummary = await baseQuery.clone()
      .select(
        db.raw('COUNT(*) as total_assignments'),
        db.raw('COUNT(DISTINCT game_assignments.user_id) as unique_referees'),
        db.raw('COUNT(DISTINCT game_assignments.game_id) as unique_games'),
        db.raw('COALESCE(SUM(game_assignments.calculated_wage), 0) as total_wages'),
        db.raw('COALESCE(AVG(game_assignments.calculated_wage), 0) as average_wage'),
        db.raw('COALESCE(MIN(game_assignments.calculated_wage), 0) as min_wage'),
        db.raw('COALESCE(MAX(game_assignments.calculated_wage), 0) as max_wage')
      )
      .first();

    // Financial breakdown by referee
    const refereeBreakdown = await baseQuery.clone()
      .select(
        'users.id as referee_id',
        'users.name as referee_name',
        'users.email as referee_email',
        db.raw('COUNT(*) as assignment_count'),
        db.raw('COALESCE(SUM(game_assignments.calculated_wage), 0) as total_earnings'),
        db.raw('COALESCE(AVG(game_assignments.calculated_wage), 0) as average_wage')
      )
      .groupBy('users.id', 'users.name', 'users.email')
      .orderBy('total_earnings', 'desc')
      .limit(50);

    // Financial breakdown by location
    const locationBreakdown = await baseQuery.clone()
      .select(
        'locations.id as location_id',
        'locations.name as location_name',
        db.raw('COUNT(*) as assignment_count'),
        db.raw('COALESCE(SUM(game_assignments.calculated_wage), 0) as total_wages'),
        db.raw('COALESCE(AVG(game_assignments.calculated_wage), 0) as average_wage')
      )
      .groupBy('locations.id', 'locations.name')
      .orderBy('total_wages', 'desc')
      .limit(20);

    // Financial breakdown by game level
    const levelBreakdown = await baseQuery.clone()
      .select(
        'games.level',
        db.raw('COUNT(*) as assignment_count'),
        db.raw('COALESCE(SUM(game_assignments.calculated_wage), 0) as total_wages'),
        db.raw('COALESCE(AVG(game_assignments.calculated_wage), 0) as average_wage')
      )
      .groupBy('games.level')
      .orderBy('total_wages', 'desc');

    // Financial breakdown by game type
    const gameTypeBreakdown = await baseQuery.clone()
      .select(
        'games.game_type',
        db.raw('COUNT(*) as assignment_count'),
        db.raw('COALESCE(SUM(game_assignments.calculated_wage), 0) as total_wages'),
        db.raw('COALESCE(AVG(game_assignments.calculated_wage), 0) as average_wage')
      )
      .groupBy('games.game_type')
      .orderBy('total_wages', 'desc');

    // Monthly trend if date range spans multiple months
    const monthlyTrend = await baseQuery.clone()
      .select(
        db.raw('EXTRACT(YEAR FROM games.game_date) as year'),
        db.raw('EXTRACT(MONTH FROM games.game_date) as month'),
        db.raw('COUNT(*) as assignment_count'),
        db.raw('COALESCE(SUM(game_assignments.calculated_wage), 0) as total_wages'),
        db.raw('COALESCE(AVG(game_assignments.calculated_wage), 0) as average_wage')
      )
      .groupBy(db.raw('EXTRACT(YEAR FROM games.game_date), EXTRACT(MONTH FROM games.game_date)'))
      .orderBy(['year', 'month']);

    res.json({
      success: true,
      data: {
        financialSummary: {
          overall: {
            totalAssignments: parseInt(overallSummary.total_assignments),
            uniqueReferees: parseInt(overallSummary.unique_referees),
            uniqueGames: parseInt(overallSummary.unique_games),
            totalWages: parseFloat(overallSummary.total_wages),
            averageWage: parseFloat(overallSummary.average_wage),
            minWage: parseFloat(overallSummary.min_wage),
            maxWage: parseFloat(overallSummary.max_wage)
          },
          byReferee: refereeBreakdown.map(r => ({
            refereeId: r.referee_id,
            refereeName: r.referee_name,
            refereeEmail: r.referee_email,
            assignmentCount: parseInt(r.assignment_count),
            totalEarnings: parseFloat(r.total_earnings),
            averageWage: parseFloat(r.average_wage)
          })),
          byLocation: locationBreakdown.map(l => ({
            locationId: l.location_id,
            locationName: l.location_name,
            assignmentCount: parseInt(l.assignment_count),
            totalWages: parseFloat(l.total_wages),
            averageWage: parseFloat(l.average_wage)
          })),
          byLevel: levelBreakdown.map(l => ({
            level: l.level,
            assignmentCount: parseInt(l.assignment_count),
            totalWages: parseFloat(l.total_wages),
            averageWage: parseFloat(l.average_wage)
          })),
          byGameType: gameTypeBreakdown.map(g => ({
            gameType: g.game_type,
            assignmentCount: parseInt(g.assignment_count),
            totalWages: parseFloat(g.total_wages),
            averageWage: parseFloat(g.average_wage)
          })),
          monthlyTrend: monthlyTrend.map(m => ({
            year: parseInt(m.year),
            month: parseInt(m.month),
            assignmentCount: parseInt(m.assignment_count),
            totalWages: parseFloat(m.total_wages),
            averageWage: parseFloat(m.average_wage)
          }))
        },
        filters: {
          start_date,
          end_date,
          referee_id,
          location_id,
          league_id,
          level,
          game_type
        }
      }
    });

  } catch (error) {
    console.error('Error generating financial summary report:', error);
    res.status(500).json({ 
      error: 'Failed to generate financial summary report',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/reports/availability-gaps - Get availability gap analysis
router.get('/availability-gaps', authenticateToken, async (req, res) => {
  try {
    const { error, value } = reportQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { start_date, end_date, location_id, level } = value;

    // Build base query for unassigned games
    let unassignedQuery = db('games')
      .leftJoin('locations', 'games.location_id', 'locations.id')
      .leftJoin('teams as home_team', 'games.home_team_id', 'home_team.id')
      .leftJoin('teams as away_team', 'games.away_team_id', 'away_team.id')
      .leftJoin('leagues', 'home_team.league_id', 'leagues.id')
      .where('games.status', 'unassigned');

    // Apply filters
    if (start_date) {
      unassignedQuery = unassignedQuery.where('games.game_date', '>=', start_date);
    }
    if (end_date) {
      unassignedQuery = unassignedQuery.where('games.game_date', '<=', end_date);
    }
    if (location_id) {
      unassignedQuery = unassignedQuery.where('games.location_id', location_id);
    }
    if (level) {
      unassignedQuery = unassignedQuery.where('games.level', level);
    }

    // Get unassigned games details
    const unassignedGames = await unassignedQuery.clone()
      .select(
        'games.id as game_id',
        'games.game_date',
        'games.game_time',
        'games.level',
        'games.game_type',
        'games.refs_needed',
        'games.pay_rate',
        'locations.name as location_name',
        'locations.address as location_address',
        'home_team.name as home_team_name',
        'away_team.name as away_team_name',
        'leagues.name as league_name'
      )
      .orderBy('games.game_date', 'asc')
      .limit(100);

    // Get availability gaps by time patterns
    const timeGaps = await unassignedQuery.clone()
      .select(
        db.raw('EXTRACT(DOW FROM games.game_date) as day_of_week'),
        db.raw('EXTRACT(HOUR FROM games.game_time) as hour_of_day'),
        db.raw('COUNT(*) as unassigned_count')
      )
      .groupBy(db.raw('EXTRACT(DOW FROM games.game_date), EXTRACT(HOUR FROM games.game_time)'))
      .orderBy(['day_of_week', 'hour_of_day']);

    // Get availability gaps by location
    const locationGaps = await unassignedQuery.clone()
      .select(
        'locations.id as location_id',
        'locations.name as location_name',
        'locations.address as location_address',
        db.raw('COUNT(*) as unassigned_count'),
        db.raw('SUM(games.refs_needed) as total_refs_needed')
      )
      .groupBy('locations.id', 'locations.name', 'locations.address')
      .orderBy('unassigned_count', 'desc');

    // Get availability gaps by level
    const levelGaps = await unassignedQuery.clone()
      .select(
        'games.level',
        db.raw('COUNT(*) as unassigned_count'),
        db.raw('SUM(games.refs_needed) as total_refs_needed')
      )
      .groupBy('games.level')
      .orderBy('unassigned_count', 'desc');

    // Get partially assigned games (games that need more referees)
    const partiallyAssignedQuery = db('games')
      .leftJoin('locations', 'games.location_id', 'locations.id')
      .leftJoin('teams as home_team', 'games.home_team_id', 'home_team.id')
      .leftJoin('teams as away_team', 'games.away_team_id', 'away_team.id')
      .leftJoin('leagues', 'home_team.league_id', 'leagues.id')
      .leftJoin('game_assignments', function() {
        this.on('games.id', '=', 'game_assignments.game_id')
          .andOn(db.raw('game_assignments.status IN (?, ?)', ['pending', 'accepted']));
      })
      .where('games.status', 'assigned')
      .whereRaw('(SELECT COUNT(*) FROM game_assignments ga WHERE ga.game_id = games.id AND ga.status IN (?, ?)) < games.refs_needed', ['pending', 'accepted']);

    if (start_date) {
      partiallyAssignedQuery.where('games.game_date', '>=', start_date);
    }
    if (end_date) {
      partiallyAssignedQuery.where('games.game_date', '<=', end_date);
    }
    if (location_id) {
      partiallyAssignedQuery.where('games.location_id', location_id);
    }
    if (level) {
      partiallyAssignedQuery.where('games.level', level);
    }

    const partiallyAssignedGames = await partiallyAssignedQuery
      .select(
        'games.id as game_id',
        'games.game_date',
        'games.game_time',
        'games.level',
        'games.game_type',
        'games.refs_needed',
        'locations.name as location_name',
        'home_team.name as home_team_name',
        'away_team.name as away_team_name',
        db.raw('COUNT(game_assignments.id) as assigned_refs')
      )
      .groupBy(
        'games.id', 'games.game_date', 'games.game_time', 'games.level', 
        'games.game_type', 'games.refs_needed', 'locations.name', 
        'home_team.name', 'away_team.name'
      )
      .orderBy('games.game_date', 'asc')
      .limit(50);

    // Format day names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    res.json({
      success: true,
      data: {
        availabilityGaps: {
          unassignedGames: unassignedGames.map(game => ({
            gameId: game.game_id,
            gameDate: game.game_date,
            gameTime: game.game_time,
            level: game.level,
            gameType: game.game_type,
            refsNeeded: parseInt(game.refs_needed),
            payRate: parseFloat(game.pay_rate) || 0,
            locationName: game.location_name,
            locationAddress: game.location_address,
            homeTeamName: game.home_team_name,
            awayTeamName: game.away_team_name,
            leagueName: game.league_name
          })),
          partiallyAssignedGames: partiallyAssignedGames.map(game => ({
            gameId: game.game_id,
            gameDate: game.game_date,
            gameTime: game.game_time,
            level: game.level,
            gameType: game.game_type,
            refsNeeded: parseInt(game.refs_needed),
            assignedRefs: parseInt(game.assigned_refs),
            refsStillNeeded: parseInt(game.refs_needed) - parseInt(game.assigned_refs),
            locationName: game.location_name,
            homeTeamName: game.home_team_name,
            awayTeamName: game.away_team_name
          })),
          timePatterns: timeGaps.map(gap => ({
            dayOfWeek: parseInt(gap.day_of_week),
            dayName: dayNames[parseInt(gap.day_of_week)],
            hourOfDay: parseInt(gap.hour_of_day),
            unassignedCount: parseInt(gap.unassigned_count)
          })),
          locationGaps: locationGaps.map(gap => ({
            locationId: gap.location_id,
            locationName: gap.location_name,
            locationAddress: gap.location_address,
            unassignedCount: parseInt(gap.unassigned_count),
            totalRefsNeeded: parseInt(gap.total_refs_needed)
          })),
          levelGaps: levelGaps.map(gap => ({
            level: gap.level,
            unassignedCount: parseInt(gap.unassigned_count),
            totalRefsNeeded: parseInt(gap.total_refs_needed)
          }))
        },
        summary: {
          totalUnassignedGames: unassignedGames.length,
          totalPartiallyAssigned: partiallyAssignedGames.length,
          totalRefereesNeeded: unassignedGames.reduce((sum, game) => sum + parseInt(game.refs_needed), 0) +
                               partiallyAssignedGames.reduce((sum, game) => sum + (parseInt(game.refs_needed) - parseInt(game.assigned_refs)), 0)
        },
        filters: {
          start_date,
          end_date,
          location_id,
          level
        }
      }
    });

  } catch (error) {
    console.error('Error generating availability gaps report:', error);
    res.status(500).json({ 
      error: 'Failed to generate availability gaps report',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;