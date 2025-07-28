const request = require('supertest');
const app = require('../../src/app');
const db = require('../setup');

describe('Chunks Routes', () => {
  let adminToken, refereeToken, refereeUserId, gameIds = [];

  beforeEach(async () => {
    // Get admin token
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@refassign.com',
        password: 'password'
      });
    adminToken = adminLogin.body.data.token;

    // Get referee token and user ID
    const refereeLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'mike@referee.com',
        password: 'password'
      });
    refereeToken = refereeLogin.body.data.token;
    refereeUserId = refereeLogin.body.data.user.id;

    // Create test games for chunking
    await createTestGames();
  });

  async function createTestGames() {
    const testGames = [
      {
        home_team_name: 'Chunk Test A1',
        away_team_name: 'Chunk Test B1',
        game_date: '2024-08-10',
        game_time: '10:00',
        location: 'Sports Complex A',
        level: 'Competitive',
        pay_rate: 75
      },
      {
        home_team_name: 'Chunk Test A2',
        away_team_name: 'Chunk Test B2',
        game_date: '2024-08-10',
        game_time: '12:00',
        location: 'Sports Complex A',
        level: 'Competitive',
        pay_rate: 75
      },
      {
        home_team_name: 'Chunk Test A3',
        away_team_name: 'Chunk Test B3',
        game_date: '2024-08-10',
        game_time: '14:00',
        location: 'Sports Complex A',
        level: 'Recreational',
        pay_rate: 50
      }
    ];

    for (const gameData of testGames) {
      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(gameData);
      
      if (response.body.success) {
        gameIds.push(response.body.data.game.id);
      }
    }
  }

  describe('POST /api/chunks', () => {
    it('should create a new game chunk', async () => {
      const chunkData = {
        name: 'Saturday Morning Chunk',
        location: 'Sports Complex A',
        date: '2024-08-10',
        start_time: '10:00',
        end_time: '15:00',
        game_ids: gameIds.slice(0, 2), // First two games
        notes: 'Morning games chunk'
      };

      const response = await request(app)
        .post('/api/chunks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(chunkData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chunk).toBeDefined();
      expect(response.body.data.chunk.name).toBe(chunkData.name);
      expect(response.body.data.chunk.location).toBe(chunkData.location);
      expect(response.body.data.chunk.game_count).toBe(2);
      expect(response.body.data.chunk.total_referees_needed).toBeGreaterThan(0);
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .post('/api/chunks')
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          name: 'Test Chunk',
          game_ids: [gameIds[0]]
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('admin');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/chunks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should validate game_ids array', async () => {
      const response = await request(app)
        .post('/api/chunks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Chunk',
          game_ids: []
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('at least one game');
    });

    it('should validate games are at same location and date', async () => {
      // Create a game at different location
      const differentLocationGame = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          home_team_name: 'Different A',
          away_team_name: 'Different B',
          game_date: '2024-08-10',
          game_time: '16:00',
          location: 'Different Complex',
          level: 'Competitive',
          pay_rate: 75
        });

      const response = await request(app)
        .post('/api/chunks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Chunk',
          game_ids: [gameIds[0], differentLocationGame.body.data.game.id]
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('same location and date');
    });

    it('should auto-calculate chunk details from games', async () => {
      const response = await request(app)
        .post('/api/chunks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Auto Calculated Chunk',
          game_ids: gameIds
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      const chunk = response.body.data.chunk;
      expect(chunk.location).toBe('Sports Complex A');
      expect(chunk.date).toBe('2024-08-10');
      expect(chunk.start_time).toBe('10:00');
      expect(chunk.end_time).toBe('14:00');
    });
  });

  describe('GET /api/chunks', () => {
    let chunkId;

    beforeEach(async () => {
      // Create a test chunk
      const chunkResponse = await request(app)
        .post('/api/chunks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test List Chunk',
          game_ids: gameIds.slice(0, 2)
        });
      chunkId = chunkResponse.body.data.chunk.id;
    });

    it('should get all chunks', async () => {
      const response = await request(app)
        .get('/api/chunks')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.chunks)).toBe(true);
      expect(response.body.data.chunks.length).toBeGreaterThan(0);

      const chunk = response.body.data.chunks.find(c => c.id === chunkId);
      expect(chunk).toBeDefined();
      expect(chunk.name).toBe('Test List Chunk');
    });

    it('should filter chunks by date', async () => {
      const response = await request(app)
        .get('/api/chunks?date=2024-08-10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.chunks.forEach(chunk => {
        expect(chunk.date).toBe('2024-08-10');
      });
    });

    it('should filter chunks by location', async () => {
      const response = await request(app)
        .get('/api/chunks?location=Sports Complex A')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.chunks.forEach(chunk => {
        expect(chunk.location).toBe('Sports Complex A');
      });
    });

    it('should filter chunks by assignment status', async () => {
      const response = await request(app)
        .get('/api/chunks?status=unassigned')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.chunks.forEach(chunk => {
        expect(chunk.assigned_referee_id).toBeNull();
      });
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .get('/api/chunks')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/chunks?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/chunks/:id', () => {
    let chunkId;

    beforeEach(async () => {
      const chunkResponse = await request(app)
        .post('/api/chunks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Detail Chunk',
          game_ids: gameIds
        });
      chunkId = chunkResponse.body.data.chunk.id;
    });

    it('should get chunk details with games', async () => {
      const response = await request(app)
        .get(`/api/chunks/${chunkId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chunk).toBeDefined();
      expect(response.body.data.chunk.id).toBe(chunkId);
      expect(Array.isArray(response.body.data.chunk.games)).toBe(true);
      expect(response.body.data.chunk.games.length).toBe(gameIds.length);
    });

    it('should handle invalid chunk ID', async () => {
      const response = await request(app)
        .get('/api/chunks/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Chunk not found');
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .get(`/api/chunks/${chunkId}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/chunks/:id', () => {
    let chunkId;

    beforeEach(async () => {
      const chunkResponse = await request(app)
        .post('/api/chunks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Update Chunk',
          game_ids: gameIds.slice(0, 2)
        });
      chunkId = chunkResponse.body.data.chunk.id;
    });

    it('should update chunk details', async () => {
      const updateData = {
        name: 'Updated Chunk Name',
        notes: 'Updated notes'
      };

      const response = await request(app)
        .put(`/api/chunks/${chunkId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chunk.name).toBe(updateData.name);
      expect(response.body.data.chunk.notes).toBe(updateData.notes);
    });

    it('should add games to chunk', async () => {
      const response = await request(app)
        .put(`/api/chunks/${chunkId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          add_game_ids: [gameIds[2]]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chunk.game_count).toBe(3);
    });

    it('should remove games from chunk', async () => {
      const response = await request(app)
        .put(`/api/chunks/${chunkId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          remove_game_ids: [gameIds[0]]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chunk.game_count).toBe(1);
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .put(`/api/chunks/${chunkId}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          name: 'Unauthorized Update'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid chunk ID', async () => {
      const response = await request(app)
        .put('/api/chunks/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/chunks/:id/assign', () => {
    let chunkId;

    beforeEach(async () => {
      const chunkResponse = await request(app)
        .post('/api/chunks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Assign Chunk',
          game_ids: gameIds.slice(0, 2)
        });
      chunkId = chunkResponse.body.data.chunk.id;
    });

    it('should assign referee to chunk', async () => {
      const response = await request(app)
        .post(`/api/chunks/${chunkId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          referee_id: refereeUserId,
          position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignments_created).toBe(2);
      expect(Array.isArray(response.body.data.assignments)).toBe(true);

      // Verify assignments were created for all games in chunk
      const assignments = await db('game_assignments')
        .whereIn('game_id', gameIds.slice(0, 2))
        .where('user_id', refereeUserId);
      expect(assignments.length).toBe(2);
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .post(`/api/chunks/${chunkId}/assign`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          referee_id: refereeUserId,
          position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should validate referee_id parameter', async () => {
      const response = await request(app)
        .post(`/api/chunks/${chunkId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('referee_id');
    });

    it('should check referee availability conflicts', async () => {
      // Create a conflicting assignment first
      const conflictGameResponse = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          home_team_name: 'Conflict A',
          away_team_name: 'Conflict B',
          game_date: '2024-08-10',
          game_time: '11:00', // Overlaps with chunk games
          location: 'Different Location',
          level: 'Competitive',
          pay_rate: 75
        });

      await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_id: conflictGameResponse.body.data.game.id,
          user_id: refereeUserId,
          position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b'
        });

      const response = await request(app)
        .post(`/api/chunks/${chunkId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          referee_id: refereeUserId,
          position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b',
          check_conflicts: true
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('conflict');
      expect(Array.isArray(response.body.data.conflicts)).toBe(true);
    });

    it('should override conflicts when requested', async () => {
      const response = await request(app)
        .post(`/api/chunks/${chunkId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          referee_id: refereeUserId,
          position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b',
          override_conflicts: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignments_created).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/chunks/:id', () => {
    let chunkId;

    beforeEach(async () => {
      const chunkResponse = await request(app)
        .post('/api/chunks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Delete Chunk',
          game_ids: gameIds.slice(0, 1)
        });
      chunkId = chunkResponse.body.data.chunk.id;
    });

    it('should delete chunk', async () => {
      const response = await request(app)
        .delete(`/api/chunks/${chunkId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify chunk was deleted
      const checkResponse = await request(app)
        .get(`/api/chunks/${chunkId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .delete(`/api/chunks/${chunkId}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid chunk ID', async () => {
      const response = await request(app)
        .delete('/api/chunks/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should prevent deletion of assigned chunks', async () => {
      // Assign the chunk first
      await request(app)
        .post(`/api/chunks/${chunkId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          referee_id: refereeUserId,
          position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b'
        });

      const response = await request(app)
        .delete(`/api/chunks/${chunkId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('assigned');
    });

    it('should force delete assigned chunks when requested', async () => {
      // Assign the chunk first
      await request(app)
        .post(`/api/chunks/${chunkId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          referee_id: refereeUserId,
          position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b'
        });

      const response = await request(app)
        .delete(`/api/chunks/${chunkId}?force=true`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignments_removed).toBeGreaterThan(0);
    });
  });

  describe('POST /api/chunks/auto-create', () => {
    it('should auto-create chunks by location and date', async () => {
      const response = await request(app)
        .post('/api/chunks/auto-create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          criteria: {
            group_by: 'location_date',
            min_games: 2,
            max_time_gap: 180 // 3 hours
          },
          date_range: {
            start_date: '2024-08-10',
            end_date: '2024-08-10'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chunks_created).toBeGreaterThan(0);
      expect(Array.isArray(response.body.data.chunks)).toBe(true);
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .post('/api/chunks/auto-create')
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          criteria: { group_by: 'location_date' }
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should validate criteria parameter', async () => {
      const response = await request(app)
        .post('/api/chunks/auto-create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('criteria');
    });
  });
});