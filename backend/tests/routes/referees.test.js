const request = require('supertest');
const app = require('../../src/app');
const db = require('../setup');

describe('Referees Routes', () => {
  let adminToken, refereeToken, refereeUserId;

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
  });

  describe('GET /api/referees', () => {
    it('should get all referees for admin', async () => {
      const response = await request(app)
        .get('/api/referees')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.referees)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.total).toBeGreaterThan(0);
    });

    it('should filter referees by certification level', async () => {
      const response = await request(app)
        .get('/api/referees?certificationLevel=Level 2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.referees.forEach(referee => {
        expect(referee.certificationLevel).toBe('Level 2');
      });
    });

    it('should filter referees by availability', async () => {
      const response = await request(app)
        .get('/api/referees?available=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.referees.forEach(referee => {
        expect(referee.isAvailable).toBe(true);
      });
    });

    it('should search referees by name', async () => {
      const response = await request(app)
        .get('/api/referees?search=mike')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.referees.forEach(referee => {
        expect(referee.name.toLowerCase()).toContain('mike');
      });
    });

    it('should return 403 for referee trying to access all referees', async () => {
      const response = await request(app)
        .get('/api/referees')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Admin access required');
    });
  });

  describe('GET /api/referees/profile', () => {
    it('should get referee own profile', async () => {
      const response = await request(app)
        .get('/api/referees/profile')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.referee.id).toBe(refereeUserId);
      expect(response.body.data.referee.email).toBe('mike@referee.com');
      expect(response.body.data.referee.password).toBeUndefined();
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/referees/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/referees/:id', () => {
    it('should get specific referee as admin', async () => {
      const response = await request(app)
        .get(`/api/referees/${refereeUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.referee.id).toBe(refereeUserId);
      expect(response.body.data.referee.email).toBe('mike@referee.com');
    });

    it('should allow referee to get own profile by ID', async () => {
      const response = await request(app)
        .get(`/api/referees/${refereeUserId}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.referee.id).toBe(refereeUserId);
    });

    it('should return 403 for referee accessing other referee profile', async () => {
      // Get another referee ID
      const refereesResponse = await request(app)
        .get('/api/referees')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const otherRefereeId = refereesResponse.body.data.referees
        .find(ref => ref.id !== refereeUserId)?.id;

      if (otherRefereeId) {
        const response = await request(app)
          .get(`/api/referees/${otherRefereeId}`)
          .set('Authorization', `Bearer ${refereeToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      }
    });

    it('should return 404 for non-existent referee', async () => {
      const response = await request(app)
        .get('/api/referees/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('PUT /api/referees/:id', () => {
    it('should update referee profile as admin', async () => {
      const updateData = {
        name: 'Updated Mike Johnson',
        phone: '555-9999',
        certificationLevel: 'Level 3'
      };

      const response = await request(app)
        .put(`/api/referees/${refereeUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.referee.name).toBe(updateData.name);
      expect(response.body.data.referee.phone).toBe(updateData.phone);
      expect(response.body.data.referee.certificationLevel).toBe(updateData.certificationLevel);
    });

    it('should allow referee to update own profile', async () => {
      const updateData = {
        name: 'Self Updated Name',
        phone: '555-8888'
      };

      const response = await request(app)
        .put(`/api/referees/${refereeUserId}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.referee.name).toBe(updateData.name);
      expect(response.body.data.referee.phone).toBe(updateData.phone);
    });

    it('should return 403 for referee updating other referee', async () => {
      const refereesResponse = await request(app)
        .get('/api/referees')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const otherRefereeId = refereesResponse.body.data.referees
        .find(ref => ref.id !== refereeUserId)?.id;

      if (otherRefereeId) {
        const response = await request(app)
          .put(`/api/referees/${otherRefereeId}`)
          .set('Authorization', `Bearer ${refereeToken}`)
          .send({ name: 'Unauthorized Update' })
          .expect(403);

        expect(response.body.success).toBe(false);
      }
    });

    it('should return 404 for non-existent referee', async () => {
      const response = await request(app)
        .put('/api/referees/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Non-existent' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/referees/:id/availability', () => {
    it('should update referee availability as admin', async () => {
      const response = await request(app)
        .patch(`/api/referees/${refereeUserId}/availability`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isAvailable: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.referee.isAvailable).toBe(false);
    });

    it('should allow referee to update own availability', async () => {
      const response = await request(app)
        .patch(`/api/referees/${refereeUserId}/availability`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({ isAvailable: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.referee.isAvailable).toBe(true);
    });

    it('should return 400 for missing isAvailable field', async () => {
      const response = await request(app)
        .patch(`/api/referees/${refereeUserId}/availability`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('isAvailable');
    });

    it('should return 400 for invalid isAvailable value', async () => {
      const response = await request(app)
        .patch(`/api/referees/${refereeUserId}/availability`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isAvailable: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/referees/:id/assignments', () => {
    it('should get referee assignments as admin', async () => {
      const response = await request(app)
        .get(`/api/referees/${refereeUserId}/assignments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.assignments)).toBe(true);
    });

    it('should allow referee to get own assignments', async () => {
      const response = await request(app)
        .get(`/api/referees/${refereeUserId}/assignments`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.assignments)).toBe(true);
    });

    it('should filter assignments by status', async () => {
      const response = await request(app)
        .get(`/api/referees/${refereeUserId}/assignments?status=accepted`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.assignments.forEach(assignment => {
        expect(assignment.status).toBe('accepted');
      });
    });

    it('should filter assignments by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      const response = await request(app)
        .get(`/api/referees/${refereeUserId}/assignments?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.assignments.forEach(assignment => {
        const gameDate = new Date(assignment.game.date);
        expect(gameDate >= new Date(startDate)).toBe(true);
        expect(gameDate <= new Date(endDate)).toBe(true);
      });
    });

    it('should return 403 for referee accessing other referee assignments', async () => {
      const refereesResponse = await request(app)
        .get('/api/referees')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const otherRefereeId = refereesResponse.body.data.referees
        .find(ref => ref.id !== refereeUserId)?.id;

      if (otherRefereeId) {
        const response = await request(app)
          .get(`/api/referees/${otherRefereeId}/assignments`)
          .set('Authorization', `Bearer ${refereeToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('DELETE /api/referees/:id', () => {
    let testRefereeId;

    beforeEach(async () => {
      // Create a test referee to delete
      const createResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Delete Referee',
          email: 'delete@test.com',
          password: 'password123',
          role: 'referee',
          phone: '555-0000',
          certificationLevel: 'Level 1'
        });
      testRefereeId = createResponse.body.data.user.id;
    });

    it('should delete referee as admin', async () => {
      const response = await request(app)
        .delete(`/api/referees/${testRefereeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify referee is deleted
      await request(app)
        .get(`/api/referees/${testRefereeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 403 for referee trying to delete account', async () => {
      const response = await request(app)
        .delete(`/api/referees/${refereeUserId}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Admin access required');
    });

    it('should return 404 for non-existent referee', async () => {
      const response = await request(app)
        .delete('/api/referees/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});