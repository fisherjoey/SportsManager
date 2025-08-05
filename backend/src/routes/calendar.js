const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Calendar validation schemas
const calendarQuerySchema = Joi.object({
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  calendar_name: Joi.string().max(100).default('Referee Schedule'),
  timezone: Joi.string().default('America/New_York')
});

const calendarSyncSchema = Joi.object({
  calendar_url: Joi.string().uri().required(),
  sync_direction: Joi.string().valid('import', 'export', 'bidirectional').default('import'),
  auto_sync: Joi.boolean().default(false)
});

// Helper function to generate iCal content
function generateICalContent(events, calendarName = 'Referee Schedule', timezone = 'America/New_York') {
  let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sports Management App//Referee Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${calendarName}
X-WR-TIMEZONE:${timezone}
X-WR-CALDESC:Referee assignment schedule
BEGIN:VTIMEZONE
TZID:${timezone}
BEGIN:STANDARD
DTSTART:20071104T020000
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
TZNAME:EST
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:20070311T020000
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
TZNAME:EDT
END:DAYLIGHT
END:VTIMEZONE
`;

  events.forEach(event => {
    const startDateTime = new Date(`${event.gameDate}T${event.gameTime}`);
    const endDateTime = new Date(startDateTime.getTime() + (2 * 60 * 60 * 1000)); // Add 2 hours
    
    // Format dates for iCal (YYYYMMDDTHHMMSS)
    const formatICalDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const uid = `game-${event.gameId}-assignment-${event.assignmentId}@sportsmanagement.app`;
    const summary = `${event.positionName} - ${event.homeTeamName} vs ${event.awayTeamName}`;
    const description = [
      `Assignment: ${event.positionName}`,
      `Game: ${event.homeTeamName} vs ${event.awayTeamName}`,
      `Level: ${event.level}`,
      `Type: ${event.gameType || 'Regular'}`,
      event.locationName ? `Location: ${event.locationName}` : '',
      event.locationAddress ? `Address: ${event.locationAddress}` : '',
      `Status: ${event.assignmentStatus}`,
      event.wage ? `Wage: $${event.wage}` : '',
      event.notes ? `Notes: ${event.notes}` : ''
    ].filter(Boolean).join('\\n');

    ical += `BEGIN:VEVENT
UID:${uid}
DTSTART;TZID=${timezone}:${formatICalDate(startDateTime).replace('Z', '')}
DTEND;TZID=${timezone}:${formatICalDate(endDateTime).replace('Z', '')}
SUMMARY:${summary}
DESCRIPTION:${description}
LOCATION:${event.locationName || ''}${event.locationAddress ? `, ${  event.locationAddress}` : ''}
STATUS:${event.assignmentStatus === 'accepted' ? 'CONFIRMED' : 'TENTATIVE'}
CATEGORIES:REFEREE,${event.level.toUpperCase()},${(event.gameType || 'REGULAR').toUpperCase()}
CLASS:PUBLIC
TRANSP:OPAQUE
SEQUENCE:0
DTSTAMP:${formatICalDate(new Date())}
CREATED:${formatICalDate(new Date(event.createdAt || new Date()))}
LAST-MODIFIED:${formatICalDate(new Date(event.updatedAt || new Date()))}
END:VEVENT
`;
  });

  ical += 'END:VCALENDAR\n';
  return ical;
}

// GET /api/referees/:id/calendar/ical - Get iCal feed for specific referee
router.get('/referees/:id/calendar/ical', async (req, res) => {
  try {
    const { error, value } = calendarQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const refereeId = req.params.id;
    const { start_date, end_date, calendar_name, timezone } = value;

    // Verify referee exists
    const referee = await db('users')
      .where('id', refereeId)
      .where('role', 'referee')
      .first();

    if (!referee) {
      return res.status(404).json({ error: 'Referee not found' });
    }

    // Build query for referee's assignments
    let query = db('game_assignments')
      .join('games', 'game_assignments.game_id', 'games.id')
      .join('users', 'game_assignments.user_id', 'users.id')
      .join('positions', 'game_assignments.position_id', 'positions.id')
      .leftJoin('locations', 'games.location_id', 'locations.id')
      .leftJoin('teams as home_team', 'games.home_team_id', 'home_team.id')
      .leftJoin('teams as away_team', 'games.away_team_id', 'away_team.id')
      .leftJoin('leagues', 'home_team.league_id', 'leagues.id')
      .where('game_assignments.user_id', refereeId)
      .whereIn('game_assignments.status', ['pending', 'accepted', 'completed']);

    // Apply date filters (default to next 6 months if not specified)
    const defaultStartDate = new Date().toISOString().split('T')[0];
    const defaultEndDate = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    query = query
      .where('games.game_date', '>=', start_date || defaultStartDate)
      .where('games.game_date', '<=', end_date || defaultEndDate);

    const assignments = await query
      .select(
        'game_assignments.id as assignment_id',
        'game_assignments.status as assignment_status',
        'game_assignments.created_at',
        'game_assignments.updated_at',
        'game_assignments.calculated_wage as wage',
        'games.id as game_id',
        'games.game_date',
        'games.game_time',
        'games.level',
        'games.game_type',
        'games.notes',
        'positions.name as position_name',
        'locations.name as location_name',
        'locations.address as location_address',
        'home_team.name as home_team_name',
        'away_team.name as away_team_name',
        'leagues.name as league_name'
      )
      .orderBy('games.game_date', 'asc');

    // Generate iCal content
    const calendarNameWithReferee = `${calendar_name} - ${referee.name}`;
    const icalContent = generateICalContent(assignments, calendarNameWithReferee, timezone);

    // Set appropriate headers for iCal download
    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${referee.name.replace(/[^a-zA-Z0-9]/g, '_')}_schedule.ics"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.send(icalContent);

  } catch (error) {
    console.error('Error generating referee iCal feed:', error);
    res.status(500).json({ 
      error: 'Failed to generate calendar feed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/games/calendar-feed - Get iCal feed for all games or filtered games
router.get('/games/calendar-feed', authenticateToken, async (req, res) => {
  try {
    const querySchema = calendarQuerySchema.keys({
      level: Joi.string(),
      game_type: Joi.string(),
      location_id: Joi.string().uuid(),
      league_id: Joi.string().uuid(),
      status: Joi.string().valid('unassigned', 'assigned', 'completed', 'cancelled'),
      include_assignments: Joi.boolean().default(false)
    });

    const { error, value } = querySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { 
      start_date, end_date, calendar_name, timezone, level, game_type, 
      location_id, league_id, status, include_assignments 
    } = value;

    // Build query for games
    let query = db('games')
      .leftJoin('locations', 'games.location_id', 'locations.id')
      .leftJoin('teams as home_team', 'games.home_team_id', 'home_team.id')
      .leftJoin('teams as away_team', 'games.away_team_id', 'away_team.id')
      .leftJoin('leagues', 'home_team.league_id', 'leagues.id');

    // Apply filters
    if (level) {
      query = query.where('games.level', level);
    }
    if (game_type) {
      query = query.where('games.game_type', game_type);
    }
    if (location_id) {
      query = query.where('games.location_id', location_id);
    }
    if (league_id) {
      query = query.where('leagues.id', league_id);
    }
    if (status) {
      query = query.where('games.status', status);
    }

    // Apply date filters (default to next 3 months if not specified)
    const defaultStartDate = new Date().toISOString().split('T')[0];
    const defaultEndDate = new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    query = query
      .where('games.game_date', '>=', start_date || defaultStartDate)
      .where('games.game_date', '<=', end_date || defaultEndDate);

    const games = await query
      .select(
        'games.id as game_id',
        'games.game_date',
        'games.game_time',
        'games.level',
        'games.game_type',
        'games.status',
        'games.refs_needed',
        'games.pay_rate',
        'games.notes',
        'games.created_at',
        'games.updated_at',
        'locations.name as location_name',
        'locations.address as location_address',
        'home_team.name as home_team_name',
        'away_team.name as away_team_name',
        'leagues.name as league_name'
      )
      .orderBy('games.game_date', 'asc');

    // Transform games into calendar events
    let events = games.map(game => ({
      gameId: game.game_id,
      assignmentId: null,
      gameDate: game.game_date,
      gameTime: game.game_time,
      level: game.level,
      gameType: game.game_type,
      assignmentStatus: game.status,
      positionName: 'Game',
      homeTeamName: game.home_team_name,
      awayTeamName: game.away_team_name,
      locationName: game.location_name,
      locationAddress: game.location_address,
      leagueName: game.league_name,
      wage: game.pay_rate,
      notes: game.notes,
      createdAt: game.created_at,
      updatedAt: game.updated_at
    }));

    // If include_assignments is true, also add assignment details
    if (include_assignments) {
      const gameIds = games.map(g => g.game_id);
      if (gameIds.length > 0) {
        const assignments = await db('game_assignments')
          .join('positions', 'game_assignments.position_id', 'positions.id')
          .join('users', 'game_assignments.user_id', 'users.id')
          .whereIn('game_assignments.game_id', gameIds)
          .whereIn('game_assignments.status', ['pending', 'accepted', 'completed'])
          .select(
            'game_assignments.id as assignment_id',
            'game_assignments.game_id',
            'game_assignments.status as assignment_status',
            'game_assignments.calculated_wage as wage',
            'game_assignments.created_at',
            'game_assignments.updated_at',
            'positions.name as position_name',
            'users.name as referee_name'
          );

        // Create assignment events
        const assignmentEvents = assignments.map(assignment => {
          const game = games.find(g => g.game_id === assignment.game_id);
          return {
            gameId: assignment.game_id,
            assignmentId: assignment.assignment_id,
            gameDate: game.game_date,
            gameTime: game.game_time,
            level: game.level,
            gameType: game.game_type,
            assignmentStatus: assignment.assignment_status,
            positionName: `${assignment.position_name} (${assignment.referee_name})`,
            homeTeamName: game.home_team_name,
            awayTeamName: game.away_team_name,
            locationName: game.location_name,
            locationAddress: game.location_address,
            leagueName: game.league_name,
            wage: assignment.wage,
            notes: game.notes,
            createdAt: assignment.created_at,
            updatedAt: assignment.updated_at
          };
        });

        // Replace game events with assignment events for assigned games
        events = events.filter(event => !assignments.find(a => a.game_id === event.gameId))
          .concat(assignmentEvents);
      }
    }

    // Generate iCal content
    const icalContent = generateICalContent(events, calendar_name, timezone);

    // Set appropriate headers for iCal download
    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="games_schedule.ics"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.send(icalContent);

  } catch (error) {
    console.error('Error generating games calendar feed:', error);
    res.status(500).json({ 
      error: 'Failed to generate games calendar feed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/calendar/sync - Configure calendar synchronization
router.post('/sync', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = calendarSyncSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { calendar_url, sync_direction, auto_sync } = value;
    const userId = req.user.id;

    // For now, we'll store calendar sync settings in the database
    // In a production system, you might want a dedicated calendar_sync_settings table
    
    // Check if organization settings table exists and has calendar sync fields
    // If not, we'll return a message indicating this feature needs database schema updates
    
    try {
      // Try to update organization settings with calendar sync info
      const orgSettings = await db('organization_settings').first();
      
      if (orgSettings) {
        // Check if calendar sync columns exist
        const tableInfo = await db.raw('PRAGMA table_info(organization_settings)');
        const hasCalendarFields = tableInfo.some(col => col.name === 'calendar_sync_url');
        
        if (!hasCalendarFields) {
          return res.status(501).json({ 
            error: 'Calendar sync feature requires database schema updates',
            message: 'Please run database migrations to add calendar sync support'
          });
        }

        await db('organization_settings')
          .update({
            calendar_sync_url: calendar_url,
            calendar_sync_direction: sync_direction,
            calendar_auto_sync: auto_sync,
            calendar_sync_enabled: true,
            updated_at: new Date()
          });
      } else {
        return res.status(404).json({ error: 'Organization settings not found' });
      }

      // Log the calendar sync configuration
      console.log(`Calendar sync configured by user ${userId}:`, {
        calendar_url,
        sync_direction,
        auto_sync
      });

      res.json({
        success: true,
        data: {
          message: 'Calendar sync configured successfully',
          syncSettings: {
            calendarUrl: calendar_url,
            syncDirection: sync_direction,
            autoSync: auto_sync,
            enabled: true
          }
        }
      });

    } catch (dbError) {
      // If organization_settings table doesn't have calendar fields, return appropriate message
      if (dbError.message.includes('no such column')) {
        return res.status(501).json({ 
          error: 'Calendar sync feature requires database schema updates',
          message: 'Please run database migrations to add calendar sync support to organization_settings table'
        });
      }
      throw dbError;
    }

  } catch (error) {
    console.error('Error configuring calendar sync:', error);
    res.status(500).json({ 
      error: 'Failed to configure calendar sync',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/calendar/sync/status - Get calendar sync status
router.get('/sync/status', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const orgSettings = await db('organization_settings').first();
    
    if (!orgSettings) {
      return res.status(404).json({ error: 'Organization settings not found' });
    }

    // Check if calendar sync fields exist in the database
    const tableInfo = await db.raw('PRAGMA table_info(organization_settings)');
    const hasCalendarFields = tableInfo.some(col => col.name === 'calendar_sync_url');
    
    if (!hasCalendarFields) {
      return res.json({
        success: true,
        data: {
          syncEnabled: false,
          message: 'Calendar sync feature requires database schema updates',
          requiresSetup: true
        }
      });
    }

    res.json({
      success: true,
      data: {
        syncEnabled: !!orgSettings.calendar_sync_enabled,
        syncSettings: orgSettings.calendar_sync_enabled ? {
          calendarUrl: orgSettings.calendar_sync_url,
          syncDirection: orgSettings.calendar_sync_direction,
          autoSync: !!orgSettings.calendar_auto_sync,
          lastSyncAt: orgSettings.calendar_last_sync_at,
          lastSyncStatus: orgSettings.calendar_last_sync_status
        } : null,
        requiresSetup: false
      }
    });

  } catch (error) {
    console.error('Error getting calendar sync status:', error);
    res.status(500).json({ 
      error: 'Failed to get calendar sync status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/calendar/sync - Disable calendar sync
router.delete('/sync', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const orgSettings = await db('organization_settings').first();
    
    if (!orgSettings) {
      return res.status(404).json({ error: 'Organization settings not found' });
    }

    // Check if calendar sync fields exist
    const tableInfo = await db.raw('PRAGMA table_info(organization_settings)');
    const hasCalendarFields = tableInfo.some(col => col.name === 'calendar_sync_url');
    
    if (!hasCalendarFields) {
      return res.status(404).json({ 
        error: 'Calendar sync feature not available',
        message: 'Calendar sync requires database schema updates'
      });
    }

    await db('organization_settings')
      .update({
        calendar_sync_enabled: false,
        calendar_sync_url: null,
        calendar_sync_direction: null,
        calendar_auto_sync: false,
        updated_at: new Date()
      });

    res.json({
      success: true,
      data: {
        message: 'Calendar sync disabled successfully'
      }
    });

  } catch (error) {
    console.error('Error disabling calendar sync:', error);
    res.status(500).json({ 
      error: 'Failed to disable calendar sync',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;