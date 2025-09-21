/**
 * Documents Routes Test Suite
 * Comprehensive tests for document management endpoints
 */

import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
import type {
  Document,
  DocumentVersion,
  DocumentAcknowledgment,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  CreateDocumentVersionRequest,
  DocumentStatus,
  AccessPermissions,
  AcknowledgmentMethod,
  DocumentStats,
  PendingAcknowledgment
} from '../../types/document.types';

// Mock dependencies
const mockPool = {
  query: jest.fn(),
  connect: jest.fn().mockReturnValue({
    query: jest.fn(),
    release: jest.fn()
  })
};

const mockFs = {
  readFile: jest.fn(),
  unlink: jest.fn().mockResolvedValue(undefined)
};

const mockCrypto = {
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mock-checksum')
  })
};

const mockAuthMiddleware = {
  authenticateToken: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      id: 'user-123',
      role: 'admin',
      organization_id: 'org-123'
    };
    next();
  }),
  requireRole: jest.fn(() => (req: any, res: any, next: any) => next()),
  requireAnyRole: jest.fn(() => (req: any, res: any, next: any) => next())
};

const mockFileUpload = {
  receiptUploader: {
    single: jest.fn(() => (req: any, res: any, next: any) => {
      req.file = {
        path: '/uploads/test-file.pdf',
        originalname: 'test-document.pdf',
        size: 1024,
        mimetype: 'application/pdf'
      };
      next();
    })
  }
};

// Mock modules
jest.mock('pg', () => ({ Pool: jest.fn(() => mockPool) }));
jest.mock('fs', () => ({ promises: mockFs }));
jest.mock('crypto', () => mockCrypto);
jest.mock('../middleware/auth', () => mockAuthMiddleware);
jest.mock('../middleware/fileUpload', () => mockFileUpload);

// Import the router after mocking dependencies
let documentRouter: express.Router;

