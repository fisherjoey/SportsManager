import express, { Request, Response } from 'express';
import db from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';
import { calculateFinalWage, getWageBreakdown } from '../utils/wage-calculator';

const router = express.Router();

// Types
interface Game {
  id: number;
  level: string;
  game_date: string;
  game_time: string;
  status: string;
  refs_needed: number;
  wage_multiplier: number;
  wage_multiplier_reason?: string;
  updated_at?: Date;
}

interface User {
  id: number;
  role: string;
  is_available: boolean;
  wage_per_game: number;
  referee_level_id?: number;
  level_name?: string;
  allowed_divisions?: string;
}

interface Position {
  id: number;
  name: string;
}

interface GameAssignment {
  id?: number;
  game_id: number;
  user_id: number;
  position_id: number;
  status: 'pending' | 'accepted' | 'declined';
  assigned_at: Date;
  assigned_by: number;
  calculated_wage: number;
}

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
}

interface SelfAssignmentRequest {
  game_id: number;
  position_id: number;
}

// POST /api/self-assignment - Allow referees to self-assign to available games (with restrictions)
router.post('/', authenticateToken, requireCerbosPermission({
  resource: 'self_assignment',
  action: 'create',
}), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { game_id, position_id } = req.body as SelfAssignmentRequest;
    const user_id = req.user!.userId;

    // Get game details
    const game = await db('games').where('id', game_id).first() as Game | undefined;
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get user with level info
    const user = await db('users')
      .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
      .select(
        'users.*',
        'referee_levels.name as level_name',
        'referee_levels.allowed_divisions'
      )
      .where('users.id', user_id)
      .first() as User | undefined;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is a referee
    if (user.role !== 'referee' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only referees can self-assign to games' });
    }

    // Check if user is available
    if (!user.is_available) {
      return res.status(400).json({ error: 'You are not currently available for assignments' });
    }

    // Check referee level eligibility (strict for self-assignment)
    if (!user.allowed_divisions) {
      return res.status(403).json({
        error: 'No level assigned. Please contact an administrator to assign your referee level before self-assigning to games.'
      });
    }

    const allowedDivisions = JSON.parse(user.allowed_divisions) as string[];
    if (!allowedDivisions.includes(game.level)) {
      return res.status(403).json({
        error: `You are not qualified to referee ${game.level} games. Your level "${user.level_name}" allows: ${allowedDivisions.join(', ')}`
      });
    }

    // Check if position exists
    const position = await db('positions').where('id', position_id).first() as Position | undefined;
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }

    // Check if position is already filled
    const existingPositionAssignment = await db('game_assignments')
      .where('game_id', game_id)
      .where('position_id', position_id)
      .first();

    if (existingPositionAssignment) {
      return res.status(409).json({ error: 'Position already filled for this game' });
    }

    // Check if user is already assigned to this game
    const existingUserAssignment = await db('game_assignments')
      .where('game_id', game_id)
      .where('user_id', user_id)
      .first();

    if (existingUserAssignment) {
      return res.status(409).json({ error: 'You are already assigned to this game' });
    }

    // Check if game has reached maximum number of referees
    const currentAssignments = await db('game_assignments')
      .where('game_id', game_id)
      .whereIn('status', ['pending', 'accepted'])
      .count('* as count')
      .first() as { count: string };

    if (parseInt(currentAssignments.count) >= game.refs_needed) {
      return res.status(409).json({ error: 'Game has reached maximum number of referees' });
    }

    // Check if user has time conflict
    const timeConflictAssignment = await db('game_assignments')
      .join('games', 'game_assignments.game_id', 'games.id')
      .where('game_assignments.user_id', user_id)
      .where('games.game_date', game.game_date)
      .where('games.game_time', game.game_time)
      .where('games.id', '!=', game_id)
      .first();

    if (timeConflictAssignment) {
      return res.status(409).json({ error: 'You have a time conflict with another game' });
    }

    // Calculate final wage using user's base wage and game multiplier
    const finalWage = calculateFinalWage(user.wage_per_game, game.wage_multiplier);
    const wageBreakdown = getWageBreakdown(user.wage_per_game, game.wage_multiplier, game.wage_multiplier_reason);

    // Create assignment with pending status and calculated wage
    const assignmentData: Omit<GameAssignment, 'id'> = {
      game_id,
      user_id: user_id,
      position_id,
      status: 'pending',
      assigned_at: new Date(),
      assigned_by: user_id, // Self-assigned
      calculated_wage: finalWage
    };

    const [assignment] = await db('game_assignments').insert(assignmentData).returning('*') as GameAssignment[];

    // Update game status
    const totalAssignments = await db('game_assignments')
      .where('game_id', game_id)
      .whereIn('status', ['pending', 'accepted'])
      .count('* as count')
      .first() as { count: string };

    let gameStatus = 'unassigned';
    if (parseInt(totalAssignments.count) > 0 && parseInt(totalAssignments.count) < game.refs_needed) {
      gameStatus = 'assigned'; // Partially assigned
    } else if (parseInt(totalAssignments.count) >= game.refs_needed) {
      gameStatus = 'assigned'; // Fully assigned
    }

    await db('games')
      .where('id', game_id)
      .update({ status: gameStatus, updated_at: new Date() });

    res.status(201).json({
      success: true,
      data: {
        assignment,
        wageBreakdown
      },
      message: 'Successfully self-assigned to game. Assignment is pending.'
    });
  } catch (error) {
    console.error('Error in self-assignment:', error);
    res.status(500).json({ error: 'Failed to self-assign to game' });
  }
});

