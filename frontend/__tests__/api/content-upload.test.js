/**
 * File Upload API Tests for Content Management System
 *
 * These tests will FAIL initially (Red Phase) - this is expected in TDD!
 * We'll implement the file upload endpoints to make them pass.
 */

import { createMocks } from 'node-mocks-http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

describe('/api/content/upload', () => {
  const testFilesDir = path.join(__dirname, '..', 'test-files');

  beforeAll(() => {
    // Create test files directory
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }

    // Create test image file
    const testImageData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(path.join(testFilesDir, 'test-image.png'), testImageData);

    // Create test document
    fs.writeFileSync(
      path.join(testFilesDir, 'test-document.pdf'),
      Buffer.from('%PDF-1.4\n%test pdf content')
    );
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true, force: true });
    }
  });

  describe('POST /api/content/upload', () => {
    test('should upload image and return URL', async () => {
      const { POST } = require('../../app/api/content/upload/route');

      const imageBuffer = fs.readFileSync(
        path.join(testFilesDir, 'test-image.png')
      );
      const imageHash = crypto
        .createHash('sha256')
        .update(imageBuffer)
        .digest('hex');

      const formData = new FormData();
      formData.append(
        'file',
        new Blob([imageBuffer], { type: 'image/png' }),
        'test-image.png'
      );
      formData.append('content_item_id', '1');
      formData.append('alt_text', 'Test image for content');

      const { req } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-jwt-token',
        },
        body: formData,
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: expect.any(Number),
        file_url: expect.stringMatching(
          /^\/uploads\/images\/\d{4}\/\d{2}\/[a-f0-9]{64}\.png$/
        ),
        file_name: 'test-image.png',
        file_size: imageBuffer.length,
        file_hash: imageHash,
        mime_type: 'image/png',
        alt_text: 'Test image for content',
        attachment_type: 'image',
        is_embedded: false,
        created_at: expect.any(String),
      });
    });

    test('should detect and prevent duplicate uploads', async () => {
      const { POST } = require('../../app/api/content/upload/route');

      const imageBuffer = fs.readFileSync(
        path.join(testFilesDir, 'test-image.png')
      );

      // Upload same file twice
      const formData1 = new FormData();
      formData1.append(
        'file',
        new Blob([imageBuffer], { type: 'image/png' }),
        'duplicate1.png'
      );

      const formData2 = new FormData();
      formData2.append(
        'file',
        new Blob([imageBuffer], { type: 'image/png' }),
        'duplicate2.png'
      );

      const { req: req1 } = createMocks({
        method: 'POST',
        headers: { authorization: 'Bearer valid-jwt-token' },
        body: formData1,
      });

      const { req: req2 } = createMocks({
        method: 'POST',
        headers: { authorization: 'Bearer valid-jwt-token' },
        body: formData2,
      });

      const response1 = await POST(req1);
      const data1 = await response1.json();

      const response2 = await POST(req2);
      const data2 = await response2.json();

      // Both should succeed but point to same file
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(data1.file_hash).toBe(data2.file_hash);
      expect(data1.file_url).toBe(data2.file_url);

      // But should have different database records with different names
      expect(data1.id).not.toBe(data2.id);
      expect(data1.file_name).toBe('duplicate1.png');
      expect(data2.file_name).toBe('duplicate2.png');
    });

    test('should validate file types', async () => {
      const { POST } = require('../../app/api/content/upload/route');

      // Create invalid file type (.exe)
      const executableContent = Buffer.from('MZ'); // PE header

      const formData = new FormData();
      formData.append(
        'file',
        new Blob([executableContent], { type: 'application/x-executable' }),
        'malware.exe'
      );

      const { req } = createMocks({
        method: 'POST',
        headers: { authorization: 'Bearer valid-jwt-token' },
        body: formData,
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('File type not allowed');
      expect(data.allowed_types).toEqual(
        expect.arrayContaining([
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'video/mp4',
        ])
      );
    });

    test('should enforce file size limits', async () => {
      const { POST } = require('../../app/api/content/upload/route');

      // Create large file (11MB, over typical 10MB limit)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 'x');

      const formData = new FormData();
      formData.append(
        'file',
        new Blob([largeBuffer], { type: 'image/jpeg' }),
        'large-image.jpg'
      );

      const { req } = createMocks({
        method: 'POST',
        headers: { authorization: 'Bearer valid-jwt-token' },
        body: formData,
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('File size exceeds limit');
      expect(data.max_size).toBe(10 * 1024 * 1024); // 10MB
      expect(data.actual_size).toBe(11 * 1024 * 1024);
    });

    test('should sanitize file names', async () => {
      const { POST } = require('../../app/api/content/upload/route');

      const imageBuffer = fs.readFileSync(
        path.join(testFilesDir, 'test-image.png')
      );

      const formData = new FormData();
      formData.append(
        'file',
        new Blob([imageBuffer], { type: 'image/png' }),
        '../../../etc/passwd.png'
      );

      const { req } = createMocks({
        method: 'POST',
        headers: { authorization: 'Bearer valid-jwt-token' },
        body: formData,
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.file_name).toBe('etc-passwd.png'); // Path traversal characters removed
      expect(data.file_url).not.toContain('../');
    });

    test('should require authentication', async () => {
      const { POST } = require('../../app/api/content/upload/route');

      const imageBuffer = fs.readFileSync(
        path.join(testFilesDir, 'test-image.png')
      );

      const formData = new FormData();
      formData.append(
        'file',
        new Blob([imageBuffer], { type: 'image/png' }),
        'unauthorized.png'
      );

      const { req } = createMocks({
        method: 'POST',
        body: formData,
        // No authorization header
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    test('should handle TinyMCE image uploads', async () => {
      const { POST } = require('../../app/api/content/upload/route');

      const imageBuffer = fs.readFileSync(
        path.join(testFilesDir, 'test-image.png')
      );

      const formData = new FormData();
      formData.append(
        'file',
        new Blob([imageBuffer], { type: 'image/png' }),
        'tinymce-image.png'
      );
      formData.append('is_embedded', 'true');
      formData.append('editor_id', 'content_editor_1');

      const { req } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-jwt-token',
          'x-requested-with': 'TinyMCE', // Special header from TinyMCE
        },
        body: formData,
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        file_url: expect.any(String),
        is_embedded: true,
        attachment_type: 'image',
        // TinyMCE specific response format
        location: expect.any(String), // TinyMCE expects 'location' field
      });

      // Should match TinyMCE expected response format
      expect(data.location).toBe(data.file_url);
    });
  });

  describe('GET /api/content/media/[id]', () => {
    test('should serve uploaded files', async () => {
      const { GET } = require('../../app/api/content/media/[id]/route');

      const response = await GET(new Request('http://localhost'), {
        params: Promise.resolve({ id: '1' }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/png');
      expect(response.headers.get('cache-control')).toContain('max-age=');

      const buffer = await response.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    test('should return 404 for non-existent files', async () => {
      const { GET } = require('../../app/api/content/media/[id]/route');

      const response = await GET(new Request('http://localhost'), {
        params: Promise.resolve({ id: '99999' }),
      });

      expect(response.status).toBe(404);
    });

    test('should respect file permissions', async () => {
      const { GET } = require('../../app/api/content/media/[id]/route');

      // Assume file ID 2 is attached to private content
      const response = await GET(new Request('http://localhost'), {
        params: Promise.resolve({ id: '2' }),
      });

      expect(response.status).toBe(403);
    });

    test('should handle range requests for large files', async () => {
      const { GET } = require('../../app/api/content/media/[id]/route');

      const response = await GET(
        new Request('http://localhost', {
          headers: { range: 'bytes=0-1023' },
        }),
        { params: Promise.resolve({ id: '1' }) }
      );

      expect(response.status).toBe(206); // Partial Content
      expect(response.headers.get('content-range')).toBeDefined();
      expect(response.headers.get('accept-ranges')).toBe('bytes');
    });
  });

  describe('DELETE /api/content/media/[id]', () => {
    test('should delete uploaded files', async () => {
      const { DELETE } = require('../../app/api/content/media/[id]/route');

      const { req } = createMocks({
        method: 'DELETE',
        headers: { authorization: 'Bearer admin-token' },
      });

      const response = await DELETE(req, {
        params: Promise.resolve({ id: '1' }),
      });

      expect(response.status).toBe(200);

      // Verify file is no longer accessible
      const { GET } = require('../../app/api/content/media/[id]/route');
      const getResponse = await GET(new Request('http://localhost'), {
        params: Promise.resolve({ id: '1' }),
      });

      expect(getResponse.status).toBe(404);
    });

    test('should require admin permissions', async () => {
      const { DELETE } = require('../../app/api/content/media/[id]/route');

      const { req } = createMocks({
        method: 'DELETE',
        headers: { authorization: 'Bearer regular-user-token' },
      });

      const response = await DELETE(req, {
        params: Promise.resolve({ id: '1' }),
      });

      expect(response.status).toBe(403);
    });

    test('should handle files referenced by multiple content items', async () => {
      const { DELETE } = require('../../app/api/content/media/[id]/route');

      const { req } = createMocks({
        method: 'DELETE',
        headers: { authorization: 'Bearer admin-token' },
      });

      // Assume file ID 3 is used in multiple content items
      const response = await DELETE(req, {
        params: Promise.resolve({ id: '3' }),
      });

      expect(response.status).toBe(409); // Conflict

      const data = await response.json();
      expect(data.error).toContain(
        'File is referenced by multiple content items'
      );
      expect(data.references).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            content_id: expect.any(Number),
            title: expect.any(String),
          }),
        ])
      );
    });
  });

  describe('GET /api/content/attachments', () => {
    test('should list attachments for content item', async () => {
      const { GET } = require('../../app/api/content/attachments/route');

      const { req } = createMocks({
        method: 'GET',
        query: { content_item_id: '1' },
      });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            file_name: expect.any(String),
            file_url: expect.any(String),
            file_size: expect.any(Number),
            mime_type: expect.any(String),
            attachment_type: expect.any(String),
            is_embedded: expect.any(Boolean),
            alt_text: expect.any(String),
            created_at: expect.any(String),
          }),
        ])
      );
    });

    test('should filter attachments by type', async () => {
      const { GET } = require('../../app/api/content/attachments/route');

      const { req } = createMocks({
        method: 'GET',
        query: {
          content_item_id: '1',
          type: 'image',
        },
      });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.forEach((attachment) => {
        expect(attachment.attachment_type).toBe('image');
      });
    });
  });
});
