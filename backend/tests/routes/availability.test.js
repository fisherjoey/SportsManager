const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock database module - move this before app import
const mockDb = {
  query: jest.fn(),
  transaction: jest.fn(),
  where: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  join: jest.fn().mockReturnThis(),
  first: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  del: jest.fn(),
  returning: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis()
};

jest.mock('../../src/config/database', () => {
  const mockQuery = () => mockDb;
  Object.assign(mockQuery, mockDb);
  return mockQuery;
});

const app = require('../../src/app');

describe('Availability API', () => {
  let adminToken, refereeToken;
  
  const mockReferee = {
    id: 'referee-123',
    name: 'John Referee',
    email: 'john@referee.com'
  };

  const mockAvailability = [
    {
      id: 'avail-1',
      referee_id: 'referee-123',
      date: '2025-01-20',
      start_time: '09:00',
      end_time: '12:00',
      is_available: true,
      reason: null
    },
    {
      id: 'avail-2', 
      referee_id: 'referee-123',
      date: '2025-01-20',
      start_time: '14:00',
      end_time: '17:00',
      is_available: false,
      reason: 'Personal appointment'
    }
  ];

  beforeAll(() => {
    adminToken = jwt.sign({
      userId: 'admin-123',
      email: 'admin@test.com',
      role: 'admin',
      roles: ['admin']
    }, process.env.JWT_SECRET || 'test-secret');

    refereeToken = jwt.sign({
      userId: 'referee-123',
      email: 'referee@test.com',
      role: 'referee',
      roles: ['referee']
    }, process.env.JWT_SECRET || 'test-secret');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/availability/referees/:id', () => {
    it('should get referee availability windows', async () => {
      mockDb.where.mockReturnValue(mockDb);
      mockDb.orderBy.mockReturnValue(Promise.resolve(mockAvailability));

      const response = await request(app)
        .get('/api/availability/referees/referee-123')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.refereeId).toBe('referee-123');
      expect(response.body.data.availability).toEqual(mockAvailability);
      expect(response.body.data.count).toBe(2);
    });

    it('should filter by date range', async () => {
      mockDb.where.mockReturnValue(mockDb);
      mockDb.orderBy.mockReturnValue(Promise.resolve([mockAvailability[0]]));

      const response = await request(app)
        .get('/api/availability/referees/referee-123?startDate=2025-01-20&endDate=2025-01-20')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.count).toBe(1);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/availability/referees/referee-123')
        .expect(401);
    });
  });

  describe('POST /api/availability/referees/:id', () => {
    it('should create availability window as admin', async () => {
      mockDb.first.mockResolvedValue(mockReferee);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.andWhere = jest.fn().mockReturnValue(Promise.resolve([])); // No overlapping
      mockDb.insert.mockReturnValue(mockDb);
      mockDb.returning.mockResolvedValue([mockAvailability[0]]);

      const newWindow = {
        date: '2025-01-21',
        start_time: '10:00',
        end_time: '13:00',
        is_available: true
      };

      const response = await request(app)
        .post('/api/availability/referees/referee-123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newWindow)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.date).toBe('2025-01-21');
    });

    it('should reject overlapping windows', async () => {
      mockDb.first.mockResolvedValue(mockReferee);
      mockDb.where.mockReturnValue(mockDb);
      // Mock overlapping window found
      const overlapping = [{
        id: 'existing-1',
        start_time: '09:00',
        end_time: '12:00'
      }];
      mockDb.andWhere = jest.fn().mockReturnValue(Promise.resolve(overlapping));

      const newWindow = {
        date: '2025-01-20',
        start_time: '10:00', // Overlaps with existing 09:00-12:00
        end_time: '13:00'
      };

      const response = await request(app)
        .post('/api/availability/referees/referee-123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newWindow)
        .expect(409);

      expect(response.body.error).toContain('Overlapping availability window');
      expect(response.body.conflicting).toEqual(overlapping);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/availability/referees/referee-123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: '2025-01-20' }) // Missing start_time and end_time
        .expect(400);

      expect(response.body.error).toContain('start_time, and end_time are required');
    });

    it('should reject non-existent referee', async () => {
      mockDb.first.mockResolvedValue(null); // Referee not found

      const newWindow = {
        date: '2025-01-21',
        start_time: '10:00',
        end_time: '13:00'
      };

      const response = await request(app)
        .post('/api/availability/referees/nonexistent-ref')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newWindow)
        .expect(404);

      expect(response.body.error).toBe('Referee not found');
    });

    it('should require proper role', async () => {
      const guestToken = jwt.sign({
        userId: 'guest-123',
        role: 'guest'
      }, process.env.JWT_SECRET || 'test-secret');

      const newWindow = {
        date: '2025-01-21',
        start_time: '10:00',
        end_time: '13:00'
      };

      const response = await request(app)
        .post('/api/availability/referees/referee-123')
        .set('Authorization', `Bearer ${guestToken}`)
        .send(newWindow)
        .expect(403);

      expect(response.body.error).toContain('Insufficient permissions');
    });
  });

  describe('PUT /api/availability/:windowId', () => {
    it('should update availability window', async () => {
      mockDb.first.mockResolvedValue(mockAvailability[0]);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.andWhere = jest.fn().mockReturnValue(Promise.resolve([])); // No conflicts
      mockDb.update.mockReturnValue(mockDb);
      mockDb.returning.mockResolvedValue([{
        ...mockAvailability[0],
        start_time: '08:00'
      }]);

      const updates = { start_time: '08:00' };

      const response = await request(app)
        .put('/api/availability/avail-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.start_time).toBe('08:00');
    });

    it('should allow referee to update own availability', async () => {
      const refereeWindow = { ...mockAvailability[0], referee_id: 'referee-123' };
      mockDb.first.mockResolvedValue(refereeWindow);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.andWhere = jest.fn().mockReturnValue(Promise.resolve([]));
      mockDb.update.mockReturnValue(mockDb);
      mockDb.returning.mockResolvedValue([refereeWindow]);

      const response = await request(app)
        .put('/api/availability/avail-1')
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({ reason: 'Updated reason' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should prevent referee from updating others availability', async () => {
      const otherWindow = { ...mockAvailability[0], referee_id: 'other-referee' };
      mockDb.first.mockResolvedValue(otherWindow);

      const response = await request(app)
        .put('/api/availability/avail-1')
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({ reason: 'Trying to update' })
        .expect(403);

      expect(response.body.error).toContain('Can only update your own availability');
    });

    it('should reject non-existent window', async () => {
      mockDb.first.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/availability/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test' })
        .expect(404);

      expect(response.body.error).toBe('Availability window not found');
    });
  });

  describe('DELETE /api/availability/:windowId', () => {
    it('should delete availability window', async () => {
      mockDb.first.mockResolvedValue(mockAvailability[0]);
      mockDb.del.mockResolvedValue(1);

      const response = await request(app)
        .delete('/api/availability/avail-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should allow referee to delete own availability', async () => {
      const refereeWindow = { ...mockAvailability[0], referee_id: 'referee-123' };
      mockDb.first.mockResolvedValue(refereeWindow);
      mockDb.del.mockResolvedValue(1);

      const response = await request(app)
        .delete('/api/availability/avail-1')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should prevent referee from deleting others availability', async () => {
      const otherWindow = { ...mockAvailability[0], referee_id: 'other-referee' };
      mockDb.first.mockResolvedValue(otherWindow);

      const response = await request(app)
        .delete('/api/availability/avail-1')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);

      expect(response.body.error).toContain('Can only delete your own availability');
    });
  });

  describe('GET /api/availability/conflicts', () => {
    it('should check for conflicts as admin', async () => {
      const conflicts = [
        {
          id: 'conflict-1',
          referee_id: 'ref-1',
          referee_name: 'John Doe',
          date: '2025-01-20',
          start_time: '10:00',
          end_time: '12:00',
          is_available: false,
          reason: 'Unavailable'
        }
      ];

      mockDb.join.mockReturnValue(mockDb);
      mockDb.select.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.andWhere = jest.fn().mockResolvedValueOnce(conflicts).mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/availability/conflicts?date=2025-01-20&start_time=09:00&end_time=13:00')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.availabilityConflicts).toEqual(conflicts);
      expect(response.body.data.totalConflicts).toBe(1);
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .get('/api/availability/conflicts?date=2025-01-20&start_time=09:00&end_time=13:00')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);

      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should validate required query parameters', async () => {
      const response = await request(app)
        .get('/api/availability/conflicts?date=2025-01-20') // Missing start_time and end_time
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error).toContain('start_time, and end_time are required');
    });
  });

  describe('POST /api/availability/bulk', () => {
    it('should create bulk availability windows', async () => {
      const windows = [
        { date: '2025-01-21', start_time: '09:00', end_time: '12:00', is_available: true },
        { date: '2025-01-22', start_time: '14:00', end_time: '17:00', is_available: true }
      ];

      mockDb.first.mockResolvedValue(mockReferee);
      
      // Mock transaction
      const mockTrx = {
        where: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn()
      };
      
      // Mock no overlapping windows for both
      mockTrx.where.mockReturnValue(mockTrx);
      mockTrx.returning.mockResolvedValueOnce([{ id: 'new-1', ...windows[0] }])
        .mockResolvedValueOnce([{ id: 'new-2', ...windows[1] }]);
      
      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTrx);
      });

      const response = await request(app)
        .post('/api/availability/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          referee_id: 'referee-123',
          windows
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.summary.total).toBe(2);
      expect(response.body.summary.created).toBe(2);
      expect(response.body.summary.skipped).toBe(0);
    });

    it('should skip overlapping windows in bulk creation', async () => {
      const windows = [
        { date: '2025-01-20', start_time: '09:00', end_time: '12:00' }, // Will overlap
        { date: '2025-01-21', start_time: '14:00', end_time: '17:00' }  // Will succeed
      ];

      mockDb.first.mockResolvedValue(mockReferee);
      
      const mockTrx = {
        where: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn()
      };
      
      // First window overlaps, second doesn't
      mockTrx.where.mockReturnValueOnce(Promise.resolve([mockAvailability[0]]))
        .mockReturnValueOnce(Promise.resolve([]));
      mockTrx.returning.mockResolvedValue([{ id: 'new-2', ...windows[1] }]);
      
      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTrx);
      });

      const response = await request(app)
        .post('/api/availability/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          referee_id: 'referee-123',
          windows
        })
        .expect(201);

      expect(response.body.summary.created).toBe(1);
      expect(response.body.summary.skipped).toBe(1);
      expect(response.body.data.skipped[0].reason).toContain('Overlapping window exists');
    });

    it('should validate bulk request data', async () => {
      const response = await request(app)
        .post('/api/availability/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          referee_id: 'referee-123',
          windows: [] // Empty array
        })
        .expect(400);

      expect(response.body.error).toContain('windows array are required');
    });

    it('should validate individual window data', async () => {
      const windows = [
        { date: '2025-01-21', start_time: '09:00' }, // Missing end_time
      ];

      const response = await request(app)
        .post('/api/availability/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          referee_id: 'referee-123',
          windows
        })
        .expect(400);

      expect(response.body.error).toContain('must have date, start_time, and end_time');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.where.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/availability/referees/referee-123')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch availability');
    });
  });
});