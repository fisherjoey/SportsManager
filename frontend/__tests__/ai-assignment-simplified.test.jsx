import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AIAssignmentsEnterprise } from '../components/ai-assignments-enterprise';
import { useApi } from '../lib/api';

// Mock dependencies
jest.mock('../lib/api');

const mockApi = {
  getGames: jest.fn(),
  getReferees: jest.fn(),
  createAIAssignmentRule: jest.fn(),
  runAIAssignmentRule: jest.fn(),
  deleteAIAssignmentRule: jest.fn(),
};

beforeEach(() => {
  useApi.mockReturnValue(mockApi);
  jest.clearAllMocks();

  // Mock successful data loading
  mockApi.getGames.mockResolvedValue({
    data: [
      {
        id: '1',
        homeTeam: 'Lakers',
        awayTeam: 'Warriors',
        status: 'unassigned',
        division: 'Premier',
      },
      {
        id: '2',
        homeTeam: 'Bulls',
        awayTeam: 'Celtics',
        status: 'unassigned',
        division: 'Premier',
      },
    ],
  });

  mockApi.getReferees.mockResolvedValue({
    success: true,
    data: {
      referees: [
        {
          id: 'ref-1',
          name: 'John Smith',
          certificationLevel: 'Level 5',
          isAvailable: true,
        },
        {
          id: 'ref-2',
          name: 'Sarah Johnson',
          certificationLevel: 'Level 4',
          isAvailable: true,
        },
      ],
    },
  });

  // Mock AI operations
  mockApi.createAIAssignmentRule.mockResolvedValue({
    success: true,
    data: { id: 'test-rule' },
  });
  mockApi.runAIAssignmentRule.mockResolvedValue({
    success: true,
    data: {
      assignments: [
        {
          gameId: '1',
          assignedReferees: [
            {
              refereeId: 'ref-1',
              refereeName: 'John Smith',
              confidence: 0.92,
              position: 'Referee 1',
            },
          ],
          conflicts: [],
        },
      ],
      conflictsFound: 0,
      algorithmicScores: { averageConfidence: 0.92 },
    },
  });
  mockApi.deleteAIAssignmentRule.mockResolvedValue({ success: true });
});

