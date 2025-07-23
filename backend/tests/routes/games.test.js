const request = require('supertest');
const app = require('../../src/app');
const db = require('../setup');

describe('Games Routes', () => {
  let adminToken, refereeToken;

  beforeEach(async () => {
    // Get admin token
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@refassign.com',
        password: 'password'
      });
    adminToken = adminLogin.body.data.token;

    // Get referee token
    const refereeLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'mike@referee.com',
        password: 'password'
      });
    refereeToken = refereeLogin.body.data.token;
  });

  describe('GET /api/games', () => {
    it('should get all games for admin', async () => {
      const response = await request(app)
        .get('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.games)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.total).toBeGreaterThan(0);
    });

    it('should filter games by status', async () => {
      const response = await request(app)
        .get('/api/games?status=unassigned')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.games.forEach(game => {
        expect(game.status).toBe('unassigned');
      });
    });

    it('should filter games by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      
      const response = await request(app)
        .get(`/api/games?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.games.forEach(game => {
        const gameDate = new Date(game.date);
        expect(gameDate >= new Date(startDate)).toBe(true);
        expect(gameDate <= new Date(endDate)).toBe(true);
      });
    });

    it('should filter games by game_type', async () => {
      const response = await request(app)
        .get('/api/games?game_type=Community')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.games.forEach(game => {
        expect(game.gameType).toBe('Community');
      });
    });

    it('should return games with default gameType when none specified', async () => {
      const response = await request(app)
        .get('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.games)).toBe(true);
      // All games should have a gameType field
      response.body.data.games.forEach(game => {
        expect(game.gameType).toBeDefined();
        expect(['Community', 'Club', 'Tournament', 'Private Tournament']).toContain(game.gameType);
      });
    });

    it('should paginate results correctly', async () => {
      const response = await request(app)
        .get('/api/games?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.games.length).toBeLessThanOrEqual(5);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/games')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/games/:id', () => {
    let gameId;

    beforeEach(async () => {
      const gamesResponse = await request(app)
        .get('/api/games')
        .set('Authorization', `Bearer ${adminToken}`);
      gameId = gamesResponse.body.data.games[0].id;
    });

    it('should get a specific game by ID', async () => {
      const response = await request(app)
        .get(`/api/games/${gameId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.game.id).toBe(gameId);
      expect(response.body.data.game.homeTeam).toBeDefined();
      expect(response.body.data.game.awayTeam).toBeDefined();
    });

    it('should return 404 for non-existent game', async () => {
      const response = await request(app)
        .get('/api/games/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('POST /api/games', () => {
    const gameData = {
      homeTeam: 'Test Home Team',
      awayTeam: 'Test Away Team',
      date: '2024-06-15',
      time: '19:00',
      location: 'Test Arena',
      level: 'Youth',
      payRate: 75.00,
      notes: 'Test game notes'
    };

    it('should create a new game as admin', async () => {
      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(gameData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.game.homeTeam).toBe(gameData.homeTeam);
      expect(response.body.data.game.awayTeam).toBe(gameData.awayTeam);
      expect(response.body.data.game.status).toBe('unassigned');
    });

    it('should return 403 for referee trying to create game', async () => {
      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${refereeToken}`)
        .send(gameData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Admin access required');
    });

    it('should create game with specified gameType', async () => {
      const gameDataWithType = {
        ...gameData,
        gameType: 'Tournament'
      };

      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(gameDataWithType)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.game.gameType).toBe('Tournament');
    });

    it('should create game with default gameType when not specified', async () => {
      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(gameData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.game.gameType).toBe('Community'); // default value
    });

    it('should reject invalid gameType values', async () => {
      const invalidGameData = {
        ...gameData,
        gameType: 'InvalidType'
      };

      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidGameData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        homeTeam: 'Test Team'
      };

      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should return 400 for invalid date format', async () => {
      const invalidData = {
        ...gameData,
        date: 'invalid-date'
      };

      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/games/:id', () => {
    let gameId;

    beforeEach(async () => {
      const gamesResponse = await request(app)
        .get('/api/games')
        .set('Authorization', `Bearer ${adminToken}`);
      gameId = gamesResponse.body.data.games[0].id;
    });

    it('should update a game as admin', async () => {
      const updateData = {
        homeTeam: 'Updated Home Team',
        payRate: 100.00
      };

      const response = await request(app)
        .put(`/api/games/${gameId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.game.homeTeam).toBe(updateData.homeTeam);
      expect(response.body.data.game.payRate).toBe(updateData.payRate);
    });

    it('should return 403 for referee trying to update game', async () => {
      const response = await request(app)
        .put(`/api/games/${gameId}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({ homeTeam: 'Updated Team' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent game', async () => {
      const response = await request(app)
        .put('/api/games/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ homeTeam: 'Updated Team' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/games/:id', () => {
    let gameId;

    beforeEach(async () => {
      // Create a test game to delete
      const createResponse = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          homeTeam: 'Delete Test Home',
          awayTeam: 'Delete Test Away',
          date: '2024-12-31',
          time: '20:00',
          location: 'Test Location',
          level: 'Adult',
          payRate: 50.00
        });
      gameId = createResponse.body.data.game.id;
    });

    it('should delete a game as admin', async () => {
      const response = await request(app)
        .delete(`/api/games/${gameId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify game is deleted
      await request(app)
        .get(`/api/games/${gameId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 403 for referee trying to delete game', async () => {
      const response = await request(app)
        .delete(`/api/games/${gameId}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent game', async () => {
      const response = await request(app)
        .delete('/api/games/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/games/:id/status', () => {
    let gameId;

    beforeEach(async () => {
      const gamesResponse = await request(app)
        .get('/api/games?status=unassigned')
        .set('Authorization', `Bearer ${adminToken}`);
      gameId = gamesResponse.body.data.games[0].id;
    });

    it('should update game status as admin', async () => {
      const response = await request(app)
        .patch(`/api/games/${gameId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'cancelled' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.game.status).toBe('cancelled');
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .patch(`/api/games/${gameId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid status');
    });

    it('should return 403 for referee trying to update status', async () => {
      const response = await request(app)
        .patch(`/api/games/${gameId}/status`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({ status: 'cancelled' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});