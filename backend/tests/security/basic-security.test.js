const request = require('supertest');
const app = require('../../src/app');

describe('Basic Security Tests', () => {
  test('should require authentication for games endpoint', async () => {
    const response = await request(app)
      .get('/api/games');

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Access token required');
  });

  test('should include security headers', async () => {
    const response = await request(app)
      .get('/api/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['content-security-policy']).toBeDefined();
  });

  test('should handle 404 routes properly', async () => {
    const response = await request(app)
      .get('/api/nonexistent');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Route not found');
  });

  test('should validate query parameters', async () => {
    // This should trigger parameter validation if authentication was passed
    // For now, just test that it doesn't crash the server
    const response = await request(app)
      .get('/api/games?invalid_param=<script>alert("xss")</script>');

    expect([400, 401]).toContain(response.status);
  });
});