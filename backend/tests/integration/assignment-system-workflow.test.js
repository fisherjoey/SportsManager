const request = require('supertest');
const app = require('../../src/app');
const db = require('../setup');

describe('Assignment System Workflow Integration', () => {
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

    // Create test games for the workflow
    await createTestGames();
  });

  async function createTestGames() {
    const testGames = [
      {
        home_team_name: 'Workflow Team A1',
        away_team_name: 'Workflow Team B1',
        game_date: '2024-08-17',
        game_time: '10:00',
        location: 'Integration Test Complex',
        level: 'Competitive',
        pay_rate: 80,
        postal_code: 'M1A1A1'
      },
      {
        home_team_name: 'Workflow Team A2',
        away_team_name: 'Workflow Team B2',
        game_date: '2024-08-17',
        game_time: '12:00',
        location: 'Integration Test Complex',
        level: 'Competitive',
        pay_rate: 80,
        postal_code: 'M1A1A1'
      },
      {
        home_team_name: 'Workflow Team A3',
        away_team_name: 'Workflow Team B3',
        game_date: '2024-08-17',
        game_time: '14:00',
        location: 'Integration Test Complex',
        level: 'Recreational',
        pay_rate: 60,
        postal_code: 'M1A1A1'
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

  describe('Complete Assignment Workflow', () => {
    it('should complete full workflow: games → AI suggestions → chunks → assignments', async () => {
      // Step 1: Verify games are created and unassigned
      const gamesResponse = await request(app)
        .get('/api/games?status=unassigned')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(gamesResponse.body.success).toBe(true);
      const unassignedGames = gamesResponse.body.data.games.filter(g => 
        gameIds.includes(g.id)
      );
      expect(unassignedGames.length).toBe(3);

      // Step 2: Generate AI suggestions for the games
      const aiSuggestionsResponse = await request(app)
        .post('/api/assignments/ai-suggestions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_ids: gameIds,
          factors: {
            proximity_weight: 0.3,
            availability_weight: 0.4,
            experience_weight: 0.2,
            performance_weight: 0.1
          }
        });

      expect(aiSuggestionsResponse.body.success).toBe(true);
      expect(aiSuggestionsResponse.body.data.suggestions.length).toBeGreaterThan(0);
      
      const suggestions = aiSuggestionsResponse.body.data.suggestions;
      const firstSuggestion = suggestions[0];

      // Step 3: Accept one AI suggestion
      const acceptResponse = await request(app)
        .put(`/api/assignments/ai-suggestions/${firstSuggestion.id}/accept`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(acceptResponse.body.success).toBe(true);
      expect(acceptResponse.body.data.assignment).toBeDefined();

      // Step 4: Create a chunk with remaining games
      const remainingGameIds = gameIds.filter(id => id !== firstSuggestion.game_id);
      const chunkResponse = await request(app)
        .post('/api/chunks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Integration Workflow Chunk',
          game_ids: remainingGameIds,
          notes: 'Created from integration test workflow'
        });

      expect(chunkResponse.body.success).toBe(true);
      const chunk = chunkResponse.body.data.chunk;
      expect(chunk.game_count).toBe(remainingGameIds.length);

      // Step 5: Assign the chunk to a referee
      const chunkAssignResponse = await request(app)
        .post(`/api/chunks/${chunk.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          referee_id: refereeUserId,
          position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b'
        });

      expect(chunkAssignResponse.body.success).toBe(true);
      expect(chunkAssignResponse.body.data.assignments_created).toBe(remainingGameIds.length);

      // Step 6: Verify all games are now assigned
      const finalGamesCheck = await request(app)
        .get(`/api/games?id=${gameIds.join(',')}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(finalGamesCheck.body.success).toBe(true);
      finalGamesCheck.body.data.games.forEach(game => {
        expect(game.status).toBe('assigned');
      });

      // Step 7: Check assignments were created correctly
      const assignmentsResponse = await request(app)
        .get('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(assignmentsResponse.body.success).toBe(true);
      const gameAssignments = assignmentsResponse.body.data.assignments.filter(a => 
        gameIds.includes(a.gameId)
      );
      expect(gameAssignments.length).toBe(3);
    });

    it('should handle historic pattern application workflow', async () => {
      // Step 1: Create historic assignment data
      await createHistoricData();

      // Step 2: Analyze patterns
      const patternsResponse = await request(app)
        .get('/api/assignments/patterns')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(patternsResponse.body.success).toBe(true);
      expect(patternsResponse.body.data.patterns.length).toBeGreaterThan(0);

      const pattern = patternsResponse.body.data.patterns[0];

      // Step 3: Create matching games for pattern application
      const matchingGameResponse = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          home_team_name: 'Pattern Match A',
          away_team_name: 'Pattern Match B',
          game_date: '2024-08-24', // Saturday
          game_time: '10:00',
          location: 'Integration Test Complex',
          level: 'Competitive',
          pay_rate: 80
        });

      const matchingGameId = matchingGameResponse.body.data.game.id;

      // Step 4: Apply the pattern
      const applyPatternResponse = await request(app)
        .post('/api/assignments/patterns/apply')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          pattern_id: pattern.id,
          game_ids: [matchingGameId],
          override_conflicts: false
        });

      expect(applyPatternResponse.body.success).toBe(true);
      expect(applyPatternResponse.body.data.assignments_created).toBe(1);

      // Step 5: Verify assignment was created based on pattern
      const assignmentCheck = await db('game_assignments')
        .where({ game_id: matchingGameId })
        .first();
      
      expect(assignmentCheck).toBeDefined();
      expect(assignmentCheck.user_id).toBe(pattern.referee_id);
    });

    it('should handle conflict detection and resolution', async () => {
      // Step 1: Create overlapping games
      const game1Response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          home_team_name: 'Conflict A1',
          away_team_name: 'Conflict B1',
          game_date: '2024-08-20',
          game_time: '14:00',
          location: 'Location A',
          level: 'Competitive',
          pay_rate: 75
        });

      const game2Response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          home_team_name: 'Conflict A2',
          away_team_name: 'Conflict B2',
          game_date: '2024-08-20',
          game_time: '14:30', // Overlapping time
          location: 'Location B',
          level: 'Competitive',
          pay_rate: 75
        });

      const game1Id = game1Response.body.data.game.id;
      const game2Id = game2Response.body.data.game.id;

      // Step 2: Assign first game
      const firstAssignResponse = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_id: game1Id,
          user_id: refereeUserId,
          position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b'
        });

      expect(firstAssignResponse.body.success).toBe(true);

      // Step 3: Try to assign same referee to overlapping game
      const conflictAssignResponse = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_id: game2Id,
          user_id: refereeUserId,
          position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b'
        });

      expect(conflictAssignResponse.status).toBe(409);
      expect(conflictAssignResponse.body.success).toBe(false);
      expect(conflictAssignResponse.body.error).toContain('conflict');

      // Step 4: Generate AI suggestions should avoid conflicted referee
      const aiResponse = await request(app)
        .post('/api/assignments/ai-suggestions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_ids: [game2Id]
        });

      expect(aiResponse.body.success).toBe(true);
      // Should suggest different referees due to conflict
      const conflictedSuggestions = aiResponse.body.data.suggestions.filter(s => 
        s.referee_id === refereeUserId
      );
      expect(conflictedSuggestions.length).toBe(0);
    });

    it('should handle end-to-end chunk workflow with validation', async () => {
      // Step 1: Try to create invalid chunk (different locations)
      const differentLocationGameResponse = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          home_team_name: 'Different A',
          away_team_name: 'Different B',
          game_date: '2024-08-17',
          game_time: '16:00',
          location: 'Different Complex',
          level: 'Competitive',
          pay_rate: 80
        });

      const differentGameId = differentLocationGameResponse.body.data.game.id;

      const invalidChunkResponse = await request(app)
        .post('/api/chunks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Mixed Location Chunk',
          game_ids: [gameIds[0], differentGameId]
        });

      expect(invalidChunkResponse.status).toBe(400);
      expect(invalidChunkResponse.body.error).toContain('same location and date');

      // Step 2: Create valid chunk
      const validChunkResponse = await request(app)
        .post('/api/chunks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Valid Workflow Chunk',
          game_ids: gameIds.slice(0, 2)
        });

      expect(validChunkResponse.body.success).toBe(true);
      const chunkId = validChunkResponse.body.data.chunk.id;

      // Step 3: Auto-create additional chunks
      const autoChunkResponse = await request(app)
        .post('/api/chunks/auto-create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          criteria: {
            group_by: 'location_date',
            min_games: 1,
            max_time_gap: 300
          },
          date_range: {
            start_date: '2024-08-17',
            end_date: '2024-08-17'
          }
        });

      expect(autoChunkResponse.body.success).toBe(true);

      // Step 4: Assign and then try to delete assigned chunk
      await request(app)
        .post(`/api/chunks/${chunkId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          referee_id: refereeUserId,
          position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b'
        });

      const deleteAssignedResponse = await request(app)
        .delete(`/api/chunks/${chunkId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteAssignedResponse.status).toBe(400);
      expect(deleteAssignedResponse.body.error).toContain('assigned');

      // Step 5: Force delete with cleanup
      const forceDeleteResponse = await request(app)
        .delete(`/api/chunks/${chunkId}?force=true`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(forceDeleteResponse.body.success).toBe(true);
      expect(forceDeleteResponse.body.data.assignments_removed).toBeGreaterThan(0);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large number of games efficiently', async () => {
      // Create many games
      const manyGameIds = [];
      for (let i = 0; i < 20; i++) {
        const gameResponse = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            home_team_name: `Perf Team A${i}`,
            away_team_name: `Perf Team B${i}`,
            game_date: '2024-08-25',
            game_time: `${String(10 + Math.floor(i/2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`,
            location: 'Performance Test Complex',
            level: 'Competitive',
            pay_rate: 75
          });
        manyGameIds.push(gameResponse.body.data.game.id);
      }

      // Generate AI suggestions for all games
      const startTime = Date.now();
      const aiResponse = await request(app)
        .post('/api/assignments/ai-suggestions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_ids: manyGameIds
        });
      const aiTime = Date.now() - startTime;

      expect(aiResponse.body.success).toBe(true);
      expect(aiTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Auto-create chunks for all games
      const chunkStartTime = Date.now();
      const autoChunkResponse = await request(app)
        .post('/api/chunks/auto-create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          criteria: {
            group_by: 'location_date',
            min_games: 3,
            max_time_gap: 120
          },
          date_range: {
            start_date: '2024-08-25',
            end_date: '2024-08-25'
          }
        });
      const chunkTime = Date.now() - chunkStartTime;

      expect(autoChunkResponse.body.success).toBe(true);
      expect(chunkTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle empty datasets gracefully', async () => {
      // Try to generate AI suggestions with no games
      const emptyAiResponse = await request(app)
        .post('/api/assignments/ai-suggestions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_ids: []
        });

      expect(emptyAiResponse.status).toBe(400);

      // Try to get patterns with no historic data
      await db('game_assignments').del(); // Clear all assignments
      
      const emptyPatternsResponse = await request(app)
        .get('/api/assignments/patterns')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(emptyPatternsResponse.body.success).toBe(true);
      expect(emptyPatternsResponse.body.data.patterns.length).toBe(0);
    });
  });

  async function createHistoricData() {
    // Create some past assignments to establish patterns
    const pastDates = ['2024-07-06', '2024-07-13', '2024-07-20', '2024-07-27']; // Saturdays

    for (let i = 0; i < pastDates.length; i++) {
      const gameResponse = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          home_team_name: `Historic A${i}`,
          away_team_name: `Historic B${i}`,
          game_date: pastDates[i],
          game_time: '10:00',
          location: 'Integration Test Complex',
          level: 'Competitive',
          pay_rate: 80
        });

      if (gameResponse.body.success) {
        await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            game_id: gameResponse.body.data.game.id,
            user_id: refereeUserId,
            position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b'
          });

        // Mark as completed to establish pattern
        await db('game_assignments')
          .where({ 
            game_id: gameResponse.body.data.game.id,
            user_id: refereeUserId 
          })
          .update({ status: 'completed' });
      }
    }
  }
});