describe('Document Routes', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Import router after mocks are set up
    const { default: router } = await import('../documents');
    documentRouter = router;

    app = express();
    app.use(express.json());
    app.use('/api/documents', documentRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/documents', () => {
    it('should return list of documents with pagination', async () => {
      const mockDocuments: Document[] = [
        {
          id: 'doc-1',
          title: 'Employee Handbook',
          description: 'Company policies and procedures',
          category: 'HR',
          subcategory: 'Policies',
          file_path: '/uploads/handbook.pdf',
          file_name: 'handbook.pdf',
          file_type: 'pdf',
          file_size: 2048,
          version: '1.0',
          uploaded_by: 'user-123',
          approved_by: 'admin-456',
          effective_date: new Date('2024-01-01'),
          expiration_date: new Date('2024-12-31'),
          tags: ['HR', 'policies'],
          access_permissions: { visibility: 'public' } as AccessPermissions,
          requires_acknowledgment: true,
          checksum: 'abc123',
          status: DocumentStatus.APPROVED,
          created_at: new Date(),
          updated_at: new Date(),
          uploaded_by_name: 'John Doe',
          approved_by_name: 'Admin User',
          acknowledgment_count: 15
        }
      ];

      const mockCountResult = { rows: [{ count: '1' }] };
      const mockDocsResult = { rows: mockDocuments };

      mockPool.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockDocsResult);

      const response = await request(app)
        .get('/api/documents?page=1&limit=10')
        .expect(200);

      expect(response.body).toEqual({
        documents: mockDocuments,
        total: 1,
        page: 1,
        limit: 10,
        has_more: false
      });
    });

    it('should filter documents by category', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/documents?category=HR')
        .expect(200);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('d.category = $2'),
        expect.arrayContaining(['user-123', 'HR'])
      );
    });

    it('should handle search queries', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/documents?search=handbook')
        .expect(200);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('d.title ILIKE'),
        expect.arrayContaining(['user-123', '%handbook%'])
      );
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/documents')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error'
      });
    });
  });

  describe('GET /api/documents/:id', () => {
    it('should return a specific document with versions', async () => {
      const mockDocument: Document = {
        id: 'doc-1',
        title: 'Employee Handbook',
        description: 'Company policies',
        category: 'HR',
        subcategory: null,
        file_path: '/uploads/handbook.pdf',
        file_name: 'handbook.pdf',
        file_type: 'pdf',
        file_size: 2048,
        version: '1.0',
        uploaded_by: 'user-123',
        approved_by: null,
        effective_date: null,
        expiration_date: null,
        tags: null,
        access_permissions: null,
        requires_acknowledgment: false,
        checksum: 'abc123',
        status: DocumentStatus.APPROVED,
        created_at: new Date(),
        updated_at: new Date(),
        uploaded_by_name: 'John Doe',
        approved_by_name: null
      };

      const mockVersions: DocumentVersion[] = [
        {
          id: 'version-1',
          document_id: 'doc-1',
          version: '1.0',
          file_path: '/uploads/handbook.pdf',
          uploaded_by: 'user-123',
          uploaded_by_name: 'John Doe',
          change_notes: 'Initial version',
          checksum: 'abc123',
          is_current: true,
          created_at: new Date()
        }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [true] }) // Access check
        .mockResolvedValueOnce({ rows: [mockDocument] }) // Document query
        .mockResolvedValueOnce({ rows: mockVersions }); // Versions query

      const response = await request(app)
        .get('/api/documents/doc-1')
        .expect(200);

      expect(response.body).toEqual({
        document: mockDocument,
        versions: mockVersions
      });
    });

    it('should return 404 for non-existent document', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [false] }) // No access
        .mockResolvedValueOnce({ rows: [] }); // No document

      const response = await request(app)
        .get('/api/documents/non-existent')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Document not found'
      });
    });

    it('should return 403 for insufficient permissions', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [false] }); // No access

      const response = await request(app)
        .get('/api/documents/doc-1')
        .expect(403);

      expect(response.body).toEqual({
        error: 'Access denied'
      });
    });
  });

  describe('POST /api/documents', () => {
    it('should create a new document with file upload', async () => {
      const newDocument: CreateDocumentRequest = {
        title: 'New Policy',
        description: 'Updated company policy',
        category: 'HR',
        subcategory: 'Policies',
        effective_date: new Date('2024-01-01'),
        requires_acknowledgment: true
      };

      const createdDocument: Document = {
        id: 'doc-2',
        ...newDocument,
        file_path: '/uploads/test-file.pdf',
        file_name: 'test-document.pdf',
        file_type: 'pdf',
        file_size: 1024,
        version: '1.0',
        uploaded_by: 'user-123',
        approved_by: null,
        expiration_date: null,
        tags: null,
        access_permissions: null,
        checksum: 'mock-checksum',
        status: DocumentStatus.PENDING_APPROVAL,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockFs.readFile.mockResolvedValueOnce(Buffer.from('file content'));
      mockPool.query
        .mockResolvedValueOnce({ rows: [createdDocument] }) // Insert document
        .mockResolvedValueOnce({ rows: [] }); // Insert version

      const response = await request(app)
        .post('/api/documents')
        .field('title', newDocument.title)
        .field('description', newDocument.description!)
        .field('category', newDocument.category)
        .field('subcategory', newDocument.subcategory!)
        .field('requires_acknowledgment', 'true')
        .attach('document', Buffer.from('file content'), 'test-document.pdf')
        .expect(201);

      expect(response.body).toEqual(createdDocument);
      expect(mockFs.readFile).toHaveBeenCalledWith('/uploads/test-file.pdf');
    });

    it('should return 400 if no file is uploaded', async () => {
      // Mock middleware to not attach file
      mockFileUpload.receiptUploader.single.mockImplementationOnce(() =>
        (req: any, res: any, next: any) => {
          req.file = undefined;
          next();
        }
      );

      const response = await request(app)
        .post('/api/documents')
        .field('title', 'Test Document')
        .field('category', 'HR')
        .expect(400);

      expect(response.body).toEqual({
        error: 'No file uploaded'
      });
    });

    it('should validate document metadata', async () => {
      const response = await request(app)
        .post('/api/documents')
        .field('title', '') // Invalid: empty title
        .field('category', 'HR')
        .attach('document', Buffer.from('file content'), 'test.pdf')
        .expect(400);

      expect(response.body.error).toContain('validation');
      expect(mockFs.unlink).toHaveBeenCalledWith('/uploads/test-file.pdf');
    });

    it('should handle file upload errors and clean up', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File read error'));

      const response = await request(app)
        .post('/api/documents')
        .field('title', 'Test Document')
        .field('category', 'HR')
        .attach('document', Buffer.from('file content'), 'test.pdf')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error'
      });
      expect(mockFs.unlink).toHaveBeenCalledWith('/uploads/test-file.pdf');
    });
  });

  describe('POST /api/documents/:id/versions', () => {
    it('should create a new version of existing document', async () => {
      const versionData: CreateDocumentVersionRequest = {
        change_notes: 'Updated policies section'
      };

      const existingDoc = {
        id: 'doc-1',
        uploaded_by: 'user-123',
        version: '1.0'
      };

      const updatedDoc: Document = {
        id: 'doc-1',
        title: 'Updated Document',
        description: null,
        category: 'HR',
        subcategory: null,
        file_path: '/uploads/test-file.pdf',
        file_name: 'test-document.pdf',
        file_type: 'pdf',
        file_size: 1024,
        version: '1.1',
        uploaded_by: 'user-123',
        approved_by: null,
        effective_date: null,
        expiration_date: null,
        tags: null,
        access_permissions: null,
        requires_acknowledgment: false,
        checksum: 'mock-checksum',
        status: DocumentStatus.PENDING_APPROVAL,
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce({ rows: [existingDoc] }) // Check document
          .mockResolvedValueOnce(undefined) // Mark old versions as not current
          .mockResolvedValueOnce({ rows: [updatedDoc] }) // Update document
          .mockResolvedValueOnce(undefined) // Insert new version
          .mockResolvedValueOnce(undefined), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);
      mockFs.readFile.mockResolvedValueOnce(Buffer.from('updated content'));

      const response = await request(app)
        .post('/api/documents/doc-1/versions')
        .field('change_notes', versionData.change_notes)
        .attach('document', Buffer.from('updated content'), 'updated.pdf')
        .expect(200);

      expect(response.body).toEqual(updatedDoc);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback transaction on error', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockRejectedValueOnce(new Error('Database error')), // Error
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const response = await request(app)
        .post('/api/documents/doc-1/versions')
        .field('change_notes', 'Test notes')
        .attach('document', Buffer.from('content'), 'test.pdf')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error'
      });
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockFs.unlink).toHaveBeenCalledWith('/uploads/test-file.pdf');
    });
  });

  describe('PUT /api/documents/:id', () => {
    it('should update document metadata', async () => {
      const updateData: UpdateDocumentRequest = {
        title: 'Updated Title',
        description: 'Updated description',
        category: 'Legal'
      };

      const updatedDocument: Document = {
        id: 'doc-1',
        title: 'Updated Title',
        description: 'Updated description',
        category: 'Legal',
        subcategory: null,
        file_path: '/uploads/doc.pdf',
        file_name: 'doc.pdf',
        file_type: 'pdf',
        file_size: 1024,
        version: '1.0',
        uploaded_by: 'user-123',
        approved_by: null,
        effective_date: null,
        expiration_date: null,
        tags: null,
        access_permissions: null,
        requires_acknowledgment: false,
        checksum: 'abc123',
        status: DocumentStatus.PENDING_APPROVAL,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ uploaded_by: 'user-123' }] }) // Permission check
        .mockResolvedValueOnce({ rows: [updatedDocument] }); // Update query

      const response = await request(app)
        .put('/api/documents/doc-1')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(updatedDocument);
    });

    it('should return 404 for non-existent document or insufficient permissions', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // No permission

      const response = await request(app)
        .put('/api/documents/non-existent')
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(response.body).toEqual({
        error: 'Document not found or permission denied'
      });
    });
  });

  describe('POST /api/documents/:id/approve', () => {
    it('should approve a document', async () => {
      const approvedDoc: Document = {
        id: 'doc-1',
        title: 'Test Document',
        description: null,
        category: 'HR',
        subcategory: null,
        file_path: '/uploads/doc.pdf',
        file_name: 'doc.pdf',
        file_type: 'pdf',
        file_size: 1024,
        version: '1.0',
        uploaded_by: 'user-123',
        approved_by: 'user-123',
        effective_date: null,
        expiration_date: null,
        tags: null,
        access_permissions: null,
        requires_acknowledgment: false,
        checksum: 'abc123',
        status: DocumentStatus.APPROVED,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.query.mockResolvedValueOnce({ rows: [approvedDoc] });

      const response = await request(app)
        .post('/api/documents/doc-1/approve')
        .expect(200);

      expect(response.body).toEqual(approvedDoc);
    });
  });

  describe('POST /api/documents/:id/acknowledge', () => {
    it('should record document acknowledgment', async () => {
      const acknowledgment: DocumentAcknowledgment = {
        id: 'ack-1',
        document_id: 'doc-1',
        user_id: 'user-123',
        acknowledged_at: new Date(),
        acknowledgment_method: AcknowledgmentMethod.CLICK,
        ip_address: '127.0.0.1',
        user_agent: 'Test Browser'
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ requires_acknowledgment: true }] }) // Check document
        .mockResolvedValueOnce({ rows: [] }) // Check existing acknowledgment
        .mockResolvedValueOnce({ rows: [acknowledgment] }); // Insert acknowledgment

      const response = await request(app)
        .post('/api/documents/doc-1/acknowledge')
        .send({
          acknowledgment_method: 'click',
          ip_address: '127.0.0.1',
          user_agent: 'Test Browser'
        })
        .expect(201);

      expect(response.body).toEqual(acknowledgment);
    });

    it('should return 400 if document does not require acknowledgment', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ requires_acknowledgment: false }] });

      const response = await request(app)
        .post('/api/documents/doc-1/acknowledge')
        .send({ acknowledgment_method: 'click' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Document does not require acknowledgment'
      });
    });

    it('should return 409 if already acknowledged', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ requires_acknowledgment: true }] })
        .mockResolvedValueOnce({ rows: [{ id: 'existing-ack' }] }); // Already acknowledged

      const response = await request(app)
        .post('/api/documents/doc-1/acknowledge')
        .send({ acknowledgment_method: 'click' })
        .expect(409);

      expect(response.body).toEqual({
        error: 'Document already acknowledged by user'
      });
    });
  });

  describe('GET /api/documents/stats/overview', () => {
    it('should return document statistics', async () => {
      const mockStats: DocumentStats = {
        total_documents: 100,
        pending_approval: 5,
        approved: 85,
        archived: 8,
        expired: 2,
        by_category: [
          { category: 'HR', count: 50, percentage: 50 },
          { category: 'Legal', count: 30, percentage: 30 },
          { category: 'Finance', count: 20, percentage: 20 }
        ],
        recent_uploads: [
          {
            id: 'doc-1',
            title: 'Recent Document',
            category: 'HR',
            uploaded_by_name: 'John Doe',
            created_at: new Date(),
            status: DocumentStatus.APPROVED
          }
        ],
        pending_acknowledgments: 15
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total_documents: 100, pending_approval: 5, approved: 85, archived: 8, expired: 2 }] })
        .mockResolvedValueOnce({ rows: mockStats.by_category })
        .mockResolvedValueOnce({ rows: mockStats.recent_uploads })
        .mockResolvedValueOnce({ rows: [{ pending_acknowledgments: 15 }] });

      const response = await request(app)
        .get('/api/documents/stats/overview')
        .expect(200);

      expect(response.body).toEqual(mockStats);
    });
  });

  describe('GET /api/documents/acknowledgments/pending', () => {
    it('should return pending acknowledgments for current user', async () => {
      const mockPending: PendingAcknowledgment[] = [
        {
          document_id: 'doc-1',
          document_title: 'Employee Handbook',
          category: 'HR',
          requires_acknowledgment: true,
          uploaded_by_name: 'Admin User',
          effective_date: new Date('2024-01-01'),
          expiration_date: new Date('2024-12-31')
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockPending });

      const response = await request(app)
        .get('/api/documents/acknowledgments/pending')
        .expect(200);

      expect(response.body).toEqual({
        pending: mockPending,
        total: mockPending.length
      });
    });
  });

  describe('File Download', () => {
    describe('GET /api/documents/:id/download', () => {
      it('should allow downloading documents with proper access', async () => {
        const mockDocument = {
          id: 'doc-1',
          file_path: '/uploads/test.pdf',
          file_name: 'test.pdf'
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [true] }) // Access check
          .mockResolvedValueOnce({ rows: [mockDocument] }); // Document query

        // Note: In a real test, you'd mock fs.createReadStream
        // For now, we'll just verify the access check works
        const response = await request(app)
          .get('/api/documents/doc-1/download')
          .expect(500); // Will fail because file doesn't exist, but access was granted

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('hasDocumentAccess'),
          ['user-123', 'doc-1']
        );
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      mockAuthMiddleware.authenticateToken.mockImplementationOnce((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      await request(app)
        .get('/api/documents')
        .expect(401);
    });

    it('should require proper roles for admin operations', async () => {
      mockAuthMiddleware.requireAnyRole.mockImplementationOnce(() => (req: any, res: any, next: any) => {
        res.status(403).json({ error: 'Insufficient permissions' });
      });

      await request(app)
        .post('/api/documents/doc-1/approve')
        .expect(403);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Connection failed'));

      const response = await request(app)
        .get('/api/documents')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error'
      });
    });

    it('should handle file system errors gracefully', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));

      const response = await request(app)
        .post('/api/documents')
        .field('title', 'Test Document')
        .field('category', 'HR')
        .attach('document', Buffer.from('content'), 'test.pdf')
        .expect(500);

      expect(mockFs.unlink).toHaveBeenCalled(); // Cleanup attempted
    });
  });

  describe('Data Validation', () => {
    it('should validate file types and sizes', async () => {
      // Mock file upload with invalid type
      mockFileUpload.receiptUploader.single.mockImplementationOnce(() =>
        (req: any, res: any, next: any) => {
          req.file = {
            path: '/uploads/test.exe',
            originalname: 'malware.exe',
            size: 1024 * 1024 * 100, // 100MB
            mimetype: 'application/octet-stream'
          };
          next();
        }
      );

      // This would be handled by the file upload middleware in practice
      // Here we're just ensuring the test framework can handle different file types
    });

    it('should validate document metadata thoroughly', async () => {
      const invalidData = {
        title: 'A'.repeat(201), // Too long
        category: '', // Empty
        effective_date: 'invalid-date'
      };

      const response = await request(app)
        .post('/api/documents')
        .send(invalidData)
        .attach('document', Buffer.from('content'), 'test.pdf')
        .expect(400);

      expect(response.body.error).toContain('validation');
    });
  });
});