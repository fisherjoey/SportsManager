import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BudgetTracker } from '@/components/budget-tracker';
import * as apiClient from '@/lib/api';

// Mock the API client
jest.mock('@/lib/api', () => ({
  apiClient: {
    getBudgetPeriods: jest.fn(),
    getBudgetCategories: jest.fn(),
    getBudgets: jest.fn(),
    createBudget: jest.fn(),
    updateBudget: jest.fn(),
    deleteBudget: jest.fn(),
  },
}));

// Mock toast
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

// Mock chart components to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="chart-container">{children}</div>
  ),
  BarChart: ({ children }: any) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  LineChart: ({ children }: any) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  PieChart: ({ children }: any) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('Budget Tracker Phase 1 Tests', () => {
  const mockBudgetPeriods = [
    {
      id: 'period-1',
      name: 'Q1 2025',
      start_date: '2025-01-01',
      end_date: '2025-03-31',
      status: 'active',
    },
  ];

  const mockBudgetCategories = [
    {
      id: 'category-1',
      name: 'Operating Expenses',
      code: 'OPEX',
      category_type: 'operating_expenses',
    },
  ];

  const mockBudgets = [
    {
      id: 'budget-1',
      name: 'Test Budget',
      description: 'Test budget description',
      budget_period_id: 'period-1',
      category_id: 'category-1',
      allocated_amount: 10000,
      actual_spent: 3000,
      committed_amount: 2000,
      reserved_amount: 1000,
      utilization_rate: 60,
      spent_amount: 3000,
      remaining_amount: 4000,
      status: 'active',
      category_name: 'Operating Expenses',
      period_name: 'Q1 2025',
      responsible_person_name: 'John Doe',
    },
  ];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock responses
    (apiClient.apiClient.getBudgetPeriods as jest.Mock).mockResolvedValue({
      periods: mockBudgetPeriods,
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    (apiClient.apiClient.getBudgetCategories as jest.Mock).mockResolvedValue({
      categories: mockBudgetCategories,
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    (apiClient.apiClient.getBudgets as jest.Mock).mockResolvedValue({
      budgets: mockBudgets,
      summary: null,
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  describe('Debug Code Removal Verification', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('should not output any console.log statements during normal operation', async () => {
      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument();
      });

      // Wait for component to fully load
      await waitFor(
        () => {
          expect(screen.getByText('Test Budget')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Verify no console.log calls were made
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    test('should not output debug information when no summary data is available', async () => {
      // Mock empty response
      (apiClient.apiClient.getBudgets as jest.Mock).mockResolvedValue({
        budgets: [],
        summary: null,
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument();
      });

      // Should not contain debug information
      expect(screen.queryByText(/Periods:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Categories:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Budgets:/)).not.toBeInTheDocument();

      // Should show proper error message instead
      expect(
        screen.getByText(/Unable to load budget summary/)
      ).toBeInTheDocument();

      // Verify no console.log calls
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    test('should handle errors without exposing debug information', async () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      // Mock API error
      (apiClient.apiClient.getBudgetPeriods as jest.Mock).mockRejectedValue(
        new Error('API Error')
      );

      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument();
      });

      // Should not expose internal error details
      expect(screen.queryByText(/API Error/)).not.toBeInTheDocument();
      expect(screen.queryByText(/stack trace/i)).not.toBeInTheDocument();

      // Verify no debug console calls
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Safe operation')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Error Handling Improvements', () => {
    test('should display user-friendly error messages', async () => {
      (apiClient.apiClient.getBudgetPeriods as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      render(<BudgetTracker />);

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to load budget periods and categories/)
        ).toBeInTheDocument();
      });
    });

    test('should handle API errors gracefully during budget creation', async () => {
      (apiClient.apiClient.createBudget as jest.Mock).mockRejectedValue(
        new Error('Validation failed')
      );

      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument();
      });

      // Open create modal
      const createButton = screen.getByText('New Budget');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create New Budget')).toBeInTheDocument();
      });

      // Fill out form
      fireEvent.change(screen.getByLabelText(/Budget Name/), {
        target: { value: 'Test Budget' },
      });
      fireEvent.change(screen.getByLabelText(/Allocated Amount/), {
        target: { value: '10000' },
      });

      // Submit form
      const submitButton = screen.getByText('Create Budget');
      fireEvent.click(submitButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Failed to create budget/)).toBeInTheDocument();
      });
    });
  });

  describe('Delete Functionality Testing', () => {
    test('should call delete API when delete is confirmed', async () => {
      (apiClient.apiClient.deleteBudget as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Budget deleted successfully',
      });

      // Mock window.confirm
      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => true);

      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Test Budget')).toBeInTheDocument();
      });

      // Find and click the delete button (in dropdown menu)
      const moreButton = screen.getAllByText('Actions')[0]; // Assuming dropdown trigger
      fireEvent.click(moreButton);

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      // Verify API was called
      await waitFor(() => {
        expect(apiClient.apiClient.deleteBudget).toHaveBeenCalledWith(
          'budget-1'
        );
      });

      // Restore window.confirm
      window.confirm = originalConfirm;
    });

    test('should not call delete API when delete is cancelled', async () => {
      // Mock window.confirm to return false
      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => false);

      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Test Budget')).toBeInTheDocument();
      });

      // Try to delete
      const moreButton = screen.getAllByText('Actions')[0];
      fireEvent.click(moreButton);

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      // Verify API was not called
      expect(apiClient.apiClient.deleteBudget).not.toHaveBeenCalled();

      // Restore window.confirm
      window.confirm = originalConfirm;
    });

    test('should handle delete errors gracefully', async () => {
      (apiClient.apiClient.deleteBudget as jest.Mock).mockRejectedValue(
        new Error('Delete failed')
      );

      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => true);

      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Test Budget')).toBeInTheDocument();
      });

      // Perform delete action
      const moreButton = screen.getAllByText('Actions')[0];
      fireEvent.click(moreButton);

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Failed to delete budget/)).toBeInTheDocument();
      });

      window.confirm = originalConfirm;
    });
  });

  describe('Loading States and User Feedback', () => {
    test('should show loading spinner during initial data load', () => {
      // Mock delayed API response
      (apiClient.apiClient.getBudgetPeriods as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  periods: mockBudgetPeriods,
                  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
                }),
              100
            )
          )
      );

      render(<BudgetTracker />);

      expect(screen.getByTestId('Loading')).toBeInTheDocument();
    });

    test('should show proper empty state when no budgets exist', async () => {
      (apiClient.apiClient.getBudgets as jest.Mock).mockResolvedValue({
        budgets: [],
        summary: {
          totalBudget: 0,
          totalSpent: 0,
          totalRemaining: 0,
          averageUtilization: 0,
          budgetsOverLimit: 0,
          budgetsNearLimit: 0,
          monthlyTrends: [],
          categoryBreakdown: [],
        },
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument();
      });

      // Should show zero values in summary cards
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });
  });

  describe('Form Validation and User Experience', () => {
    test('should validate required fields in budget creation', async () => {
      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument();
      });

      // Open create modal
      const createButton = screen.getByText('New Budget');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create New Budget')).toBeInTheDocument();
      });

      // Try to submit without filling required fields
      const submitButton = screen.getByText('Create Budget');
      fireEvent.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(
          screen.getByText(/Please fill in all required fields/)
        ).toBeInTheDocument();
      });
    });

    test('should prevent negative amounts in budget creation', async () => {
      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument();
      });

      // Open create modal
      const createButton = screen.getByText('New Budget');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create New Budget')).toBeInTheDocument();
      });

      // Try to enter negative amount
      const amountInput = screen.getByLabelText(/Allocated Amount/);
      fireEvent.change(amountInput, { target: { value: '-1000' } });

      // Input should have min="0" attribute
      expect(amountInput).toHaveAttribute('min', '0');
    });
  });

  describe('Data Consistency Verification', () => {
    test('should calculate utilization rates correctly', async () => {
      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Test Budget')).toBeInTheDocument();
      });

      // Find the progress bar or utilization display
      const utilizationText = screen.getByText('60.0%');
      expect(utilizationText).toBeInTheDocument();
    });

    test('should display budget status correctly based on utilization', async () => {
      const overBudgetMock = [
        {
          ...mockBudgets[0],
          utilization_rate: 105,
          actual_spent: 10500,
          status: 'exceeded',
        },
      ];

      (apiClient.apiClient.getBudgets as jest.Mock).mockResolvedValue({
        budgets: overBudgetMock,
        summary: null,
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Over Budget')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    test('should have proper ARIA labels for form elements', async () => {
      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument();
      });

      // Open create modal
      const createButton = screen.getByText('New Budget');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Budget Name/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Allocated Amount/)).toBeInTheDocument();
      });
    });

    test('should handle keyboard navigation properly', async () => {
      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Budget Management')).toBeInTheDocument();
      });

      // Tab navigation should work
      const createButton = screen.getByText('New Budget');
      createButton.focus();
      expect(document.activeElement).toBe(createButton);
    });
  });
});
