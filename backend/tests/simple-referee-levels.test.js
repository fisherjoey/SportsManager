const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

describe('Referee Levels System', () => {
  beforeAll(async () => {
    // Clean up test data
    try {
      await db('game_assignments').del();
      await db('referees').del();
      await db('referee_levels').del();
      await db('games').del();
      await db('positions').del();
    } catch (error) {
      // Tables might not exist in test, that's okay
    }
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('Referee Levels API', () => {
    let learningLevel;
    let teachingLevel;

    beforeEach(async () => {
      // Create referee levels
      [learningLevel] = await db('referee_levels').insert({
        name: 'Learning',
        wage_amount: 25.00,
        description: 'Rookie level',
        allowed_divisions: JSON.stringify(['U11-2', 'U11-1', 'U13-3'])
      }).returning('*');

      [teachingLevel] = await db('referee_levels').insert({
        name: 'Teaching',
        wage_amount: 45.00,
        description: 'Senior level',
        allowed_divisions: JSON.stringify(['U15-1', 'U18-2', 'U18-1'])
      }).returning('*');
    });

    afterEach(async () => {
      await db('referee_levels').del();
    });

    it('should get all referee levels', async () => {
      const response = await request(app)
        .get('/api/referee-levels')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('Learning');
      expect(response.body.data[0].wage_amount).toBe('25.00');
      expect(response.body.data[1].name).toBe('Teaching');
      expect(response.body.data[1].wage_amount).toBe('45.00');
    });

    it('should return referee levels ordered by wage amount', async () => {
      const response = await request(app)
        .get('/api/referee-levels')
        .expect(200);

      expect(response.body.success).toBe(true);
      const wages = response.body.data.map(level => parseFloat(level.wage_amount));
      expect(wages[0]).toBeLessThan(wages[1]); // Should be ordered ascending
    });

    it('should have correct allowed divisions for each level', async () => {
      const response = await request(app)
        .get('/api/referee-levels')
        .expect(200);

      const learningData = response.body.data.find(l => l.name === 'Learning');
      const teachingData = response.body.data.find(l => l.name === 'Teaching');

      expect(JSON.parse(learningData.allowed_divisions)).toContain('U13-3');
      expect(JSON.parse(teachingData.allowed_divisions)).toContain('U18-1');
    });
  });

  describe('Database Schema Validation', () => {
    it('should have referee_levels table with correct columns', async () => {
      const result = await db.raw(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'referee_levels'
      `);
      
      const columns = result.rows.map(row => row.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('wage_amount');
      expect(columns).toContain('allowed_divisions');
    });

    it('should have referees table with level relationship', async () => {
      const result = await db.raw(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'referees'
      `);
      
      const columns = result.rows.map(row => row.column_name);
      expect(columns).toContain('referee_level_id');
      expect(columns).toContain('wage_per_game');
      expect(columns).toContain('years_experience');
    });
  });

  describe('Wage Calculation Logic', () => {
    let testReferee;
    let learningLevel;

    beforeEach(async () => {
      // Create referee level
      [learningLevel] = await db('referee_levels').insert({
        name: 'Learning',
        wage_amount: 25.00,
        description: 'Rookie level',
        allowed_divisions: JSON.stringify(['U11-2', 'U11-1', 'U13-3'])
      }).returning('*');

      // Create referee
      [testReferee] = await db('referees').insert({
        name: 'Test Referee',
        email: 'test@referee.com',
        phone: '123-456-7890',
        location: 'Test City',
        postal_code: 'T1T1T1',
        max_distance: 25,
        is_available: true,
        wage_per_game: 0
      }).returning('*');
    });

    afterEach(async () => {
      await db('referees').del();
      await db('referee_levels').del();
    });

    it('should update referee wage when assigned to level', async () => {
      // Assign referee to level (simulating admin action)
      await db('referees')
        .where('id', testReferee.id)
        .update({
          referee_level_id: learningLevel.id,
          wage_per_game: learningLevel.wage_amount
        });

      const updatedReferee = await db('referees')
        .where('id', testReferee.id)
        .first();

      expect(updatedReferee.referee_level_id).toBe(learningLevel.id);
      expect(parseFloat(updatedReferee.wage_per_game)).toBe(25.00);
    });

    it('should maintain wage consistency with level', async () => {
      // Assign referee to level
      await db('referees')
        .where('id', testReferee.id)
        .update({
          referee_level_id: learningLevel.id,
          wage_per_game: learningLevel.wage_amount
        });

      // Get referee with level info
      const refereeWithLevel = await db('referees')
        .leftJoin('referee_levels', 'referees.referee_level_id', 'referee_levels.id')
        .select(
          'referees.*',
          'referee_levels.name as level_name',
          'referee_levels.wage_amount as level_wage'
        )
        .where('referees.id', testReferee.id)
        .first();

      expect(refereeWithLevel.wage_per_game).toBe(refereeWithLevel.level_wage);
    });
  });
});