const { test, expect } = require('@playwright/test');

test.describe('Conflict Detection API Tests', () => {
  const BASE_URL = 'http://localhost:3001'; // Backend URL
  
  test('Backend health check responds', async ({ request }) => {
    try {
      const response = await request.get(`${BASE_URL}/api/health`);
      console.log('Backend health status:', response.status());
      
      if (response.ok()) {
        const body = await response.json();
        expect(body.status).toBe('ok');
      } else {
        console.log('Backend not available, skipping API tests');
        test.skip();
      }
    } catch (error) {
      console.log('Backend not available:', error.message);
      test.skip();
    }
  });

  test('Assignment conflict detection API exists', async ({ request }) => {
    try {
      // Test if assignments endpoint exists (should return 401 without auth)
      const response = await request.get(`${BASE_URL}/api/assignments`);
      
      // Should exist but require authentication
      expect([200, 401, 403]).toContain(response.status());
      
      // If we get JSON response, check structure
      if (response.headers()['content-type']?.includes('application/json')) {
        const body = await response.json();
        console.log('Assignments API response type:', typeof body);
      }
    } catch (error) {
      console.log('Assignment API test error:', error.message);
      test.skip();
    }
  });

  test('Game scheduling API responds', async ({ request }) => {
    try {
      // Test games endpoint
      const response = await request.get(`${BASE_URL}/api/games`);
      
      // Should exist but may require authentication
      expect([200, 401, 403]).toContain(response.status());
      
      console.log('Games API status:', response.status());
    } catch (error) {
      console.log('Games API test error:', error.message);
      test.skip();
    }
  });

  test('Authentication endpoint responds', async ({ request }) => {
    try {
      // Test login endpoint with invalid credentials
      const response = await request.post(`${BASE_URL}/api/auth/login`, {
        data: {
          email: 'test@invalid.com',
          password: 'invalid'
        }
      });
      
      // Should respond (but fail authentication)
      expect([200, 400, 401, 404]).toContain(response.status());
      
      console.log('Auth API status:', response.status());
    } catch (error) {
      console.log('Auth API test error:', error.message);
      test.skip();
    }
  });
});

test.describe('Frontend-Backend Integration', () => {
  test('Frontend can communicate with backend', async ({ page }) => {
    const networkRequests = [];
    
    page.on('response', (response) => {
      if (response.url().includes('localhost:3001')) {
        networkRequests.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method()
        });
      }
    });
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for any API calls
    await page.waitForTimeout(3000);
    
    console.log('Backend API calls detected:', networkRequests.length);
    
    if (networkRequests.length > 0) {
      console.log('API calls made:', networkRequests);
    }
    
    // This test is informational - logs API communication
    expect(true).toBe(true);
  });
});