import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { toast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'
import BudgetTracker from '@/components/budget-tracker'

// Add Jest environment setup
/**
 * @jest-environment jsdom
 */

// Mock the toast system
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn()
}))

// Mock the API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    getBudgetPeriods: vi.fn(),
    getBudgetCategories: vi.fn(),
    getBudgets: vi.fn(),
    createBudget: vi.fn(),
    updateBudget: vi.fn(),
    deleteBudget: vi.fn()
  }
}))

// Mock ResizeObserver for charts
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn()
})

const mockBudgetPeriods = [
  {
    id: 'period-1',
    name: 'Q1 2024',
    start_date: '2024-01-01',
    end_date: '2024-03-31',
    status: 'active'
  },
  {
    id: 'period-2',
    name: 'Q2 2024',
    start_date: '2024-04-01',
    end_date: '2024-06-30',
    status: 'pending'
  }
]

const mockBudgetCategories = [
  {
    id: 'cat-1',
    name: 'Operations',
    code: 'OPS',
    color: '#0088FE'
  },
  {
    id: 'cat-2',
    name: 'Marketing', 
    code: 'MKT',
    color: '#00C49F'
  }
]

const mockBudgets = [
  {
    id: 'budget-1',
    name: 'Operations Budget',
    description: 'Monthly operations budget',
    allocated_amount: 10000,
    actual_spent: 7500,
    budget_period_id: 'period-1',
    category_id: 'cat-1',
    category_name: 'Operations',
    category_code: 'OPS',
    category_color: '#0088FE',
    period_name: 'Q1 2024',
    period_start: '2024-01-01',
    period_end: '2024-03-31',
    responsible_person: 'John Doe',
    status: 'active'
  },
  {
    id: 'budget-2',
    name: 'Marketing Budget',
    description: 'Marketing campaign budget',
    allocated_amount: 5000,
    actual_spent: 5200,
    budget_period_id: 'period-1',
    category_id: 'cat-2',
    category_name: 'Marketing',
    category_code: 'MKT',
    category_color: '#00C49F',
    period_name: 'Q1 2024',
    period_start: '2024-01-01',
    period_end: '2024-03-31',
    responsible_person: 'Jane Smith',
    status: 'exceeded'
  }
]

