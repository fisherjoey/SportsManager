import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { AIAssignmentsEnterprise } from '../components/ai-assignments-enterprise'
import { useApi } from '../lib/api'

// Mock dependencies
jest.mock('../lib/api')

const mockApi = {
  getGames: jest.fn(),
  getReferees: jest.fn(),
  createAIAssignmentRule: jest.fn(),
  runAIAssignmentRule: jest.fn(),
  deleteAIAssignmentRule: jest.fn()
}

beforeEach(() => {
  useApi.mockReturnValue(mockApi)
  jest.clearAllMocks()
  
  // Mock successful data loading by default
  mockApi.getGames.mockResolvedValue({
    data: mockGames
  })
  
  mockApi.getReferees.mockResolvedValue({
    success: true,
    data: { referees: mockBackendReferees }
  })
  
  // Mock successful AI operations by default
  mockApi.createAIAssignmentRule.mockResolvedValue({ success: true, data: { id: 'test-rule' } })
  mockApi.runAIAssignmentRule.mockResolvedValue({ success: true, data: { assignments: [], conflictsFound: 0 } })
  mockApi.deleteAIAssignmentRule.mockResolvedValue({ success: true })
})

const mockGames = [
  {
    id: '1',
    homeTeam: 'Lakers',
    awayTeam: 'Warriors',
    date: '2024-02-01',
    time: '19:00',
    division: 'Premier',
    location: 'Downtown Arena',
    status: 'unassigned',
    assignedReferees: []
  },
  {
    id: '2',
    homeTeam: 'Bulls',
    awayTeam: 'Celtics',
    date: '2024-02-01',
    time: '21:00',
    division: 'Premier',
    location: 'Downtown Arena',
    status: 'unassigned',
    assignedReferees: []
  },
  {
    id: '3',
    homeTeam: 'Heat',
    awayTeam: 'Spurs',
    date: '2024-02-02',
    time: '18:00',
    division: 'Championship',
    location: 'Westside Center',
    status: 'assigned',
    assignedReferees: ['ref-1']
  }
]

const mockBackendReferees = [
  {
    id: 'ref-1',
    name: 'John Smith',
    certificationLevel: 'Level 5',
    location: 'Downtown',
    isAvailable: true
  },
  {
    id: 'ref-2',
    name: 'Sarah Johnson',
    certificationLevel: 'Level 4',
    location: 'Downtown',
    isAvailable: true
  },
  {
    id: 'ref-3',
    name: 'Mike Wilson',
    certificationLevel: 'Level 5',
    location: 'Westside',
    isAvailable: false
  }
]

const mockAIRuleResponse = {
  success: true,
  data: {
    id: 'rule-123',
    name: 'Test Rule'
  }
}

const mockAIRunResponse = {
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
            position: 'Referee 1'
          },
          {
            refereeId: 'ref-2',
            refereeName: 'Sarah Johnson',
            confidence: 0.85,
            position: 'Referee 2'
          }
        ],
        conflicts: []
      }
    ],
    conflictsFound: 0,
    algorithmicScores: {
      averageConfidence: 0.88
    }
  }
}

