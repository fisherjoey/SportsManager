/**
 * @fileoverview Leagues Routes Integration Tests
 * True integration tests using real database - TDD approach
 */

import request from 'supertest';
import express from 'express';

// Mock middleware before importing routes
jest.mock('../../middleware/requireCerbosPermission', () => ({
  requireCerbosPermission: jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next())
}));

jest.mock('../../middleware/auth', () => ({
  authenticateToken: jest.fn().mockImplementation((req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@test.com', roles: ['Admin', 'Super Admin'] };
    next();
  })
}));

import db from '../../config/database';
import leaguesRouter from '../leagues';

const app = express();
app.use(express.json());

// Mock auth to inject test user
app.use((req: any, res, next) => {
  req.user = { id: 'test-user-id', email: 'test@test.com', roles: ['Admin', 'Super Admin'] };
  next();
});

app.use('/api/leagues', leaguesRouter);

const testLeague = {
  organization: 'Test Org TDD',
  age_group: 'U12',
  gender: 'Boys',
  division: 'A',
  season: '2024-Spring',
  name: 'Test Org TDD U12 Boys A 2024-Spring'
};

async function cleanupTestData() {
  try {
    await db('leagues').where('organization', 'LIKE', '%TDD%').del();
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

describe('Leagues API - Integration Tests', () => {

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await db.destroy();
  });

  it('should list leagues with pagination', async () => {
    await db('leagues').insert(testLeague);

    const response = await request(app)
      .get('/api/leagues')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.leagues).toBeDefined();
    expect(response.body.data.pagination).toBeDefined();
  });

  it('should create a new league', async () => {
    const newLeague = {
      organization: 'Create Test TDD',
      age_group: 'U16',
      gender: 'Mixed',
      division: 'Premier',
      season: '2024-Fall'
    };

    const response = await request(app)
      .post('/api/leagues')
      .send(newLeague)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeDefined();

    await db('leagues').where('id', response.body.data.id).del();
  });

  it('should prevent duplicate leagues', async () => {
    await db('leagues').insert(testLeague);

    const response = await request(app)
      .post('/api/leagues')
      .send({
        organization: testLeague.organization,
        age_group: testLeague.age_group,
        gender: testLeague.gender,
        division: testLeague.division,
        season: testLeague.season
      })
      .expect(409);

    expect(response.body.success).toBe(false);
  });

  it('should get specific league by ID', async () => {
    const [league] = await db('leagues').insert(testLeague).returning('*');

    const response = await request(app)
      .get(`/api/leagues/${league.id}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.league.id).toBe(league.id);
  });

  it('should update a league', async () => {
    const [league] = await db('leagues').insert(testLeague).returning('*');

    const response = await request(app)
      .put(`/api/leagues/${league.id}`)
      .send({ division: 'Premier' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.division).toBe('Premier');
  });

  it('should delete a league', async () => {
    const [league] = await db('leagues').insert(testLeague).returning('*');

    await request(app)
      .delete(`/api/leagues/${league.id}`)
      .expect(200);

    const deleted = await db('leagues').where('id', league.id).first();
    expect(deleted).toBeUndefined();
  });

  it('should prevent deletion of league with teams', async () => {
    const [league] = await db('leagues').insert(testLeague).returning('*');
    await db('teams').insert({ name: 'Test Team TDD', team_number: 'TDD-001', league_id: league.id });

    const response = await request(app)
      .delete(`/api/leagues/${league.id}`)
      .expect(409);

    expect(response.body.success).toBe(false);

    await db('teams').where('league_id', league.id).del();
  });
});
