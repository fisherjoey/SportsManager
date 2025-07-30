const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Validation schemas
const createChunkSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  location: Joi.string().max(255).optional(),
  date: Joi.date().optional(),
  start_time: Joi.string().optional(),
  end_time: Joi.string().optional(),
  game_ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
  notes: Joi.string().max(1000).optional()
});

const updateChunkSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  notes: Joi.string().max(1000).optional(),
  add_game_ids: Joi.array().items(Joi.string().uuid()).optional(),
  remove_game_ids: Joi.array().items(Joi.string().uuid()).optional()
});

const assignChunkSchema = Joi.object({
  referee_id: Joi.string().uuid().required(),
  position_id: Joi.string().uuid().optional(),
  check_conflicts: Joi.boolean().default(true),
  override_conflicts: Joi.boolean().default(false)
});

const autoCreateSchema = Joi.object({
  criteria: Joi.object({
    group_by: Joi.string().valid('location_date', 'referee', 'level').default('location_date'),
    min_games: Joi.number().integer().min(1).default(2),
    max_time_gap: Joi.number().integer().min(0).default(180) // minutes
  }).required(),
  date_range: Joi.object({
    start_date: Joi.date().required(),
    end_date: Joi.date().required()
  }).optional()
});

// Chunk Management Service
class ChunkService {
  static async validateGamesForChunk(gameIds) {
    const games = await db('games')
      .whereIn('id', gameIds)
      .select('id', 'game_date', 'game_time', 'location', 'level', 'refs_needed');

    if (games.length !== gameIds.length) {
      throw new Error('One or more games not found');
    }

    // Check if games are at same location and date
    const locations = [...new Set(games.map(g => g.location))];
    const dates = [...new Set(games.map(g => g.game_date))];

    if (locations.length > 1 || dates.length > 1) {
      throw new Error('All games must be at the same location and date to be chunked together');
    }

    // Sort games by time
    games.sort((a, b) => a.game_time.localeCompare(b.game_time));

    return games;
  }

  static async calculateChunkDetails(games) {
    const sortedGames = games.sort((a, b) => a.game_time.localeCompare(b.game_time));
    const totalReferees = games.reduce((sum, game) => sum + (game.refs_needed || 1), 0);

    return {
      location: games[0].location,
      date: games[0].game_date,
      start_time: sortedGames[0].game_time,
      end_time: sortedGames[sortedGames.length - 1].game_time,
      total_referees_needed: totalReferees,
      game_count: games.length
    };
  }

  static async checkAssignmentConflicts(refereeId, games) {
    const conflicts = [];

    for (const game of games) {
      // Check for existing assignments to this game
      const existingAssignment = await db('game_assignments')
        .where('game_id', game.id)
        .whereIn('status', ['pending', 'accepted'])
        .first();

      if (existingAssignment) {
        conflicts.push({
          game_id: game.id,
          type: 'game_assigned',
          message: 'Game is already assigned'
        });
        continue;
      }

      // Check for referee time conflicts
      const timeConflicts = await db('game_assignments')
        .join('games as conflict_games', 'game_assignments.game_id', 'conflict_games.id')
        .where('game_assignments.user_id', refereeId)
        .where('conflict_games.game_date', game.game_date)
        .whereRaw(`
          (conflict_games.game_time, conflict_games.game_time + INTERVAL '2 hours') OVERLAPS 
          (?, ? + INTERVAL '2 hours')
        `, [game.game_time, game.game_time])
        .whereIn('game_assignments.status', ['pending', 'accepted']);

      if (timeConflicts.length > 0) {
        conflicts.push({
          game_id: game.id,
          type: 'time_conflict',
          message: 'Referee has overlapping assignment'
        });
      }
    }

    return conflicts;
  }