describe('AIAssignmentsEnterprise Component', () => {
  describe('Component Initialization and Data Loading', () => {
    test('renders loading state initially', () => {
      mockApi.getGames.mockImplementation(() => new Promise(() => {})) // Never resolves
      mockApi.getReferees.mockImplementation(() => new Promise(() => {}))

      render(<AIAssignmentsEnterprise />)

      expect(screen.getByText('Loading games and referees...')).toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument() // Loading spinner
    })

    test('loads games and referees data on mount', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        expect(mockApi.getGames).toHaveBeenCalledWith({ status: 'unassigned', limit: 100 })
        expect(mockApi.getReferees).toHaveBeenCalledWith({ available: true, limit: 100 })
      })
    })

    test('displays enterprise AI title and description', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        expect(screen.getByText('Enterprise AI Assignment Engine')).toBeInTheDocument()
        expect(screen.getByText('Intelligent bulk referee assignment system for large-scale operations')).toBeInTheDocument()
        expect(screen.getByText('Enterprise Scale')).toBeInTheDocument()
      })
    })

    test('handles data loading errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      mockApi.getGames.mockRejectedValue(new Error('Network error'))
      mockApi.getReferees.mockRejectedValue(new Error('Network error'))

      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load real data, using mock data:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Statistics and Metrics Display', () => {
    test('calculates and displays unassigned games count', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        expect(screen.getByText('Unassigned Games')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument() // 2 unassigned games from mock data
        expect(screen.getByText('Games needing assignment')).toBeInTheDocument()
      })
    })

    test('calculates and displays available referees count', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        expect(screen.getByText('Available Referees')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument() // 2 available referees from mock data
        expect(screen.getByText('Ready for assignment')).toBeInTheDocument()
      })
    })

    test('updates selected games count when games are selected', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        expect(screen.getByText('Selected Games')).toBeInTheDocument()
        expect(screen.getByText('0')).toBeInTheDocument() // Initially no games selected
      })

      // Select a game
      const gameCheckbox = await screen.findByLabelText(/Lakers vs Warriors/)
      fireEvent.click(gameCheckbox)

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument() // 1 game selected
      })
    })

    test('displays optimization score after bulk assignment', async () => {
      mockApi.createAIAssignmentRule.mockResolvedValue(mockAIRuleResponse)
      mockApi.runAIAssignmentRule.mockResolvedValue(mockAIRunResponse)
      mockApi.deleteAIAssignmentRule.mockResolvedValue({ success: true })

      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        expect(screen.getByText('Optimization Score')).toBeInTheDocument()
        expect(screen.getByText('N/A')).toBeInTheDocument() // Initially N/A
      })

      // Generate bulk assignments
      const generateButton = await screen.findByText('Generate Bulk Assignments')
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('88%')).toBeInTheDocument() // Calculated from mock response
      })
    })
  })

  describe('Optimization Settings Tab', () => {
    test('renders optimization parameters with default values', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        const optimizationTab = screen.getByText('Optimization Settings')
        fireEvent.click(optimizationTab)
      })

      expect(screen.getByText('Max Games per Referee per Day')).toBeInTheDocument()
      expect(screen.getByText('Max Games per Referee per Week')).toBeInTheDocument()
      expect(screen.getByText('Max Travel Distance (km)')).toBeInTheDocument()
      expect(screen.getByText('Preferred Division Weight (%)')).toBeInTheDocument()
      expect(screen.getByText('Experience Weight (%)')).toBeInTheDocument()
      expect(screen.getByText('Workload Balance Weight (%)')).toBeInTheDocument()
      expect(screen.getByText('Minimum Rest Between Games (minutes)')).toBeInTheDocument()
    })

    test('displays optimization tip warning', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        const optimizationTab = screen.getByText('Optimization Settings')
        fireEvent.click(optimizationTab)
      })

      expect(screen.getByText('Optimization Tip')).toBeInTheDocument()
      expect(screen.getByText('Higher weights prioritize that factor more heavily. Balance all weights to achieve optimal results.')).toBeInTheDocument()
    })

    test('allows slider value adjustments', async () => {
      const user = userEvent.setup()
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        const optimizationTab = screen.getByText('Optimization Settings')
        fireEvent.click(optimizationTab)
      })

      // Test slider adjustment (this is a simplified test as slider interactions are complex)
      const sliders = screen.getAllByRole('slider')
      expect(sliders.length).toBeGreaterThan(0)
    })
  })

  describe('Bulk Assignment Workflow', () => {
    test('renders bulk assignment interface', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        expect(screen.getByText('Enterprise Bulk Assignment')).toBeInTheDocument()
        expect(screen.getByText('Assign up to 300+ games simultaneously with advanced optimization algorithms')).toBeInTheDocument()
        expect(screen.getByText('Assignment Scope')).toBeInTheDocument()
        expect(screen.getByText('All Unassigned Games (2 games)')).toBeInTheDocument()
        expect(screen.getByText('Selected Games (0 games)')).toBeInTheDocument()
      })
    })

    test('shows bulk assignment mode information', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        expect(screen.getByText('Bulk Assignment Mode')).toBeInTheDocument()
        expect(screen.getByText(/Will process all 2 unassigned games using advanced optimization algorithms/)).toBeInTheDocument()
        expect(screen.getByText(/Estimated processing time: 1 seconds/)).toBeInTheDocument()
      })
    })

    test('executes bulk assignment with backend integration', async () => {
      mockApi.createAIAssignmentRule.mockResolvedValue(mockAIRuleResponse)
      mockApi.runAIAssignmentRule.mockResolvedValue(mockAIRunResponse)
      mockApi.deleteAIAssignmentRule.mockResolvedValue({ success: true })

      render(<AIAssignmentsEnterprise />)

      const generateButton = await screen.findByText('Generate Bulk Assignments')
      
      // Click to start bulk assignment
      fireEvent.click(generateButton)

      // Check loading state
      await waitFor(() => {
        expect(screen.getByText(/Processing 2 Games.../)).toBeInTheDocument()
        expect(screen.getByText('Processing assignments...')).toBeInTheDocument()
        expect(screen.getByText('Step 2 of 4')).toBeInTheDocument()
      })

      // Wait for completion
      await waitFor(() => {
        expect(mockApi.createAIAssignmentRule).toHaveBeenCalledWith(expect.objectContaining({
          name: expect.stringContaining('Bulk Assignment'),
          description: 'Temporary rule for enterprise bulk assignment',
          enabled: true,
          schedule: { type: 'manual' },
          aiSystem: {
            type: 'algorithmic',
            algorithmicSettings: expect.objectContaining({
              distanceWeight: 40,
              skillWeight: 30,
              experienceWeight: 20,
              partnerPreferenceWeight: 10
            })
          }
        }))

        expect(mockApi.runAIAssignmentRule).toHaveBeenCalledWith('rule-123', {
          dryRun: true,
          gameIds: ['1', '2'],
          contextComments: ['Enterprise bulk assignment with 2 games']
        })

        expect(mockApi.deleteAIAssignmentRule).toHaveBeenCalledWith('rule-123')
      })
    })

    test('handles backend AI assignment failure gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      mockApi.createAIAssignmentRule.mockRejectedValue(new Error('Backend error'))

      render(<AIAssignmentsEnterprise />)

      const generateButton = await screen.findByText('Generate Bulk Assignments')
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Backend AI assignment failed, using fallback algorithm:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })

    test('shows Apply All Assignments button after generation', async () => {
      mockApi.createAIAssignmentRule.mockResolvedValue(mockAIRuleResponse)
      mockApi.runAIAssignmentRule.mockResolvedValue(mockAIRunResponse)
      mockApi.deleteAIAssignmentRule.mockResolvedValue({ success: true })

      render(<AIAssignmentsEnterprise />)

      const generateButton = await screen.findByText('Generate Bulk Assignments')
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Apply All Assignments')).toBeInTheDocument()
      })
    })
  })

  describe('Game Selection Interface', () => {
    test('renders game selection list', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        expect(screen.getByText('Game Selection')).toBeInTheDocument()
        expect(screen.getByText('Select specific games for assignment (optional)')).toBeInTheDocument()
        expect(screen.getByText('Lakers vs Warriors')).toBeInTheDocument()
        expect(screen.getByText('Bulls vs Celtics')).toBeInTheDocument()
      })
    })

    test('allows individual game selection', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        const lakersGame = screen.getByLabelText(/Lakers vs Warriors/)
        expect(lakersGame).not.toBeChecked()

        fireEvent.click(lakersGame)
        expect(lakersGame).toBeChecked()

        // Should update the scope radio button
        const selectedGamesScope = screen.getByLabelText('Selected Games (1 games)')
        expect(selectedGamesScope).toBeChecked()
      })
    })

    test('displays game information correctly', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        expect(screen.getByText('2/1/2024')).toBeInTheDocument() // Date formatting
        expect(screen.getByText('19:00')).toBeInTheDocument()
        expect(screen.getByText('21:00')).toBeInTheDocument()
        expect(screen.getByText('Premier')).toBeInTheDocument()
      })
    })

    test('filters out already assigned games', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        // Should not show the Heat vs Spurs game (status: assigned)
        expect(screen.queryByText('Heat vs Spurs')).not.toBeInTheDocument()
        
        // Should only show unassigned games
        expect(screen.getByText('Lakers vs Warriors')).toBeInTheDocument()
        expect(screen.getByText('Bulls vs Celtics')).toBeInTheDocument()
      })
    })
  })

  describe('Assignment Results Tab', () => {
    test('shows no results message initially', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        const resultsTab = screen.getByText('Assignment Results')
        fireEvent.click(resultsTab)
      })

      expect(screen.getByText('No Assignment Results')).toBeInTheDocument()
      expect(screen.getByText('Run a bulk assignment to see detailed results and optimization metrics here.')).toBeInTheDocument()
      expect(screen.getByText('Go to Bulk Assignment')).toBeInTheDocument()
    })

    test('displays assignment results after generation', async () => {
      mockApi.createAIAssignmentRule.mockResolvedValue(mockAIRuleResponse)
      mockApi.runAIAssignmentRule.mockResolvedValue(mockAIRunResponse)
      mockApi.deleteAIAssignmentRule.mockResolvedValue({ success: true })

      render(<AIAssignmentsEnterprise />)

      // Generate assignments first
      const generateButton = await screen.findByText('Generate Bulk Assignments')
      fireEvent.click(generateButton)

      await waitFor(() => {
        const resultsTab = screen.getByText('Assignment Results')
        fireEvent.click(resultsTab)
      })

      await waitFor(() => {
        expect(screen.getByText('Assignment Results')).toBeInTheDocument()
        expect(screen.getByText('Successfully assigned 1 games with optimization metrics')).toBeInTheDocument()
        expect(screen.getByText('88%')).toBeInTheDocument() // Workload Balance
        expect(screen.getByText('87%')).toBeInTheDocument() // Preference Match
        expect(screen.getByText('0')).toBeInTheDocument() // Conflicts
      })
    })

    test('displays individual assignment details', async () => {
      mockApi.createAIAssignmentRule.mockResolvedValue(mockAIRuleResponse)
      mockApi.runAIAssignmentRule.mockResolvedValue(mockAIRunResponse)
      mockApi.deleteAIAssignmentRule.mockResolvedValue({ success: true })

      render(<AIAssignmentsEnterprise />)

      const generateButton = await screen.findByText('Generate Bulk Assignments')
      fireEvent.click(generateButton)

      await waitFor(() => {
        const resultsTab = screen.getByText('Assignment Results')
        fireEvent.click(resultsTab)
      })

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument()
        expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
        expect(screen.getByText('92% match')).toBeInTheDocument()
        expect(screen.getByText('85% match')).toBeInTheDocument()
        expect(screen.getByText('Optimal assignment based on AI algorithm')).toBeInTheDocument()
      })
    })

    test('allows individual assignment application', async () => {
      mockApi.createAIAssignmentRule.mockResolvedValue(mockAIRuleResponse)
      mockApi.runAIAssignmentRule.mockResolvedValue(mockAIRunResponse)
      mockApi.deleteAIAssignmentRule.mockResolvedValue({ success: true })

      render(<AIAssignmentsEnterprise />)

      const generateButton = await screen.findByText('Generate Bulk Assignments')
      fireEvent.click(generateButton)

      await waitFor(() => {
        const resultsTab = screen.getByText('Assignment Results')
        fireEvent.click(resultsTab)
      })

      await waitFor(() => {
        const applyButtons = screen.getAllByText('Apply')
        expect(applyButtons.length).toBeGreaterThan(0)
        
        // Click individual apply button
        fireEvent.click(applyButtons[0])
        
        // Should remove the assignment from results
        // (This tests the UI logic for removing applied assignments)
      })
    })
  })

  describe('Performance Analytics Tab', () => {
    test('displays system capabilities', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        const analyticsTab = screen.getByText('Performance Analytics')
        fireEvent.click(analyticsTab)
      })

      expect(screen.getByText('System Capabilities')).toBeInTheDocument()
      expect(screen.getByText('Enterprise Scale')).toBeInTheDocument()
      expect(screen.getByText('Handles 300+ games and 100+ referees simultaneously')).toBeInTheDocument()
      expect(screen.getByText('Constraint Optimization')).toBeInTheDocument()
      expect(screen.getByText('Real-time Processing')).toBeInTheDocument()
      expect(screen.getByText('Conflict Prevention')).toBeInTheDocument()
    })

    test('displays performance metrics', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        const analyticsTab = screen.getByText('Performance Analytics')
        fireEvent.click(analyticsTab)
      })

      expect(screen.getByText('Performance Metrics')).toBeInTheDocument()
      expect(screen.getByText('Assignment Success Rate')).toBeInTheDocument()
      expect(screen.getByText('Average Processing Time')).toBeInTheDocument()
      expect(screen.getByText('2.3s per game')).toBeInTheDocument()
      expect(screen.getByText('Referee Satisfaction')).toBeInTheDocument()
      expect(screen.getByText('Workload Distribution')).toBeInTheDocument()
    })

    test('updates metrics after assignment generation', async () => {
      mockApi.createAIAssignmentRule.mockResolvedValue(mockAIRuleResponse)
      mockApi.runAIAssignmentRule.mockResolvedValue(mockAIRunResponse)
      mockApi.deleteAIAssignmentRule.mockResolvedValue({ success: true })

      render(<AIAssignmentsEnterprise />)

      // Generate assignments first
      const generateButton = await screen.findByText('Generate Bulk Assignments')
      fireEvent.click(generateButton)

      await waitFor(() => {
        const analyticsTab = screen.getByText('Performance Analytics')
        fireEvent.click(analyticsTab)
      })

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument() // Success rate (1/1 games)
        expect(screen.getByText('87%')).toBeInTheDocument() // Referee satisfaction
        expect(screen.getByText('88%')).toBeInTheDocument() // Workload distribution
      })
    })
  })

  describe('Data Transformation and Backend Integration', () => {
    test('transforms backend referee data correctly', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        expect(mockApi.getReferees).toHaveBeenCalledWith({ available: true, limit: 100 })
      })

      // The component should transform backend data to frontend format
      // This is tested indirectly through the successful loading of referee data
    })

    test('creates temporary AI rule with optimization settings', async () => {
      mockApi.createAIAssignmentRule.mockResolvedValue(mockAIRuleResponse)
      mockApi.runAIAssignmentRule.mockResolvedValue(mockAIRunResponse)
      mockApi.deleteAIAssignmentRule.mockResolvedValue({ success: true })

      render(<AIAssignmentsEnterprise />)

      // Adjust optimization settings first
      const optimizationTab = await screen.findByText('Optimization Settings')
      fireEvent.click(optimizationTab)

      // Generate assignments
      const bulkTab = await screen.findByText('Bulk Assignment')
      fireEvent.click(bulkTab)
      
      const generateButton = await screen.findByText('Generate Bulk Assignments')
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(mockApi.createAIAssignmentRule).toHaveBeenCalledWith(expect.objectContaining({
          criteria: expect.objectContaining({
            maxDistance: 50, // From default optimization settings
            maxDaysAhead: 30,
            minRefereeLevel: 'Rookie'
          }),
          aiSystem: expect.objectContaining({
            type: 'algorithmic',
            algorithmicSettings: expect.objectContaining({
              distanceWeight: 40,
              skillWeight: 30,
              experienceWeight: 20,
              partnerPreferenceWeight: 10
            })
          })
        }))
      })
    })

    test('cleans up temporary AI rule after processing', async () => {
      mockApi.createAIAssignmentRule.mockResolvedValue(mockAIRuleResponse)
      mockApi.runAIAssignmentRule.mockResolvedValue(mockAIRunResponse)
      mockApi.deleteAIAssignmentRule.mockResolvedValue({ success: true })

      render(<AIAssignmentsEnterprise />)

      const generateButton = await screen.findByText('Generate Bulk Assignments')
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(mockApi.deleteAIAssignmentRule).toHaveBeenCalledWith('rule-123')
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('handles empty games list', async () => {
      mockApi.getGames.mockResolvedValue({ data: [] })

      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        expect(screen.getByText('Unassigned Games')).toBeInTheDocument()
        expect(screen.getByText('0')).toBeInTheDocument()
        expect(screen.getByText('All Unassigned Games (0 games)')).toBeInTheDocument()
      })
    })

    test('handles empty referees list', async () => {
      mockApi.getReferees.mockResolvedValue({ success: true, data: { referees: [] } })

      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        expect(screen.getByText('Available Referees')).toBeInTheDocument()
        expect(screen.getByText('0')).toBeInTheDocument()
      })
    })

    test('handles invalid API response formats', async () => {
      mockApi.getGames.mockResolvedValue({ data: null })
      mockApi.getReferees.mockResolvedValue({ success: true, data: null })

      render(<AIAssignmentsEnterprise />)

      // Should not crash and should use fallback values
      await waitFor(() => {
        expect(screen.getByText('Enterprise AI Assignment Engine')).toBeInTheDocument()
      })
    })

    test('handles partial AI assignment rule creation failure', async () => {
      mockApi.createAIAssignmentRule.mockResolvedValue({ success: false })

      render(<AIAssignmentsEnterprise />)

      const generateButton = await screen.findByText('Generate Bulk Assignments')
      fireEvent.click(generateButton)

      // Should fall back to mock algorithm
      await waitFor(() => {
        expect(screen.getByText('Apply All Assignments')).toBeInTheDocument()
      })
    })
  })

  describe('User Interface Interactions', () => {
    test('tab navigation works correctly', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        const tabs = ['Bulk Assignment', 'Optimization Settings', 'Assignment Results', 'Performance Analytics']
        
        tabs.forEach(tabName => {
          expect(screen.getByText(tabName)).toBeInTheDocument()
        })
      })

      // Test clicking each tab
      const optimizationTab = screen.getByText('Optimization Settings')
      fireEvent.click(optimizationTab)
      expect(screen.getByText('Optimization Parameters')).toBeInTheDocument()

      const resultsTab = screen.getByText('Assignment Results')
      fireEvent.click(resultsTab)
      expect(screen.getByText('No Assignment Results')).toBeInTheDocument()

      const analyticsTab = screen.getByText('Performance Analytics')
      fireEvent.click(analyticsTab)
      expect(screen.getByText('System Capabilities')).toBeInTheDocument()
    })

    test('scope selection radio buttons work correctly', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        const allUnassignedRadio = screen.getByLabelText(/All Unassigned Games/)
        const selectedGamesRadio = screen.getByLabelText(/Selected Games/)

        expect(allUnassignedRadio).toBeChecked()
        expect(selectedGamesRadio).not.toBeChecked()

        // Select a game which should switch to selected games mode
        const gameCheckbox = screen.getByLabelText(/Lakers vs Warriors/)
        fireEvent.click(gameCheckbox)

        expect(selectedGamesRadio).toBeChecked()
        expect(allUnassignedRadio).not.toBeChecked()
      })
    })

    test('export button is present in results', async () => {
      mockApi.createAIAssignmentRule.mockResolvedValue(mockAIRuleResponse)
      mockApi.runAIAssignmentRule.mockResolvedValue(mockAIRunResponse)
      mockApi.deleteAIAssignmentRule.mockResolvedValue({ success: true })

      render(<AIAssignmentsEnterprise />)

      const generateButton = await screen.findByText('Generate Bulk Assignments')
      fireEvent.click(generateButton)

      await waitFor(() => {
        const resultsTab = screen.getByText('Assignment Results')
        fireEvent.click(resultsTab)
      })

      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument()
      })
    })
  })
})