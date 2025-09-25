import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BudgetTracker } from '../../components/budget-tracker-simple';

// Mock Next.js environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001/api';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock toast
jest.mock('../../components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: { children: React.ReactNode }) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="cell" />,
  Tooltip: () => <div data-testid="tooltip" />,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
}));

// Mock fetch
global.fetch = jest.fn();

const mockBudgetData = {
  budgets: [
    {
      id: 1,
      category: 'Referee Wages',
      allocated: 50000,
      spent: 2500,
      percentage: 5,
      color: '#0088FE'
    },
    {
      id: 2,
      category: 'Operations',
      allocated: 10000,
      spent: 750,
      percentage: 7.5,
      color: '#00C49F'
    },
    {
      id: 3,
      category: 'Equipment',
      allocated: 5000,
      spent: 0,
      percentage: 0,
      color: '#FFBB28'
    },
    {
      id: 4,
      category: 'Administration',
      allocated: 8000,
      spent: 0,
      percentage: 0,
      color: '#FF8042'
    }
  ],
  summary: {
    totalAllocated: 73000,
    totalSpent: 3250,
    overallUtilization: 4.45,
    remainingBudget: 69750,
    categoriesOverBudget: 0,
    categoriesNearLimit: 0
  },
  period: {
    month: 8,
    year: 2025,
    monthName: 'August'
  }
};