// GET /api/self-assignment/available - Get games available for self-assignment
router.get('/available', authenticateToken, requireCerbosPermission({
  resource: 'self_assignment',
  action: 'view:available',
}), async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('Starting available games endpoint');
    const user_id = req.user!.userId;
    console.log('User ID from JWT:', user_id);

    // Get user with level info
    const user = await db('users')
      .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
      .select(
        'users.*',
        'referee_levels.name as level_name',
        'referee_levels.allowed_divisions'
      )
      .where('users.id', user_id)
      .first() as User | undefined;

    console.log('Found user:', !!user);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is a referee
    if (user.role !== 'referee' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only referees can view available games' });
    }

    if (!user.allowed_divisions) {
      return res.json({
        success: true,
        data: { games: [] },
        message: 'No level assigned. Contact an administrator to assign your referee level.'
      });
    }

    const allowedDivisions = JSON.parse(user.allowed_divisions) as string[];

    // Get available games that user can self-assign to
    console.log('Querying games for user:', user_id);
    console.log('User level name:', user.level_name);
    console.log('Allowed divisions:', allowedDivisions);

    const availableGames = await db('games')
      .select('games.*')
      .whereIn('games.level', allowedDivisions)
      .where('games.game_date', '>=', '2024-12-20') // Use a fixed date for testing
      .where('games.status', 'unassigned')
      .whereNotExists(function() {
        this.select('*')
          .from('game_assignments')
          .whereRaw('game_assignments.game_id = games.id')
          .where('game_assignments.user_id', user_id);
      })
      .where(function() {
        this.whereNull('games.refs_needed')
          .orWhere(function() {
            this.whereRaw(`
              (SELECT COUNT(*) FROM game_assignments
               WHERE game_assignments.game_id = games.id
               AND game_assignments.status IN ('pending', 'accepted')) < games.refs_needed
            `);
          });
      })
      .orderBy('games.game_date', 'asc') as Game[];

    console.log('Found games:', availableGames.length);

    res.json({
      success: true,
      data: {
        games: availableGames,
        referee_level: user.level_name,
        allowed_divisions: allowedDivisions
      }
    });
  } catch (error) {
    console.error('Error fetching available games:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to fetch available games' });
  }
});

export default router;