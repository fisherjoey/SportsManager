/**
 * @fileoverview Comprehensive unit tests for Calendar upload route
 * @description Tests calendar ICS file upload, parsing, game import, and error handling
 */

import request from 'supertest';
import express from 'express';
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
  insert: jest.fn(),
  // For the main query method
  then: jest.fn()
};

const mockAuthMiddleware = {
  authenticateToken: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      id: 'test-user-id',
      email: 'admin@test.com',
      roles: ['admin']
    };
    next();
  }),
  requireRole: jest.fn((role: string) => (req: any, res: any, next: any) => next()),
  requireAnyRole: jest.fn((roles: string[]) => (req: any, res: any, next: any) => next())
};

const mockICSParser = {
  isValidICS: jest.fn(),
  parse: jest.fn(),
  eventsToGameData: jest.fn()
};

const mockUpload = {
  single: jest.fn(() => (req: any, res: any, next: any) => {
    req.file = {
      buffer: Buffer.from('BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR'),
      originalname: 'test.ics',
      mimetype: 'text/calendar'
    };
    next();
  })
};

// Mock modules
jest.unstable_mockModule('../../config/database', () => ({
  default: mockDb
}));

jest.unstable_mockModule('../../middleware/auth', () => ({
  authenticateToken: mockAuthMiddleware.authenticateToken,
  requireRole: mockAuthMiddleware.requireRole,
  requireAnyRole: mockAuthMiddleware.requireAnyRole
}));

jest.unstable_mockModule('../../utils/ics-parser', () => ({
  ICSParser: {
    isValidICS: mockICSParser.isValidICS,
    eventsToGameData: mockICSParser.eventsToGameData,
    default: class MockICSParser {
      parse = mockICSParser.parse;
    }
  }
}));

jest.unstable_mockModule('multer', () => ({
  default: jest.fn(() => ({
    single: mockUpload.single
  }))
}));

jest.unstable_mockModule('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123')
}));

// Create mock app
const app = express();
app.use(express.json());

// Import the router after mocking
const calendarRouter = (await import('../calendar.js')).default;
app.use('/api/calendar', calendarRouter);