  static async autoCreateChunks(criteria, dateRange) {
    let query = db('games')
      .whereNotExists(function() {
        this.select('*')
          .from('game_assignments')
          .whereRaw('game_assignments.game_id = games.id')
          .whereIn('status', ['pending', 'accepted']);
      })
      .whereNotExists(function() {
        this.select('*')
          .from('chunk_games')
          .whereRaw('chunk_games.game_id = games.id');
      });

    if (dateRange) {
      query = query.whereBetween('game_date', [dateRange.start_date, dateRange.end_date]);
    }

    const games = await query.select('*');
    const chunks = [];

    if (criteria.group_by === 'location_date') {
      const groups = {};
      
      games.forEach(game => {
        const key = `${game.location}-${game.game_date}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(game);
      });

      for (const [key, groupGames] of Object.entries(groups)) {
        if (groupGames.length >= criteria.min_games) {
          // Check time gaps between games
          const sortedGames = groupGames.sort((a, b) => a.game_time.localeCompare(b.game_time));
          const validGames = [sortedGames[0]];
          
          for (let i = 1; i < sortedGames.length; i++) {
            const prevGame = validGames[validGames.length - 1];
            const currentGame = sortedGames[i];
            const timeDiff = this.getTimeDifferenceMinutes(prevGame.game_time, currentGame.game_time);
            
            if (timeDiff <= criteria.max_time_gap) {
              validGames.push(currentGame);
            }
          }

          if (validGames.length >= criteria.min_games) {
            chunks.push({
              games: validGames,
              name: `Auto-chunk: ${validGames[0].location} - ${validGames[0].game_date}`,
              criteria: 'location_date'
            });
          }
        }
      }
    }

    return chunks;
  }

  static getTimeDifferenceMinutes(time1, time2) {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    return Math.abs((h2 * 60 + m2) - (h1 * 60 + m1));
  }
}

// POST /api/chunks - Create new chunk
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = createChunkSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { name, location, date, start_time, end_time, game_ids, notes } = value;

    // Validate and get games
    const games = await ChunkService.validateGamesForChunk(game_ids);
    
    // Calculate chunk details from games if not provided
    const calculatedDetails = await ChunkService.calculateChunkDetails(games);
    
    const chunkData = {
      id: require('crypto').randomUUID(),
      name: name || `Chunk: ${calculatedDetails.location} - ${calculatedDetails.date}`,
      location: location || calculatedDetails.location,
      date: date || calculatedDetails.date,
      start_time: start_time || calculatedDetails.start_time,
      end_time: end_time || calculatedDetails.end_time,
      total_referees_needed: calculatedDetails.total_referees_needed,
      game_count: calculatedDetails.game_count,
      notes,
      created_by: req.user.userId
    };

    // Create chunk
    const [chunk] = await db('game_chunks').insert(chunkData).returning('*');

    // Add games to chunk
    const chunkGameInserts = games.map((game, index) => ({
      id: require('crypto').randomUUID(),
      chunk_id: chunk.id,
      game_id: game.id,
      sort_order: index
    }));

    await db('chunk_games').insert(chunkGameInserts);

    res.status(201).json({
      success: true,
      data: {
        chunk: {
          id: chunk.id,
          name: chunk.name,
          location: chunk.location,
          date: chunk.date,
          start_time: chunk.start_time,
          end_time: chunk.end_time,
          game_count: chunk.game_count,
          total_referees_needed: chunk.total_referees_needed,
          status: chunk.status,
          notes: chunk.notes,
          created_at: chunk.created_at
        }
      },
      message: 'Chunk created successfully'
    });

  } catch (error) {
    console.error('Error creating chunk:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create chunk'
    });
  }
});

// GET /api/chunks - Get all chunks
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { 
      location, 
      date, 
      status = 'all',
      page = 1, 
      limit = 20 
    } = req.query;

    let query = db('game_chunks')
      .leftJoin('users as referee', 'game_chunks.assigned_referee_id', 'referee.id')
      .select(
        'game_chunks.*',
        'referee.name as assigned_referee_name'
      )
      .orderBy('game_chunks.date', 'desc')
      .orderBy('game_chunks.start_time', 'asc');

    if (location && location !== 'all') {
      query = query.where('game_chunks.location', location);
    }

    if (date) {
      query = query.where('game_chunks.date', date);
    }

    if (status !== 'all') {
      query = query.where('game_chunks.status', status);
    }

    const offset = (page - 1) * limit;
    const chunks = await query.limit(limit).offset(offset);

    res.json({
      success: true,
      data: {
        chunks: chunks.map(chunk => ({
          id: chunk.id,
          name: chunk.name,
          location: chunk.location,
          date: chunk.date,
          start_time: chunk.start_time,
          end_time: chunk.end_time,
          game_count: chunk.game_count,
          total_referees_needed: chunk.total_referees_needed,
          status: chunk.status,
          assigned_referee_id: chunk.assigned_referee_id,
          assigned_referee_name: chunk.assigned_referee_name,
          notes: chunk.notes,
          created_at: chunk.created_at
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching chunks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chunks'
    });
  }
});

// GET /api/chunks/:id - Get specific chunk with games
router.get('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const chunk = await db('game_chunks')
      .leftJoin('users as referee', 'game_chunks.assigned_referee_id', 'referee.id')
      .where('game_chunks.id', id)
      .select(
        'game_chunks.*',
        'referee.name as assigned_referee_name'
      )
      .first();

    if (!chunk) {
      return res.status(404).json({
        success: false,
        error: 'Chunk not found'
      });
    }

    // Get games in chunk
    const games = await db('chunk_games')
      .join('games', 'chunk_games.game_id', 'games.id')
      .join('teams as home_team', 'games.home_team_id', 'home_team.id')
      .join('teams as away_team', 'games.away_team_id', 'away_team.id')
      .where('chunk_games.chunk_id', id)
      .orderBy('chunk_games.sort_order', 'asc')
      .select(
        'games.*',
        'home_team.name as home_team_name',
        'away_team.name as away_team_name',
        'chunk_games.sort_order'
      );

    res.json({
      success: true,
      data: {
        chunk: {
          id: chunk.id,
          name: chunk.name,
          location: chunk.location,
          date: chunk.date,
          start_time: chunk.start_time,
          end_time: chunk.end_time,
          game_count: chunk.game_count,
          total_referees_needed: chunk.total_referees_needed,
          status: chunk.status,
          assigned_referee_id: chunk.assigned_referee_id,
          assigned_referee_name: chunk.assigned_referee_name,
          notes: chunk.notes,
          created_at: chunk.created_at,
          games: games.map(game => ({
            id: game.id,
            home_team_name: game.home_team_name,
            away_team_name: game.away_team_name,
            game_date: game.game_date,
            game_time: game.game_time,
            location: game.location,
            level: game.level,
            refs_needed: game.refs_needed,
            sort_order: game.sort_order
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching chunk details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chunk details'
    });
  }
});

// PUT /api/chunks/:id - Update chunk
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateChunkSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { name, notes, add_game_ids, remove_game_ids } = value;

    // Check if chunk exists
    const existingChunk = await db('game_chunks').where('id', id).first();
    if (!existingChunk) {
      return res.status(404).json({
        success: false,
        error: 'Chunk not found'
      });
    }

    // Update basic chunk details
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (notes !== undefined) updateData.notes = notes;
    updateData.updated_at = new Date();

    if (Object.keys(updateData).length > 1) { // More than just updated_at
      await db('game_chunks').where('id', id).update(updateData);
    }

    // Remove games if specified
    if (remove_game_ids && remove_game_ids.length > 0) {
      await db('chunk_games')
        .where('chunk_id', id)
        .whereIn('game_id', remove_game_ids)
        .del();
    }

    // Add games if specified
    if (add_game_ids && add_game_ids.length > 0) {
      // Validate new games can be added
      const existingGames = await db('chunk_games')
        .join('games', 'chunk_games.game_id', 'games.id')
        .where('chunk_games.chunk_id', id)
        .select('games.*');

      const newGames = await db('games').whereIn('id', add_game_ids);
      const allGames = [...existingGames, ...newGames];

      try {
        await ChunkService.validateGamesForChunk(allGames.map(g => g.id));
        
        // Add new games to chunk
        const maxSort = await db('chunk_games')
          .where('chunk_id', id)
          .max('sort_order as max_sort')
          .first();

        const startSort = (maxSort.max_sort || 0) + 1;
        const newChunkGames = add_game_ids.map((gameId, index) => ({
          id: require('crypto').randomUUID(),
          chunk_id: id,
          game_id: gameId,
          sort_order: startSort + index
        }));

        await db('chunk_games').insert(newChunkGames);
      } catch (validationError) {
        return res.status(400).json({
          success: false,
          error: validationError.message
        });
      }
    }

    // Recalculate chunk details
    const updatedGames = await db('chunk_games')
      .join('games', 'chunk_games.game_id', 'games.id')
      .where('chunk_games.chunk_id', id)
      .select('games.*');

    const newDetails = await ChunkService.calculateChunkDetails(updatedGames);
    
    await db('game_chunks')
      .where('id', id)
      .update({
        game_count: newDetails.game_count,
        total_referees_needed: newDetails.total_referees_needed,
        start_time: newDetails.start_time,
        end_time: newDetails.end_time
      });

    // Get updated chunk
    const updatedChunk = await db('game_chunks').where('id', id).first();

    res.json({
      success: true,
      data: {
        chunk: {
          id: updatedChunk.id,
          name: updatedChunk.name,
          location: updatedChunk.location,
          date: updatedChunk.date,
          start_time: updatedChunk.start_time,
          end_time: updatedChunk.end_time,
          game_count: updatedChunk.game_count,
          total_referees_needed: updatedChunk.total_referees_needed,
          status: updatedChunk.status,
          notes: updatedChunk.notes
        }
      },
      message: 'Chunk updated successfully'
    });

  } catch (error) {
    console.error('Error updating chunk:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update chunk'
    });
  }
});

// POST /api/chunks/:id/assign - Assign referee to chunk
router.post('/:id/assign', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = assignChunkSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { referee_id, position_id = 'e468e96b-4ae8-448d-b0f7-86f688f3402b', check_conflicts, override_conflicts } = value;

    // Get chunk and its games
    const chunk = await db('game_chunks').where('id', id).first();
    if (!chunk) {
      return res.status(404).json({
        success: false,
        error: 'Chunk not found'
      });
    }

    const games = await db('chunk_games')
      .join('games', 'chunk_games.game_id', 'games.id')
      .where('chunk_games.chunk_id', id)
      .select('games.*');

    // Check for conflicts if requested
    if (check_conflicts) {
      const conflicts = await ChunkService.checkAssignmentConflicts(referee_id, games);
      
      if (conflicts.length > 0 && !override_conflicts) {
        return res.status(409).json({
          success: false,
          error: 'Assignment conflicts detected',
          data: { conflicts }
        });
      }
    }

    // Create assignments for all games in chunk
    const assignments = [];
    let conflictsOverridden = 0;

    for (const game of games) {
      // Remove existing assignment if overriding
      if (override_conflicts) {
        const existing = await db('game_assignments')
          .where('game_id', game.id)
          .first();
        
        if (existing) {
          await db('game_assignments').where('id', existing.id).del();
          conflictsOverridden++;
        }
      }

      // Create new assignment
      const assignmentData = {
        game_id: game.id,
        user_id: referee_id,
        position_id,
        assigned_by: req.user.userId,
        status: 'pending'
      };

      const [assignment] = await db('game_assignments').insert(assignmentData).returning('*');
      assignments.push(assignment);
    }

    // Update chunk status
    await db('game_chunks')
      .where('id', id)
      .update({
        assigned_referee_id: referee_id,
        assigned_by: req.user.userId,
        assigned_at: new Date(),
        status: 'assigned'
      });

    res.json({
      success: true,
      data: {
        assignments_created: assignments.length,
        conflicts_overridden: conflictsOverridden,
        assignments: assignments.map(a => ({
          id: a.id,
          game_id: a.game_id,
          referee_id: a.user_id,
          status: a.status
        }))
      },
      message: `Chunk assigned to referee with ${assignments.length} game assignments created`
    });

  } catch (error) {
    console.error('Error assigning chunk:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign chunk'
    });
  }
});

// DELETE /api/chunks/:id - Delete chunk
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false } = req.query;

    const chunk = await db('game_chunks').where('id', id).first();
    if (!chunk) {
      return res.status(404).json({
        success: false,
        error: 'Chunk not found'
      });
    }

    // Check if chunk is assigned
    if (chunk.assigned_referee_id && !force) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete assigned chunk. Use force=true to delete and remove assignments.'
      });
    }

    let assignmentsRemoved = 0;

    // If force deleting assigned chunk, remove assignments
    if (force && chunk.assigned_referee_id) {
      const gameIds = await db('chunk_games')
        .where('chunk_id', id)
        .pluck('game_id');

      const deletedAssignments = await db('game_assignments')
        .whereIn('game_id', gameIds)
        .where('user_id', chunk.assigned_referee_id)
        .del();

      assignmentsRemoved = deletedAssignments;
    }

    // Delete chunk (cascade will handle chunk_games)
    await db('game_chunks').where('id', id).del();

    res.json({
      success: true,
      data: {
        assignments_removed: assignmentsRemoved
      },
      message: 'Chunk deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting chunk:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete chunk'
    });
  }
});

// POST /api/chunks/auto-create - Auto-create chunks
router.post('/auto-create', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = autoCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { criteria, date_range } = value;

    // Generate chunks based on criteria
    const suggestedChunks = await ChunkService.autoCreateChunks(criteria, date_range);
    
    const createdChunks = [];

    for (const chunkSuggestion of suggestedChunks) {
      try {
        const chunkDetails = await ChunkService.calculateChunkDetails(chunkSuggestion.games);
        
        const chunkData = {
          id: require('crypto').randomUUID(),
          name: chunkSuggestion.name,
          location: chunkDetails.location,
          date: chunkDetails.date,
          start_time: chunkDetails.start_time,
          end_time: chunkDetails.end_time,
          total_referees_needed: chunkDetails.total_referees_needed,
          game_count: chunkDetails.game_count,
          notes: `Auto-created using ${criteria.group_by} criteria`,
          created_by: req.user.userId
        };

        const [chunk] = await db('game_chunks').insert(chunkData).returning('*');

        // Add games to chunk
        const chunkGameInserts = chunkSuggestion.games.map((game, index) => ({
          id: require('crypto').randomUUID(),
          chunk_id: chunk.id,
          game_id: game.id,
          sort_order: index
        }));

        await db('chunk_games').insert(chunkGameInserts);
        createdChunks.push(chunk);

      } catch (chunkError) {
        console.error('Error creating individual chunk:', chunkError);
        // Continue with other chunks
      }
    }

    res.json({
      success: true,
      data: {
        chunks_created: createdChunks.length,
        chunks: createdChunks.map(chunk => ({
          id: chunk.id,
          name: chunk.name,
          location: chunk.location,
          date: chunk.date,
          start_time: chunk.start_time,
          end_time: chunk.end_time,
          game_count: chunk.game_count,
          total_referees_needed: chunk.total_referees_needed
        }))
      },
      message: `Auto-created ${createdChunks.length} chunks based on ${criteria.group_by} criteria`
    });

  } catch (error) {
    console.error('Error auto-creating chunks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to auto-create chunks'
    });
  }
});

module.exports = router;