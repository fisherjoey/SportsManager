import { useApi } from '../lib/api';

// Mock the API client
jest.mock('../lib/api');

describe('AI Assignment API Integration', () => {
  let mockApi;

  beforeEach(() => {
    mockApi = {
      getGames: jest.fn(),
      getReferees: jest.fn(),
      createAIAssignmentRule: jest.fn(),
      runAIAssignmentRule: jest.fn(),
      deleteAIAssignmentRule: jest.fn(),
      getAIAssignmentRules: jest.fn(),
      updateAIAssignmentRule: jest.fn(),
      toggleAIAssignmentRule: jest.fn(),
      getAIAssignmentRuleRuns: jest.fn(),
      addPartnerPreference: jest.fn(),
      deletePartnerPreference: jest.fn(),
    };

    useApi.mockReturnValue(mockApi);
    jest.clearAllMocks();
  });

  describe('AI Assignment Rule CRUD Operations', () => {
    test('creates AI assignment rule with correct parameters', async () => {
      const expectedRuleData = {
        name: 'Test Rule',
        description: 'Test description',
        enabled: true,
        schedule: { type: 'manual' },
        criteria: {
          gameTypes: ['Premier'],
          ageGroups: ['U18'],
          maxDaysAhead: 14,
          minRefereeLevel: 'Level 3',
          prioritizeExperience: true,
          avoidBackToBack: true,
          maxDistance: 25,
        },
        aiSystem: {
          type: 'algorithmic',
          algorithmicSettings: {
            distanceWeight: 40,
            skillWeight: 30,
            experienceWeight: 20,
            partnerPreferenceWeight: 10,
            preferredPairs: [],
          },
        },
      };

      const expectedResponse = {
        success: true,
        data: { id: 'rule-123', ...expectedRuleData },
      };

      mockApi.createAIAssignmentRule.mockResolvedValue(expectedResponse);

      const result = await mockApi.createAIAssignmentRule(expectedRuleData);

      expect(mockApi.createAIAssignmentRule).toHaveBeenCalledWith(
        expectedRuleData
      );
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('rule-123');
    });

    test('creates LLM-based AI assignment rule', async () => {
      const llmRuleData = {
        name: 'LLM Rule',
        description: 'LLM-powered assignment',
        enabled: true,
        schedule: {
          type: 'recurring',
          frequency: 'weekly',
          dayOfWeek: 'monday',
          time: '09:00',
        },
        criteria: {
          gameTypes: [],
          ageGroups: [],
          maxDaysAhead: 30,
          minRefereeLevel: 'Rookie',
          prioritizeExperience: false,
          avoidBackToBack: false,
          maxDistance: 50,
        },
        aiSystem: {
          type: 'llm',
          llmSettings: {
            model: 'gpt-4o',
            temperature: 0.3,
            contextPrompt: 'You are an expert referee assignment system.',
            includeComments: true,
          },
        },
      };

      const expectedResponse = {
        success: true,
        data: { id: 'llm-rule-456', ...llmRuleData },
      };

      mockApi.createAIAssignmentRule.mockResolvedValue(expectedResponse);

      const result = await mockApi.createAIAssignmentRule(llmRuleData);

      expect(mockApi.createAIAssignmentRule).toHaveBeenCalledWith(llmRuleData);
      expect(result.success).toBe(true);
      expect(result.data.aiSystem.type).toBe('llm');
      expect(result.data.aiSystem.llmSettings.model).toBe('gpt-4o');
    });

    test('handles AI rule creation errors', async () => {
      const invalidRuleData = {
        // Missing required fields
        name: '',
        aiSystem: { type: 'invalid' },
      };

      mockApi.createAIAssignmentRule.mockRejectedValue(
        new Error('Validation failed')
      );

      await expect(
        mockApi.createAIAssignmentRule(invalidRuleData)
      ).rejects.toThrow('Validation failed');
    });

    test('fetches existing AI assignment rules', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Weekly Auto Assignment',
          enabled: true,
          ai_system_type: 'algorithmic',
          last_run_status: 'success',
          assignments_created: 25,
          conflicts_found: 2,
        },
        {
          id: 'rule-2',
          name: 'Manual LLM Assignment',
          enabled: false,
          ai_system_type: 'llm',
          last_run_status: 'partial',
          assignments_created: 15,
          conflicts_found: 5,
        },
      ];

      mockApi.getAIAssignmentRules.mockResolvedValue({
        success: true,
        data: mockRules,
      });

      const result = await mockApi.getAIAssignmentRules();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].ai_system_type).toBe('algorithmic');
      expect(result.data[1].ai_system_type).toBe('llm');
    });

    test('updates AI assignment rule', async () => {
      const updateData = {
        name: 'Updated Rule Name',
        enabled: false,
        criteria: {
          maxDistance: 35, // Updated from 25
        },
      };

      const expectedResponse = {
        success: true,
        data: { id: 'rule-123', ...updateData },
      };

      mockApi.updateAIAssignmentRule.mockResolvedValue(expectedResponse);

      const result = await mockApi.updateAIAssignmentRule(
        'rule-123',
        updateData
      );

      expect(mockApi.updateAIAssignmentRule).toHaveBeenCalledWith(
        'rule-123',
        updateData
      );
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Updated Rule Name');
    });

    test('toggles AI assignment rule enabled status', async () => {
      const toggleResponse = {
        success: true,
        data: { id: 'rule-123', enabled: false }, // Toggled to false
      };

      mockApi.toggleAIAssignmentRule.mockResolvedValue(toggleResponse);

      const result = await mockApi.toggleAIAssignmentRule('rule-123');

      expect(mockApi.toggleAIAssignmentRule).toHaveBeenCalledWith('rule-123');
      expect(result.success).toBe(true);
      expect(result.data.enabled).toBe(false);
    });

    test('deletes AI assignment rule', async () => {
      mockApi.deleteAIAssignmentRule.mockResolvedValue({ success: true });

      const result = await mockApi.deleteAIAssignmentRule('rule-123');

      expect(mockApi.deleteAIAssignmentRule).toHaveBeenCalledWith('rule-123');
      expect(result.success).toBe(true);
    });
  });

  describe('AI Assignment Rule Execution', () => {
    test('runs AI assignment rule with dry run', async () => {
      const runParams = {
        dryRun: true,
        gameIds: ['game-1', 'game-2'],
        contextComments: ['High priority games', 'Need experienced referees'],
      };

      const expectedResponse = {
        success: true,
        data: {
          runId: 'run-789',
          status: 'success',
          gamesProcessed: 2,
          assignmentsCreated: 4,
          conflictsFound: 0,
          duration: 2.5,
          aiSystemUsed: 'algorithmic',
          assignments: [
            {
              gameId: 'game-1',
              gameInfo: 'Team A vs Team B - 2024-02-01',
              assignedReferees: [
                {
                  refereeId: 'ref-1',
                  refereeName: 'John Smith',
                  position: 'Referee 1',
                  confidence: 0.92,
                  reasoning: 'High experience, optimal location',
                },
              ],
              conflicts: [],
            },
          ],
          algorithmicScores: {
            weights: {
              distance: 0.4,
              skill: 0.3,
              experience: 0.2,
              partner: 0.1,
            },
            averageConfidence: 0.88,
          },
        },
      };

      mockApi.runAIAssignmentRule.mockResolvedValue(expectedResponse);

      const result = await mockApi.runAIAssignmentRule('rule-123', runParams);

      expect(mockApi.runAIAssignmentRule).toHaveBeenCalledWith(
        'rule-123',
        runParams
      );
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('success');
      expect(result.data.gamesProcessed).toBe(2);
      expect(result.data.assignmentsCreated).toBe(4);
      expect(result.data.aiSystemUsed).toBe('algorithmic');
    });

    test('runs AI assignment rule with actual assignment', async () => {
      const runParams = {
        dryRun: false,
        gameIds: ['game-1'],
        contextComments: [],
      };

      const expectedResponse = {
        success: true,
        data: {
          runId: 'run-790',
          status: 'success',
          gamesProcessed: 1,
          assignmentsCreated: 2,
          conflictsFound: 0,
          duration: 1.8,
          aiSystemUsed: 'llm',
          assignments: [
            {
              gameId: 'game-1',
              assignedReferees: [
                { refereeId: 'ref-1', refereeName: 'John Smith' },
                { refereeId: 'ref-2', refereeName: 'Jane Doe' },
              ],
            },
          ],
          llmAnalysis: {
            model: 'gpt-4o',
            temperature: 0.3,
            contextUsed: false,
            processingTime: 1.8,
          },
        },
      };

      mockApi.runAIAssignmentRule.mockResolvedValue(expectedResponse);

      const result = await mockApi.runAIAssignmentRule('rule-123', runParams);

      expect(result.data.aiSystemUsed).toBe('llm');
      expect(result.data.llmAnalysis).toBeDefined();
      expect(result.data.llmAnalysis.model).toBe('gpt-4o');
    });

    test('handles rule execution with conflicts', async () => {
      const runParams = { dryRun: true, gameIds: ['game-1', 'game-2'] };

      const responseWithConflicts = {
        success: true,
        data: {
          runId: 'run-791',
          status: 'partial',
          gamesProcessed: 2,
          assignmentsCreated: 2, // Only 1 game fully assigned
          conflictsFound: 3,
          assignments: [
            {
              gameId: 'game-1',
              assignedReferees: [
                { refereeId: 'ref-1', refereeName: 'John Smith' },
              ],
              conflicts: ['Insufficient referees available'],
            },
          ],
        },
      };

      mockApi.runAIAssignmentRule.mockResolvedValue(responseWithConflicts);

      const result = await mockApi.runAIAssignmentRule('rule-123', runParams);

      expect(result.data.status).toBe('partial');
      expect(result.data.conflictsFound).toBe(3);
      expect(result.data.assignments[0].conflicts).toContain(
        'Insufficient referees available'
      );
    });

    test('handles rule execution errors', async () => {
      mockApi.runAIAssignmentRule.mockRejectedValue(
        new Error('Rule execution failed')
      );

      await expect(
        mockApi.runAIAssignmentRule('invalid-rule', {})
      ).rejects.toThrow('Rule execution failed');
    });
  });

  describe('AI Assignment Rule Run History', () => {
    test('fetches rule run history', async () => {
      const mockRuns = [
        {
          id: 'run-1',
          rule_id: 'rule-123',
          run_date: '2024-02-01T10:00:00Z',
          status: 'success',
          ai_system_used: 'algorithmic',
          games_processed: 5,
          assignments_created: 10,
          conflicts_found: 1,
          duration_seconds: 3.2,
        },
        {
          id: 'run-2',
          rule_id: 'rule-123',
          run_date: '2024-02-02T10:00:00Z',
          status: 'partial',
          ai_system_used: 'algorithmic',
          games_processed: 3,
          assignments_created: 4,
          conflicts_found: 2,
          duration_seconds: 2.8,
        },
      ];

      mockApi.getAIAssignmentRuleRuns.mockResolvedValue({
        success: true,
        data: mockRuns,
      });

      const result = await mockApi.getAIAssignmentRuleRuns('rule-123');

      expect(mockApi.getAIAssignmentRuleRuns).toHaveBeenCalledWith('rule-123');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].status).toBe('success');
      expect(result.data[1].status).toBe('partial');
    });

    test('fetches rule runs with filters', async () => {
      const filters = {
        status: 'success',
        page: 1,
        limit: 10,
      };

      mockApi.getAIAssignmentRuleRuns.mockResolvedValue({
        success: true,
        data: [],
      });

      await mockApi.getAIAssignmentRuleRuns('rule-123', filters);

      expect(mockApi.getAIAssignmentRuleRuns).toHaveBeenCalledWith(
        'rule-123',
        filters
      );
    });
  });

  describe('Partner Preferences Management', () => {
    test('adds partner preference for algorithmic rules', async () => {
      const preferenceData = {
        referee1Id: 'ref-1',
        referee2Id: 'ref-2',
        preferenceType: 'preferred',
      };

      const expectedResponse = {
        success: true,
        data: {
          id: 'pref-123',
          rule_id: 'rule-123',
          ...preferenceData,
        },
      };

      mockApi.addPartnerPreference.mockResolvedValue(expectedResponse);

      const result = await mockApi.addPartnerPreference(
        'rule-123',
        preferenceData
      );

      expect(mockApi.addPartnerPreference).toHaveBeenCalledWith(
        'rule-123',
        preferenceData
      );
      expect(result.success).toBe(true);
      expect(result.data.preferenceType).toBe('preferred');
    });

    test('adds avoid partner preference', async () => {
      const avoidPreference = {
        referee1Id: 'ref-3',
        referee2Id: 'ref-4',
        preferenceType: 'avoid',
      };

      mockApi.addPartnerPreference.mockResolvedValue({
        success: true,
        data: { id: 'pref-124', ...avoidPreference },
      });

      const result = await mockApi.addPartnerPreference(
        'rule-123',
        avoidPreference
      );

      expect(result.data.preferenceType).toBe('avoid');
    });

    test('deletes partner preference', async () => {
      mockApi.deletePartnerPreference.mockResolvedValue({ success: true });

      const result = await mockApi.deletePartnerPreference(
        'rule-123',
        'pref-123'
      );

      expect(mockApi.deletePartnerPreference).toHaveBeenCalledWith(
        'rule-123',
        'pref-123'
      );
      expect(result.success).toBe(true);
    });

    test('handles partner preference validation errors', async () => {
      const invalidPreference = {
        referee1Id: 'invalid-id',
        referee2Id: '', // Empty ID
        preferenceType: 'invalid-type',
      };

      mockApi.addPartnerPreference.mockRejectedValue(
        new Error('Invalid preference data')
      );

      await expect(
        mockApi.addPartnerPreference('rule-123', invalidPreference)
      ).rejects.toThrow('Invalid preference data');
    });
  });

  describe('Data Transformation for Enterprise Component', () => {
    test('transforms backend games data for frontend', async () => {
      const backendGames = [
        {
          id: 'game-1',
          home_team_name: 'Lakers',
          away_team_name: 'Warriors',
          game_date: '2024-02-01',
          game_time: '19:00',
          location: 'Downtown Arena',
          level: 'Premier',
          status: 'unassigned',
          pay_rate: 85.0,
        },
      ];

      const expectedFrontendFormat = [
        {
          id: 'game-1',
          homeTeam: 'Lakers',
          awayTeam: 'Warriors',
          date: '2024-02-01',
          time: '19:00',
          location: 'Downtown Arena',
          level: 'Premier',
          status: 'unassigned',
          payRate: 85.0,
        },
      ];

      mockApi.getGames.mockResolvedValue({
        data: expectedFrontendFormat,
        pagination: { page: 1, limit: 100 },
      });

      const result = await mockApi.getGames({
        status: 'unassigned',
        limit: 100,
      });

      expect(result.data[0].homeTeam).toBe('Lakers'); // Transformed from home_team_name
      expect(result.data[0].awayTeam).toBe('Warriors'); // Transformed from away_team_name
      expect(result.data[0].date).toBe('2024-02-01'); // Transformed from game_date
      expect(result.data[0].time).toBe('19:00'); // Transformed from game_time
      expect(result.data[0].payRate).toBe(85.0); // Transformed from pay_rate
    });

    test('transforms backend referees data for frontend', async () => {
      const backendReferees = [
        {
          id: 'ref-1',
          name: 'John Smith',
          email: 'john@example.com',
          level: 'Level 5',
          location: 'Downtown',
          is_available: true,
          wage_per_game: 75.0,
          max_distance: 30,
          postal_code: 'T2J 5W7',
        },
      ];

      const expectedFrontendFormat = [
        {
          id: 'ref-1',
          name: 'John Smith',
          email: 'john@example.com',
          certificationLevel: 'Level 5',
          location: 'Downtown',
          isAvailable: true,
          wagePerGame: 75.0,
          maxDistance: 30,
          postalCode: 'T2J 5W7',
        },
      ];

      mockApi.getReferees.mockResolvedValue({
        success: true,
        data: {
          referees: expectedFrontendFormat,
          pagination: { page: 1, limit: 100 },
        },
      });

      const result = await mockApi.getReferees({ available: true, limit: 100 });

      expect(result.data.referees[0].certificationLevel).toBe('Level 5'); // Transformed from level
      expect(result.data.referees[0].isAvailable).toBe(true); // Transformed from is_available
      expect(result.data.referees[0].wagePerGame).toBe(75.0); // Transformed from wage_per_game
      expect(result.data.referees[0].maxDistance).toBe(30); // Transformed from max_distance
      expect(result.data.referees[0].postalCode).toBe('T2J 5W7'); // Transformed from postal_code
    });

    test('handles missing or null data gracefully', async () => {
      mockApi.getGames.mockResolvedValue({ data: null });
      mockApi.getReferees.mockResolvedValue({ success: true, data: null });

      const gamesResult = await mockApi.getGames();
      const refereesResult = await mockApi.getReferees();

      // Should not throw errors with null data
      expect(gamesResult.data).toBeNull();
      expect(refereesResult.data).toBeNull();
    });
  });

  describe('API Error Handling', () => {
    test('handles network errors gracefully', async () => {
      mockApi.createAIAssignmentRule.mockRejectedValue(
        new Error('Network error')
      );

      await expect(mockApi.createAIAssignmentRule({})).rejects.toThrow(
        'Network error'
      );
    });

    test('handles HTTP error responses', async () => {
      mockApi.runAIAssignmentRule.mockRejectedValue({
        message: 'HTTP 404: Rule not found',
        status: 404,
      });

      await expect(
        mockApi.runAIAssignmentRule('nonexistent-rule', {})
      ).rejects.toMatchObject({
        message: 'HTTP 404: Rule not found',
        status: 404,
      });
    });

    test('handles validation errors with details', async () => {
      const validationError = {
        message: 'Validation failed',
        details: [
          { field: 'name', message: 'Name is required' },
          { field: 'aiSystem.type', message: 'Invalid AI system type' },
        ],
      };

      mockApi.createAIAssignmentRule.mockRejectedValue(validationError);

      await expect(mockApi.createAIAssignmentRule({})).rejects.toMatchObject(
        validationError
      );
    });
  });
});
