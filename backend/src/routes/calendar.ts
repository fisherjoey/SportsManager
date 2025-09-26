/**
 * @fileoverview Calendar routes with TypeScript implementation
 * @description TypeScript implementation of calendar routes providing iCal generation,
 * calendar synchronization, and comprehensive date/time handling for referee schedules
 * and game management. Supports standard iCal format with timezone handling.
 */

import express, { Request, Response } from 'express';
import Joi from 'joi';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../types/database.types';
import { AuthenticatedRequest } from '../types/auth.types';
import { ApiResponse, RouteParams } from '../types/api.types';
const { authenticateToken, requireRole, requireAnyRole } = require('../middleware/auth');
import { ICSParser, ParsedCalendar, GameImportData } from '../utils/ics-parser';
import db from '../config/database';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Accept only .ics files
    if (file.mimetype === 'text/calendar' || file.originalname.endsWith('.ics')) {
      cb(null, true);
    } else {
      cb(new Error('Only .ics calendar files are allowed'));
    }
  }
});

const router = express.Router();

// Type definitions for calendar functionality
interface CalendarQueryParams {
  start_date?: string;
  end_date?: string;
  calendar_name?: string;
  timezone?: string;
}

interface GameCalendarQueryParams extends CalendarQueryParams {
  level?: string;
  game_type?: string;
  location_id?: string;
  league_id?: string;
  status?: 'unassigned' | 'assigned' | 'completed' | 'cancelled';
  include_assignments?: boolean;
}

interface CalendarSyncRequest {
  calendar_url: string;
  sync_direction: 'import' | 'export' | 'bidirectional';
  auto_sync?: boolean;
}

interface CalendarSyncSettings {
  calendarUrl: string;
  syncDirection: 'import' | 'export' | 'bidirectional';
  autoSync: boolean;
  enabled: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: string;
}

