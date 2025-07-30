const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');

describe('AI Assignment Rules Routes', () => {
  let adminToken, refereeToken;
  let ruleId, partnerPrefId;

  beforeAll(async () => {
    // Get admin token
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password'
      });
    adminToken = adminLogin.body.data.token;

    // Get referee token
    const refereeLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'referee1@test.com',
        password: 'password'
      });
    refereeToken = refereeLogin.body.data.token;
  });

  describe('POST /api/ai-assignment-rules', () => {
    it('should create AI assignment rule with algorithmic system', async () => {
      const ruleData = {
        name: 'Test Algorithmic Rule',
        description: 'Test rule for algorithmic assignments',
        enabled: true,
        schedule: {
          type: 'recurring',
          frequency: 'weekly',
          dayOfWeek: 'sunday',
          time: '10:00',
          startDate: '2024-12-01',
          endDate: '2025-03-31'
        },
        criteria: {
          gameTypes: ['Community'],
          ageGroups: ['U12', 'U14'],
          maxDaysAhead: 14,
          minRefereeLevel: 'Rookie',
          prioritizeExperience: true,
          avoidBackToBack: true,
          maxDistance: 25
        },
        aiSystem: {
          type: 'algorithmic',
          algorithmicSettings: {
            distanceWeight: 40,
            skillWeight: 30,
            experienceWeight: 20,
            partnerPreferenceWeight: 10,
            preferredPairs: []
          }
        }
      };

      const response = await request(app)
        .post('/api/ai-assignment-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(ruleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(ruleData.name);
      expect(response.body.data.ai_system_type).toBe('algorithmic');
      expect(response.body.data.distance_weight).toBe(40);
      
      ruleId = response.body.data.id;
    });

    it('should create AI assignment rule with LLM system', async () => {
      const ruleData = {
        name: 'Test LLM Rule',
        description: 'Test rule for LLM assignments',
        enabled: true,
        schedule: {
          type: 'manual'
        },
        criteria: {
          gameTypes: ['Tournament'],
          ageGroups: ['Senior'],
          maxDaysAhead: 30,
          minRefereeLevel: 'Senior',
          prioritizeExperience: true,
          avoidBackToBack: false,
          maxDistance: 50
        },
        aiSystem: {
          type: 'llm',
          llmSettings: {
            model: 'gpt-4o',
            temperature: 0.3,
            contextPrompt: 'Expert referee assignment system',
            includeComments: true
          }
        }
      };

      const response = await request(app)
        .post('/api/ai-assignment-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(ruleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ai_system_type).toBe('llm');
      expect(response.body.data.llm_model).toBe('gpt-4o');
      expect(response.body.data.temperature).toBe('0.3');
    });

    it('should require admin role', async () => {
      const ruleData = {
        name: 'Test Rule',
        aiSystem: { type: 'algorithmic' }
      };

      await request(app)
        .post('/api/ai-assignment-rules')
        .set('Authorization', `Bearer ${refereeToken}`)
        .send(ruleData)
        .expect(403);
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/ai-assignment-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('should validate AI system type', async () => {
      const ruleData = {
        name: 'Test Rule',
        aiSystem: { type: 'invalid' }
      };

      await request(app)
        .post('/api/ai-assignment-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(ruleData)
        .expect(400);
    });
  });

  describe('GET /api/ai-assignment-rules', () => {
    it('should get all AI assignment rules for admin', async () => {
      const response = await request(app)
        .get('/api/ai-assignment-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter rules by enabled status', async () => {
      const response = await request(app)
        .get('/api/ai-assignment-rules?enabled=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(rule => {
        expect(rule.enabled).toBe(true);
      });
    });

    it('should filter rules by AI system type', async () => {
      const response = await request(app)
        .get('/api/ai-assignment-rules?aiSystemType=algorithmic')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(rule => {
        expect(rule.ai_system_type).toBe('algorithmic');
      });
    });

    it('should require admin role', async () => {
      await request(app)
        .get('/api/ai-assignment-rules')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);
    });
  });

  describe('GET /api/ai-assignment-rules/:id', () => {
    it('should get specific rule with partner preferences', async () => {
      const response = await request(app)
        .get(`/api/ai-assignment-rules/${ruleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(ruleId);
      expect(response.body.data).toHaveProperty('partnerPreferences');
    });

    it('should return 404 for non-existent rule', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      await request(app)
        .get(`/api/ai-assignment-rules/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/ai-assignment-rules/:id', () => {
    it('should update AI assignment rule', async () => {
      const updateData = {
        name: 'Updated Test Rule',
        enabled: false,
        criteria: {
          maxDistance: 30
        },
        aiSystem: {
          algorithmicSettings: {
            distanceWeight: 50
          }
        }
      };

      const response = await request(app)
        .put(`/api/ai-assignment-rules/${ruleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Test Rule');
      expect(response.body.data.enabled).toBe(false);
      expect(response.body.data.distance_weight).toBe(50);
    });

    it('should require admin role', async () => {
      await request(app)
        .put(`/api/ai-assignment-rules/${ruleId}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({ name: 'Unauthorized Update' })
        .expect(403);
    });
  });

  describe('POST /api/ai-assignment-rules/:id/partner-preferences', () => {
    it('should add partner preference', async () => {
      // Get referee IDs
      const referees = await db('users')
        .where('role', 'referee')
        .limit(2)
        .select('id');

      const prefData = {
        referee1Id: referees[0].id,
        referee2Id: referees[1].id,
        preferenceType: 'preferred'
      };

      const response = await request(app)
        .post(`/api/ai-assignment-rules/${ruleId}/partner-preferences`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(prefData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.preference_type).toBe('preferred');
      
      partnerPrefId = response.body.data.id;
    });

    it('should prevent duplicate partner preferences', async () => {
      const referees = await db('users')
        .where('role', 'referee')
        .limit(2)
        .select('id');

      const prefData = {
        referee1Id: referees[0].id,
        referee2Id: referees[1].id,
        preferenceType: 'avoid'
      };

      await request(app)
        .post(`/api/ai-assignment-rules/${ruleId}/partner-preferences`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(prefData)
        .expect(409);
    });
  });

  describe('DELETE /api/ai-assignment-rules/:id/partner-preferences/:prefId', () => {
    it('should delete partner preference', async () => {
      await request(app)
        .delete(`/api/ai-assignment-rules/${ruleId}/partner-preferences/${partnerPrefId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('POST /api/ai-assignment-rules/:id/run', () => {
    it('should execute AI assignment rule manually', async () => {
      const response = await request(app)
        .post(`/api/ai-assignment-rules/${ruleId}/run`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dryRun: true,
          gameIds: []
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('runId');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('gamesProcessed');
    });

    it('should handle algorithmic assignment execution', async () => {
      // Create test games first
      const games = await db('games').limit(2).select('id');
      
      const response = await request(app)
        .post(`/api/ai-assignment-rules/${ruleId}/run`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dryRun: false,
          gameIds: games.map(g => g.id)
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.aiSystemUsed).toBe('algorithmic');
    });
  });

  describe('GET /api/ai-assignment-rules/:id/runs', () => {
    it('should get rule run history', async () => {
      const response = await request(app)
        .get(`/api/ai-assignment-rules/${ruleId}/runs`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter runs by status', async () => {
      const response = await request(app)
        .get(`/api/ai-assignment-rules/${ruleId}/runs?status=success`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(run => {
        expect(run.status).toBe('success');
      });
    });
  });

  describe('GET /api/ai-assignment-rules/runs/:runId', () => {
    it('should get detailed run results', async () => {
      // Get a run ID from previous tests
      const runs = await db('ai_assignment_rule_runs')
        .where('rule_id', ruleId)
        .limit(1)
        .select('id');

      if (runs.length > 0) {
        const response = await request(app)
          .get(`/api/ai-assignment-rules/runs/${runs[0].id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('run_details');
        expect(response.body.data).toHaveProperty('ai_system_used');
      }
    });
  });

  describe('POST /api/ai-assignment-rules/:id/toggle', () => {
    it('should toggle rule enabled status', async () => {
      const response = await request(app)
        .post(`/api/ai-assignment-rules/${ruleId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(true); // Should be toggled back to true
    });
  });

  describe('DELETE /api/ai-assignment-rules/:id', () => {
    it('should delete AI assignment rule', async () => {
      await request(app)
        .delete(`/api/ai-assignment-rules/${ruleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify rule is deleted
      await request(app)
        .get(`/api/ai-assignment-rules/${ruleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should require admin role', async () => {
      await request(app)
        .delete(`/api/ai-assignment-rules/${ruleId}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);
    });
  });

  describe('AI Algorithm Integration Tests', () => {
    let algorithmicRuleId, llmRuleId;

    beforeAll(async () => {
      // Create algorithmic rule
      const algRule = await request(app)
        .post('/api/ai-assignment-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Algorithm Test Rule',
          aiSystem: {
            type: 'algorithmic',
            algorithmicSettings: {
              distanceWeight: 50,
              skillWeight: 25,
              experienceWeight: 15,
              partnerPreferenceWeight: 10
            }
          }
        });
      algorithmicRuleId = algRule.body.data.id;

      // Create LLM rule
      const llmRule = await request(app)
        .post('/api/ai-assignment-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'LLM Test Rule',
          aiSystem: {
            type: 'llm',
            llmSettings: {
              model: 'gpt-4o',
              temperature: 0.2,
              contextPrompt: 'Assign referees considering experience and location',
              includeComments: true
            }
          }
        });
      llmRuleId = llmRule.body.data.id;
    });

    it('should execute algorithmic assignment with proper scoring', async () => {
      const response = await request(app)
        .post(`/api/ai-assignment-rules/${algorithmicRuleId}/run`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ dryRun: true })
        .expect(200);

      expect(response.body.data.aiSystemUsed).toBe('algorithmic');
      expect(response.body.data).toHaveProperty('algorithmicScores');
    });

    it('should execute LLM assignment with context', async () => {
      const response = await request(app)
        .post(`/api/ai-assignment-rules/${llmRuleId}/run`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          dryRun: true,
          contextComments: ['John prefers downtown games', 'Sarah works well with experienced refs']
        })
        .expect(200);

      expect(response.body.data.aiSystemUsed).toBe('llm');
      expect(response.body.data).toHaveProperty('llmAnalysis');
    });

    afterAll(async () => {
      // Cleanup
      await db('ai_assignment_rules').whereIn('id', [algorithmicRuleId, llmRuleId]).del();
    });
  });
});