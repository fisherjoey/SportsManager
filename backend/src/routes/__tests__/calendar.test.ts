/**
 * @fileoverview Test suite for calendar routes
 * @description Comprehensive integration tests for all calendar endpoints with proper mocking
 * and TypeScript type checking. Tests iCal generation, calendar sync, and date/time handling.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

// Mock dependencies
const mockDb = {
  where: jest.fn(() => mockDb),
  whereIn: jest.fn(() => mockDb),
  join: jest.fn(() => mockDb),
  leftJoin: jest.fn(() => mockDb),
  select: jest.fn(() => mockDb),
  orderBy: jest.fn(() => mockDb),
  first: jest.fn(),
  update: jest.fn(),
  raw: jest.fn(),
  // For the main query method
  then: jest.fn()
};

const mockAuthMiddleware = {
  authenticateToken: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      roles: ['admin']
    };
    next();
  }),
  requireRole: jest.fn((role: string) => (req: any, res: any, next: any) => next())
};

// Mock modules
jest.unstable_mockModule('../config/database', () => ({
  default: mockDb
}));

jest.unstable_mockModule('../middleware/auth', () => ({
  authenticateToken: mockAuthMiddleware.authenticateToken,
  requireRole: mockAuthMiddleware.requireRole
}));

// Create mock app
const app = express();
app.use(express.json());

// Import the router after mocking
const calendarRouter = (await import('../calendar.js')).default;
app.use('/api/calendar', calendarRouter);

describe('Calendar Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock database to return empty results by default
    mockDb.first.mockResolvedValue(null);
    mockDb.update.mockResolvedValue([]);
    mockDb.raw.mockResolvedValue([]);
    // Reset the main query method to return empty array
    mockDb.then.mockImplementation((callback: Function) => callback([]));
  });

  describe('GET /referees/:id/calendar/ical', () => {
    const mockReferee = {
      id: 'referee-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'referee'
    };

    const mockAssignments = [
      {
        assignment_id: 'assignment-1',
        assignment_status: 'accepted',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        wage: '50.00',
        game_id: 'game-1',
        game_date: '2024-02-15',
        game_time: '18:00:00',
        level: 'Youth',
        game_type: 'Regular',
        notes: 'Test game notes',
        position_name: 'Referee',
        location_name: 'Main Field',
        location_address: '123 Sports Ave',
        home_team_name: 'Lions',
        away_team_name: 'Tigers',
        league_name: 'Youth League'
      },
      {
        assignment_id: 'assignment-2',
        assignment_status: 'pending',
        created_at: '2024-01-01T11:00:00Z',
        updated_at: '2024-01-01T11:00:00Z',
        wage: '60.00',
        game_id: 'game-2',
        game_date: '2024-02-16',
        game_time: '20:00:00',
        level: 'Adult',
        game_type: 'Playoff',
        notes: null,
        position_name: 'Assistant Referee',
        location_name: 'Field 2',
        location_address: '456 Sports Blvd',
        home_team_name: 'Eagles',
        away_team_name: 'Hawks',
        league_name: 'Adult League'
      }
    ];

    it('should generate iCal feed for valid referee', async () => {
      // Mock referee lookup
      mockDb.first.mockResolvedValue(mockReferee);
      // Mock assignments query
      mockDb.then.mockImplementation((callback: Function) => callback(mockAssignments));

      const response = await request(app)
        .get('/api/calendar/referees/referee-123/calendar/ical')
        .query({
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          calendar_name: 'Test Calendar',
          timezone: 'America/New_York'
        })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/calendar/);
      expect(response.headers['content-disposition']).toMatch(/attachment/);
      expect(response.headers['content-disposition']).toMatch(/John_Doe_schedule\.ics/);

      const icalContent = response.text;
      expect(icalContent).toContain('BEGIN:VCALENDAR');
      expect(icalContent).toContain('END:VCALENDAR');
      expect(icalContent).toContain('Test Calendar - John Doe');
      expect(icalContent).toContain('TZID:America/New_York');

      // Check for events
      expect(icalContent).toContain('BEGIN:VEVENT');
      expect(icalContent).toContain('SUMMARY:Referee - Lions vs Tigers');
      expect(icalContent).toContain('SUMMARY:Assistant Referee - Eagles vs Hawks');
      expect(icalContent).toContain('LOCATION:Main Field, 123 Sports Ave');
      expect(icalContent).toContain('STATUS:CONFIRMED'); // accepted assignment
      expect(icalContent).toContain('STATUS:TENTATIVE'); // pending assignment
    });

    it('should return 404 for non-existent referee', async () => {
      mockDb.first.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/calendar/referees/non-existent/calendar/ical')
        .expect(404);

      expect(response.body.error).toBe('Referee not found');
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/calendar/referees/referee-123/calendar/ical')
        .query({
          start_date: 'invalid-date',
          timezone: 'invalid-timezone'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should use default date range when not specified', async () => {
      mockDb.first.mockResolvedValue(mockReferee);
      mockDb.then.mockImplementation((callback: Function) => callback([]));

      await request(app)
        .get('/api/calendar/referees/referee-123/calendar/ical')
        .expect(200);

      // Verify that date filters were applied (checking that where was called with date filters)
      expect(mockDb.where).toHaveBeenCalledWith('games.game_date', '>=', expect.any(String));
      expect(mockDb.where).toHaveBeenCalledWith('games.game_date', '<=', expect.any(String));
    });

    it('should handle database errors gracefully', async () => {
      mockDb.first.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/calendar/referees/referee-123/calendar/ical')
        .expect(500);

      expect(response.body.error).toBe('Failed to generate calendar feed');
    });

    it('should filter assignments by status', async () => {
      mockDb.first.mockResolvedValue(mockReferee);
      mockDb.then.mockImplementation((callback: Function) => callback([]));

      await request(app)
        .get('/api/calendar/referees/referee-123/calendar/ical')
        .expect(200);

      expect(mockDb.whereIn).toHaveBeenCalledWith('game_assignments.status', ['pending', 'accepted', 'completed']);
    });
  });

  describe('GET /games/calendar-feed', () => {
    const mockGames = [
      {
        game_id: 'game-1',
        game_date: '2024-02-15',
        game_time: '18:00:00',
        level: 'Youth',
        game_type: 'Regular',
        status: 'unassigned',
        refs_needed: 2,
        pay_rate: '50.00',
        notes: 'Regular season game',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        location_name: 'Main Field',
        location_address: '123 Sports Ave',
        home_team_name: 'Lions',
        away_team_name: 'Tigers',
        league_name: 'Youth League'
      }
    ];

    const mockAssignments = [
      {
        assignment_id: 'assignment-1',
        game_id: 'game-1',
        assignment_status: 'accepted',
        wage: '50.00',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        position_name: 'Referee',
        referee_name: 'John Doe'
      }
    ];

    it('should generate games calendar feed with authentication', async () => {
      mockDb.then.mockImplementation((callback: Function) => callback(mockGames));

      const response = await request(app)
        .get('/api/calendar/games/calendar-feed')
        .query({
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          calendar_name: 'Games Schedule'
        })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/calendar/);
      expect(response.headers['content-disposition']).toMatch(/games_schedule\.ics/);

      const icalContent = response.text;
      expect(icalContent).toContain('BEGIN:VCALENDAR');
      expect(icalContent).toContain('Games Schedule');
      expect(icalContent).toContain('SUMMARY:Game - Lions vs Tigers');
    });

    it('should include assignments when requested', async () => {
      // First call returns games, second call returns assignments
      let callCount = 0;
      mockDb.then.mockImplementation((callback: Function) => {
        if (callCount === 0) {
          callCount++;
          return callback(mockGames);
        } else {
          return callback(mockAssignments);
        }
      });

      const response = await request(app)
        .get('/api/calendar/games/calendar-feed')
        .query({
          include_assignments: 'true'
        })
        .expect(200);

      const icalContent = response.text;
      expect(icalContent).toContain('SUMMARY:Referee (John Doe) - Lions vs Tigers');
    });

    it('should apply filters correctly', async () => {
      mockDb.then.mockImplementation((callback: Function) => callback([]));

      await request(app)
        .get('/api/calendar/games/calendar-feed')
        .query({
          level: 'Youth',
          game_type: 'Regular',
          location_id: 'loc-123',
          league_id: 'league-456',
          status: 'unassigned'
        })
        .expect(200);

      expect(mockDb.where).toHaveBeenCalledWith('games.level', 'Youth');
      expect(mockDb.where).toHaveBeenCalledWith('games.game_type', 'Regular');
      expect(mockDb.where).toHaveBeenCalledWith('games.location_id', 'loc-123');
      expect(mockDb.where).toHaveBeenCalledWith('leagues.id', 'league-456');
      expect(mockDb.where).toHaveBeenCalledWith('games.status', 'unassigned');
    });

    it('should require authentication', async () => {
      mockAuthMiddleware.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const response = await request(app)
        .get('/api/calendar/games/calendar-feed')
        .expect(401);

      expect(response.body.error).toBe('Access token required');
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/calendar/games/calendar-feed')
        .query({
          status: 'invalid-status'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /sync', () => {
    const mockOrgSettings = {
      id: 'org-1',
      name: 'Test Organization',
      calendar_sync_enabled: false
    };

    it('should configure calendar sync for admin users', async () => {
      mockDb.first.mockResolvedValue(mockOrgSettings);
      mockDb.raw.mockResolvedValue([{ name: 'calendar_sync_url' }]); // Mock column exists
      mockDb.update.mockResolvedValue([1]);

      const response = await request(app)
        .post('/api/calendar/sync')
        .send({
          calendar_url: 'https://calendar.example.com/feed.ics',
          sync_direction: 'import',
          auto_sync: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.syncSettings).toEqual({
        calendarUrl: 'https://calendar.example.com/feed.ics',
        syncDirection: 'import',
        autoSync: true,
        enabled: true
      });

      expect(mockDb.update).toHaveBeenCalledWith({
        calendar_sync_url: 'https://calendar.example.com/feed.ics',
        calendar_sync_direction: 'import',
        calendar_auto_sync: true,
        calendar_sync_enabled: true,
        updated_at: expect.any(Date)
      });
    });

    it('should require admin role', async () => {
      mockAuthMiddleware.requireRole.mockImplementation((role: string) =>
        (req: any, res: any, next: any) => {
          if (role === 'admin') {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }
          next();
        }
      );

      const response = await request(app)
        .post('/api/calendar/sync')
        .send({
          calendar_url: 'https://calendar.example.com/feed.ics'
        })
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/calendar/sync')
        .send({
          calendar_url: 'invalid-url',
          sync_direction: 'invalid-direction'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle missing organization settings', async () => {
      mockDb.first.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/calendar/sync')
        .send({
          calendar_url: 'https://calendar.example.com/feed.ics'
        })
        .expect(404);

      expect(response.body.error).toBe('Organization settings not found');
    });

    it('should handle schema updates requirement', async () => {
      mockDb.first.mockResolvedValue(mockOrgSettings);
      mockDb.raw.mockResolvedValue([]); // Mock no calendar columns exist

      const response = await request(app)
        .post('/api/calendar/sync')
        .send({
          calendar_url: 'https://calendar.example.com/feed.ics'
        })
        .expect(501);

      expect(response.body.error).toBe('Calendar sync feature requires database schema updates');
    });

    it('should handle database column errors', async () => {
      mockDb.first.mockResolvedValue(mockOrgSettings);
      mockDb.raw.mockResolvedValue([{ name: 'calendar_sync_url' }]);
      mockDb.update.mockRejectedValue(new Error('no such column: calendar_sync_url'));

      const response = await request(app)
        .post('/api/calendar/sync')
        .send({
          calendar_url: 'https://calendar.example.com/feed.ics'
        })
        .expect(501);

      expect(response.body.error).toBe('Calendar sync feature requires database schema updates');
    });
  });

  describe('GET /sync/status', () => {
    it('should return calendar sync status for admin users', async () => {
      const mockSettings = {
        calendar_sync_enabled: true,
        calendar_sync_url: 'https://calendar.example.com/feed.ics',
        calendar_sync_direction: 'import',
        calendar_auto_sync: true,
        calendar_last_sync_at: '2024-01-01T10:00:00Z',
        calendar_last_sync_status: 'success'
      };

      mockDb.first.mockResolvedValue(mockSettings);
      mockDb.raw.mockResolvedValue([{ name: 'calendar_sync_url' }]);

      const response = await request(app)
        .get('/api/calendar/sync/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.syncEnabled).toBe(true);
      expect(response.body.data.syncSettings).toEqual({
        calendarUrl: 'https://calendar.example.com/feed.ics',
        syncDirection: 'import',
        autoSync: true,
        lastSyncAt: '2024-01-01T10:00:00Z',
        lastSyncStatus: 'success'
      });
    });

    it('should return requires setup when schema is missing', async () => {
      mockDb.first.mockResolvedValue({});
      mockDb.raw.mockResolvedValue([]); // No calendar columns

      const response = await request(app)
        .get('/api/calendar/sync/status')
        .expect(200);

      expect(response.body.data.syncEnabled).toBe(false);
      expect(response.body.data.requiresSetup).toBe(true);
      expect(response.body.data.message).toContain('database schema updates');
    });

    it('should return disabled status when sync is not enabled', async () => {
      mockDb.first.mockResolvedValue({ calendar_sync_enabled: false });
      mockDb.raw.mockResolvedValue([{ name: 'calendar_sync_url' }]);

      const response = await request(app)
        .get('/api/calendar/sync/status')
        .expect(200);

      expect(response.body.data.syncEnabled).toBe(false);
      expect(response.body.data.syncSettings).toBeNull();
    });
  });

  describe('DELETE /sync', () => {
    it('should disable calendar sync for admin users', async () => {
      const mockSettings = {
        calendar_sync_enabled: true,
        calendar_sync_url: 'https://calendar.example.com/feed.ics'
      };

      mockDb.first.mockResolvedValue(mockSettings);
      mockDb.raw.mockResolvedValue([{ name: 'calendar_sync_url' }]);
      mockDb.update.mockResolvedValue([1]);

      const response = await request(app)
        .delete('/api/calendar/sync')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Calendar sync disabled successfully');

      expect(mockDb.update).toHaveBeenCalledWith({
        calendar_sync_enabled: false,
        calendar_sync_url: null,
        calendar_sync_direction: null,
        calendar_auto_sync: false,
        updated_at: expect.any(Date)
      });
    });

    it('should handle missing calendar sync schema', async () => {
      mockDb.first.mockResolvedValue({});
      mockDb.raw.mockResolvedValue([]); // No calendar columns

      const response = await request(app)
        .delete('/api/calendar/sync')
        .expect(404);

      expect(response.body.error).toBe('Calendar sync feature not available');
    });

    it('should require admin role', async () => {
      mockAuthMiddleware.requireRole.mockImplementation((role: string) =>
        (req: any, res: any, next: any) => {
          if (role === 'admin') {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }
          next();
        }
      );

      const response = await request(app)
        .delete('/api/calendar/sync')
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('iCal Content Generation', () => {
    it('should generate valid iCal format', async () => {
      const mockReferee = { id: 'ref-1', name: 'John Doe', role: 'referee' };
      const mockAssignments = [{
        assignment_id: 'assignment-1',
        assignment_status: 'accepted',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        wage: '50.00',
        game_id: 'game-1',
        game_date: '2024-02-15',
        game_time: '18:00:00',
        level: 'Youth',
        game_type: 'Regular',
        notes: 'Test notes',
        position_name: 'Referee',
        location_name: 'Main Field',
        location_address: '123 Sports Ave',
        home_team_name: 'Lions',
        away_team_name: 'Tigers',
        league_name: 'Youth League'
      }];

      mockDb.first.mockResolvedValue(mockReferee);
      mockDb.then.mockImplementation((callback: Function) => callback(mockAssignments));

      const response = await request(app)
        .get('/api/calendar/referees/ref-1/calendar/ical')
        .expect(200);

      const icalContent = response.text;

      // Verify iCal structure
      expect(icalContent).toMatch(/^BEGIN:VCALENDAR/);
      expect(icalContent).toMatch(/END:VCALENDAR\s*$/);
      expect(icalContent).toContain('VERSION:2.0');
      expect(icalContent).toContain('PRODID:-//Sports Management App//Referee Calendar//EN');

      // Verify timezone
      expect(icalContent).toContain('BEGIN:VTIMEZONE');
      expect(icalContent).toContain('TZID:America/New_York');

      // Verify event structure
      expect(icalContent).toContain('BEGIN:VEVENT');
      expect(icalContent).toContain('END:VEVENT');
      expect(icalContent).toContain('UID:game-game-1-assignment-assignment-1@sportsmanagement.app');
      expect(icalContent).toContain('DTSTART;TZID=America/New_York:');
      expect(icalContent).toContain('DTEND;TZID=America/New_York:');

      // Verify event content
      expect(icalContent).toContain('SUMMARY:Referee - Lions vs Tigers');
      expect(icalContent).toContain('LOCATION:Main Field, 123 Sports Ave');
      expect(icalContent).toContain('STATUS:CONFIRMED');
      expect(icalContent).toContain('CATEGORIES:REFEREE,YOUTH,REGULAR');
    });

    it('should handle missing event data gracefully', async () => {
      const mockReferee = { id: 'ref-1', name: 'John Doe', role: 'referee' };
      const mockAssignments = [{
        assignment_id: 'assignment-1',
        assignment_status: 'pending',
        game_id: 'game-1',
        game_date: '2024-02-15',
        game_time: '18:00:00',
        level: 'Youth',
        position_name: 'Referee',
        home_team_name: 'Lions',
        away_team_name: 'Tigers',
        // Missing optional fields
        location_name: null,
        location_address: null,
        notes: null,
        wage: null,
        game_type: null
      }];

      mockDb.first.mockResolvedValue(mockReferee);
      mockDb.then.mockImplementation((callback: Function) => callback(mockAssignments));

      const response = await request(app)
        .get('/api/calendar/referees/ref-1/calendar/ical')
        .expect(200);

      const icalContent = response.text;
      expect(icalContent).toContain('SUMMARY:Referee - Lions vs Tigers');
      expect(icalContent).toContain('STATUS:TENTATIVE'); // pending status
      expect(icalContent).toContain('LOCATION:'); // empty location
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockDb.first.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/calendar/referees/ref-1/calendar/ical')
        .expect(500);

      expect(response.body.error).toBe('Failed to generate calendar feed');
    });

    it('should include error details in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockDb.first.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get('/api/calendar/referees/ref-1/calendar/ical')
        .expect(500);

      expect(response.body.details).toBe('Test error');

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle malformed database responses', async () => {
      mockDb.first.mockResolvedValue({ id: 'ref-1', name: 'John Doe', role: 'referee' });
      // Return malformed assignment data
      mockDb.then.mockImplementation((callback: Function) => callback([{
        assignment_id: null,
        game_date: 'invalid-date',
        game_time: 'invalid-time'
      }]));

      const response = await request(app)
        .get('/api/calendar/referees/ref-1/calendar/ical')
        .expect(500);

      expect(response.body.error).toBe('Failed to generate calendar feed');
    });
  });
});