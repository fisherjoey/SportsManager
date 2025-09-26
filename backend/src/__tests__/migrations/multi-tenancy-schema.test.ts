/**
 * @fileoverview Tests for Multi-Tenancy Database Schema Migration
 * @description TDD approach - write tests first, then migration
 */

import db from '../../config/database';

describe('Multi-Tenancy Database Schema', () => {
  describe('organizations table', () => {
    it('should exist', async () => {
      const exists = await db.schema.hasTable('organizations');
      expect(exists).toBe(true);
    });

    it('should have required columns', async () => {
      const columns = await db('organizations').columnInfo();

      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('name');
      expect(columns).toHaveProperty('slug');
      expect(columns).toHaveProperty('settings');
      expect(columns).toHaveProperty('created_at');
      expect(columns).toHaveProperty('updated_at');
    });

    it('should have id as UUID', async () => {
      const columns = await db('organizations').columnInfo();
      expect(columns.id.type).toBe('uuid');
    });

    it('should have unique constraint on slug', async () => {
      // Test by trying to insert duplicate slug
      const testOrg = {
        name: 'Test Org',
        slug: 'test-unique-slug',
        settings: {}
      };

      await db('organizations').insert(testOrg);

      // Should fail on duplicate
      await expect(
        db('organizations').insert(testOrg)
      ).rejects.toThrow();

      // Cleanup
      await db('organizations').where('slug', 'test-unique-slug').del();
    });
  });

  describe('regions table', () => {
    it('should exist', async () => {
      const exists = await db.schema.hasTable('regions');
      expect(exists).toBe(true);
    });

    it('should have required columns', async () => {
      const columns = await db('regions').columnInfo();

      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('organization_id');
      expect(columns).toHaveProperty('name');
      expect(columns).toHaveProperty('slug');
      expect(columns).toHaveProperty('parent_region_id');
      expect(columns).toHaveProperty('settings');
      expect(columns).toHaveProperty('created_at');
      expect(columns).toHaveProperty('updated_at');
    });

    it('should have foreign key to organizations', async () => {
      // Insert test org
      const [org] = await db('organizations')
        .insert({ name: 'Test Org', slug: 'test-org-fk' })
        .returning('*');

      // Should allow region with valid org_id
      const [region] = await db('regions')
        .insert({
          organization_id: org.id,
          name: 'Test Region',
          slug: 'test-region'
        })
        .returning('*');

      expect(region.organization_id).toBe(org.id);

      // Cleanup
      await db('regions').where('id', region.id).del();
      await db('organizations').where('id', org.id).del();
    });

    it('should cascade delete regions when organization deleted', async () => {
      const [org] = await db('organizations')
        .insert({ name: 'Test Org Cascade', slug: 'test-cascade' })
        .returning('*');

      const [region] = await db('regions')
        .insert({
          organization_id: org.id,
          name: 'Test Region Cascade',
          slug: 'test-cascade'
        })
        .returning('*');

      // Delete org
      await db('organizations').where('id', org.id).del();

      // Region should be auto-deleted
      const remainingRegions = await db('regions').where('id', region.id);
      expect(remainingRegions.length).toBe(0);
    });

    it('should enforce unique constraint on org+slug', async () => {
      const [org] = await db('organizations')
        .insert({ name: 'Test Org Unique', slug: 'test-unique' })
        .returning('*');

      await db('regions').insert({
        organization_id: org.id,
        name: 'Region 1',
        slug: 'same-slug'
      });

      // Should fail - same org + slug
      await expect(
        db('regions').insert({
          organization_id: org.id,
          name: 'Region 2',
          slug: 'same-slug'
        })
      ).rejects.toThrow();

      // Cleanup
      await db('regions').where('organization_id', org.id).del();
      await db('organizations').where('id', org.id).del();
    });
  });

  describe('user_region_assignments table', () => {
    it('should exist', async () => {
      const exists = await db.schema.hasTable('user_region_assignments');
      expect(exists).toBe(true);
    });

    it('should have required columns', async () => {
      const columns = await db('user_region_assignments').columnInfo();

      expect(columns).toHaveProperty('user_id');
      expect(columns).toHaveProperty('region_id');
      expect(columns).toHaveProperty('role');
      expect(columns).toHaveProperty('assigned_at');
      expect(columns).toHaveProperty('assigned_by');
      expect(columns).toHaveProperty('expires_at');
    });

    it('should have composite primary key', async () => {
      const [org] = await db('organizations')
        .insert({ name: 'Test Org', slug: 'test-pk' })
        .returning('*');

      const [region] = await db('regions')
        .insert({
          organization_id: org.id,
          name: 'Test Region',
          slug: 'test-pk'
        })
        .returning('*');

      // Create test user
      const [user] = await db('users')
        .insert({ email: 'test@example.com', name: 'Test User', organization_id: org.id })
        .returning('*');

      // Insert assignment
      await db('user_region_assignments').insert({
        user_id: user.id,
        region_id: region.id,
        role: 'assignor'
      });

      // Should fail on duplicate (same user, region, role)
      await expect(
        db('user_region_assignments').insert({
          user_id: user.id,
          region_id: region.id,
          role: 'assignor'
        })
      ).rejects.toThrow();

      // Cleanup
      await db('user_region_assignments').where('user_id', user.id).del();
      await db('users').where('id', user.id).del();
      await db('regions').where('id', region.id).del();
      await db('organizations').where('id', org.id).del();
    });

    it('should cascade delete when user deleted', async () => {
      const [org] = await db('organizations')
        .insert({ name: 'Test Org', slug: 'test-cascade-user' })
        .returning('*');

      const [region] = await db('regions')
        .insert({
          organization_id: org.id,
          name: 'Test Region',
          slug: 'test-cascade-user'
        })
        .returning('*');

      const [user] = await db('users')
        .insert({ email: 'cascade@example.com', name: 'Cascade User', organization_id: org.id })
        .returning('*');

      await db('user_region_assignments').insert({
        user_id: user.id,
        region_id: region.id,
        role: 'assignor'
      });

      // Delete user
      await db('users').where('id', user.id).del();

      // Assignment should be gone
      const remaining = await db('user_region_assignments').where('user_id', user.id);
      expect(remaining.length).toBe(0);

      // Cleanup
      await db('regions').where('id', region.id).del();
      await db('organizations').where('id', org.id).del();
    });
  });

  describe('existing tables - organization_id column', () => {
    const tablesToCheck = ['users', 'games', 'assignments', 'referees', 'expenses', 'budgets'];

    tablesToCheck.forEach(tableName => {
      it(`should have organization_id column on ${tableName}`, async () => {
        const columns = await db(tableName).columnInfo();
        expect(columns).toHaveProperty('organization_id');
        expect(columns.organization_id.type).toBe('uuid');
      });

      it(`should have foreign key constraint on ${tableName}.organization_id`, async () => {
        // Create test org
        const [org] = await db('organizations')
          .insert({ name: 'Test FK Org', slug: `test-fk-${tableName}` })
          .returning('*');

        // Try to insert with invalid org_id - should fail
        const invalidOrgId = '00000000-0000-0000-0000-000000000000';

        let insertData: any = { organization_id: invalidOrgId };

        // Add required fields per table
        if (tableName === 'users') {
          insertData.email = `test-${Date.now()}@example.com`;
          insertData.name = 'Test User';
        } else if (tableName === 'games') {
          insertData.date_time = new Date();
          insertData.location = 'Test Location';
        }
        // Add more table-specific required fields as needed

        if (tableName !== 'users') { // Users can have null org_id initially
          await expect(
            db(tableName).insert(insertData)
          ).rejects.toThrow(); // Foreign key violation
        }

        // Cleanup
        await db('organizations').where('id', org.id).del();
      });
    });
  });

  describe('existing tables - region_id column', () => {
    const tablesToCheck = ['users', 'games', 'referees'];

    tablesToCheck.forEach(tableName => {
      it(`should have primary_region_id column on ${tableName}`, async () => {
        const columns = await db(tableName).columnInfo();

        if (tableName === 'users' || tableName === 'referees') {
          expect(columns).toHaveProperty('primary_region_id');
        } else if (tableName === 'games') {
          expect(columns).toHaveProperty('region_id');
        }
      });
    });
  });

  describe('existing tables - created_by column', () => {
    it('should have created_by column on games', async () => {
      const columns = await db('games').columnInfo();
      expect(columns).toHaveProperty('created_by');
      expect(columns.created_by.type).toBe('uuid');
    });
  });

  describe('indexes', () => {
    it('should have index on users.organization_id', async () => {
      const indexes = await db.raw(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'users'
        AND indexname LIKE '%organization%'
      `);

      expect(indexes.rows.length).toBeGreaterThan(0);
    });

    it('should have index on games.organization_id', async () => {
      const indexes = await db.raw(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'games'
        AND indexname LIKE '%organization%'
      `);

      expect(indexes.rows.length).toBeGreaterThan(0);
    });

    it('should have index on games.region_id', async () => {
      const indexes = await db.raw(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'games'
        AND indexname LIKE '%region%'
      `);

      expect(indexes.rows.length).toBeGreaterThan(0);
    });
  });

  describe('data integrity', () => {
    it('should allow creating full multi-tenant hierarchy', async () => {
      // Create organization
      const [org] = await db('organizations')
        .insert({
          name: 'Complete Test Org',
          slug: 'complete-test',
          settings: { timezone: 'America/New_York' }
        })
        .returning('*');

      expect(org.id).toBeDefined();

      // Create region
      const [region] = await db('regions')
        .insert({
          organization_id: org.id,
          name: 'East Region',
          slug: 'east',
          settings: {}
        })
        .returning('*');

      expect(region.id).toBeDefined();

      // Create user
      const [user] = await db('users')
        .insert({
          email: 'hierarchy@example.com',
          name: 'Hierarchy User',
          organization_id: org.id,
          primary_region_id: region.id
        })
        .returning('*');

      expect(user.organization_id).toBe(org.id);
      expect(user.primary_region_id).toBe(region.id);

      // Assign user to region
      await db('user_region_assignments').insert({
        user_id: user.id,
        region_id: region.id,
        role: 'assignor'
      });

      // Create game
      const [game] = await db('games')
        .insert({
          organization_id: org.id,
          region_id: region.id,
          created_by: user.id,
          date_time: new Date(),
          location: 'Test Location'
        })
        .returning('*');

      expect(game.organization_id).toBe(org.id);
      expect(game.region_id).toBe(region.id);
      expect(game.created_by).toBe(user.id);

      // Cleanup
      await db('games').where('id', game.id).del();
      await db('user_region_assignments').where('user_id', user.id).del();
      await db('users').where('id', user.id).del();
      await db('regions').where('id', region.id).del();
      await db('organizations').where('id', org.id).del();
    });
  });
});