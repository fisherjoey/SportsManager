/**
 * API Endpoint Tests for Content Management System
 * 
 * These tests will FAIL initially (Red Phase) - this is expected in TDD!
 * We'll implement the API endpoints to make them pass.
 */

import { createMocks } from 'node-mocks-http';

describe('/api/content/items', () => {
  beforeEach(() => {
    // Mock database operations
    jest.clearAllMocks();
  });

  describe('POST /api/content/items', () => {
    test('should create content item successfully', async () => {
      const { POST } = require('../../app/api/content/items/route');
      
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          title: 'New Training Document',
          content: '<h1>Training Overview</h1><p>This document covers <strong>essential training</strong> for all referees.</p>',
          category_id: 1,
          type: 'document',
          visibility: 'public'
        },
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer valid-jwt-token'
        }
      });

      const response = await POST(req);
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        id: expect.any(Number),
        title: 'New Training Document',
        slug: 'new-training-document',
        content: expect.stringContaining('<h1>Training Overview</h1>'),
        content_plain: expect.stringContaining('Training Overview'),
        type: 'document',
        status: 'draft', // Default status
        visibility: 'public',
        created_at: expect.any(String),
        updated_at: expect.any(String),
        author: expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String)
        })
      });
    });

    test('should return 400 for invalid content data', async () => {
      const { POST } = require('../../app/api/content/items/route');
      
      const { req } = createMocks({
        method: 'POST',
        body: {
          // Missing required title
          content: '<p>Content without title</p>',
          category_id: 1
        },
        headers: {
          'authorization': 'Bearer valid-jwt-token'
        }
      });

      const response = await POST(req);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toContain('Title is required');
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'title',
            message: expect.any(String)
          })
        ])
      );
    });

    test('should return 401 for unauthenticated requests', async () => {
      const { POST } = require('../../app/api/content/items/route');
      
      const { req } = createMocks({
        method: 'POST',
        body: {
          title: 'Unauthorized Content',
          content: '<p>This should not be created</p>',
          category_id: 1
        }
        // No authorization header
      });

      const response = await POST(req);
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    test('should sanitize HTML content', async () => {
      const { POST } = require('../../app/api/content/items/route');
      
      const { req } = createMocks({
        method: 'POST',
        body: {
          title: 'Content with Scripts',
          content: '<h1>Title</h1><script>alert("xss")</script><p>Safe content</p><img src="x" onerror="alert(1)">',
          category_id: 1
        },
        headers: {
          'authorization': 'Bearer valid-jwt-token'
        }
      });

      const response = await POST(req);
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.content).not.toContain('<script>');
      expect(data.content).not.toContain('onerror');
      expect(data.content).toContain('<h1>Title</h1>');
      expect(data.content).toContain('<p>Safe content</p>');
    });

    test('should handle large content efficiently', async () => {
      const { POST } = require('../../app/api/content/items/route');
      
      // Generate large HTML content (50KB)
      const largeContent = '<h1>Large Document</h1>' + 
        '<p>'.repeat(1000) + 'This is a large document with lots of content. '.repeat(100) + '</p>'.repeat(1000);
      
      const startTime = Date.now();
      
      const { req } = createMocks({
        method: 'POST',
        body: {
          title: 'Large Document Test',
          content: largeContent,
          category_id: 1
        },
        headers: {
          'authorization': 'Bearer valid-jwt-token'
        }
      });

      const response = await POST(req);
      const endTime = Date.now();
      
      expect(response.status).toBe(201);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      const data = await response.json();
      expect(data.content).toHaveLength(largeContent.length);
    });
  });

  describe('GET /api/content/items', () => {
    test('should return paginated content list', async () => {
      const { GET } = require('../../app/api/content/items/route');
      
      const { req } = createMocks({
        method: 'GET',
        query: {
          page: '1',
          limit: '10',
          status: 'published'
        }
      });

      const response = await GET(req);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            title: expect.any(String),
            slug: expect.any(String),
            type: expect.any(String),
            status: 'published',
            created_at: expect.any(String),
            author: expect.objectContaining({
              name: expect.any(String)
            })
            // Note: full content should not be included in list view
          })
        ]),
        pagination: expect.objectContaining({
          page: 1,
          limit: 10,
          total: expect.any(Number),
          pages: expect.any(Number)
        })
      });
      
      // Ensure no item contains full content (performance optimization)
      data.items.forEach(item => {
        expect(item.content).toBeUndefined();
        expect(item.content_plain).toBeUndefined();
      });
    });

    test('should filter by category', async () => {
      const { GET } = require('../../app/api/content/items/route');
      
      const { req } = createMocks({
        method: 'GET',
        query: {
          category_id: '2',
          status: 'published'
        }
      });

      const response = await GET(req);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      data.items.forEach(item => {
        expect(item.category_id).toBe(2);
      });
    });

    test('should search content', async () => {
      const { GET } = require('../../app/api/content/items/route');
      
      const { req } = createMocks({
        method: 'GET',
        query: {
          search: 'referee training',
          limit: '5'
        }
      });

      const response = await GET(req);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: expect.any(String),
            snippet: expect.stringContaining('referee'),
            rank: expect.any(Number)
          })
        ])
      );
      
      // Results should be ordered by relevance (rank desc)
      if (data.items.length > 1) {
        expect(data.items[0].rank).toBeGreaterThanOrEqual(data.items[1].rank);
      }
    });

    test('should return empty results for invalid page', async () => {
      const { GET } = require('../../app/api/content/items/route');
      
      const { req } = createMocks({
        method: 'GET',
        query: {
          page: '999',
          limit: '10'
        }
      });

      const response = await GET(req);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(0);
      expect(data.pagination.page).toBe(999);
    });
  });

  describe('GET /api/content/items/[id]', () => {
    test('should return single content item with full details', async () => {
      const { GET } = require('../../app/api/content/items/[id]/route');
      
      const response = await GET(
        new Request('http://localhost'),
        { params: Promise.resolve({ id: '1' }) }
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: 1,
        title: expect.any(String),
        slug: expect.any(String),
        content: expect.any(String), // Full content included
        content_plain: expect.any(String),
        type: expect.any(String),
        status: expect.any(String),
        visibility: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String),
        author: expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          email: expect.any(String)
        }),
        category: expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          slug: expect.any(String)
        }),
        attachments: expect.arrayContaining([]),
        tags: expect.arrayContaining([])
      });
    });

    test('should return 404 for non-existent content', async () => {
      const { GET } = require('../../app/api/content/items/[id]/route');
      
      const response = await GET(
        new Request('http://localhost'),
        { params: Promise.resolve({ id: '99999' }) }
      );
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe('Content not found');
    });

    test('should respect content visibility permissions', async () => {
      const { GET } = require('../../app/api/content/items/[id]/route');
      
      // Test private content without authentication
      const response = await GET(
        new Request('http://localhost'),
        { params: Promise.resolve({ id: '2' }) } // Assume ID 2 is private content
      );
      
      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/content/items/[id]', () => {
    test('should update content item', async () => {
      const { PUT } = require('../../app/api/content/items/[id]/route');
      
      const { req } = createMocks({
        method: 'PUT',
        body: {
          title: 'Updated Training Manual',
          content: '<h1>Updated Content</h1><p>This content has been <em>updated</em>.</p>',
          status: 'published'
        },
        headers: {
          'authorization': 'Bearer valid-jwt-token'
        }
      });

      const response = await PUT(
        req,
        { params: Promise.resolve({ id: '1' }) }
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: 1,
        title: 'Updated Training Manual',
        content: expect.stringContaining('Updated Content'),
        status: 'published',
        updated_at: expect.any(String)
      });
      
      // Should have updated timestamp
      expect(new Date(data.updated_at).getTime()).toBeGreaterThan(Date.now() - 5000);
    });

    test('should create version on update', async () => {
      const { PUT } = require('../../app/api/content/items/[id]/route');
      
      const { req } = createMocks({
        method: 'PUT',
        body: {
          title: 'Version Test Update',
          content: '<p>New version content</p>'
        },
        headers: {
          'authorization': 'Bearer valid-jwt-token'
        }
      });

      await PUT(req, { params: Promise.resolve({ id: '1' }) });
      
      // Check versions endpoint
      const { GET } = require('../../app/api/content/items/[id]/versions/route');
      const versionsResponse = await GET(
        new Request('http://localhost'),
        { params: Promise.resolve({ id: '1' }) }
      );
      const versions = await versionsResponse.json();
      
      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0]).toMatchObject({
        version_number: expect.any(Number),
        title: expect.any(String),
        content: expect.any(String),
        created_at: expect.any(String),
        change_summary: expect.any(String)
      });
    });

    test('should require appropriate permissions for update', async () => {
      const { PUT } = require('../../app/api/content/items/[id]/route');
      
      const { req } = createMocks({
        method: 'PUT',
        body: {
          title: 'Unauthorized Update'
        },
        headers: {
          'authorization': 'Bearer limited-permissions-token' // User without edit permissions
        }
      });

      const response = await PUT(req, { params: Promise.resolve({ id: '1' }) });
      
      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/content/items/[id]', () => {
    test('should soft delete content item', async () => {
      const { DELETE } = require('../../app/api/content/items/[id]/route');
      
      const { req } = createMocks({
        method: 'DELETE',
        headers: {
          'authorization': 'Bearer admin-token'
        }
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: '1' }) });
      
      expect(response.status).toBe(200);
      
      // Verify content is soft-deleted (status changed to 'deleted')
      const { GET } = require('../../app/api/content/items/[id]/route');
      const getResponse = await GET(
        new Request('http://localhost'),
        { params: Promise.resolve({ id: '1' }) }
      );
      
      expect(getResponse.status).toBe(404); // Should not be publicly accessible
    });

    test('should require admin permissions for delete', async () => {
      const { DELETE } = require('../../app/api/content/items/[id]/route');
      
      const { req } = createMocks({
        method: 'DELETE',
        headers: {
          'authorization': 'Bearer regular-user-token'
        }
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: '1' }) });
      
      expect(response.status).toBe(403);
    });
  });
});