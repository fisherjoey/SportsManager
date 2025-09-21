/**
 * Budget Routes Test Suite
 * Comprehensive tests for budget management endpoints
 */

import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
import type {
  BudgetPeriod,
  BudgetCategory,
  Budget,
  BudgetAllocation,
  CreateBudgetPeriodRequest,
  CreateBudgetCategoryRequest,
  CreateBudgetRequest,
  CreateBudgetAllocationRequest,
  BudgetCategoryType
} from '../../types/budget.types';

// Mock dependencies
const mockDb = {
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  first: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  count: jest.fn(),
  leftJoin: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  having: jest.fn().mockReturnThis(),
  raw: jest.fn(),
  transaction: jest.fn()
};

const mockAuthMiddleware = {
  authenticateToken: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      id: 'user-123',
      organization_id: 'org-123',
      roles: ['admin']
    };
    next();
  }),
  requireRole: jest.fn(() => (req: any, res: any, next: any) => next()),
  requirePermission: jest.fn(() => (req: any, res: any, next: any) => next()),
  requireAnyRole: jest.fn(() => (req: any, res: any, next: any) => next()),
  requireAnyPermission: jest.fn(() => (req: any, res: any, next: any) => next())
};

const mockAuditMiddleware = {
  auditMiddleware: jest.fn(() => (req: any, res: any, next: any) => next())
};

// Mock modules
jest.mock('../config/database', () => mockDb);
jest.mock('../middleware/auth', () => mockAuthMiddleware);
jest.mock('../middleware/auditTrail', () => mockAuditMiddleware);

// Import the router after mocking dependencies
let budgetRouter: express.Router;