interface CalendarEvent {
  gameId: string;
  assignmentId?: string | null;
  gameDate: string;
  gameTime: string;
  level: string;
  gameType?: string;
  assignmentStatus: string;
  positionName: string;
  homeTeamName: string;
  awayTeamName: string;
  locationName?: string;
  locationAddress?: string;
  leagueName?: string;
  wage?: number | string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AssignmentData {
  assignment_id: string;
  assignment_status: string;
  created_at: string;
  updated_at: string;
  wage?: string;
  game_id: string;
  game_date: string;
  game_time: string;
  level: string;
  game_type?: string;
  notes?: string;
  position_name: string;
  location_name?: string;
  location_address?: string;
  home_team_name: string;
  away_team_name: string;
  league_name?: string;
}

interface GameData {
  game_id: string;
  game_date: string;
  game_time: string;
  level: string;
  game_type?: string;
  status: string;
  refs_needed: number;
  pay_rate?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  location_name?: string;
  location_address?: string;
  home_team_name: string;
  away_team_name: string;
  league_name?: string;
}

interface RefereeCalendarParams extends RouteParams {
  id: string;
}

interface CalendarSyncResponse extends ApiResponse {
  data: {
    message: string;
    syncSettings?: CalendarSyncSettings;
  };
}

interface CalendarSyncStatusResponse extends ApiResponse {
  data: {
    syncEnabled: boolean;
    syncSettings?: CalendarSyncSettings | null;
    requiresSetup: boolean;
    message?: string;
  };
}

interface CalendarUploadResponse extends ApiResponse {
  data: {
    message: string;
    imported: number;
    failed: number;
    skipped: number;
    games?: Array<{
      id: string;
      gameDate: string;
      gameTime: string;
      homeTeamName?: string;
      awayTeamName?: string;
      status: 'imported' | 'failed' | 'skipped';
      reason?: string;
    }>;
  };
}

interface CalendarUploadOptions {
  overwriteExisting?: boolean;
  autoCreateTeams?: boolean;
  autoCreateLocations?: boolean;
  defaultLevel?: string;
  defaultGameType?: string;
  leagueId?: string;
}

// Validation schemas
const calendarQuerySchema = Joi.object({
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  calendar_name: Joi.string().max(100).default('Referee Schedule'),
  timezone: Joi.string().default('America/New_York')
});

const gameCalendarQuerySchema = calendarQuerySchema.keys({
  level: Joi.string(),
  game_type: Joi.string(),
  location_id: Joi.string().uuid(),
  league_id: Joi.string().uuid(),
  status: Joi.string().valid('unassigned', 'assigned', 'completed', 'cancelled'),
  include_assignments: Joi.boolean().default(false)
});

const calendarSyncSchema = Joi.object({
  calendar_url: Joi.string().uri().required(),
  sync_direction: Joi.string().valid('import', 'export', 'bidirectional').default('import'),
  auto_sync: Joi.boolean().default(false)
});

const calendarUploadOptionsSchema = Joi.object({
  overwriteExisting: Joi.boolean().default(false),
  autoCreateTeams: Joi.boolean().default(false),
  autoCreateLocations: Joi.boolean().default(false),
  defaultLevel: Joi.string().default('Youth'),
  defaultGameType: Joi.string().default('League'),
  leagueId: Joi.string().uuid()
});

/**
 * Helper function to generate iCal content from calendar events
 * @param events Array of calendar events
 * @param calendarName Name of the calendar
 * @param timezone Timezone identifier
 * @returns iCal formatted string
 */
function generateICalContent(
  events: CalendarEvent[],
  calendarName: string = 'Referee Schedule',
  timezone: string = 'America/New_York'
): string {
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
    const formatICalDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const uid = `game-${event.gameId}-assignment-${event.assignmentId || 'none'}@sportsmanagement.app`;
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

    const location = [event.locationName, event.locationAddress].filter(Boolean).join(', ');
    const status = event.assignmentStatus === 'accepted' ? 'CONFIRMED' : 'TENTATIVE';
    const categories = `REFEREE,${event.level.toUpperCase()},${(event.gameType || 'REGULAR').toUpperCase()}`;

    ical += `BEGIN:VEVENT
UID:${uid}
DTSTART;TZID=${timezone}:${formatICalDate(startDateTime).replace('Z', '')}
DTEND;TZID=${timezone}:${formatICalDate(endDateTime).replace('Z', '')}
SUMMARY:${summary}
DESCRIPTION:${description}
LOCATION:${location}
STATUS:${status}
CATEGORIES:${categories}
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

/**
 * GET /api/calendar/referees/:id/calendar/ical - Get iCal feed for specific referee
 * @route GET /api/calendar/referees/:id/calendar/ical
 * @access Public (no authentication required for calendar feeds)
 * @param {string} id - Referee ID
 * @param {CalendarQueryParams} query - Query parameters for calendar filtering
 * @returns {string} iCal formatted calendar content
 */
router.get('/referees/:id/calendar/ical', async (req: Request<RefereeCalendarParams>, res: Response) => {
  try {
    const { error, value } = calendarQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const refereeId = req.params.id;
    const { start_date, end_date, calendar_name, timezone } = value as CalendarQueryParams;

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

    const assignments: AssignmentData[] = await query
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

    // Transform assignments to calendar events
    const events: CalendarEvent[] = assignments.map(assignment => ({
      gameId: assignment.game_id,
      assignmentId: assignment.assignment_id,
      gameDate: assignment.game_date,
      gameTime: assignment.game_time,
      level: assignment.level,
      gameType: assignment.game_type,
      assignmentStatus: assignment.assignment_status,
      positionName: assignment.position_name,
      homeTeamName: assignment.home_team_name,
      awayTeamName: assignment.away_team_name,
      locationName: assignment.location_name,
      locationAddress: assignment.location_address,
      leagueName: assignment.league_name,
      wage: assignment.wage ? parseFloat(assignment.wage) : undefined,
      notes: assignment.notes,
      createdAt: assignment.created_at,
      updatedAt: assignment.updated_at
    }));

    // Generate iCal content
    const calendarNameWithReferee = `${calendar_name} - ${referee.name}`;
    const icalContent = generateICalContent(events, calendarNameWithReferee, timezone);

    // Set appropriate headers for iCal download
    const filename = `${referee.name.replace(/[^a-zA-Z0-9]/g, '_')}_schedule.ics`;
    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.send(icalContent);

  } catch (error) {
    console.error('Error generating referee iCal feed:', error);
    res.status(500).json({
      error: 'Failed to generate calendar feed',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * GET /api/calendar/games/calendar-feed - Get iCal feed for all games or filtered games
 * @route GET /api/calendar/games/calendar-feed
 * @access Private (Authenticated users)
 * @param {GameCalendarQueryParams} query - Query parameters for filtering games
 * @returns {string} iCal formatted calendar content
 */
router.get('/games/calendar-feed', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error, value } = gameCalendarQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {
      start_date, end_date, calendar_name, timezone, level, game_type,
      location_id, league_id, status, include_assignments
    } = value as GameCalendarQueryParams;

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

    const games: GameData[] = await query
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
    let events: CalendarEvent[] = games.map(game => ({
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
      wage: game.pay_rate ? parseFloat(game.pay_rate) : undefined,
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
        const assignmentEvents: CalendarEvent[] = assignments.map(assignment => {
          const game = games.find(g => g.game_id === assignment.game_id);
          if (!game) {
            throw new Error(`Game not found for assignment ${assignment.assignment_id}`);
          }

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
            wage: assignment.wage ? parseFloat(assignment.wage) : undefined,
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
      'Content-Disposition': 'attachment; filename="games_schedule.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.send(icalContent);

  } catch (error) {
    console.error('Error generating games calendar feed:', error);
    res.status(500).json({
      error: 'Failed to generate games calendar feed',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * POST /api/calendar/sync - Configure calendar synchronization
 * @route POST /api/calendar/sync
 * @access Private (Admin only)
 * @param {CalendarSyncRequest} body - Calendar sync configuration
 * @returns {CalendarSyncResponse} Sync configuration response
 */
router.post('/sync', authenticateToken, requireRole('admin'), async (req: AuthenticatedRequest, res: Response<CalendarSyncResponse>) => {
  try {
    const { error, value } = calendarSyncSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
      });
    }

    const { calendar_url, sync_direction, auto_sync } = value as CalendarSyncRequest;
    const userId = req.user?.id;

    // For now, we'll store calendar sync settings in the database
    // In a production system, you might want a dedicated calendar_sync_settings table

    try {
      // Try to update organization settings with calendar sync info
      const orgSettings = await db('organization_settings').first();

      if (!orgSettings) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Organization settings not found' }
        });
      }

      // Check if calendar sync columns exist
      const tableInfo = await db.raw('PRAGMA table_info(organization_settings)');
      const hasCalendarFields = tableInfo.some((col: any) => col.name === 'calendar_sync_url');

      if (!hasCalendarFields) {
        return res.status(501).json({
          success: false,
          error: {
            code: 'FEATURE_UNAVAILABLE',
            message: 'Calendar sync feature requires database schema updates'
          },
          data: {
            message: 'Please run database migrations to add calendar sync support'
          }
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

    } catch (dbError: any) {
      // If organization_settings table doesn't have calendar fields, return appropriate message
      if (dbError.message && dbError.message.includes('no such column')) {
        return res.status(501).json({
          success: false,
          error: {
            code: 'SCHEMA_UPDATE_REQUIRED',
            message: 'Calendar sync feature requires database schema updates'
          },
          data: {
            message: 'Please run database migrations to add calendar sync support to organization_settings table'
          }
        });
      }
      throw dbError;
    }

  } catch (error) {
    console.error('Error configuring calendar sync:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to configure calendar sync',
        ...(process.env.NODE_ENV === 'development' && { details: (error as Error).message })
      }
    });
  }
});

/**
 * GET /api/calendar/sync/status - Get calendar sync status
 * @route GET /api/calendar/sync/status
 * @access Private (Admin only)
 * @returns {CalendarSyncStatusResponse} Calendar sync status
 */
router.get('/sync/status', authenticateToken, requireRole('admin'), async (req: AuthenticatedRequest, res: Response<CalendarSyncStatusResponse>) => {
  try {
    const orgSettings = await db('organization_settings').first();

    if (!orgSettings) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization settings not found' }
      });
    }

    // Check if calendar sync fields exist in the database
    const tableInfo = await db.raw('PRAGMA table_info(organization_settings)');
    const hasCalendarFields = tableInfo.some((col: any) => col.name === 'calendar_sync_url');

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

    const syncSettings: CalendarSyncSettings | null = orgSettings.calendar_sync_enabled ? {
      calendarUrl: orgSettings.calendar_sync_url,
      syncDirection: orgSettings.calendar_sync_direction,
      autoSync: !!orgSettings.calendar_auto_sync,
      enabled: true,
      lastSyncAt: orgSettings.calendar_last_sync_at,
      lastSyncStatus: orgSettings.calendar_last_sync_status
    } : null;

    res.json({
      success: true,
      data: {
        syncEnabled: !!orgSettings.calendar_sync_enabled,
        syncSettings,
        requiresSetup: false
      }
    });

  } catch (error) {
    console.error('Error getting calendar sync status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get calendar sync status',
        ...(process.env.NODE_ENV === 'development' && { details: (error as Error).message })
      }
    });
  }
});

/**
 * DELETE /api/calendar/sync - Disable calendar sync
 * @route DELETE /api/calendar/sync
 * @access Private (Admin only)
 * @returns {CalendarSyncResponse} Sync disable response
 */
router.delete('/sync', authenticateToken, requireRole('admin'), async (req: AuthenticatedRequest, res: Response<CalendarSyncResponse>) => {
  try {
    const orgSettings = await db('organization_settings').first();

    if (!orgSettings) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization settings not found' }
      });
    }

    // Check if calendar sync fields exist
    const tableInfo = await db.raw('PRAGMA table_info(organization_settings)');
    const hasCalendarFields = tableInfo.some((col: any) => col.name === 'calendar_sync_url');

    if (!hasCalendarFields) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FEATURE_UNAVAILABLE',
          message: 'Calendar sync feature not available'
        },
        data: {
          message: 'Calendar sync requires database schema updates'
        }
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
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to disable calendar sync',
        ...(process.env.NODE_ENV === 'development' && { details: (error as Error).message })
      }
    });
  }
});

/**
 * POST /api/calendar/upload - Upload and import ICS calendar file
 * @route POST /api/calendar/upload
 * @access Private (Admin or assignor role)
 * @param {File} file - ICS calendar file
 * @param {CalendarUploadOptions} body - Import options
 * @returns {CalendarUploadResponse} Import results
 */
router.post('/upload',
  authenticateToken,
  upload.single('calendar'),
  async (req: AuthenticatedRequest, res: Response<CalendarUploadResponse>) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No calendar file provided'
          }
        });
      }

      // Validate options
      const { error, value } = calendarUploadOptionsSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          }
        });
      }

      const options = value as CalendarUploadOptions;
      const fileContent = req.file.buffer.toString('utf-8');

      // Validate ICS format
      if (!ICSParser.isValidICS(fileContent)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'Invalid ICS calendar file format'
          }
        });
      }

      // Parse the calendar
      const parser = new ICSParser();
      let calendar: ParsedCalendar;

      try {
        console.log('Parsing ICS file, content length:', fileContent.length);
        console.log('First 500 chars:', fileContent.substring(0, 500));
        calendar = parser.parse(fileContent);
        console.log('Parsed calendar, found events:', calendar.events.length);
      } catch (parseError) {
        console.error('Error parsing ICS file:', parseError);
        return res.status(400).json({
          success: false,
          error: {
            code: 'PARSE_ERROR',
            message: 'Failed to parse calendar file',
            details: (parseError as Error).message
          }
        });
      }

      if (calendar.events.length === 0) {
        console.log('No events found in parsed calendar');
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_EVENTS',
            message: 'No events found in calendar file'
          }
        });
      }

      // Convert events to game data
      const gameDataList = ICSParser.eventsToGameData(calendar.events);

      console.log('Converted game data:', gameDataList.map(g => ({
        date: g.gameDate,
        time: g.gameTime,
        home: g.homeTeamName,
        away: g.awayTeamName,
        level: g.level,
        type: g.gameType,
        location: g.locationName
      })));

      const importResults: Array<{
        id: string;
        gameDate: string;
        gameTime: string;
        homeTeamName?: string;
        awayTeamName?: string;
        status: 'imported' | 'failed' | 'skipped';
        reason?: string;
      }> = [];

      let imported = 0;
      let failed = 0;
      let skipped = 0;

      // Process games without transaction (SQLite doesn't support it well in this context)
      try {
        for (const gameData of gameDataList) {
          const result = {
            id: '',
            gameDate: gameData.gameDate,
            gameTime: gameData.gameTime,
            homeTeamName: gameData.homeTeamName,
            awayTeamName: gameData.awayTeamName,
            status: 'failed' as const,
            reason: ''
          };

          try {
            // Check if game already exists by external ID
            if (gameData.externalId) {
              const existingGame = await db('games')
                .where('external_id', gameData.externalId)
                .first();

              if (existingGame && !options.overwriteExisting) {
                result.status = 'skipped';
                result.reason = 'Game already exists';
                result.id = existingGame.id;
                skipped++;
                importResults.push(result);
                continue;
              }

              if (existingGame && options.overwriteExisting) {
                // Update existing game
                await db('games')
                  .where('id', existingGame.id)
                  .update({
                    date_time: `${gameData.gameDate} ${gameData.gameTime}:00`,
                    field: gameData.locationName || existingGame.field,
                    metadata: JSON.stringify({
                      ...JSON.parse(existingGame.metadata || '{}'),
                      notes: gameData.notes,
                      location_address: gameData.locationAddress
                    }),
                    updated_at: new Date()
                  });

                result.id = existingGame.id;
                result.status = 'imported';
                imported++;
                importResults.push(result);
                continue;
              }
            }

            // Prepare game record (using actual database schema)
            const gameRecord: any = {
              id: uuidv4(),
              game_number: Math.floor(Math.random() * 90000) + 10000, // Generate random game number
              date_time: `${gameData.gameDate} ${gameData.gameTime}:00`, // Combine date and time
              division: gameData.level || options.defaultLevel || 'Youth',
              game_type: gameData.gameType || options.defaultGameType || 'League',
              refs_needed: gameData.refereesRequired || 2,
              field: gameData.locationName || null,
              metadata: JSON.stringify({
                external_id: gameData.externalId,
                notes: gameData.notes,
                original_status: gameData.status || 'scheduled',
                location_address: gameData.locationAddress
              }),
              created_at: new Date(),
              updated_at: new Date()
            };

            // Handle teams
            if (gameData.homeTeamName && gameData.awayTeamName) {
              // Look up or create teams
              let homeTeamId = null;
              let awayTeamId = null;

              const homeTeam = await db('teams')
                .where('name', gameData.homeTeamName)
                .first();

              if (homeTeam) {
                homeTeamId = homeTeam.id;
              } else if (options.autoCreateTeams) {
                const newHomeTeam = {
                  id: uuidv4(),
                  name: gameData.homeTeamName,
                  display_name: gameData.homeTeamName,
                  team_number: Math.floor(Math.random() * 9000) + 1000, // Random team number
                  league_id: options.leagueId,
                  metadata: JSON.stringify({
                    sport: 'Basketball',
                    level: gameData.level || options.defaultLevel || 'Youth'
                  }),
                  created_at: new Date(),
                  updated_at: new Date()
                };
                await db('teams').insert(newHomeTeam);
                homeTeamId = newHomeTeam.id;
              }

              const awayTeam = await db('teams')
                .where('name', gameData.awayTeamName)
                .first();

              if (awayTeam) {
                awayTeamId = awayTeam.id;
              } else if (options.autoCreateTeams) {
                const newAwayTeam = {
                  id: uuidv4(),
                  name: gameData.awayTeamName,
                  display_name: gameData.awayTeamName,
                  team_number: Math.floor(Math.random() * 9000) + 1000, // Random team number
                  league_id: options.leagueId,
                  metadata: JSON.stringify({
                    sport: 'Basketball',
                    level: gameData.level || options.defaultLevel || 'Youth'
                  }),
                  created_at: new Date(),
                  updated_at: new Date()
                };
                await db('teams').insert(newAwayTeam);
                awayTeamId = newAwayTeam.id;
              }

              if (homeTeamId && awayTeamId) {
                gameRecord.home_team_id = homeTeamId;
                gameRecord.away_team_id = awayTeamId;
              }
            }

            // Handle location
            if (gameData.locationName) {
              const location = await db('locations')
                .where('name', gameData.locationName)
                .first();

              if (location) {
                gameRecord.location_id = location.id;
              } else if (options.autoCreateLocations) {
                const newLocation = {
                  id: uuidv4(),
                  name: gameData.locationName,
                  address: gameData.locationAddress || 'TBD',
                  city: 'TBD',
                  province: 'ON',
                  postal_code: 'TBD',
                  country: 'Canada',
                  created_at: new Date(),
                  updated_at: new Date()
                };
                await db('locations').insert(newLocation);
                gameRecord.location_id = newLocation.id;
              }
            }

            // Insert the game
            await db('games').insert(gameRecord);

            result.id = gameRecord.id;
            result.status = 'imported';
            imported++;
            importResults.push(result);

          } catch (gameError) {
            console.error('Error importing game:', {
              gameData,
              error: gameError,
              message: (gameError as Error).message,
              stack: (gameError as Error).stack
            });
            result.status = 'failed';
            result.reason = (gameError as Error).message;
            failed++;
            importResults.push(result);
          }
        }

        // Log the import
        console.log(`Calendar import completed by user ${req.user?.id}:`, {
          total: gameDataList.length,
          imported,
          failed,
          skipped
        });

        res.json({
          success: true,
          data: {
            message: `Successfully processed ${gameDataList.length} events from calendar`,
            imported,
            failed,
            skipped,
            games: importResults
          }
        });

      } catch (dbError) {
        throw dbError;
      }

    } catch (error) {
      console.error('Error processing calendar upload:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process calendar upload',
          ...(process.env.NODE_ENV === 'development' && { details: (error as Error).message })
        }
      });
    }
  }
);

export default router;