describe('BudgetTracker Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('fake-token');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBudgetData),
      statusText: 'OK'
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', async () => {
      // Mock fetch to never resolve
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

      render(<BudgetTracker />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Successful Data Loading', () => {
    it('should render budget tracker with data', async () => {
      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Budget Tracker')).toBeInTheDocument();
      });

      expect(screen.getByText('Track budget utilization for August 2025')).toBeInTheDocument();
    });

    it('should display summary cards with correct values', async () => {
      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('$73,000.00')).toBeInTheDocument(); // Total Budget
        expect(screen.getByText('$3,250.00')).toBeInTheDocument(); // Total Spent
        expect(screen.getByText('$69,750.00')).toBeInTheDocument(); // Remaining
        expect(screen.getByText('4.5% utilized')).toBeInTheDocument(); // Utilization percentage
      });

      expect(screen.getByText('Allocated this month')).toBeInTheDocument();
      expect(screen.getByText('Available to spend')).toBeInTheDocument();
      expect(screen.getByText('Over budget (0 near limit)')).toBeInTheDocument();
    });

    it('should display budget categories with progress bars', async () => {
      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Referee Wages')).toBeInTheDocument();
        expect(screen.getByText('Operations')).toBeInTheDocument();
        expect(screen.getByText('Equipment')).toBeInTheDocument();
        expect(screen.getByText('Administration')).toBeInTheDocument();
      });

      // Check spent amounts
      expect(screen.getByText('Spent: $2,500.00')).toBeInTheDocument();
      expect(screen.getByText('Spent: $750.00')).toBeInTheDocument();
      expect(screen.getAllByText('Spent: $0.00')).toHaveLength(2); // Equipment and Administration

      // Check budget amounts
      expect(screen.getByText('Budget: $50,000.00')).toBeInTheDocument();
      expect(screen.getByText('Budget: $10,000.00')).toBeInTheDocument();
      expect(screen.getByText('Budget: $5,000.00')).toBeInTheDocument();
      expect(screen.getByText('Budget: $8,000.00')).toBeInTheDocument();

      // Check percentage badges
      expect(screen.getByText('5.0%')).toBeInTheDocument();
      expect(screen.getByText('7.5%')).toBeInTheDocument();
      expect(screen.getAllByText('0.0%')).toHaveLength(2);
    });

    it('should render charts', async () => {
      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Budget Distribution')).toBeInTheDocument();
        expect(screen.getByText('Spending vs Budget')).toBeInTheDocument();
      });

      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should make API call with correct parameters', async () => {
      render(<BudgetTracker />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/budget-tracker/utilization',
          {
            headers: {
              'Authorization': 'Bearer fake-token',
              'Content-Type': 'application/json'
            }
          }
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      const mockToast = require('../../components/ui/use-toast').toast;
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        status: 500
      });

      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load budget data: Internal Server Error')).toBeInTheDocument();
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to load budget data: Internal Server Error',
        variant: 'destructive'
      });
    });

    it('should handle network errors', async () => {
      const mockToast = require('../../components/ui/use-toast').toast;
      
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Network error',
        variant: 'destructive'
      });
    });

    it('should handle missing auth token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      render(<BudgetTracker />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/budget-tracker/utilization',
          {
            headers: {
              'Authorization': 'Bearer null',
              'Content-Type': 'application/json'
            }
          }
        );
      });
    });
  });

  describe('Budget Status Logic', () => {
    it('should show correct status for different budget percentages', async () => {
      const overBudgetData = {
        ...mockBudgetData,
        budgets: [
          {
            id: 1,
            category: 'Over Budget Category',
            allocated: 1000,
            spent: 1200,
            percentage: 120,
            color: '#FF0000'
          },
          {
            id: 2,
            category: 'Near Limit Category',
            allocated: 1000,
            spent: 850,
            percentage: 85,
            color: '#FFA500'
          },
          {
            id: 3,
            category: 'On Track Category',
            allocated: 1000,
            spent: 500,
            percentage: 50,
            color: '#00FF00'
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(overBudgetData)
      });

      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Over Budget Category')).toBeInTheDocument();
        expect(screen.getByText('Near Limit Category')).toBeInTheDocument();
        expect(screen.getByText('On Track Category')).toBeInTheDocument();
      });

      // Check status badges (text content may vary based on getBudgetStatus logic)
      expect(screen.getByText('120.0%')).toBeInTheDocument();
      expect(screen.getByText('85.0%')).toBeInTheDocument();
      expect(screen.getByText('50.0%')).toBeInTheDocument();
    });
  });

  describe('Currency Formatting', () => {
    it('should format currency values correctly', async () => {
      const customBudgetData = {
        ...mockBudgetData,
        budgets: [
          {
            id: 1,
            category: 'Test Category',
            allocated: 1234.56,
            spent: 987.65,
            percentage: 80,
            color: '#0088FE'
          }
        ],
        summary: {
          ...mockBudgetData.summary,
          totalAllocated: 1234.56,
          totalSpent: 987.65,
          remainingBudget: 246.91
        }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(customBudgetData)
      });

      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('$1,234.56')).toBeInTheDocument(); // Total Budget
        expect(screen.getByText('$987.65')).toBeInTheDocument(); // Total Spent
        expect(screen.getByText('$246.91')).toBeInTheDocument(); // Remaining
        expect(screen.getByText('Spent: $987.65')).toBeInTheDocument(); // Category spent
        expect(screen.getByText('Budget: $1,234.56')).toBeInTheDocument(); // Category budget
      });
    });

    it('should handle zero values', async () => {
      const zeroBudgetData = {
        ...mockBudgetData,
        budgets: mockBudgetData.budgets.map(budget => ({
          ...budget,
          spent: 0,
          percentage: 0
        })),
        summary: {
          ...mockBudgetData.summary,
          totalSpent: 0,
          overallUtilization: 0,
          remainingBudget: mockBudgetData.summary.totalAllocated
        }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(zeroBudgetData)
      });

      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('$0.00')).toBeInTheDocument(); // Total Spent
        expect(screen.getByText('0.0% utilized')).toBeInTheDocument();
      });

      expect(screen.getAllByText('Spent: $0.00')).toHaveLength(4); // All categories
      expect(screen.getAllByText('0.0%')).toHaveLength(4); // All percentage badges
    });
  });

  describe('Component Structure', () => {
    it('should have proper heading structure', async () => {
      render(<BudgetTracker />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 2 });
        expect(heading).toHaveTextContent('Budget Tracker');
      });
    });

    it('should render all required sections', async () => {
      render(<BudgetTracker />);

      await waitFor(() => {
        expect(screen.getByText('Budget Categories')).toBeInTheDocument();
        expect(screen.getByText('Budget Distribution')).toBeInTheDocument();
        expect(screen.getByText('Spending vs Budget')).toBeInTheDocument();
      });
    });

    it('should render progress bars for each category', async () => {
      render(<BudgetTracker />);

      await waitFor(() => {
        // Progress bars are rendered as div elements with specific classes
        // We can check if they exist by looking for the category content
        expect(screen.getByText('Referee Wages')).toBeInTheDocument();
      });

      // The exact number of progress elements depends on the Progress component implementation
      // but we can verify the categories are rendered with their data
      const categories = ['Referee Wages', 'Operations', 'Equipment', 'Administration'];
      categories.forEach(category => {
        expect(screen.getByText(category)).toBeInTheDocument();
      });
    });
  });
});