describe('AI Assignments Enterprise - Simplified Tests', () => {
  describe('Component Loading and Basic Functionality', () => {
    test('renders enterprise AI title and description', async () => {
      render(<AIAssignmentsEnterprise />);

      await waitFor(() => {
        expect(
          screen.getByText('Enterprise AI Assignment Engine')
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            'Intelligent bulk referee assignment system for large-scale operations'
          )
        ).toBeInTheDocument();
        expect(screen.getByText('Enterprise Scale')).toBeInTheDocument();
      });
    });

    test('loads and displays games and referees data', async () => {
      render(<AIAssignmentsEnterprise />);

      await waitFor(() => {
        expect(mockApi.getGames).toHaveBeenCalledWith({
          status: 'unassigned',
          limit: 100,
        });
        expect(mockApi.getReferees).toHaveBeenCalledWith({
          available: true,
          limit: 100,
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Unassigned Games')).toBeInTheDocument();
        expect(screen.getByText('Available Referees')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument(); // Should show 2 for both games and referees
      });
    });

    test('displays all four main tabs', async () => {
      render(<AIAssignmentsEnterprise />);

      await waitFor(() => {
        expect(screen.getByText('Bulk Assignment')).toBeInTheDocument();
        expect(screen.getByText('Optimization Settings')).toBeInTheDocument();
        expect(screen.getByText('Assignment Results')).toBeInTheDocument();
        expect(screen.getByText('Performance Analytics')).toBeInTheDocument();
      });
    });

    test('can switch between tabs', async () => {
      render(<AIAssignmentsEnterprise />);

      await waitFor(() => {
        const optimizationTab = screen.getByText('Optimization Settings');
        fireEvent.click(optimizationTab);
        expect(screen.getByText('Optimization Parameters')).toBeInTheDocument();
      });

      const resultsTab = screen.getByText('Assignment Results');
      fireEvent.click(resultsTab);
      expect(screen.getByText('No Assignment Results')).toBeInTheDocument();

      const analyticsTab = screen.getByText('Performance Analytics');
      fireEvent.click(analyticsTab);
      expect(screen.getByText('System Capabilities')).toBeInTheDocument();
    });
  });

  describe('Bulk Assignment Workflow', () => {
    test('shows bulk assignment interface with scope options', async () => {
      render(<AIAssignmentsEnterprise />);

      await waitFor(() => {
        expect(
          screen.getByText('Enterprise Bulk Assignment')
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            'Assign up to 300+ games simultaneously with advanced optimization algorithms'
          )
        ).toBeInTheDocument();
        expect(
          screen.getByLabelText(/All Unassigned Games/)
        ).toBeInTheDocument();
        expect(screen.getByLabelText(/Selected Games/)).toBeInTheDocument();
      });
    });

    test('executes bulk assignment successfully', async () => {
      render(<AIAssignmentsEnterprise />);

      const generateButton = await screen.findByText(
        'Generate Bulk Assignments'
      );
      fireEvent.click(generateButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/Processing 2 Games.../)).toBeInTheDocument();
      });

      // Should complete and show apply button
      await waitFor(
        () => {
          expect(screen.getByText('Apply All Assignments')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Verify API calls were made
      expect(mockApi.createAIAssignmentRule).toHaveBeenCalled();
      expect(mockApi.runAIAssignmentRule).toHaveBeenCalled();
      expect(mockApi.deleteAIAssignmentRule).toHaveBeenCalled();
    });

    test('handles backend failure gracefully with fallback', async () => {
      // Force backend failure
      mockApi.createAIAssignmentRule.mockRejectedValue(
        new Error('Backend unavailable')
      );

      const consoleSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      render(<AIAssignmentsEnterprise />);

      const generateButton = await screen.findByText(
        'Generate Bulk Assignments'
      );
      fireEvent.click(generateButton);

      // Should still complete using fallback
      await waitFor(
        () => {
          expect(screen.getByText('Apply All Assignments')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Backend AI assignment failed, using fallback algorithm:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Game Selection and Interaction', () => {
    test('displays individual games for selection', async () => {
      render(<AIAssignmentsEnterprise />);

      await waitFor(() => {
        expect(screen.getByText('Game Selection')).toBeInTheDocument();
        expect(screen.getByText('Lakers vs Warriors')).toBeInTheDocument();
        expect(screen.getByText('Bulls vs Celtics')).toBeInTheDocument();
      });
    });

    test('allows selecting individual games', async () => {
      render(<AIAssignmentsEnterprise />);

      await waitFor(() => {
        const gameCheckbox = screen.getByLabelText(/Lakers vs Warriors/);
        expect(gameCheckbox).not.toBeChecked();

        fireEvent.click(gameCheckbox);
        expect(gameCheckbox).toBeChecked();

        // Should update selected games count in stats
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });

    test('updates scope when games are selected', async () => {
      render(<AIAssignmentsEnterprise />);

      await waitFor(() => {
        const allUnassignedRadio =
          screen.getByLabelText(/All Unassigned Games/);
        const selectedGamesRadio = screen.getByLabelText(/Selected Games/);

        expect(allUnassignedRadio).toBeChecked();
        expect(selectedGamesRadio).not.toBeChecked();

        // Select a game
        const gameCheckbox = screen.getByLabelText(/Lakers vs Warriors/);
        fireEvent.click(gameCheckbox);

        // Should switch to selected games mode
        expect(selectedGamesRadio).toBeChecked();
        expect(allUnassignedRadio).not.toBeChecked();
      });
    });
  });

  describe('Assignment Results Display', () => {
    test('shows assignment results after generation', async () => {
      render(<AIAssignmentsEnterprise />);

      // Generate assignments
      const generateButton = await screen.findByText(
        'Generate Bulk Assignments'
      );
      fireEvent.click(generateButton);

      await waitFor(
        () => {
          expect(screen.getByText('Apply All Assignments')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Check results tab
      const resultsTab = screen.getByText('Assignment Results');
      fireEvent.click(resultsTab);

      await waitFor(() => {
        expect(screen.getByText('Assignment Results')).toBeInTheDocument();
        expect(
          screen.getByText(/Successfully assigned 1 games/)
        ).toBeInTheDocument();
        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('92% match')).toBeInTheDocument();
      });
    });

    test('displays optimization metrics', async () => {
      render(<AIAssignmentsEnterprise />);

      // Generate assignments
      const generateButton = await screen.findByText(
        'Generate Bulk Assignments'
      );
      fireEvent.click(generateButton);

      await waitFor(() => {
        const resultsTab = screen.getByText('Assignment Results');
        fireEvent.click(resultsTab);
      });

      await waitFor(() => {
        expect(screen.getByText('92%')).toBeInTheDocument(); // Workload Balance
        expect(screen.getByText('87%')).toBeInTheDocument(); // Preference Match
        expect(screen.getByText('0')).toBeInTheDocument(); // Conflicts
      });
    });
  });

  describe('Optimization Settings', () => {
    test('displays optimization parameters interface', async () => {
      render(<AIAssignmentsEnterprise />);

      await waitFor(() => {
        const optimizationTab = screen.getByText('Optimization Settings');
        fireEvent.click(optimizationTab);
      });

      expect(screen.getByText('Optimization Parameters')).toBeInTheDocument();
      expect(
        screen.getByText(
          "Fine-tune the assignment algorithm for your organization's needs"
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText('Max Games per Referee per Day')
      ).toBeInTheDocument();
      expect(screen.getByText('Max Travel Distance (km)')).toBeInTheDocument();
      expect(screen.getByText('Experience Weight (%)')).toBeInTheDocument();
    });

    test('shows optimization tip', async () => {
      render(<AIAssignmentsEnterprise />);

      await waitFor(() => {
        const optimizationTab = screen.getByText('Optimization Settings');
        fireEvent.click(optimizationTab);
      });

      expect(screen.getByText('Optimization Tip')).toBeInTheDocument();
      expect(
        screen.getByText(/Higher weights prioritize that factor more heavily/)
      ).toBeInTheDocument();
    });
  });

  describe('Performance Analytics', () => {
    test('displays system capabilities and metrics', async () => {
      render(<AIAssignmentsEnterprise />);

      await waitFor(() => {
        const analyticsTab = screen.getByText('Performance Analytics');
        fireEvent.click(analyticsTab);
      });

      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
      expect(screen.getByText('System Capabilities')).toBeInTheDocument();
      expect(screen.getByText('Enterprise Scale')).toBeInTheDocument();
      expect(
        screen.getByText('Handles 300+ games and 100+ referees simultaneously')
      ).toBeInTheDocument();
      expect(screen.getByText('Constraint Optimization')).toBeInTheDocument();
      expect(screen.getByText('Real-time Processing')).toBeInTheDocument();
      expect(screen.getByText('Conflict Prevention')).toBeInTheDocument();
    });

    test('shows performance metrics with default values', async () => {
      render(<AIAssignmentsEnterprise />);

      await waitFor(() => {
        const analyticsTab = screen.getByText('Performance Analytics');
        fireEvent.click(analyticsTab);
      });

      expect(screen.getByText('Assignment Success Rate')).toBeInTheDocument();
      expect(screen.getByText('Average Processing Time')).toBeInTheDocument();
      expect(screen.getByText('2.3s per game')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles empty games list gracefully', async () => {
      mockApi.getGames.mockResolvedValue({ data: [] });

      render(<AIAssignmentsEnterprise />);

      await waitFor(() => {
        expect(screen.getByText('Unassigned Games')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });

    test('handles empty referees list gracefully', async () => {
      mockApi.getReferees.mockResolvedValue({
        success: true,
        data: { referees: [] },
      });

      render(<AIAssignmentsEnterprise />);

      await waitFor(() => {
        expect(screen.getByText('Available Referees')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });

    test('shows loading state during data fetch', () => {
      mockApi.getGames.mockImplementation(() => new Promise(() => {})); // Never resolves
      mockApi.getReferees.mockImplementation(() => new Promise(() => {}));

      render(<AIAssignmentsEnterprise />);

      expect(
        screen.getByText('Loading games and referees...')
      ).toBeInTheDocument();
    });
  });
});
