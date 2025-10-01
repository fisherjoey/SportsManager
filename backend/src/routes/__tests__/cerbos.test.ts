import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import cerbosRoutes from '../cerbos';

const TEST_POLICIES_PATH = path.join(__dirname, '../../../test-cerbos-api-policies');
const JWT_SECRET = 'test-secret';

describe('Cerbos API Routes', () => {
  let app: express.Application;
  let adminToken: string;
  let assignorToken: string;

  beforeEach(async () => {
    await fs.mkdir(TEST_POLICIES_PATH, { recursive: true });
    await fs.mkdir(path.join(TEST_POLICIES_PATH, 'resources'), { recursive: true });
    await fs.mkdir(path.join(TEST_POLICIES_PATH, 'derived_roles'), { recursive: true });

    vi.stubEnv('JWT_SECRET', JWT_SECRET);
    vi.mock('../../services/CerbosPolicyService', () => {
      const { CerbosPolicyService } = vi.importActual<typeof import('../../services/CerbosPolicyService')>(
        '../../services/CerbosPolicyService'
      );
      return {
        default: class extends CerbosPolicyService {
          constructor() {
            super(TEST_POLICIES_PATH);
          }
        },
      };
    });

    app = express();
    app.use(express.json());
    app.use('/api/cerbos', cerbosRoutes);

    adminToken = jwt.sign(
      {
        userId: 'admin-user-id',
        email: 'admin@test.com',
        roles: ['Admin'],
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    assignorToken = jwt.sign(
      {
        userId: 'assignor-user-id',
        email: 'assignor@test.com',
        roles: ['Assignor'],
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    await fs.rm(TEST_POLICIES_PATH, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('GET /api/cerbos/resources', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/cerbos/resources');

      expect(response.status).toBe(401);
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .get('/api/cerbos/resources')
        .set('Authorization', `Bearer ${assignorToken}`);

      expect(response.status).toBe(403);
    });

    it('should list resources for admin', async () => {
      await fs.writeFile(
        path.join(TEST_POLICIES_PATH, 'resources', 'test_resource.yaml'),
        `apiVersion: api.cerbos.dev/v1
resourcePolicy:
  resource: test_resource
  version: default
  rules:
    - actions: [view]
      effect: EFFECT_ALLOW
      roles: [admin]
`
      );

      const response = await request(app)
        .get('/api/cerbos/resources')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.resources).toHaveLength(1);
      expect(response.body.data.resources[0].kind).toBe('test_resource');
    });
  });

  describe('GET /api/cerbos/resources/:kind', () => {
    beforeEach(async () => {
      await fs.writeFile(
        path.join(TEST_POLICIES_PATH, 'resources', 'game.yaml'),
        `apiVersion: api.cerbos.dev/v1
resourcePolicy:
  resource: game
  version: default
  rules:
    - actions: [view, list]
      effect: EFFECT_ALLOW
      roles: [admin]
`
      );
    });

    it('should get specific resource', async () => {
      const response = await request(app)
        .get('/api/cerbos/resources/game')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.policy.resourcePolicy.resource).toBe('game');
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await request(app)
        .get('/api/cerbos/resources/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/cerbos/resources', () => {
    it('should create new resource', async () => {
      const response = await request(app)
        .post('/api/cerbos/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          kind: 'new_resource',
          version: 'default',
          importDerivedRoles: ['common_roles'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.policy.resourcePolicy.resource).toBe('new_resource');

      const fileExists = await fs
        .access(path.join(TEST_POLICIES_PATH, 'resources', 'new_resource.yaml'))
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should validate resource kind format', async () => {
      const response = await request(app)
        .post('/api/cerbos/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          kind: 'Invalid-Resource-Name',
          version: 'default',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should prevent duplicate resources', async () => {
      await request(app)
        .post('/api/cerbos/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          kind: 'duplicate',
          version: 'default',
        });

      const response = await request(app)
        .post('/api/cerbos/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          kind: 'duplicate',
          version: 'default',
        });

      expect(response.status).toBe(409);
    });
  });

  describe('PUT /api/cerbos/resources/:kind', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/cerbos/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          kind: 'updatable',
          version: 'default',
        });
    });

    it('should update existing resource', async () => {
      const policy = {
        apiVersion: 'api.cerbos.dev/v1',
        resourcePolicy: {
          resource: 'updatable',
          version: 'default',
          rules: [
            {
              actions: ['view'],
              effect: 'EFFECT_ALLOW',
              roles: ['admin'],
            },
          ],
        },
      };

      const response = await request(app)
        .put('/api/cerbos/resources/updatable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(policy);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.policy.resourcePolicy.rules).toHaveLength(1);
    });

    it('should validate policy before updating', async () => {
      const invalidPolicy = {
        apiVersion: 'api.cerbos.dev/v1',
        resourcePolicy: {
          resource: 'updatable',
          version: 'default',
          rules: [
            {
              actions: [],
              effect: 'EFFECT_ALLOW',
              roles: ['admin'],
            },
          ],
        },
      };

      const response = await request(app)
        .put('/api/cerbos/resources/updatable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPolicy);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/cerbos/resources/:kind', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/cerbos/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          kind: 'deletable',
          version: 'default',
        });
    });

    it('should delete resource', async () => {
      const response = await request(app)
        .delete('/api/cerbos/resources/deletable')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const fileExists = await fs
        .access(path.join(TEST_POLICIES_PATH, 'resources', 'deletable.yaml'))
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(false);
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await request(app)
        .delete('/api/cerbos/resources/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/cerbos/resources/:kind/actions', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/cerbos/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          kind: 'actionable',
          version: 'default',
        });
    });

    it('should add action to resource', async () => {
      const response = await request(app)
        .post('/api/cerbos/resources/actionable/actions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'new_action',
          roles: {
            admin: { effect: 'EFFECT_ALLOW' },
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should validate action name format', async () => {
      const response = await request(app)
        .post('/api/cerbos/resources/actionable/actions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'Invalid-Action',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/cerbos/resources/:kind/roles/:role', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/cerbos/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          kind: 'configurable',
          version: 'default',
        });
    });

    it('should set role rules', async () => {
      const response = await request(app)
        .put('/api/cerbos/resources/configurable/roles/assignor')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          view: { effect: 'EFFECT_ALLOW' },
          create: {
            effect: 'EFFECT_ALLOW',
            condition: 'R.attr.organizationId == P.attr.organizationId',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should validate effect values', async () => {
      const response = await request(app)
        .put('/api/cerbos/resources/configurable/roles/assignor')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          view: { effect: 'INVALID_EFFECT' },
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/cerbos/reload', () => {
    it('should check Cerbos health before reload', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
      });

      const response = await request(app)
        .post('/api/cerbos/reload')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 503 if Cerbos is unavailable', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      const response = await request(app)
        .post('/api/cerbos/reload')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(503);
    });
  });
});