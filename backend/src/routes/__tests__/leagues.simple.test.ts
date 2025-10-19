/**
 * @fileoverview Simple Leagues Routes Tests - Direct Database Testing
 * TDD approach: Define behavior first, then ensure routes match
 */

import db from '../../config/database';

describe('Leagues Database Operations - TDD', () => {

  const testLeague = {
    organization: 'TDD Test Org',
    age_group: 'U12',
    gender: 'Boys',
    division: 'A',
    season: '2024-TDD',
    name: 'TDD Test Org U12 Boys A 2024-TDD'
  };

  async function cleanup() {
    try {
      await db('leagues').where('organization', 'LIKE', '%TDD%').del();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await db.destroy();
  });

  describe('CREATE - Leagues should be creatable', () => {
    it('should insert a new league into database', async () => {
      const [created] = await db('leagues').insert(testLeague).returning('*');

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.organization).toBe(testLeague.organization);
      expect(created.age_group).toBe(testLeague.age_group);
      expect(created.gender).toBe(testLeague.gender);
    });

    it('should prevent duplicate leagues (unique constraint)', async () => {
      await db('leagues').insert(testLeague);

      await expect(
        db('leagues').insert(testLeague)
      ).rejects.toThrow();
    });

    it('should auto-generate UUID for id', async () => {
      const [created] = await db('leagues').insert(testLeague).returning('*');

      expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  describe('READ - Leagues should be retrievable', () => {
    it('should retrieve all leagues', async () => {
      await db('leagues').insert([testLeague]);

      const leagues = await db('leagues').where('organization', 'LIKE', '%TDD%');

      expect(leagues.length).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve league by ID', async () => {
      const [created] = await db('leagues').insert(testLeague).returning('*');

      const found = await db('leagues').where('id', created.id).first();

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
    });

    it('should filter leagues by organization', async () => {
      await db('leagues').insert(testLeague);

      const leagues = await db('leagues').where('organization', testLeague.organization);

      expect(leagues.every(l => l.organization === testLeague.organization)).toBe(true);
    });

    it('should filter leagues by age_group', async () => {
      await db('leagues').insert(testLeague);

      const leagues = await db('leagues').where('age_group', testLeague.age_group);

      expect(leagues.every(l => l.age_group === testLeague.age_group)).toBe(true);
    });
  });

  describe('UPDATE - Leagues should be updatable', () => {
    it('should update league fields', async () => {
      const [created] = await db('leagues').insert(testLeague).returning('*');

      await db('leagues')
        .where('id', created.id)
        .update({ division: 'Premier' });

      const updated = await db('leagues').where('id', created.id).first();

      expect(updated.division).toBe('Premier');
    });

    it('should update updated_at timestamp', async () => {
      const [created] = await db('leagues').insert(testLeague).returning('*');
      const originalTimestamp = created.updated_at;

      await new Promise(resolve => setTimeout(resolve, 100));

      await db('leagues')
        .where('id', created.id)
        .update({ division: 'Updated' });

      const updated = await db('leagues').where('id', created.id).first();

      expect(new Date(updated.updated_at).getTime()).toBeGreaterThan(new Date(originalTimestamp).getTime());
    });
  });

  describe('DELETE - Leagues should be deletable', () => {
    it('should delete a league', async () => {
      const [created] = await db('leagues').insert(testLeague).returning('*');

      await db('leagues').where('id', created.id).del();

      const deleted = await db('leagues').where('id', created.id).first();

      expect(deleted).toBeUndefined();
    });

    it('should cascade delete to teams', async () => {
      const [league] = await db('leagues').insert(testLeague).returning('*');
      const [team] = await db('teams').insert({
        name: 'TDD Team',
        team_number: 'TDD-999',
        league_id: league.id
      }).returning('*');

      await db('leagues').where('id', league.id).del();

      const deletedTeam = await db('teams').where('id', team.id).first();

      expect(deletedTeam).toBeUndefined();
    });
  });

  describe('RELATIONSHIPS - Leagues relationships should work', () => {
    it('should relate to teams', async () => {
      const [league] = await db('leagues').insert(testLeague).returning('*');
      await db('teams').insert({
        name: 'TDD Team 1',
        team_number: 'TDD-001',
        league_id: league.id
      });

      const teams = await db('teams').where('league_id', league.id);

      expect(teams.length).toBe(1);
      expect(teams[0].league_id).toBe(league.id);
    });

    it('should count teams in league', async () => {
      const [league] = await db('leagues').insert(testLeague).returning('*');
      await db('teams').insert([
        { name: 'TDD Team 1', team_number: 'TDD-001', league_id: league.id },
        { name: 'TDD Team 2', team_number: 'TDD-002', league_id: league.id }
      ]);

      const [result] = await db('teams')
        .where('league_id', league.id)
        .count('* as count');

      expect(parseInt(result.count as string)).toBe(2);
    });
  });
});
