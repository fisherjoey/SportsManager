const express = require('express');
const { authenticateToken, requireRole, requireAnyRole } = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

// GET /api/availability/referees/:id - Get referee's availability windows
router.get('/referees/:id', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const refereeId = req.params.id;

    let query = db('referee_availability')
      .where('referee_id', refereeId)
      .orderBy('date', 'asc')
      .orderBy('start_time', 'asc');

    // Filter by date range if provided
    if (startDate) {
      query = query.where('date', '>=', startDate);
    }
    if (endDate) {
      query = query.where('date', '<=', endDate);
    }

    const availability = await query;

    res.json({
      success: true,
      data: {
        refereeId,
        availability,
        count: availability.length
      }
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// POST /api/availability/referees/:id - Create availability window
router.post('/referees/:id', authenticateToken, requireAnyRole('admin', 'referee'), async (req, res) => {
  try {
    const refereeId = req.params.id;
    const { date, start_time, end_time, is_available = true, reason } = req.body;

    // Validation
    if (!date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Date, start_time, and end_time are required' });
    }

    // Verify referee exists
    const referee = await db('referees').where('id', refereeId).first();
    if (!referee) {
      return res.status(404).json({ error: 'Referee not found' });
    }

    // Check for overlapping windows
    const overlapping = await db('referee_availability')
      .where('referee_id', refereeId)
      .where('date', date)
      .where(function() {
        this.where(function() {
          // New window starts during existing window
          this.where('start_time', '<=', start_time)
            .where('end_time', '>', start_time);
        }).orWhere(function() {
          // New window ends during existing window
          this.where('start_time', '<', end_time)
            .where('end_time', '>=', end_time);
        }).orWhere(function() {
          // New window completely contains existing window
          this.where('start_time', '>=', start_time)
            .where('end_time', '<=', end_time);
        });
      });

    if (overlapping.length > 0) {
      return res.status(409).json({ 
        error: 'Overlapping availability window exists',
        conflicting: overlapping
      });
    }

    // Create availability window
    const [newWindow] = await db('referee_availability')
      .insert({
        referee_id: refereeId,
        date,
        start_time,
        end_time,
        is_available,
        reason
      })
      .returning('*');

    res.status(201).json({
      success: true,
      data: newWindow
    });
  } catch (error) {
    console.error('Error creating availability window:', error);
    res.status(500).json({ error: 'Failed to create availability window' });
  }
});

// PUT /api/availability/:windowId - Update availability window
router.put('/:windowId', authenticateToken, requireAnyRole('admin', 'referee'), async (req, res) => {
  try {
    const windowId = req.params.windowId;
    const { date, start_time, end_time, is_available, reason } = req.body;

    // Get existing window
    const existingWindow = await db('referee_availability').where('id', windowId).first();
    if (!existingWindow) {
      return res.status(404).json({ error: 'Availability window not found' });
    }

    // Authorization check - referees can only update their own windows
    if (req.user.role === 'referee' && req.user.userId !== existingWindow.referee_id) {
      return res.status(403).json({ error: 'Can only update your own availability' });
    }

    // Check for overlapping windows (exclude current window)
    if (date && start_time && end_time) {
      const overlapping = await db('referee_availability')
        .where('referee_id', existingWindow.referee_id)
        .where('date', date)
        .where('id', '!=', windowId)
        .where(function() {
          this.where(function() {
            this.where('start_time', '<=', start_time)
              .where('end_time', '>', start_time);
          }).orWhere(function() {
            this.where('start_time', '<', end_time)
              .where('end_time', '>=', end_time);
          }).orWhere(function() {
            this.where('start_time', '>=', start_time)
              .where('end_time', '<=', end_time);
          });
        });

      if (overlapping.length > 0) {
        return res.status(409).json({ 
          error: 'Overlapping availability window exists',
          conflicting: overlapping
        });
      }
    }

    // Update window
    const [updatedWindow] = await db('referee_availability')
      .where('id', windowId)
      .update({
        ...(date && { date }),
        ...(start_time && { start_time }),
        ...(end_time && { end_time }),
        ...(typeof is_available === 'boolean' && { is_available }),
        ...(reason !== undefined && { reason }),
        updated_at: new Date()
      })
      .returning('*');

    res.json({
      success: true,
      data: updatedWindow
    });
  } catch (error) {
    console.error('Error updating availability window:', error);
    res.status(500).json({ error: 'Failed to update availability window' });
  }
});

// DELETE /api/availability/:windowId - Delete availability window
router.delete('/:windowId', authenticateToken, requireAnyRole('admin', 'referee'), async (req, res) => {
  try {
    const windowId = req.params.windowId;

    // Get existing window for authorization
    const existingWindow = await db('referee_availability').where('id', windowId).first();
    if (!existingWindow) {
      return res.status(404).json({ error: 'Availability window not found' });
    }

    // Authorization check
    if (req.user.role === 'referee' && req.user.userId !== existingWindow.referee_id) {
      return res.status(403).json({ error: 'Can only delete your own availability' });
    }

    await db('referee_availability').where('id', windowId).del();

    res.json({
      success: true,
      message: 'Availability window deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting availability window:', error);
    res.status(500).json({ error: 'Failed to delete availability window' });
  }
});

// GET /api/availability/conflicts - Check for scheduling conflicts
router.get('/conflicts', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { date, start_time, end_time, referee_id } = req.query;

    if (!date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Date, start_time, and end_time are required' });
    }

    let query = db('referee_availability as ra')
      .join('referees as r', 'ra.referee_id', 'r.id')
      .select('ra.*', 'r.name as referee_name')
      .where('ra.date', date)
      .where('ra.is_available', false)
      .where(function() {
        this.where(function() {
          this.where('ra.start_time', '<=', start_time)
            .where('ra.end_time', '>', start_time);
        }).orWhere(function() {
          this.where('ra.start_time', '<', end_time)
            .where('ra.end_time', '>=', end_time);
        }).orWhere(function() {
          this.where('ra.start_time', '>=', start_time)
            .where('ra.end_time', '<=', end_time);
        });
      });

    // Filter by specific referee if provided
    if (referee_id) {
      query = query.where('ra.referee_id', referee_id);
    }

    const conflicts = await query;

    // Also check game assignments for double-booking
    const gameConflicts = await db('game_assignments as ga')
      .join('games as g', 'ga.game_id', 'g.id')
      .join('referees as r', 'ga.referee_id', 'r.id')
      .select('ga.*', 'g.game_date', 'g.game_time', 'r.name as referee_name')
      .where('g.game_date', date)
      .where('g.game_time', '>=', start_time)
      .where('g.game_time', '<', end_time)
      .where(referee_id ? 'ga.referee_id' : 'ga.referee_id', referee_id || db.raw('ga.referee_id'));

    res.json({
      success: true,
      data: {
        availabilityConflicts: conflicts,
        gameConflicts,
        totalConflicts: conflicts.length + gameConflicts.length
      }
    });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({ error: 'Failed to check conflicts' });
  }
});

// POST /api/availability/bulk - Bulk create availability windows
router.post('/bulk', authenticateToken, requireAnyRole('admin', 'referee'), async (req, res) => {
  try {
    const { referee_id, windows } = req.body;

    if (!referee_id || !Array.isArray(windows) || windows.length === 0) {
      return res.status(400).json({ error: 'referee_id and windows array are required' });
    }

    // Verify referee exists
    const referee = await db('referees').where('id', referee_id).first();
    if (!referee) {
      return res.status(404).json({ error: 'Referee not found' });
    }

    // Authorization check - referees can only create availability for themselves
    if (req.user.role === 'referee' && req.user.referee_id !== referee_id) {
      return res.status(403).json({ error: 'Can only create availability for yourself' });
    }

    // Validate all windows
    for (const window of windows) {
      if (!window.date || !window.start_time || !window.end_time) {
        return res.status(400).json({ error: 'Each window must have date, start_time, and end_time' });
      }
    }

    // Process in transaction
    const results = await db.transaction(async (trx) => {
      const created = [];
      const skipped = [];

      for (const window of windows) {
        // Check for overlapping windows
        const overlapping = await trx('referee_availability')
          .where('referee_id', referee_id)
          .where('date', window.date)
          .where(function() {
            this.where(function() {
              this.where('start_time', '<=', window.start_time)
                .where('end_time', '>', window.start_time);
            }).orWhere(function() {
              this.where('start_time', '<', window.end_time)
                .where('end_time', '>=', window.end_time);
            }).orWhere(function() {
              this.where('start_time', '>=', window.start_time)
                .where('end_time', '<=', window.end_time);
            });
          });

        if (overlapping.length > 0) {
          skipped.push({ window, reason: 'Overlapping window exists' });
          continue;
        }

        // Create window
        const [newWindow] = await trx('referee_availability')
          .insert({
            referee_id,
            date: window.date,
            start_time: window.start_time,
            end_time: window.end_time,
            is_available: window.is_available !== undefined ? window.is_available : true,
            reason: window.reason
          })
          .returning('*');

        created.push(newWindow);
      }

      return { created, skipped };
    });

    res.status(201).json({
      success: true,
      data: results,
      summary: {
        total: windows.length,
        created: results.created.length,
        skipped: results.skipped.length
      }
    });
  } catch (error) {
    console.error('Error creating bulk availability:', error);
    res.status(500).json({ error: 'Failed to create bulk availability' });
  }
});

module.exports = router;