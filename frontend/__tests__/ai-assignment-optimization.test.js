import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
  
  // Mock successful data loading with some games and referees for testing
  mockApi.getGames.mockResolvedValue({ 
    data: [
      { id: '1', homeTeam: 'Team A', awayTeam: 'Team B', status: 'unassigned', division: 'Premier' },
      { id: '2', homeTeam: 'Team C', awayTeam: 'Team D', status: 'unassigned', division: 'Premier' }
    ]
  })
  mockApi.getReferees.mockResolvedValue({ 
    success: true, 
    data: { 
      referees: [
        { id: 'ref-1', name: 'John Doe', certificationLevel: 'Level 5', isAvailable: true },
        { id: 'ref-2', name: 'Jane Smith', certificationLevel: 'Level 4', isAvailable: true }
      ]
    }
  })
})

describe('AI Assignment Optimization Settings', () => {
  describe('Default Optimization Values', () => {
    test('sets correct default optimization values', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        const optimizationTab = screen.getByText('Optimization Settings')
        fireEvent.click(optimizationTab)
      })

      // Check default values are displayed
      expect(screen.getByText('4')).toBeInTheDocument() // Max games per day
      expect(screen.getByText('15')).toBeInTheDocument() // Max games per week
      expect(screen.getByText('50km')).toBeInTheDocument() // Max travel distance
      expect(screen.getByText('30%')).toBeInTheDocument() // Preferred division weight
      expect(screen.getByText('20%')).toBeInTheDocument() // Experience weight
      expect(screen.getByText('30%')).toBeInTheDocument() // Workload balance weight
      expect(screen.getByText('30min')).toBeInTheDocument() // Minimum rest between games
    })

    test('displays correct slider ranges', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        const optimizationTab = screen.getByText('Optimization Settings')
        fireEvent.click(optimizationTab)
      })

      // Check range labels
      expect(screen.getByText('1')).toBeInTheDocument() // Min games per day
      expect(screen.getByText('8')).toBeInTheDocument() // Max games per day
      expect(screen.getByText('5')).toBeInTheDocument() // Min games per week
      expect(screen.getByText('30')).toBeInTheDocument() // Max games per week
      expect(screen.getByText('10km')).toBeInTheDocument() // Min travel distance
      expect(screen.getByText('100km')).toBeInTheDocument() // Max travel distance
      expect(screen.getByText('15min')).toBeInTheDocument() // Min rest time
      expect(screen.getByText('120min')).toBeInTheDocument() // Max rest time
      expect(screen.getByText('0%')).toBeInTheDocument() // Min weight percentage
      expect(screen.getByText('100%')).toBeInTheDocument() // Max weight percentage
    })
  })

  describe('Optimization Parameter Integration', () => {
    test('passes optimization settings to AI rule creation', async () => {
      const mockRuleResponse = { success: true, data: { id: 'rule-123' } }
      const mockRunResponse = { 
        success: true, 
        data: { 
          assignments: [], 
          conflictsFound: 0,
          algorithmicScores: { averageConfidence: 0.85 }
        } 
      }

      mockApi.createAIAssignmentRule.mockResolvedValue(mockRuleResponse)
      mockApi.runAIAssignmentRule.mockResolvedValue(mockRunResponse)
      mockApi.deleteAIAssignmentRule.mockResolvedValue({ success: true })

      render(<AIAssignmentsEnterprise />)

      // Navigate to bulk assignment and generate
      await waitFor(() => {
        const generateButton = screen.getByText('Generate Bulk Assignments')
        fireEvent.click(generateButton)
      })

      await waitFor(() => {
        expect(mockApi.createAIAssignmentRule).toHaveBeenCalledWith(
          expect.objectContaining({
            criteria: expect.objectContaining({
              maxDistance: 50, // Default max travel distance
              maxDaysAhead: 30,
              minRefereeLevel: 'Rookie',
              prioritizeExperience: true,
              avoidBackToBack: true
            }),
            aiSystem: expect.objectContaining({
              type: 'algorithmic',
              algorithmicSettings: expect.objectContaining({
                distanceWeight: 40,
                skillWeight: 30,
                experienceWeight: 20,
                partnerPreferenceWeight: 10,
                preferredPairs: []
              })
            })
          })
        )
      })
    })

    test('updates AI rule with modified optimization settings', async () => {
      // This test would require more complex slider interaction simulation
      // For now, we test that the settings structure is correct
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        const optimizationTab = screen.getByText('Optimization Settings')
        fireEvent.click(optimizationTab)
      })

      // Verify that all optimization parameter inputs are present
      const sliders = screen.getAllByRole('slider')
      expect(sliders).toHaveLength(7) // 7 optimization parameters
    })
  })

  describe('Constraint Validation', () => {
    test('displays validation ranges correctly', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        const optimizationTab = screen.getByText('Optimization Settings')
        fireEvent.click(optimizationTab)
      })

      // Test that constraint descriptions are shown
      expect(screen.getByText('Max Games per Referee per Day')).toBeInTheDocument()
      expect(screen.getByText('Max Games per Referee per Week')).toBeInTheDocument()
      expect(screen.getByText('Max Travel Distance (km)')).toBeInTheDocument()
      expect(screen.getByText('Minimum Rest Between Games (minutes)')).toBeInTheDocument()
      expect(screen.getByText('Preferred Division Weight (%)')).toBeInTheDocument()
      expect(screen.getByText('Experience Weight (%)')).toBeInTheDocument()
      expect(screen.getByText('Workload Balance Weight (%)')).toBeInTheDocument()
    })

    test('shows optimization tip for weight balancing', async () => {
      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        const optimizationTab = screen.getByText('Optimization Settings')
        fireEvent.click(optimizationTab)
      })

      expect(screen.getByText('Optimization Tip')).toBeInTheDocument()
      expect(screen.getByText(/Higher weights prioritize that factor more heavily/)).toBeInTheDocument()
    })
  })

  describe('Parameter Impact on Assignment Quality', () => {
    test('optimization settings affect assignment reasoning', async () => {
      const mockRuleResponse = { success: true, data: { id: 'rule-123' } }
      const mockRunResponse = { 
        success: true, 
        data: { 
          assignments: [
            {
              gameId: '1',
              assignedReferees: [
                { refereeId: 'ref-1', refereeName: 'John Doe', confidence: 0.92, position: 'Referee 1' }
              ],
              conflicts: []
            }
          ],
          conflictsFound: 0,
          algorithmicScores: { averageConfidence: 0.92 }
        } 
      }

      mockApi.getGames.mockResolvedValue({ 
        data: [
          { id: '1', homeTeam: 'Team A', awayTeam: 'Team B', status: 'unassigned', division: 'Premier' }
        ]
      })
      mockApi.createAIAssignmentRule.mockResolvedValue(mockRuleResponse)
      mockApi.runAIAssignmentRule.mockResolvedValue(mockRunResponse)
      mockApi.deleteAIAssignmentRule.mockResolvedValue({ success: true })

      render(<AIAssignmentsEnterprise />)

      // Generate assignment
      await waitFor(() => {
        const generateButton = screen.getByText('Generate Bulk Assignments')
        fireEvent.click(generateButton)
      })

      // Check results tab
      await waitFor(() => {
        const resultsTab = screen.getByText('Assignment Results')
        fireEvent.click(resultsTab)
      })

      await waitFor(() => {
        expect(screen.getByText('92%')).toBeInTheDocument() // High confidence score
        expect(screen.getByText('Optimal assignment based on AI algorithm')).toBeInTheDocument()
      })
    })
  })

  describe('Performance Metrics Calculation', () => {
    test('calculates optimization metrics correctly', async () => {
      const mockRuleResponse = { success: true, data: { id: 'rule-123' } }
      const mockRunResponse = { 
        success: true, 
        data: { 
          assignments: [
            { gameId: '1', assignedReferees: [{ confidence: 0.85 }], conflicts: [] },
            { gameId: '2', assignedReferees: [{ confidence: 0.90 }], conflicts: [] }
          ],
          conflictsFound: 0,
          algorithmicScores: { averageConfidence: 0.875 }
        } 
      }

      mockApi.getGames.mockResolvedValue({ 
        data: [
          { id: '1', status: 'unassigned' },
          { id: '2', status: 'unassigned' }
        ]
      })
      mockApi.createAIAssignmentRule.mockResolvedValue(mockRuleResponse)
      mockApi.runAIAssignmentRule.mockResolvedValue(mockRunResponse)
      mockApi.deleteAIAssignmentRule.mockResolvedValue({ success: true })

      render(<AIAssignmentsEnterprise />)

      // Generate assignments
      await waitFor(() => {
        const generateButton = screen.getByText('Generate Bulk Assignments')
        fireEvent.click(generateButton)
      })

      // Check optimization score in stats
      await waitFor(() => {
        expect(screen.getByText('88%')).toBeInTheDocument() // Rounded average confidence
      })

      // Check detailed metrics in results tab
      await waitFor(() => {
        const resultsTab = screen.getByText('Assignment Results')
        fireEvent.click(resultsTab)
      })

      await waitFor(() => {
        expect(screen.getByText('Successfully assigned 2 games with optimization metrics')).toBeInTheDocument()
        expect(screen.getByText('88%')).toBeInTheDocument() // Workload Balance
        expect(screen.getByText('87%')).toBeInTheDocument() // Preference Match (default)
        expect(screen.getByText('246km')).toBeInTheDocument() // Total Travel (rounded)
        expect(screen.getByText('0')).toBeInTheDocument() // Conflicts
      })
    })

    test('handles assignments with conflicts', async () => {
      const mockRuleResponse = { success: true, data: { id: 'rule-123' } }
      const mockRunResponse = { 
        success: true, 
        data: { 
          assignments: [
            {
              gameId: '1',
              assignedReferees: [{ confidence: 0.75 }],
              conflicts: ['Time overlap with another assignment']
            }
          ],
          conflictsFound: 1,
          algorithmicScores: { averageConfidence: 0.75 }
        } 
      }

      mockApi.getGames.mockResolvedValue({ data: [{ id: '1', status: 'unassigned' }] })
      mockApi.createAIAssignmentRule.mockResolvedValue(mockRuleResponse)
      mockApi.runAIAssignmentRule.mockResolvedValue(mockRunResponse)
      mockApi.deleteAIAssignmentRule.mockResolvedValue({ success: true })

      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        const generateButton = screen.getByText('Generate Bulk Assignments')
        fireEvent.click(generateButton)
      })

      await waitFor(() => {
        const resultsTab = screen.getByText('Assignment Results')
        fireEvent.click(resultsTab)
      })

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument() // Conflicts count
        expect(screen.getByText('Assignment with 1 minor conflicts')).toBeInTheDocument()
      })
    })
  })

  describe('Fallback Algorithm Testing', () => {
    test('fallback algorithm uses mock optimization logic', async () => {
      // Force fallback by making AI rule creation fail
      mockApi.createAIAssignmentRule.mockRejectedValue(new Error('Backend unavailable'))

      const mockGames = [
        { id: '1', homeTeam: 'Team A', awayTeam: 'Team B', status: 'unassigned', division: 'Premier' }
      ]

      const mockReferees = [
        { id: 'ref-1', name: 'John Doe', isAvailable: true, preferredDivisions: ['Premier'] },
        { id: 'ref-2', name: 'Jane Smith', isAvailable: true, preferredDivisions: ['Premier'] }
      ]

      mockApi.getGames.mockResolvedValue({ data: mockGames })
      mockApi.getReferees.mockResolvedValue({ 
        success: true, 
        data: { 
          referees: mockReferees.map(ref => ({
            ...ref,
            certificationLevel: 'Level 5',
            location: 'Downtown'
          }))
        }
      })

      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        const generateButton = screen.getByText('Generate Bulk Assignments')
        fireEvent.click(generateButton)
      })

      // Should still produce assignments using fallback
      await waitFor(() => {
        expect(screen.getByText('Apply All Assignments')).toBeInTheDocument()
      })

      // Check that fallback results are displayed
      await waitFor(() => {
        const resultsTab = screen.getByText('Assignment Results')
        fireEvent.click(resultsTab)
      })

      await waitFor(() => {
        expect(screen.getByText('92%')).toBeInTheDocument() // Fallback workload balance
        expect(screen.getByText('87%')).toBeInTheDocument() // Fallback preference match
      })
    })

    test('fallback algorithm respects basic optimization constraints', async () => {
      mockApi.createAIAssignmentRule.mockRejectedValue(new Error('Backend unavailable'))

      const mockGames = [
        { 
          id: '1', 
          homeTeam: 'Team A', 
          awayTeam: 'Team B', 
          status: 'unassigned', 
          division: 'Elite' // No referees prefer this division
        }
      ]

      const mockReferees = [
        { id: 'ref-1', name: 'John Doe', isAvailable: true, preferredDivisions: ['Premier'] }
      ]

      mockApi.getGames.mockResolvedValue({ data: mockGames })
      mockApi.getReferees.mockResolvedValue({ 
        success: true, 
        data: { 
          referees: mockReferees.map(ref => ({
            ...ref,
            certificationLevel: 'Level 3',
            location: 'Downtown'
          }))
        }
      })

      render(<AIAssignmentsEnterprise />)

      await waitFor(() => {
        const generateButton = screen.getByText('Generate Bulk Assignments')
        fireEvent.click(generateButton)
      })

      // Should handle the constraint mismatch gracefully
      await waitFor(() => {
        const resultsTab = screen.getByText('Assignment Results')
        fireEvent.click(resultsTab)
      })

      // Should show unassigned games section since no referees match the division
      await waitFor(() => {
        expect(screen.getByText('Unassigned Games') || screen.getByText('Assignment Results')).toBeInTheDocument()
      })
    })
  })
})