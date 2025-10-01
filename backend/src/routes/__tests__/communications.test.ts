/**
 * @fileoverview Communications Routes Integration Tests
 *
 * Comprehensive test suite for the communications routes following TDD approach.
 * Tests all endpoints with proper authentication, authorization, and data validation.
 */

import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';

// Mock dependencies
const mockDb: any = {
  select: (jest.fn() as any).mockReturnThis(),
  where: (jest.fn() as any).mockReturnThis(),
  whereIn: (jest.fn() as any).mockReturnThis(),
  orWhere: (jest.fn() as any).mockReturnThis(),
  join: (jest.fn() as any).mockReturnThis(),
  leftJoin: (jest.fn() as any).mockReturnThis(),
  orderBy: (jest.fn() as any).mockReturnThis(),
  groupBy: (jest.fn() as any).mockReturnThis(),
  first: (jest.fn() as any).mockResolvedValue(null),
  insert: (jest.fn() as any).mockReturnThis(),
  update: (jest.fn() as any).mockReturnThis(),
  del: (jest.fn() as any).mockResolvedValue(1),
  returning: (jest.fn() as any).mockResolvedValue([]),
  count: (jest.fn() as any).mockReturnThis(),
  pluck: (jest.fn() as any).mockResolvedValue([]),
  raw: jest.fn() as any,
  transaction: jest.fn() as any
};

const mockCacheHelpers: any = {
  cacheAggregation: (jest.fn() as any).mockResolvedValue({ communications: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } }),
  cachePaginatedQuery: (jest.fn() as any).mockResolvedValue(null),
  cacheLookupData: (jest.fn() as any).mockResolvedValue([])
};

const mockCacheInvalidation = {
  invalidateCommunications: jest.fn()
};

const mockQueryBuilder = {
  validatePaginationParams: jest.fn().mockImplementation((params: any) => ({
    page: parseInt(params.page) || 1,
    limit: parseInt(params.limit) || 50
  })),
  applyCommonFilters: jest.fn().mockReturnValue(mockDb),
  buildCountQuery: jest.fn().mockReturnValue(Promise.resolve([{ count: 0 }])),
  applyPagination: jest.fn().mockReturnValue(mockDb)
};

const mockAuth = {
  authenticateToken: jest.fn().mockImplementation((req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', role: 'admin', name: 'Test User' };
    next();
  })
};

const mockCerbos = {
  requireCerbosPermission: jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next())
};

const mockValidation = {
  validateBody: jest.fn().mockImplementation((schema: any) => (req: any, res: any, next: any) => next()),
  validateParams: jest.fn().mockImplementation((schema: any) => (req: any, res: any, next: any) => next()),
  validateQuery: jest.fn().mockImplementation((schema: any) => (req: any, res: any, next: any) => next())
};

const mockResponseFormatter = {
  sendSuccess: jest.fn().mockImplementation((res: any, data: any, message?: string) => {
    res.json({ success: true, data, message });
  }),
  sendCreated: jest.fn().mockImplementation((res: any, data: any, message?: string, location?: string) => {
    res.status(201).json({ success: true, data, message });
  }),
  sendError: jest.fn().mockImplementation((res: any, error: any, statusCode: number) => {
    res.status(statusCode).json({ error: error.message || error });
  })
};

const mockEnhancedAsyncHandler = jest.fn().mockImplementation((fn: any) => async (req: any, res: any, next: any) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    next(error);
  }
});

const mockErrorFactory = {
  badRequest: (jest.fn() as any)((message: string) => new Error(message)),
  notFound: (jest.fn() as any)((message: string) => new Error(message)),
  conflict: (jest.fn() as any)((message: string) => new Error(message))
};

const mockFileUpload = {
  receiptUploader: {
    array: jest.fn().mockImplementation((fieldName: string, maxCount: number) =>
      (req: any, res: any, next: any) => {
        req.files = [];
        next();
      }
    )
  }
};