describe('Calendar Upload Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock database
    mockDb.first.mockResolvedValue(null);
    mockDb.update.mockResolvedValue([]);
    mockDb.insert.mockResolvedValue([]);
    mockDb.then.mockImplementation((callback: Function) => callback([]));

    // Reset ICS parser mocks
    mockICSParser.isValidICS.mockReturnValue(true);
    mockICSParser.parse.mockReturnValue({
      events: [{
        uid: 'event-1',
        summary: 'Lions vs Tigers',
        dtstart: '2024-02-15T18:00:00Z',
        dtend: '2024-02-15T20:00:00Z',
        location: 'Field 1'
      }]
    });
    mockICSParser.eventsToGameData.mockReturnValue([{
      externalId: 'event-1',
      gameDate: '2024-02-15',
      gameTime: '18:00',
      homeTeamName: 'Lions',
      awayTeamName: 'Tigers',
      locationName: 'Field 1',
      level: 'Youth',
      gameType: 'League',
      refereesRequired: 2
    }]);
  });

  describe('POST /api/calendar/upload', () => {
    const validICSContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test Calendar//EN
BEGIN:VEVENT
UID:test-event-1
DTSTART:20240215T180000Z
DTEND:20240215T200000Z
SUMMARY:Lions vs Tigers
LOCATION:Field 1
DESCRIPTION:Youth League Game
END:VEVENT
END:VCALENDAR`;

    it('should upload and import ICS file successfully', async () => {
      mockUpload.single.mockReturnValue((req: any, res: any, next: any) => {
        req.file = {
          buffer: Buffer.from(validICSContent),
          originalname: 'calendar.ics',
          mimetype: 'text/calendar'
        };
        next();
      });

      const response = await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from(validICSContent), 'calendar.ics')
        .field('overwriteExisting', 'false')
        .field('autoCreateTeams', 'true')
        .field('autoCreateLocations', 'true')
        .field('defaultLevel', 'Youth')
        .field('defaultGameType', 'League')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.imported).toBe(1);
      expect(response.body.data.failed).toBe(0);
      expect(response.body.data.skipped).toBe(0);
      expect(mockICSParser.isValidICS).toHaveBeenCalledWith(validICSContent);
      expect(mockICSParser.parse).toHaveBeenCalledWith(validICSContent);
    });

    it('should require authentication', async () => {
      mockAuthMiddleware.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const response = await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from(validICSContent), 'calendar.ics')
        .expect(401);

      expect(response.body.error).toBe('Access token required');
    });

    it('should return 400 when no file is provided', async () => {
      mockUpload.single.mockReturnValue((req: any, res: any, next: any) => {
        req.file = undefined;
        next();
      });

      const response = await request(app)
        .post('/api/calendar/upload')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILE');
      expect(response.body.error.message).toBe('No calendar file provided');
    });

    it('should validate ICS file format', async () => {
      mockICSParser.isValidICS.mockReturnValue(false);

      const response = await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from('invalid content'), 'invalid.txt')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_FORMAT');
      expect(response.body.error.message).toBe('Invalid ICS calendar file format');
    });

    it('should handle parsing errors', async () => {
      mockICSParser.parse.mockImplementation(() => {
        throw new Error('Invalid ICS structure');
      });

      const response = await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from(validICSContent), 'calendar.ics')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PARSE_ERROR');
      expect(response.body.error.message).toBe('Failed to parse calendar file');
      expect(response.body.error.details).toBe('Invalid ICS structure');
    });

    it('should return error when no events found', async () => {
      mockICSParser.parse.mockReturnValue({ events: [] });

      const response = await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from(validICSContent), 'calendar.ics')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_EVENTS');
      expect(response.body.error.message).toBe('No events found in calendar file');
    });

    it('should skip existing games when overwriteExisting is false', async () => {
      // Mock existing game found
      mockDb.first.mockResolvedValueOnce({ id: 'existing-game-id', external_id: 'event-1' });

      const response = await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from(validICSContent), 'calendar.ics')
        .field('overwriteExisting', 'false')
        .expect(200);

      expect(response.body.data.skipped).toBe(1);
      expect(response.body.data.imported).toBe(0);
      expect(response.body.data.games[0].status).toBe('skipped');
      expect(response.body.data.games[0].reason).toBe('Game already exists');
    });

    it('should overwrite existing games when overwriteExisting is true', async () => {
      const existingGame = {
        id: 'existing-game-id',
        external_id: 'event-1',
        field: 'Old Field',
        metadata: JSON.stringify({})
      };
      mockDb.first.mockResolvedValueOnce(existingGame);
      mockDb.update.mockResolvedValueOnce([1]);

      const response = await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from(validICSContent), 'calendar.ics')
        .field('overwriteExisting', 'true')
        .expect(200);

      expect(response.body.data.imported).toBe(1);
      expect(response.body.data.skipped).toBe(0);
      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'Field 1',
          updated_at: expect.any(Date)
        })
      );
    });

    it('should create teams when autoCreateTeams is true', async () => {
      // Mock no existing teams
      mockDb.first
        .mockResolvedValueOnce(null) // No existing game
        .mockResolvedValueOnce(null) // No home team
        .mockResolvedValueOnce(null) // No away team
        .mockResolvedValueOnce(null); // No location

      mockDb.insert
        .mockResolvedValueOnce([{ id: 'home-team-id' }]) // Create home team
        .mockResolvedValueOnce([{ id: 'away-team-id' }]) // Create away team
        .mockResolvedValueOnce([{ id: 'location-id' }]) // Create location
        .mockResolvedValueOnce([{ id: 'game-id' }]); // Create game

      const response = await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from(validICSContent), 'calendar.ics')
        .field('autoCreateTeams', 'true')
        .field('autoCreateLocations', 'true')
        .expect(200);

      expect(response.body.data.imported).toBe(1);
      expect(mockDb.insert).toHaveBeenCalledTimes(4); // Teams, location, and game
    });

    it('should use provided league ID when specified', async () => {
      mockDb.first
        .mockResolvedValueOnce(null) // No existing game
        .mockResolvedValueOnce(null) // No home team
        .mockResolvedValueOnce(null) // No away team
        .mockResolvedValueOnce(null); // No location

      mockDb.insert
        .mockResolvedValueOnce([{ id: 'home-team-id' }])
        .mockResolvedValueOnce([{ id: 'away-team-id' }])
        .mockResolvedValueOnce([{ id: 'location-id' }])
        .mockResolvedValueOnce([{ id: 'game-id' }]);

      await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from(validICSContent), 'calendar.ics')
        .field('autoCreateTeams', 'true')
        .field('leagueId', 'league-123')
        .expect(200);

      // Verify league ID was used in team creation
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          league_id: 'league-123'
        })
      );
    });

    it('should validate upload options', async () => {
      const response = await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from(validICSContent), 'calendar.ics')
        .field('defaultLevel', '') // Invalid empty level
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle database errors during game creation', async () => {
      mockDb.insert.mockRejectedValue(new Error('Database constraint violation'));

      const response = await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from(validICSContent), 'calendar.ics')
        .expect(200);

      expect(response.body.data.failed).toBe(1);
      expect(response.body.data.imported).toBe(0);
      expect(response.body.data.games[0].status).toBe('failed');
      expect(response.body.data.games[0].reason).toBe('Database constraint violation');
    });

    it('should handle partial success with multiple games', async () => {
      // Mock multiple events
      mockICSParser.eventsToGameData.mockReturnValue([
        {
          externalId: 'event-1',
          gameDate: '2024-02-15',
          gameTime: '18:00',
          homeTeamName: 'Lions',
          awayTeamName: 'Tigers',
          locationName: 'Field 1'
        },
        {
          externalId: 'event-2',
          gameDate: '2024-02-16',
          gameTime: '20:00',
          homeTeamName: 'Eagles',
          awayTeamName: 'Hawks',
          locationName: 'Field 2'
        }
      ]);

      // First game succeeds, second fails
      mockDb.first.mockResolvedValue(null);
      mockDb.insert
        .mockResolvedValueOnce([{ id: 'game-1' }]) // First game succeeds
        .mockRejectedValueOnce(new Error('Constraint error')); // Second game fails

      const response = await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from(validICSContent), 'calendar.ics')
        .expect(200);

      expect(response.body.data.imported).toBe(1);
      expect(response.body.data.failed).toBe(1);
      expect(response.body.data.games).toHaveLength(2);
    });

    it('should include detailed game information in response', async () => {
      mockDb.insert.mockResolvedValue([{ id: 'new-game-id' }]);

      const response = await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from(validICSContent), 'calendar.ics')
        .expect(200);

      expect(response.body.data.games[0]).toEqual(
        expect.objectContaining({
          id: 'new-game-id',
          gameDate: '2024-02-15',
          gameTime: '18:00',
          homeTeamName: 'Lions',
          awayTeamName: 'Tigers',
          status: 'imported'
        })
      );
    });

    it('should log import activity', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from(validICSContent), 'calendar.ics')
        .expect(200);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Calendar import completed by user test-user-id')
      );

      consoleSpy.mockRestore();
    });

    it('should handle file upload errors', async () => {
      mockUpload.single.mockReturnValue((req: any, res: any, next: any) => {
        const error = new Error('File too large');
        error.name = 'MulterError';
        next(error);
      });

      await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from(validICSContent), 'calendar.ics')
        .expect(500);
    });

    it('should handle malformed event data gracefully', async () => {
      mockICSParser.eventsToGameData.mockReturnValue([
        {
          externalId: 'event-1',
          gameDate: 'invalid-date',
          gameTime: 'invalid-time',
          homeTeamName: null,
          awayTeamName: undefined,
          locationName: ''
        }
      ]);

      const response = await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from(validICSContent), 'calendar.ics')
        .expect(200);

      expect(response.body.data.failed).toBe(1);
      expect(response.body.data.games[0].status).toBe('failed');
    });

    it('should respect file size limits', async () => {
      const largeContent = 'A'.repeat(11 * 1024 * 1024); // 11MB content

      mockUpload.single.mockReturnValue((req: any, res: any, next: any) => {
        const error = new Error('File too large');
        error.name = 'MulterError';
        error.code = 'LIMIT_FILE_SIZE';
        next(error);
      });

      await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from(largeContent), 'large.ics')
        .expect(500);
    });

    it('should only accept .ics files', async () => {
      mockUpload.single.mockReturnValue((req: any, res: any, next: any) => {
        const error = new Error('Only .ics calendar files are allowed');
        error.name = 'MulterError';
        next(error);
      });

      await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from('content'), 'file.txt')
        .expect(500);
    });
  });

  describe('Error Edge Cases', () => {
    it('should handle empty calendar files', async () => {
      mockUpload.single.mockReturnValue((req: any, res: any, next: any) => {
        req.file = {
          buffer: Buffer.from(''),
          originalname: 'empty.ics',
          mimetype: 'text/calendar'
        };
        next();
      });

      const response = await request(app)
        .post('/api/calendar/upload')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_FORMAT');
    });

    it('should handle corrupted calendar files', async () => {
      mockICSParser.parse.mockImplementation(() => {
        throw new Error('Unexpected end of input');
      });

      const response = await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from('BEGIN:VCALENDAR\nVER'), 'corrupted.ics')
        .expect(400);

      expect(response.body.error.code).toBe('PARSE_ERROR');
      expect(response.body.error.details).toBe('Unexpected end of input');
    });

    it('should handle database connection failures', async () => {
      mockDb.first.mockRejectedValue(new Error('Connection refused'));

      const response = await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from(validICSContent), 'calendar.ics')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should include error details in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockDb.insert.mockRejectedValue(new Error('Detailed database error'));

      const response = await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from(validICSContent), 'calendar.ics')
        .expect(500);

      expect(response.body.error.details).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });
});