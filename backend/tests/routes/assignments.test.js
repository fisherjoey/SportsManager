const request = require('supertest');
const app = require('../../src/app');
const db = require('../setup');

describe('Assignments Routes', () => {
  let adminToken, refereeToken, gameId, refereeUserId;

  beforeEach(async () => {
    // Get admin token
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password123'
      });
    adminToken = adminLogin.body.token;

    // Get referee token and user ID
    const refereeLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'referee@test.com',
        password: 'password123'
      });
    refereeToken = refereeLogin.body.token;
    refereeUserId = refereeLogin.body.user?.id;

    // Get an unassigned game ID
    const gamesResponse = await request(app)
      .get('/api/games?status=unassigned')
      .set('Authorization', `Bearer ${adminToken}`);
    gameId = gamesResponse.body.games?.[0]?.id;
  });

  describe('GET /api/assignments', () => {
    it('should get all assignments for admin', async () => {
      const response = await request(app)
        .get('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body.assignments)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter assignments by status', async () => {
      const response = await request(app)
        .get('/api/assignments?status=pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      response.body.assignments.forEach(assignment => {
        expect(assignment.status).toBe('pending');
      });
    });

    it('should filter assignments by referee ID', async () => {
      const response = await request(app)
        .get(`/api/assignments?refereeId=${refereeUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      response.body.assignments.forEach(assignment => {
        expect(assignment.refereeId).toBe(refereeUserId);
      });
    });

    it('should filter assignments by game ID', async () => {
      const response = await request(app)
        .get(`/api/assignments?gameId=${gameId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      response.body.assignments.forEach(assignment => {
        expect(assignment.gameId).toBe(gameId);
      });
    });

    it('should return referee own assignments only', async () => {
      const response = await request(app)
        .get('/api/assignments')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      response.body.assignments.forEach(assignment => {
        expect(assignment.refereeId).toBe(refereeUserId);
      });
    });
  });

  describe('GET /api/assignments/:id', () => {
    let assignmentId;

    beforeEach(async () => {
      const assignmentsResponse = await request(app)
        .get('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`);
      assignmentId = assignmentsResponse.body.data.assignments[0]?.id;
    });

    it('should get specific assignment as admin', async () => {
      if (!assignmentId) {
        console.log('No assignments found, skipping test');
        return;
      }

      const response = await request(app)
        .get(`/api/assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.assignment.id).toBe(assignmentId);
      expect(response.body.assignment.game).toBeDefined();
      expect(response.body.assignment.referee).toBeDefined();
    });

    it('should return 404 for non-existent assignment', async () => {
      const response = await request(app)
        .get('/api/assignments/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/assignments', () => {
    it('should create assignment as admin', async () => {
      if (!gameId) {
        console.log('No unassigned games found, skipping test');
        return;
      }

      const assignmentData = {
        gameId: gameId,
        refereeId: refereeUserId,
        assignedBy: 'admin@refassign.com'
      };

      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignmentData)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.assignment.gameId).toBe(gameId);
      expect(response.body.assignment.refereeId).toBe(refereeUserId);
      expect(response.body.assignment.status).toBe('pending');
    });

    it('should return 403 for referee trying to create assignment', async () => {
      const assignmentData = {
        gameId: gameId,
        refereeId: refereeUserId
      };

      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${refereeToken}`)
        .send(assignmentData)
        .expect(403);

      expect(response.body.error).toBeDefined();
      expect(response.body.error).toContain('Admin access required');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          gameId: gameId
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error).toContain('required');
    });

    it('should return 400 for non-existent game', async () => {
      const assignmentData = {
        gameId: 99999,
        refereeId: refereeUserId
      };

      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignmentData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for non-existent referee', async () => {
      const assignmentData = {
        gameId: gameId,
        refereeId: 99999
      };

      const response = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignmentData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/assignments/bulk', () => {
    it('should create multiple assignments as admin', async () => {
      // Get multiple unassigned games
      const gamesResponse = await request(app)
        .get('/api/games?status=unassigned&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const games = gamesResponse.body.data.games;
      if (games.length < 2) {
        console.log('Not enough unassigned games for bulk test, skipping');
        return;
      }

      const bulkData = {
        assignments: [
          {
            gameId: games[0].id,
            refereeId: refereeUserId
          },
          {
            gameId: games[1].id,
            refereeId: refereeUserId
          }
        ]
      };

      const response = await request(app)
        .post('/api/assignments/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkData)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.assignments).toHaveLength(2);
      expect(response.body.summary.total).toBe(2);
      expect(response.body.summary.successful).toBe(2);
      expect(response.body.summary.failed).toBe(0);
    });

    it('should return 403 for referee trying bulk assignment', async () => {
      const bulkData = {
        assignments: [
          {
            gameId: gameId,
            refereeId: refereeUserId
          }
        ]
      };

      const response = await request(app)
        .post('/api/assignments/bulk')
        .set('Authorization', `Bearer ${refereeToken}`)
        .send(bulkData)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for empty assignments array', async () => {
      const response = await request(app)
        .post('/api/assignments/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignments: [] })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error).toContain('at least one assignment');
    });
  });

  describe('PATCH /api/assignments/:id/status', () => {
    let assignmentId;

    beforeEach(async () => {
      // Create a test assignment
      if (gameId) {
        const createResponse = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            gameId: gameId,
            refereeId: refereeUserId,
            assignedBy: 'admin@refassign.com'
          });
        assignmentId = createResponse.body.data.assignment.id;
      }
    });

    it('should allow referee to accept assignment', async () => {
      if (!assignmentId) {
        console.log('No assignment created, skipping test');
        return;
      }

      const response = await request(app)
        .patch(`/api/assignments/${assignmentId}/status`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({ status: 'accepted' })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.assignment.status).toBe('accepted');
    });

    it('should allow referee to decline assignment', async () => {
      if (!assignmentId) {
        console.log('No assignment created, skipping test');
        return;
      }

      const response = await request(app)
        .patch(`/api/assignments/${assignmentId}/status`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({ 
          status: 'declined',
          reason: 'Schedule conflict'
        })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.assignment.status).toBe('declined');
      expect(response.body.assignment.reason).toBe('Schedule conflict');
    });

    it('should allow admin to update assignment status', async () => {
      if (!assignmentId) {
        console.log('No assignment created, skipping test');
        return;
      }

      const response = await request(app)
        .patch(`/api/assignments/${assignmentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'cancelled' })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.assignment.status).toBe('cancelled');
    });

    it('should return 400 for invalid status', async () => {
      if (!assignmentId) {
        console.log('No assignment created, skipping test');
        return;
      }

      const response = await request(app)
        .patch(`/api/assignments/${assignmentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error).toContain('Invalid status');
    });

    it('should return 404 for non-existent assignment', async () => {
      const response = await request(app)
        .patch('/api/assignments/99999/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'accepted' })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/assignments/:id', () => {
    let assignmentId;

    beforeEach(async () => {
      // Create a test assignment to delete
      if (gameId) {
        const createResponse = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            gameId: gameId,
            refereeId: refereeUserId,
            assignedBy: 'admin@refassign.com'
          });
        assignmentId = createResponse.body.data.assignment.id;
      }
    });

    it('should delete assignment as admin', async () => {
      if (!assignmentId) {
        console.log('No assignment created, skipping test');
        return;
      }

      const response = await request(app)
        .delete(`/api/assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.error).toContain('deleted');

      // Verify assignment is deleted
      await request(app)
        .get(`/api/assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 403 for referee trying to delete assignment', async () => {
      if (!assignmentId) {
        console.log('No assignment created, skipping test');
        return;
      }

      const response = await request(app)
        .delete(`/api/assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
      expect(response.body.error).toContain('Admin access required');
    });

    it('should return 404 for non-existent assignment', async () => {
      const response = await request(app)
        .delete('/api/assignments/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/assignments/available-games', () => {
    it('should get available games for referee', async () => {
      const response = await request(app)
        .get('/api/assignments/available-games')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body.games)).toBe(true);
      
      // All returned games should be unassigned or up-for-grabs
      response.body.games.forEach(game => {
        expect(['unassigned', 'up-for-grabs']).toContain(game.status);
      });
    });

    it('should filter available games by date range', async () => {
      const startDate = '2024-06-01';
      const endDate = '2024-06-30';

      const response = await request(app)
        .get(`/api/assignments/available-games?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      response.body.games.forEach(game => {
        const gameDate = new Date(game.date);
        expect(gameDate >= new Date(startDate)).toBe(true);
        expect(gameDate <= new Date(endDate)).toBe(true);
      });
    });

    it('should filter available games by certification level', async () => {
      const response = await request(app)
        .get('/api/assignments/available-games?level=Youth')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      response.body.games.forEach(game => {
        expect(game.level).toBe('Youth');
      });
    });
  });
});