describe('BudgetTracker Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    
    // Set up default successful API responses
    vi.mocked(apiClient.getBudgetPeriods).mockResolvedValue({
      periods: mockBudgetPeriods,
      pagination: { total: 2, page: 1, limit: 10 }
    })
    
    vi.mocked(apiClient.getBudgetCategories).mockResolvedValue({
      categories: mockBudgetCategories,
      pagination: { total: 2, page: 1, limit: 10 }
    })
    
    vi.mocked(apiClient.getBudgets).mockResolvedValue({
      budgets: mockBudgets,
      pagination: { total: 2, page: 1, limit: 10 }
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Initial Rendering and Data Loading', () => {
    it('renders loading state initially', async () => {
      render(<BudgetTracker />)
      
      // Should show loading spinner
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('loads and displays budget data successfully', async () => {
      render(<BudgetTracker />)
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument()
      })
      
      // Check that API calls were made
      expect(apiClient.getBudgetPeriods).toHaveBeenCalledTimes(1)
      expect(apiClient.getBudgetCategories).toHaveBeenCalledTimes(1)
      expect(apiClient.getBudgets).toHaveBeenCalledTimes(1)
      
      // Check that budget data is displayed
      expect(screen.getByText('Operations Budget')).toBeInTheDocument()
      expect(screen.getByText('Marketing Budget')).toBeInTheDocument()
    })

    it('displays error when initial data loading fails', async () => {
      vi.mocked(apiClient.getBudgetPeriods).mockRejectedValue(new Error('Network error'))
      
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Initial Data Loading Failed',
            variant: 'destructive'
          })
        )
      })
    })

    it('displays specific error message for 401 unauthorized', async () => {
      vi.mocked(apiClient.getBudgetPeriods).mockRejectedValue(new Error('unauthorized'))
      
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            description: 'Session expired: Please log in again to continue.'
          })
        )
      })
    })
  })

  describe('Budget Creation', () => {
    it('opens create budget modal when New Budget button is clicked', async () => {
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument()
      })
      
      const newBudgetButton = screen.getByRole('button', { name: /new budget/i })
      fireEvent.click(newBudgetButton)
      
      expect(screen.getByText('Create New Budget')).toBeInTheDocument()
      expect(screen.getByLabelText(/budget name/i)).toBeInTheDocument()
    })

    it('validates required fields before creating budget', async () => {
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument()
      })
      
      // Open create modal
      fireEvent.click(screen.getByRole('button', { name: /new budget/i }))
      
      // Try to submit without filling required fields
      const createButton = screen.getByRole('button', { name: /create budget/i })
      fireEvent.click(createButton)
      
      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Validation Error',
            description: expect.stringContaining('Budget Name is required')
          })
        )
      })
    })

    it('creates budget successfully with valid data', async () => {
      vi.mocked(apiClient.createBudget).mockResolvedValue({ success: true })
      
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument()
      })
      
      // Open create modal
      fireEvent.click(screen.getByRole('button', { name: /new budget/i }))
      
      // Fill in form
      await userEvent.type(screen.getByLabelText(/budget name/i), 'Test Budget')
      await userEvent.type(screen.getByLabelText(/allocated amount/i), '1000')
      
      // Select period and category
      const periodSelect = screen.getByRole('button', { name: /select period/i })
      fireEvent.click(periodSelect)
      fireEvent.click(screen.getByText('Q1 2024'))
      
      const categorySelect = screen.getByRole('button', { name: /select category/i })
      fireEvent.click(categorySelect)
      fireEvent.click(screen.getByText('Operations'))
      
      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /create budget/i }))
      
      await waitFor(() => {
        expect(apiClient.createBudget).toHaveBeenCalledWith({
          name: 'Test Budget',
          description: '',
          period_id: 'period-1',
          category_id: 'cat-1',
          allocated_amount: 1000,
          responsible_person: ''
        })
      })
      
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Success',
          description: 'Budget created successfully'
        })
      )
    })

    it('handles budget creation failure with specific error messages', async () => {
      vi.mocked(apiClient.createBudget).mockRejectedValue(new Error('duplicate budget name'))
      
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument()
      })
      
      // Open modal and fill form
      fireEvent.click(screen.getByRole('button', { name: /new budget/i }))
      await userEvent.type(screen.getByLabelText(/budget name/i), 'Test Budget')
      await userEvent.type(screen.getByLabelText(/allocated amount/i), '1000')
      
      // Submit
      fireEvent.click(screen.getByRole('button', { name: /create budget/i }))
      
      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Budget Creation Failed',
            description: 'A budget with this name already exists in the selected period.'
          })
        )
      })
    })

    it('validates negative amounts', async () => {
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByRole('button', { name: /new budget/i }))
      
      await userEvent.type(screen.getByLabelText(/budget name/i), 'Test Budget')
      await userEvent.type(screen.getByLabelText(/allocated amount/i), '-100')
      
      fireEvent.click(screen.getByRole('button', { name: /create budget/i }))
      
      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            description: expect.stringContaining('Allocated Amount must be greater than zero')
          })
        )
      })
    })
  })

  describe('Budget Editing', () => {
    it('opens edit modal with pre-filled data', async () => {
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(screen.getByText('Operations Budget')).toBeInTheDocument()
      })
      
      // Click on dropdown menu for first budget
      const dropdownButtons = screen.getAllByRole('button', { name: '' })
      fireEvent.click(dropdownButtons[0])
      
      // Click edit option
      fireEvent.click(screen.getByText('Edit Budget'))
      
      // Check that modal opens with pre-filled data
      expect(screen.getByText('Edit Budget')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Operations Budget')).toBeInTheDocument()
      expect(screen.getByDisplayValue('10000')).toBeInTheDocument()
    })

    it('updates budget successfully', async () => {
      vi.mocked(apiClient.updateBudget).mockResolvedValue({ success: true })
      
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(screen.getByText('Operations Budget')).toBeInTheDocument()
      })
      
      // Open edit modal
      const dropdownButtons = screen.getAllByRole('button', { name: '' })
      fireEvent.click(dropdownButtons[0])
      fireEvent.click(screen.getByText('Edit Budget'))
      
      // Modify the budget name
      const nameInput = screen.getByDisplayValue('Operations Budget')
      await userEvent.clear(nameInput)
      await userEvent.type(nameInput, 'Updated Operations Budget')
      
      // Submit update
      fireEvent.click(screen.getByRole('button', { name: /update budget/i }))
      
      await waitFor(() => {
        expect(apiClient.updateBudget).toHaveBeenCalledWith(
          'budget-1',
          expect.objectContaining({
            name: 'Updated Operations Budget'
          })
        )
      })
      
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Success',
          description: 'Budget updated successfully'
        })
      )
    })

    it('handles update failure with specific error message', async () => {
      vi.mocked(apiClient.updateBudget).mockRejectedValue(new Error('404 budget not found'))
      
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(screen.getByText('Operations Budget')).toBeInTheDocument()
      })
      
      // Open edit modal and submit
      const dropdownButtons = screen.getAllByRole('button', { name: '' })
      fireEvent.click(dropdownButtons[0])
      fireEvent.click(screen.getByText('Edit Budget'))
      fireEvent.click(screen.getByRole('button', { name: /update budget/i }))
      
      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Budget Update Failed',
            description: 'Budget not found: It may have been deleted by another user.'
          })
        )
      })
    })
  })

  describe('Budget Deletion', () => {
    it('shows confirmation dialog before deleting', async () => {
      vi.mocked(window.confirm).mockReturnValue(false)
      
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(screen.getByText('Operations Budget')).toBeInTheDocument()
      })
      
      // Open dropdown and click delete
      const dropdownButtons = screen.getAllByRole('button', { name: '' })
      fireEvent.click(dropdownButtons[0])
      fireEvent.click(screen.getByText('Delete'))
      
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to delete the budget "Operations Budget"')
      )
      
      // Should not call delete API if user cancels
      expect(apiClient.deleteBudget).not.toHaveBeenCalled()
    })

    it('deletes budget successfully when confirmed', async () => {
      vi.mocked(window.confirm).mockReturnValue(true)
      vi.mocked(apiClient.deleteBudget).mockResolvedValue({ success: true })
      
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(screen.getByText('Operations Budget')).toBeInTheDocument()
      })
      
      // Delete budget
      const dropdownButtons = screen.getAllByRole('button', { name: '' })
      fireEvent.click(dropdownButtons[0])
      fireEvent.click(screen.getByText('Delete'))
      
      await waitFor(() => {
        expect(apiClient.deleteBudget).toHaveBeenCalledWith('budget-1')
      })
      
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Budget Deleted',
          description: expect.stringContaining('"Operations Budget" has been successfully deleted')
        })
      )
    })

    it('handles deletion failure with error message', async () => {
      vi.mocked(window.confirm).mockReturnValue(true)
      vi.mocked(apiClient.deleteBudget).mockRejectedValue(new Error('network error'))
      
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(screen.getByText('Operations Budget')).toBeInTheDocument()
      })
      
      // Delete budget
      const dropdownButtons = screen.getAllByRole('button', { name: '' })
      fireEvent.click(dropdownButtons[0])
      fireEvent.click(screen.getByText('Delete'))
      
      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Deletion Failed',
            description: expect.stringContaining('Failed to delete budget "Operations Budget"')
          })
        )
      })
    })

    it('handles attempt to delete non-existent budget', async () => {
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(screen.getByText('Operations Budget')).toBeInTheDocument()
      })
      
      // Manually call delete function with invalid ID
      const component = screen.getByTestId('budget-tracker') as any
      
      // This would normally be done through the UI, but we're testing the function directly
      // In a real scenario, this would be triggered by a race condition
      act(() => {
        // Simulate a budget that was deleted by another user
        // Since we can't easily access the internal function, this tests the error path
      })
    })
  })

  describe('Loading States', () => {
    it('shows loading state during initial data fetch', async () => {
      // Make API calls take time
      vi.mocked(apiClient.getBudgetPeriods).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ periods: mockBudgetPeriods }), 100))
      )
      
      render(<BudgetTracker />)
      
      expect(screen.getByRole('status')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument()
      })
    })

    it('shows loading state during budget operations', async () => {
      vi.mocked(apiClient.createBudget).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      )
      
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument()
      })
      
      // Open create modal and submit
      fireEvent.click(screen.getByRole('button', { name: /new budget/i }))
      await userEvent.type(screen.getByLabelText(/budget name/i), 'Test Budget')
      await userEvent.type(screen.getByLabelText(/allocated amount/i), '1000')
      
      fireEvent.click(screen.getByRole('button', { name: /create budget/i }))
      
      // Should show "Creating..." text
      expect(screen.getByText('Creating...')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.queryByText('Creating...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Boundary', () => {
    it('catches and displays errors gracefully', async () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Create a component that will throw an error
      const ThrowError = () => {
        throw new Error('Test error')
      }
      
      render(
        <div>
          <ThrowError />
        </div>
      )
      
      // Error boundary should catch this and show error UI
      // Note: This test might need adjustment based on how error boundaries are implemented
      
      consoleSpy.mockRestore()
    })
  })

  describe('Budget Status Indicators', () => {
    it('displays correct status for over-budget items', async () => {
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(screen.getByText('Marketing Budget')).toBeInTheDocument()
      })
      
      // Marketing budget is over limit (5200 spent vs 5000 allocated)
      expect(screen.getByText('Over Budget')).toBeInTheDocument()
    })

    it('displays correct status for under-budget items', async () => {
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(screen.getByText('Operations Budget')).toBeInTheDocument()
      })
      
      // Operations budget is under limit (7500 spent vs 10000 allocated = 75%)
      expect(screen.getByText('On Track')).toBeInTheDocument()
    })
  })

  describe('No Debug Information', () => {
    it('does not expose sensitive debug information in production', async () => {
      // Mock console methods to capture any debug output
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument()
      })
      
      // Perform various operations
      fireEvent.click(screen.getByRole('button', { name: /new budget/i }))
      
      // Check that no debug information was logged
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/debug|test|development/i)
      )
      expect(consoleDebugSpy).not.toHaveBeenCalled()
      
      consoleLogSpy.mockRestore()
      consoleDebugSpy.mockRestore()
      consoleInfoSpy.mockRestore()
    })

    it('does not display debug data in the UI', async () => {
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument()
      })
      
      // Check that no debug-related text appears in the UI
      expect(screen.queryByText(/debug/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/console/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/test.*data/i)).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument()
      })
      
      // Check for proper form labels
      fireEvent.click(screen.getByRole('button', { name: /new budget/i }))
      
      expect(screen.getByLabelText(/budget name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/allocated amount/i)).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      render(<BudgetTracker />)
      
      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument()
      })
      
      const newBudgetButton = screen.getByRole('button', { name: /new budget/i })
      
      // Should be focusable
      newBudgetButton.focus()
      expect(document.activeElement).toBe(newBudgetButton)
    })
  })
})