describe('Budget Routes', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Import router after mocks are set up
    const { default: router } = await import('../budgets');
    budgetRouter = router;

    app = express();
    app.use(express.json());
    app.use('/api/budgets', budgetRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Budget Periods', () => {
    describe('GET /api/budgets/periods', () => {
      it('should return list of budget periods', async () => {
        const mockPeriods: BudgetPeriod[] = [
          {
            id: 'period-1',
            name: 'Q1 2024',
            description: 'First quarter budget',
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-03-31'),
            is_template: false,
            organization_id: 'org-123',
            created_at: new Date(),
            updated_at: new Date()
          }
        ];

        mockDb.count.mockResolvedValueOnce([{ count: '1' }]);
        mockDb.select.mockResolvedValueOnce(mockPeriods);

        const response = await request(app)
          .get('/api/budgets/periods')
          .expect(200);

        expect(response.body).toEqual({
          periods: mockPeriods,
          total: 1,
          page: 1,
          limit: 50
        });
      });

      it('should handle pagination parameters', async () => {
        const mockPeriods: BudgetPeriod[] = [];
        mockDb.count.mockResolvedValueOnce([{ count: '0' }]);
        mockDb.select.mockResolvedValueOnce(mockPeriods);

        await request(app)
          .get('/api/budgets/periods?page=2&limit=10')
          .expect(200);

        expect(mockDb.limit).toHaveBeenCalledWith(10);
        expect(mockDb.offset).toHaveBeenCalledWith(10);
      });

      it('should handle search filter', async () => {
        const mockPeriods: BudgetPeriod[] = [];
        mockDb.count.mockResolvedValueOnce([{ count: '0' }]);
        mockDb.select.mockResolvedValueOnce(mockPeriods);

        await request(app)
          .get('/api/budgets/periods?search=Q1')
          .expect(200);

        expect(mockDb.where).toHaveBeenCalledWith(expect.any(Function));
      });

      it('should handle database errors', async () => {
        mockDb.count.mockRejectedValueOnce(new Error('Database error'));

        const response = await request(app)
          .get('/api/budgets/periods')
          .expect(500);

        expect(response.body).toEqual({
          error: 'Internal server error',
          message: 'Failed to fetch budget periods'
        });
      });
    });

    describe('POST /api/budgets/periods', () => {
      it('should create a new budget period', async () => {
        const newPeriod: CreateBudgetPeriodRequest = {
          name: 'Q2 2024',
          description: 'Second quarter budget',
          start_date: new Date('2024-04-01'),
          end_date: new Date('2024-06-30'),
          is_template: false
        };

        const createdPeriod: BudgetPeriod = {
          id: 'period-2',
          ...newPeriod,
          organization_id: 'org-123',
          created_at: new Date(),
          updated_at: new Date()
        };

        mockDb.select.mockResolvedValueOnce([]); // No overlapping periods
        mockDb.insert.mockResolvedValueOnce([createdPeriod]);

        const response = await request(app)
          .post('/api/budgets/periods')
          .send(newPeriod)
          .expect(201);

        expect(response.body).toEqual(createdPeriod);
      });

      it('should validate required fields', async () => {
        const invalidPeriod = {
          description: 'Missing required fields'
        };

        const response = await request(app)
          .post('/api/budgets/periods')
          .send(invalidPeriod)
          .expect(400);

        expect(response.body.error).toBe('Validation error');
      });

      it('should prevent overlapping periods', async () => {
        const newPeriod: CreateBudgetPeriodRequest = {
          name: 'Overlapping Period',
          start_date: new Date('2024-01-15'),
          end_date: new Date('2024-02-15'),
          is_template: false
        };

        mockDb.select.mockResolvedValueOnce([{ id: 'existing-period' }]); // Overlapping period exists

        const response = await request(app)
          .post('/api/budgets/periods')
          .send(newPeriod)
          .expect(409);

        expect(response.body.error).toBe('Overlapping period');
      });

      it('should validate date range', async () => {
        const invalidPeriod = {
          name: 'Invalid Dates',
          start_date: '2024-06-30',
          end_date: '2024-04-01', // End date before start date
          is_template: false
        };

        const response = await request(app)
          .post('/api/budgets/periods')
          .send(invalidPeriod)
          .expect(400);

        expect(response.body.error).toBe('Validation error');
      });
    });

    describe('DELETE /api/budgets/periods/:id', () => {
      it('should delete a budget period', async () => {
        mockDb.first.mockResolvedValueOnce({ id: 'period-1', organization_id: 'org-123' });
        mockDb.select.mockResolvedValueOnce([]); // No associated budgets
        mockDb.delete.mockResolvedValueOnce(1);

        await request(app)
          .delete('/api/budgets/periods/period-1')
          .expect(200);
      });

      it('should prevent deletion of period with associated budgets', async () => {
        mockDb.first.mockResolvedValueOnce({ id: 'period-1', organization_id: 'org-123' });
        mockDb.select.mockResolvedValueOnce([{ id: 'budget-1' }]); // Has associated budgets

        const response = await request(app)
          .delete('/api/budgets/periods/period-1')
          .expect(409);

        expect(response.body.error).toBe('Period has associated budgets');
      });

      it('should return 404 for non-existent period', async () => {
        mockDb.first.mockResolvedValueOnce(null);

        const response = await request(app)
          .delete('/api/budgets/periods/non-existent')
          .expect(404);

        expect(response.body.error).toBe('Period not found');
      });
    });
  });

  describe('Budget Categories', () => {
    describe('GET /api/budgets/categories', () => {
      it('should return list of budget categories', async () => {
        const mockCategories: BudgetCategory[] = [
          {
            id: 'category-1',
            name: 'Equipment',
            code: 'EQ001',
            description: 'Sports equipment purchases',
            parent_id: null,
            category_type: BudgetCategoryType.EQUIPMENT,
            organization_id: 'org-123',
            created_at: new Date(),
            updated_at: new Date()
          }
        ];

        mockDb.count.mockResolvedValueOnce([{ count: '1' }]);
        mockDb.select.mockResolvedValueOnce(mockCategories);

        const response = await request(app)
          .get('/api/budgets/categories')
          .expect(200);

        expect(response.body).toEqual({
          categories: mockCategories,
          total: 1,
          page: 1,
          limit: 50
        });
      });

      it('should filter by category type', async () => {
        mockDb.count.mockResolvedValueOnce([{ count: '0' }]);
        mockDb.select.mockResolvedValueOnce([]);

        await request(app)
          .get('/api/budgets/categories?category_type=equipment')
          .expect(200);

        expect(mockDb.where).toHaveBeenCalledWith('category_type', 'equipment');
      });

      it('should filter by parent category', async () => {
        mockDb.count.mockResolvedValueOnce([{ count: '0' }]);
        mockDb.select.mockResolvedValueOnce([]);

        await request(app)
          .get('/api/budgets/categories?parent_id=parent-123')
          .expect(200);

        expect(mockDb.where).toHaveBeenCalledWith('parent_id', 'parent-123');
      });
    });

    describe('POST /api/budgets/categories', () => {
      it('should create a new budget category', async () => {
        const newCategory: CreateBudgetCategoryRequest = {
          name: 'Training',
          code: 'TR001',
          description: 'Player training expenses',
          category_type: BudgetCategoryType.TRAINING
        };

        const createdCategory: BudgetCategory = {
          id: 'category-2',
          ...newCategory,
          parent_id: null,
          organization_id: 'org-123',
          created_at: new Date(),
          updated_at: new Date()
        };

        mockDb.first.mockResolvedValueOnce(null); // No duplicate code
        mockDb.insert.mockResolvedValueOnce([createdCategory]);

        const response = await request(app)
          .post('/api/budgets/categories')
          .send(newCategory)
          .expect(201);

        expect(response.body).toEqual(createdCategory);
      });

      it('should prevent duplicate category codes', async () => {
        const duplicateCategory: CreateBudgetCategoryRequest = {
          name: 'Duplicate',
          code: 'EQ001', // Existing code
          category_type: BudgetCategoryType.EQUIPMENT
        };

        mockDb.first.mockResolvedValueOnce({ id: 'existing-category' }); // Duplicate exists

        const response = await request(app)
          .post('/api/budgets/categories')
          .send(duplicateCategory)
          .expect(409);

        expect(response.body.error).toBe('Category code already exists');
      });

      it('should validate category type', async () => {
        const invalidCategory = {
          name: 'Invalid',
          code: 'IV001',
          category_type: 'invalid_type'
        };

        const response = await request(app)
          .post('/api/budgets/categories')
          .send(invalidCategory)
          .expect(400);

        expect(response.body.error).toBe('Validation error');
      });
    });

    describe('DELETE /api/budgets/categories/:id', () => {
      it('should delete a budget category', async () => {
        mockDb.first.mockResolvedValueOnce({ id: 'category-1', organization_id: 'org-123' });
        mockDb.select.mockResolvedValueOnce([]); // No associated budgets
        mockDb.delete.mockResolvedValueOnce(1);

        await request(app)
          .delete('/api/budgets/categories/category-1')
          .expect(200);
      });

      it('should prevent deletion of category with associated budgets', async () => {
        mockDb.first.mockResolvedValueOnce({ id: 'category-1', organization_id: 'org-123' });
        mockDb.select.mockResolvedValueOnce([{ id: 'budget-1' }]); // Has associated budgets

        const response = await request(app)
          .delete('/api/budgets/categories/category-1')
          .expect(409);

        expect(response.body.error).toBe('Category has associated budgets');
      });
    });
  });

  describe('Budgets', () => {
    describe('GET /api/budgets', () => {
      it('should return list of budgets', async () => {
        const mockBudgets: Budget[] = [
          {
            id: 'budget-1',
            budget_period_id: 'period-1',
            category_id: 'category-1',
            name: 'Equipment Budget Q1',
            description: 'Budget for equipment purchases',
            allocated_amount: 50000,
            variance_rules: { warning_threshold: 0.8, error_threshold: 0.9 },
            seasonal_patterns: null,
            owner_id: 'user-123',
            organization_id: 'org-123',
            created_at: new Date(),
            updated_at: new Date()
          }
        ];

        mockDb.count.mockResolvedValueOnce([{ count: '1' }]);
        mockDb.select.mockResolvedValueOnce(mockBudgets);

        const response = await request(app)
          .get('/api/budgets')
          .expect(200);

        expect(response.body).toEqual({
          budgets: mockBudgets,
          total: 1,
          page: 1,
          limit: 50
        });
      });

      it('should filter by period and category', async () => {
        mockDb.count.mockResolvedValueOnce([{ count: '0' }]);
        mockDb.select.mockResolvedValueOnce([]);

        await request(app)
          .get('/api/budgets?period_id=period-1&category_id=category-1')
          .expect(200);

        expect(mockDb.where).toHaveBeenCalledWith('budget_period_id', 'period-1');
        expect(mockDb.where).toHaveBeenCalledWith('category_id', 'category-1');
      });
    });

    describe('POST /api/budgets', () => {
      it('should create a new budget', async () => {
        const newBudget: CreateBudgetRequest = {
          budget_period_id: 'period-1',
          category_id: 'category-1',
          name: 'New Equipment Budget',
          description: 'Budget for new equipment',
          allocated_amount: 30000,
          variance_rules: { warning_threshold: 0.8 }
        };

        const createdBudget: Budget = {
          id: 'budget-2',
          ...newBudget,
          seasonal_patterns: null,
          owner_id: null,
          organization_id: 'org-123',
          created_at: new Date(),
          updated_at: new Date()
        };

        mockDb.first.mockResolvedValueOnce({ id: 'period-1' }); // Period exists
        mockDb.first.mockResolvedValueOnce({ id: 'category-1' }); // Category exists
        mockDb.insert.mockResolvedValueOnce([createdBudget]);

        const response = await request(app)
          .post('/api/budgets')
          .send(newBudget)
          .expect(201);

        expect(response.body).toEqual(createdBudget);
      });

      it('should validate budget period exists', async () => {
        const invalidBudget: CreateBudgetRequest = {
          budget_period_id: 'non-existent',
          category_id: 'category-1',
          name: 'Invalid Budget',
          allocated_amount: 10000
        };

        mockDb.first.mockResolvedValueOnce(null); // Period doesn't exist

        const response = await request(app)
          .post('/api/budgets')
          .send(invalidBudget)
          .expect(400);

        expect(response.body.error).toBe('Invalid budget period');
      });

      it('should validate budget category exists', async () => {
        const invalidBudget: CreateBudgetRequest = {
          budget_period_id: 'period-1',
          category_id: 'non-existent',
          name: 'Invalid Budget',
          allocated_amount: 10000
        };

        mockDb.first.mockResolvedValueOnce({ id: 'period-1' }); // Period exists
        mockDb.first.mockResolvedValueOnce(null); // Category doesn't exist

        const response = await request(app)
          .post('/api/budgets')
          .send(invalidBudget)
          .expect(400);

        expect(response.body.error).toBe('Invalid budget category');
      });

      it('should validate allocated amount is positive', async () => {
        const invalidBudget = {
          budget_period_id: 'period-1',
          category_id: 'category-1',
          name: 'Invalid Budget',
          allocated_amount: -1000
        };

        const response = await request(app)
          .post('/api/budgets')
          .send(invalidBudget)
          .expect(400);

        expect(response.body.error).toBe('Validation error');
      });
    });

    describe('GET /api/budgets/:id', () => {
      it('should return a specific budget', async () => {
        const mockBudget: Budget = {
          id: 'budget-1',
          budget_period_id: 'period-1',
          category_id: 'category-1',
          name: 'Equipment Budget Q1',
          description: 'Budget for equipment purchases',
          allocated_amount: 50000,
          variance_rules: null,
          seasonal_patterns: null,
          owner_id: null,
          organization_id: 'org-123',
          created_at: new Date(),
          updated_at: new Date()
        };

        mockDb.first.mockResolvedValueOnce(mockBudget);

        const response = await request(app)
          .get('/api/budgets/budget-1')
          .expect(200);

        expect(response.body).toEqual(mockBudget);
      });

      it('should return 404 for non-existent budget', async () => {
        mockDb.first.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/api/budgets/non-existent')
          .expect(404);

        expect(response.body.error).toBe('Budget not found');
      });
    });

    describe('PUT /api/budgets/:id', () => {
      it('should update an existing budget', async () => {
        const updateData = {
          name: 'Updated Equipment Budget',
          allocated_amount: 60000,
          description: 'Updated description'
        };

        const existingBudget = {
          id: 'budget-1',
          organization_id: 'org-123'
        };

        const updatedBudget: Budget = {
          id: 'budget-1',
          budget_period_id: 'period-1',
          category_id: 'category-1',
          name: 'Updated Equipment Budget',
          description: 'Updated description',
          allocated_amount: 60000,
          variance_rules: null,
          seasonal_patterns: null,
          owner_id: null,
          organization_id: 'org-123',
          created_at: new Date(),
          updated_at: new Date()
        };

        mockDb.first.mockResolvedValueOnce(existingBudget);
        mockDb.update.mockResolvedValueOnce([updatedBudget]);

        const response = await request(app)
          .put('/api/budgets/budget-1')
          .send(updateData)
          .expect(200);

        expect(response.body).toEqual(updatedBudget);
      });

      it('should return 404 for non-existent budget', async () => {
        mockDb.first.mockResolvedValueOnce(null);

        const response = await request(app)
          .put('/api/budgets/non-existent')
          .send({ name: 'Updated Name' })
          .expect(404);

        expect(response.body.error).toBe('Budget not found');
      });
    });

    describe('DELETE /api/budgets/:id', () => {
      it('should delete a budget', async () => {
        mockDb.first.mockResolvedValueOnce({ id: 'budget-1', organization_id: 'org-123' });
        mockDb.select.mockResolvedValueOnce([]); // No allocations
        mockDb.delete.mockResolvedValueOnce(1);

        await request(app)
          .delete('/api/budgets/budget-1')
          .expect(200);
      });

      it('should prevent deletion of budget with allocations', async () => {
        mockDb.first.mockResolvedValueOnce({ id: 'budget-1', organization_id: 'org-123' });
        mockDb.select.mockResolvedValueOnce([{ id: 'allocation-1' }]); // Has allocations

        const response = await request(app)
          .delete('/api/budgets/budget-1')
          .expect(409);

        expect(response.body.error).toBe('Budget has allocations');
      });
    });
  });

  describe('Budget Allocations', () => {
    describe('POST /api/budgets/:id/allocations', () => {
      it('should create a budget allocation', async () => {
        const newAllocation: Omit<CreateBudgetAllocationRequest, 'budget_id'> = {
          allocation_year: 2024,
          allocation_month: 1,
          allocated_amount: 10000,
          notes: 'January allocation'
        };

        const createdAllocation: BudgetAllocation = {
          id: 'allocation-1',
          budget_id: 'budget-1',
          ...newAllocation,
          created_at: new Date(),
          updated_at: new Date()
        };

        mockDb.first.mockResolvedValueOnce({ id: 'budget-1', organization_id: 'org-123' });
        mockDb.insert.mockResolvedValueOnce([createdAllocation]);

        const response = await request(app)
          .post('/api/budgets/budget-1/allocations')
          .send(newAllocation)
          .expect(201);

        expect(response.body).toEqual(createdAllocation);
      });

      it('should validate allocation year range', async () => {
        const invalidAllocation = {
          allocation_year: 2019, // Before minimum year
          allocation_month: 1,
          allocated_amount: 10000
        };

        const response = await request(app)
          .post('/api/budgets/budget-1/allocations')
          .send(invalidAllocation)
          .expect(400);

        expect(response.body.error).toBe('Validation error');
      });

      it('should validate allocation month range', async () => {
        const invalidAllocation = {
          allocation_year: 2024,
          allocation_month: 13, // Invalid month
          allocated_amount: 10000
        };

        const response = await request(app)
          .post('/api/budgets/budget-1/allocations')
          .send(invalidAllocation)
          .expect(400);

        expect(response.body.error).toBe('Validation error');
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      // Reset auth middleware to simulate unauthenticated request
      mockAuthMiddleware.authenticateToken.mockImplementationOnce((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      await request(app)
        .get('/api/budgets/periods')
        .expect(401);
    });

    it('should require proper permissions', async () => {
      mockAuthMiddleware.requirePermission.mockImplementationOnce(() => (req: any, res: any, next: any) => {
        res.status(403).json({ error: 'Insufficient permissions' });
      });

      await request(app)
        .get('/api/budgets/periods')
        .expect(403);
    });

    it('should check organization access', async () => {
      // Mock user from different organization
      mockAuthMiddleware.authenticateToken.mockImplementationOnce((req: any, res: any, next: any) => {
        req.user = {
          id: 'user-456',
          organization_id: 'different-org',
          roles: ['user']
        };
        next();
      });

      mockDb.first.mockResolvedValueOnce({ id: 'budget-1', organization_id: 'org-123' });

      const response = await request(app)
        .get('/api/budgets/budget-1')
        .expect(404);

      expect(response.body.error).toBe('Budget not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockDb.count.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/budgets/periods')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });

    it('should handle malformed UUID parameters', async () => {
      const response = await request(app)
        .get('/api/budgets/invalid-uuid')
        .expect(400);

      expect(response.body.error).toBe('Invalid budget ID format');
    });

    it('should handle JSON parsing errors', async () => {
      const response = await request(app)
        .post('/api/budgets/periods')
        .send('{"invalid": json"}')
        .type('application/json')
        .expect(400);
    });
  });

  describe('Data Validation', () => {
    it('should validate required string fields are not empty', async () => {
      const invalidPeriod = {
        name: '', // Empty string
        start_date: '2024-01-01',
        end_date: '2024-03-31'
      };

      const response = await request(app)
        .post('/api/budgets/periods')
        .send(invalidPeriod)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    it('should validate string length limits', async () => {
      const invalidCategory = {
        name: 'A'.repeat(101), // Exceeds 100 character limit
        code: 'TEST',
        category_type: 'equipment'
      };

      const response = await request(app)
        .post('/api/budgets/categories')
        .send(invalidCategory)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    it('should validate UUID format for references', async () => {
      const invalidBudget = {
        budget_period_id: 'not-a-uuid',
        category_id: 'category-1',
        name: 'Test Budget',
        allocated_amount: 10000
      };

      const response = await request(app)
        .post('/api/budgets')
        .send(invalidBudget)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });
  });
});