const mockCommunicationService = {
  getCommunications: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 }),
  getCommunicationById: jest.fn().mockResolvedValue(null),
  createCommunication: jest.fn().mockResolvedValue({ id: 'comm-new' }),
  updateCommunication: jest.fn().mockResolvedValue(null),
  publishCommunication: jest.fn().mockResolvedValue({ id: 'comm-1', status: 'published' }),
  archiveCommunication: jest.fn().mockResolvedValue(null),
  acknowledgeCommunication: jest.fn().mockResolvedValue(false),
  getCommunicationRecipients: jest.fn().mockResolvedValue(null),
  getUnreadCount: jest.fn().mockResolvedValue(0),
  getPendingAcknowledgments: jest.fn().mockResolvedValue([]),
  getCommunicationStats: jest.fn().mockResolvedValue({}),
  markAsRead: jest.fn().mockResolvedValue(true)
};

// Mock modules
jest.mock('../../config/database', () => mockDb);
jest.mock('../../utils/query-cache', () => ({
  queryCache: {},
  CacheHelpers: mockCacheHelpers,
  CacheInvalidation: mockCacheInvalidation
}));
jest.mock('../../utils/query-builders', () => ({
  QueryBuilder: mockQueryBuilder,
  QueryHelpers: {}
}));
jest.mock('../../middleware/auth', () => mockAuth);
jest.mock('../../middleware/requireCerbosPermission', () => mockCerbos);
jest.mock('../../middleware/validation', () => mockValidation);
jest.mock('../../middleware/fileUpload', () => mockFileUpload);
jest.mock('../../utils/response-formatters', () => ({ ResponseFormatter: mockResponseFormatter }));
jest.mock('../../middleware/enhanced-error-handling', () => ({ enhancedAsyncHandler: mockEnhancedAsyncHandler }));
jest.mock('../../utils/errors', () => ({ ErrorFactory: mockErrorFactory }));
jest.mock('../../services/CommunicationService', () => ({
  CommunicationService: jest.fn().mockImplementation(() => mockCommunicationService)
}));
jest.mock('joi', () => {
  // Create a comprehensive chainable mock that handles all Joi methods
  const createChainableMock = (): any => {
    const mock: any = {};

    // Define all Joi methods that need to be chainable
    const chainableMethods = [
      'string', 'number', 'boolean', 'array', 'object', 'date', 'binary',
      'required', 'optional', 'allow', 'valid', 'invalid', 'default',
      'min', 'max', 'length', 'email', 'uri', 'uuid', 'integer',
      'positive', 'negative', 'items', 'keys', 'pattern', 'regex',
      'alphanum', 'token', 'hex', 'base64', 'lowercase', 'uppercase',
      'trim', 'replace', 'truncate', 'normalize', 'when', 'alternatives',
      'alt', 'concat', 'raw', 'empty', 'strip', 'label', 'description',
      'notes', 'tags', 'meta', 'example', 'unit', 'messages', 'prefs',
      'preferences', 'strict', 'options', 'fork', 'validate', 'partial'
    ];

    // Create mock functions for all chainable methods
    chainableMethods.forEach(method => {
      if (method === 'validate') {
        mock[method] = jest.fn().mockReturnValue({ error: null, value: {} });
      } else if (method === 'partial') {
        mock[method] = jest.fn().mockReturnValue(mock); // Return self for chaining
      } else {
        mock[method] = jest.fn().mockReturnValue(mock); // Return self for chaining
      }
    });

    return mock;
  };

  // Create the main Joi mock
  const joiMock = createChainableMock();

  // Override specific methods that return schemas
  joiMock.object = jest.fn().mockImplementation((schema?: any) => {
    const schemaMock = createChainableMock();
    return schemaMock;
  });

  joiMock.array = jest.fn().mockImplementation(() => createChainableMock());
  joiMock.string = jest.fn().mockImplementation(() => createChainableMock());
  joiMock.number = jest.fn().mockImplementation(() => createChainableMock());
  joiMock.boolean = jest.fn().mockImplementation(() => createChainableMock());

  return {
    default: joiMock,
    __esModule: true
  };
});

describe('Communications Routes Integration Tests', () => {
  let app: express.Application;
  let communicationsRouter: express.Router;

  beforeEach(() => {
    jest.clearAllMocks();

    // Restore default mock implementations after clearAllMocks
    mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
      req.user = { id: 'test-user-id', role: 'admin', name: 'Test User' };
      next();
    });
    mockCerbos.requireCerbosPermission.mockImplementation(() => (req: any, res: any, next: any) => next());
    mockValidation.validateBody.mockImplementation((schema: any) => (req: any, res: any, next: any) => next());
    mockValidation.validateParams.mockImplementation((schema: any) => (req: any, res: any, next: any) => next());
    mockValidation.validateQuery.mockImplementation((schema: any) => (req: any, res: any, next: any) => next());
    mockEnhancedAsyncHandler.mockImplementation((fn: any) => async (req: any, res: any, next: any) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        next(error);
      }
    });
    mockQueryBuilder.validatePaginationParams.mockImplementation((params: any) => ({
      page: parseInt(params.page) || 1,
      limit: parseInt(params.limit) || 50
    }));
    mockQueryBuilder.applyCommonFilters.mockReturnValue(mockDb);
    mockQueryBuilder.buildCountQuery.mockReturnValue(Promise.resolve([{ count: 0 }]));
    mockQueryBuilder.applyPagination.mockReturnValue(mockDb);
    mockCacheHelpers.cacheAggregation.mockResolvedValue({ communications: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } });
    mockCacheHelpers.cachePaginatedQuery.mockResolvedValue(null);
    mockCacheHelpers.cacheLookupData.mockResolvedValue([]);
    mockFileUpload.receiptUploader.array.mockImplementation((fieldName: string, maxCount: number) =>
      (req: any, res: any, next: any) => {
        req.files = [];
        next();
      }
    );

    // Reset CommunicationService mocks
    mockCommunicationService.getCommunications.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });
    mockCommunicationService.getCommunicationById.mockResolvedValue(null);
    mockCommunicationService.createCommunication.mockResolvedValue({ id: 'comm-new' });
    mockCommunicationService.updateCommunication.mockResolvedValue(null);
    mockCommunicationService.publishCommunication.mockResolvedValue({ id: 'comm-1', status: 'published' });
    mockCommunicationService.archiveCommunication.mockResolvedValue(null);
    mockCommunicationService.acknowledgeCommunication.mockResolvedValue(false);
    mockCommunicationService.getCommunicationRecipients.mockResolvedValue(null);
    mockCommunicationService.getUnreadCount.mockResolvedValue(0);
    mockCommunicationService.getPendingAcknowledgments.mockResolvedValue([]);
    mockCommunicationService.getCommunicationStats.mockResolvedValue({});
    mockCommunicationService.markAsRead.mockResolvedValue(true);

    app = express();
    app.use(express.json());

    // Import the router after mocks are set up
    communicationsRouter = require('../communications').default;
    app.use('/communications', communicationsRouter);
  });

  describe('Route Module Structure', () => {
    it('should be able to import the communications routes module', () => {
      expect(() => {
        require('../communications');
      }).not.toThrow();
    });

    it('should export an express router', () => {
      const routeModule = require('../communications').default;
      expect(routeModule).toBeDefined();
      expect(typeof routeModule).toBe('function'); // Express router is a function
    });
  });

  describe('GET / - Get all communications', () => {
    const mockCommunications = [
      {
        id: 'comm-1',
        title: 'Test Communication',
        content: 'Test content',
        type: 'announcement',
        priority: 'normal',
        author_name: 'Test Author',
        sent_at: new Date(),
        read_at: null,
        acknowledged_at: null,
        delivery_status: 'delivered',
        is_unread: true,
        requires_ack: false
      },
      {
        id: 'comm-2',
        title: 'Urgent Update',
        content: 'Urgent content',
        type: 'emergency',
        priority: 'urgent',
        author_name: 'Admin User',
        sent_at: new Date(),
        read_at: new Date(),
        acknowledged_at: null,
        delivery_status: 'delivered',
        is_unread: false,
        requires_ack: true
      }
    ];

    it('should require authentication and permissions', async () => {
      mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const response = await request(app)
        .get('/communications')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should fetch all communications with default pagination', async () => {
      mockCommunicationService.getCommunications.mockResolvedValue({
        items: mockCommunications,
        total: mockCommunications.length,
        page: 1,
        limit: 10
      });

      const response = await request(app)
        .get('/communications')
        .expect(200);

      expect(response.body).toEqual({
        items: mockCommunications,
        total: mockCommunications.length,
        page: 1,
        limit: 10
      });
      expect(mockCommunicationService.getCommunications).toHaveBeenCalledWith(
        'test-user-id',
        'admin',
        expect.objectContaining({
          status: 'published',
          page: 1,
          limit: 10
        })
      );
    });

    it('should apply filters correctly', async () => {
      mockCommunicationService.getCommunications.mockResolvedValue({
        items: [mockCommunications[1]],
        total: 1,
        page: 1,
        limit: 10
      });

      const response = await request(app)
        .get('/communications')
        .query({
          type: 'emergency',
          priority: 'urgent',
          unread_only: 'false',
          page: 1,
          limit: 10
        })
        .expect(200);

      expect(mockCommunicationService.getCommunications).toHaveBeenCalledWith(
        'test-user-id',
        'admin',
        expect.objectContaining({
          type: 'emergency',
          priority: 'urgent',
          unread_only: false,
          page: 1,
          limit: 10
        })
      );
    });

    it('should apply unread_only filter', async () => {
      mockCommunicationService.getCommunications.mockResolvedValue({
        items: [mockCommunications[0]],
        total: 1,
        page: 1,
        limit: 10
      });

      await request(app)
        .get('/communications')
        .query({ unread_only: 'true' })
        .expect(200);

      expect(mockCommunicationService.getCommunications).toHaveBeenCalledWith(
        'test-user-id',
        'admin',
        expect.objectContaining({ unread_only: true })
      );
    });

    it('should handle pagination correctly', async () => {
      mockCommunicationService.getCommunications.mockResolvedValue({
        items: mockCommunications,
        total: mockCommunications.length,
        page: 2,
        limit: 1
      });

      const response = await request(app)
        .get('/communications')
        .query({ page: 2, limit: 1 })
        .expect(200);

      expect(mockCommunicationService.getCommunications).toHaveBeenCalledWith(
        'test-user-id',
        'admin',
        expect.objectContaining({ page: 2, limit: 1 })
      );
    });

    it('should handle service errors gracefully', async () => {
      mockCommunicationService.getCommunications.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/communications')
        .expect(200);

      expect(response.body).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 10
      });
    });
  });

  describe('GET /:id - Get single communication', () => {
    const mockCommunication = {
      id: 'comm-1',
      title: 'Test Communication',
      content: 'Test content',
      author_name: 'Test Author',
      sent_at: new Date(),
      read_at: null,
      acknowledged_at: null,
      delivery_status: 'delivered'
    };

    it('should fetch single communication by ID', async () => {
      mockCommunicationService.getCommunicationById.mockResolvedValue(mockCommunication);

      const response = await request(app)
        .get('/communications/comm-1')
        .expect(200);

      expect(response.body).toEqual(mockCommunication);
      expect(mockCommunicationService.getCommunicationById).toHaveBeenCalledWith(
        'comm-1',
        'test-user-id',
        'admin'
      );
    });

    it('should mark communication as read when accessed', async () => {
      const unreadComm = { ...mockCommunication, sent_at: new Date(), read_at: null };
      mockCommunicationService.getCommunicationById.mockResolvedValue(unreadComm);

      await request(app)
        .get('/communications/comm-1')
        .expect(200);

      expect(mockCommunicationService.markAsRead).toHaveBeenCalledWith('comm-1', 'test-user-id');
    });

    it('should return 404 for non-existent communication', async () => {
      mockCommunicationService.getCommunicationById.mockResolvedValue(null);

      await request(app)
        .get('/communications/non-existent')
        .expect(404);
    });

    it('should handle service errors', async () => {
      mockCommunicationService.getCommunicationById.mockRejectedValue(new Error('Service error'));

      await request(app)
        .get('/communications/comm-1')
        .expect(500);
    });
  });

  describe('POST / - Create new communication', () => {
    const validCommunicationData = {
      title: 'New Communication',
      content: 'Communication content',
      type: 'announcement',
      priority: 'normal',
      target_audience: {
        all_users: true,
        departments: null,
        roles: null,
        specific_users: null
      },
      requires_acknowledgment: false,
      tags: ['test', 'announcement']
    };

    beforeEach(() => {
      mockCommunicationService.createCommunication.mockResolvedValue({
        id: 'comm-new',
        ...validCommunicationData,
        author_id: 'test-user-id',
        status: 'draft',
        created_at: new Date()
      });
    });

    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .post('/communications')
        .send(validCommunicationData)
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should create new communication successfully', async () => {
      const response = await request(app)
        .post('/communications')
        .send(validCommunicationData)
        .expect(201);

      expect(response.body).toHaveProperty('id', 'comm-new');
      expect(mockCommunicationService.createCommunication).toHaveBeenCalledWith(
        expect.objectContaining(validCommunicationData),
        'test-user-id',
        []
      );
    });

    it('should validate required fields', async () => {
      const joiMock = require('joi').default;
      joiMock.object.mockReturnValue({
        validate: (jest.fn() as any).mockReturnValue({
          error: { details: [{ message: 'Title is required' }] },
          value: null
        })
      });

      const invalidData = { ...validCommunicationData };
      delete invalidData.title;

      await request(app)
        .post('/communications')
        .send(invalidData)
        .expect(400);
    });

    it('should validate communication type', async () => {
      const joiMock = require('joi').default;
      joiMock.object.mockReturnValue({
        validate: (jest.fn() as any).mockReturnValue({
          error: { details: [{ message: 'Invalid communication type' }] },
          value: null
        })
      });

      const invalidData = { ...validCommunicationData, type: 'invalid_type' };

      await request(app)
        .post('/communications')
        .send(invalidData)
        .expect(400);
    });

    it('should validate priority level', async () => {
      const joiMock = require('joi').default;
      joiMock.object.mockReturnValue({
        validate: (jest.fn() as any).mockReturnValue({
          error: { details: [{ message: 'Invalid priority level' }] },
          value: null
        })
      });

      const invalidData = { ...validCommunicationData, priority: 'invalid_priority' };

      await request(app)
        .post('/communications')
        .send(invalidData)
        .expect(400);
    });

    it('should handle file attachments', async () => {
      mockFileUpload.receiptUploader.array.mockImplementationOnce((fieldName: string, maxCount: number) =>
        (req: any, res: any, next: any) => {
          req.files = [
            {
              originalname: 'document.pdf',
              path: '/uploads/document.pdf',
              size: 12345,
              mimetype: 'application/pdf'
            }
          ];
          next();
        }
      );

      const response = await request(app)
        .post('/communications')
        .send(validCommunicationData)
        .expect(201);

      expect(mockCommunicationService.createCommunication).toHaveBeenCalledWith(
        expect.objectContaining(validCommunicationData),
        'test-user-id',
        expect.arrayContaining([
          expect.objectContaining({ filename: 'document.pdf' })
        ])
      );
    });

    it('should handle service errors during creation', async () => {
      mockCommunicationService.createCommunication.mockRejectedValue(new Error('Service error'));

      await request(app)
        .post('/communications')
        .send(validCommunicationData)
        .expect(500);
    });
  });

  describe('PUT /:id - Update communication', () => {
    const updateData = {
      title: 'Updated Communication',
      content: 'Updated content',
      priority: 'high'
    };

    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .put('/communications/comm-1')
        .send(updateData)
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should update draft communication successfully', async () => {
      mockCommunicationService.updateCommunication.mockResolvedValue({
        id: 'comm-1',
        ...updateData
      });

      const response = await request(app)
        .put('/communications/comm-1')
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject(updateData);
      expect(mockCommunicationService.updateCommunication).toHaveBeenCalledWith(
        'comm-1',
        updateData,
        'test-user-id',
        'admin'
      );
    });

    it('should prevent editing published communications', async () => {
      const error = new Error('Only draft communications can be edited');
      mockCommunicationService.updateCommunication.mockRejectedValue(error);

      await request(app)
        .put('/communications/comm-1')
        .send(updateData)
        .expect(400);
    });

    it('should return 404 for non-existent communication', async () => {
      mockCommunicationService.updateCommunication.mockResolvedValue(null);

      await request(app)
        .put('/communications/non-existent')
        .send(updateData)
        .expect(404);
    });

    it('should validate update data', async () => {
      const joiMock = require('joi').default;
      const mockSchema = {
        partial: jest.fn().mockReturnValue({
          validate: jest.fn().mockReturnValue({
            error: { details: [{ message: 'Invalid type' }] },
            value: null
          })
        })
      };
      joiMock.object.mockReturnValue(mockSchema);

      const invalidData = { type: 'invalid_type' };

      await request(app)
        .put('/communications/comm-1')
        .send(invalidData)
        .expect(400);
    });

    it('should handle empty updates', async () => {
      await request(app)
        .put('/communications/comm-1')
        .send({})
        .expect(400);
    });
  });

  describe('POST /:id/publish - Publish communication', () => {
    const mockCommunication = {
      id: 'comm-1',
      title: 'Draft Communication',
      target_audience: { all_users: true }
    };

    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .post('/communications/comm-1/publish')
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should publish draft communication successfully', async () => {
      mockCommunicationService.publishCommunication.mockResolvedValue({
        ...mockCommunication,
        status: 'published',
        recipient_count: 2
      });

      const response = await request(app)
        .post('/communications/comm-1/publish')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'published');
      expect(response.body).toHaveProperty('recipient_count', 2);
      expect(mockCommunicationService.publishCommunication).toHaveBeenCalledWith(
        'comm-1',
        'test-user-id',
        'admin'
      );
    });

    it('should return 404 for non-existent draft', async () => {
      const error = new Error('Draft communication not found or permission denied');
      mockCommunicationService.publishCommunication.mockRejectedValue(error);

      await request(app)
        .post('/communications/non-existent/publish')
        .expect(404);
    });

    it('should handle service errors during publishing', async () => {
      mockCommunicationService.publishCommunication.mockRejectedValue(new Error('Service error'));

      await request(app)
        .post('/communications/comm-1/publish')
        .expect(500);
    });
  });

  describe('POST /:id/archive - Archive communication', () => {
    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .post('/communications/comm-1/archive')
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should archive communication successfully', async () => {
      mockCommunicationService.archiveCommunication.mockResolvedValue({
        id: 'comm-1',
        status: 'archived'
      });

      const response = await request(app)
        .post('/communications/comm-1/archive')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'archived');
      expect(mockCommunicationService.archiveCommunication).toHaveBeenCalledWith(
        'comm-1',
        'test-user-id',
        'admin'
      );
    });

    it('should return 404 for non-existent communication', async () => {
      mockCommunicationService.archiveCommunication.mockResolvedValue(null);

      await request(app)
        .post('/communications/non-existent/archive')
        .expect(404);
    });
  });

  describe('POST /:id/acknowledge - Acknowledge communication', () => {
    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .post('/communications/comm-1/acknowledge')
        .send({ acknowledgment_text: 'Acknowledged' })
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should acknowledge communication successfully', async () => {
      mockCommunicationService.acknowledgeCommunication.mockResolvedValue(true);

      const response = await request(app)
        .post('/communications/comm-1/acknowledge')
        .send({ acknowledgment_text: 'Acknowledged' })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Communication acknowledged successfully');
      expect(mockCommunicationService.acknowledgeCommunication).toHaveBeenCalledWith(
        'comm-1',
        'test-user-id',
        'Acknowledged'
      );
    });

    it('should return 404 for non-acknowledgeable communication', async () => {
      mockCommunicationService.acknowledgeCommunication.mockResolvedValue(false);

      await request(app)
        .post('/communications/comm-1/acknowledge')
        .expect(404);
    });
  });

  describe('GET /:id/recipients - Get communication recipients', () => {
    const mockRecipients = {
      recipients: [
        {
          id: 'recipient-1',
          recipient_name: 'User One',
          recipient_email: 'user1@example.com',
          employee_id: 'EMP001',
          department_name: 'IT',
          delivery_status: 'delivered',
          read_at: new Date(),
          acknowledged_at: null
        },
        {
          id: 'recipient-2',
          recipient_name: 'User Two',
          recipient_email: 'user2@example.com',
          employee_id: 'EMP002',
          department_name: 'HR',
          delivery_status: 'delivered',
          read_at: null,
          acknowledged_at: null
        }
      ],
      statistics: {
        total_recipients: 2,
        delivered: 2,
        read: 1,
        acknowledged: 0,
        failed: 0
      }
    };

    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .get('/communications/comm-1/recipients')
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should get communication recipients successfully', async () => {
      mockCommunicationService.getCommunicationRecipients.mockResolvedValue(mockRecipients);

      const response = await request(app)
        .get('/communications/comm-1/recipients')
        .expect(200);

      expect(response.body).toEqual(mockRecipients);
      expect(mockCommunicationService.getCommunicationRecipients).toHaveBeenCalledWith(
        'comm-1',
        'test-user-id',
        'admin'
      );
    });

    it('should return 404 for unauthorized access', async () => {
      mockCommunicationService.getCommunicationRecipients.mockResolvedValue(null);

      await request(app)
        .get('/communications/comm-1/recipients')
        .expect(404);
    });
  });

  describe('GET /unread/count - Get unread count', () => {
    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .get('/communications/unread/count')
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should get unread communications count', async () => {
      mockCommunicationService.getUnreadCount.mockResolvedValue(5);

      const response = await request(app)
        .get('/communications/unread/count')
        .expect(200);

      expect(response.body).toEqual({ unread_count: 5 });
      expect(mockCommunicationService.getUnreadCount).toHaveBeenCalledWith('test-user-id');
    });

    it('should handle service errors', async () => {
      mockCommunicationService.getUnreadCount.mockRejectedValue(new Error('Service error'));

      await request(app)
        .get('/communications/unread/count')
        .expect(500);
    });
  });

  describe('GET /acknowledgments/pending - Get pending acknowledgments', () => {
    const mockPendingAcks = [
      {
        id: 'comm-1',
        title: 'Urgent Policy Update',
        type: 'policy_update',
        priority: 'urgent',
        publish_date: new Date(),
        requires_acknowledgment: true,
        sent_at: new Date(),
        read_at: new Date()
      }
    ];

    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .get('/communications/acknowledgments/pending')
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should get pending acknowledgments', async () => {
      mockCommunicationService.getPendingAcknowledgments.mockResolvedValue(mockPendingAcks);

      const response = await request(app)
        .get('/communications/acknowledgments/pending')
        .expect(200);

      expect(response.body).toEqual(mockPendingAcks);
      expect(mockCommunicationService.getPendingAcknowledgments).toHaveBeenCalledWith('test-user-id');
    });
  });

  describe('GET /stats/overview - Get communication statistics', () => {
    const mockStats = {
      overview: {
        total_communications: '50',
        draft_communications: '5',
        published_communications: '40',
        archived_communications: '5',
        emergency_communications: '2',
        urgent_communications: '8',
        acknowledgment_required: '15'
      },
      engagement: {
        total_recipients: '1000',
        total_read: '800',
        total_acknowledged: '600',
        delivery_failures: '10',
        avg_hours_to_read: '2.5'
      },
      typeBreakdown: [
        { type: 'announcement', count: '25', published_count: '20' },
        { type: 'memo', count: '15', published_count: '15' },
        { type: 'policy_update', count: '10', published_count: '8' }
      ]
    };

    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .get('/communications/stats/overview')
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should get comprehensive communication statistics', async () => {
      mockCommunicationService.getCommunicationStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/communications/stats/overview')
        .expect(200);

      expect(response.body).toEqual(mockStats);
      expect(mockCommunicationService.getCommunicationStats).toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockCommunicationService.getCommunicationStats.mockRejectedValue(new Error('Service error'));

      await request(app)
        .get('/communications/stats/overview')
        .expect(500);
    });
  });

  describe('Authorization', () => {
    beforeEach(() => {
      mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 'test-user-id', role: 'employee', name: 'Regular User' };
        next();
      });
    });

    it('should deny access to creation for non-privileged users', async () => {
      mockCerbos.requireCerbosPermission.mockImplementationOnce(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
      );

      await request(app)
        .post('/communications')
        .send({
          title: 'Test',
          content: 'Test',
          type: 'announcement',
          target_audience: { all_users: true }
        })
        .expect(403);
    });

    it('should deny access to statistics for non-privileged users', async () => {
      mockCerbos.requireCerbosPermission.mockImplementationOnce(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
      );

      await request(app)
        .get('/communications/stats/overview')
        .expect(403);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      await request(app)
        .post('/communications')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });

    it('should handle authentication errors', async () => {
      mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Invalid token' });
      });

      await request(app)
        .post('/communications')
        .send({
          title: 'Test',
          content: 'Test',
          type: 'announcement',
          target_audience: { all_users: true }
        })
        .expect(401);
    });

    it('should handle service unavailable errors', async () => {
      mockCommunicationService.createCommunication.mockRejectedValue(new Error('Service unavailable'));

      await request(app)
        .post('/communications')
        .send({
          title: 'Test',
          content: 'Test',
          type: 'announcement',
          target_audience: { all_users: true }
        })
        .expect(500);
    });
  });
});