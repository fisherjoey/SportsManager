#!/usr/bin/env node

/**
 * Comprehensive Backend Integration Test for Games API
 * Tests backend API directly on port 3001 with various limit parameters
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_PROXY_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
  email: 'admin@cmba.ca',
  password: 'admin123'
};

// Test configuration
const LIMIT_VALUES = [50, 100, 300, 500, 1000];
const MAX_RETRIES = 3;
const TIMEOUT = 30000; // 30 seconds

class IntegrationTester {
  constructor() {
    this.backendToken = null;
    this.frontendToken = null;
    this.results = {
      backend: {},
      frontend: {},
      errors: []
    };
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async retryRequest(requestFn, description, maxRetries = MAX_RETRIES) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        console.log(`❌ ${description} - Attempt ${attempt}/${maxRetries} failed:`,
          error.response?.status || error.code, error.response?.data?.error || error.message);

        if (attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff
        await this.delay(1000 * attempt);
      }
    }
  }

  async loginToBackend() {
    console.log('\n🔐 Logging into backend (port 3001)...');

    try {
      const response = await this.retryRequest(async () => {
        return await axios.post(`${BACKEND_URL}/api/auth/login`, TEST_CREDENTIALS, {
          timeout: TIMEOUT,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }, 'Backend login');

      this.backendToken = response.data.token;
      console.log('✅ Backend login successful');
      console.log('Token preview:', this.backendToken ? `${this.backendToken.substring(0, 20)}...` : 'null');

      return true;
    } catch (error) {
      console.error('❌ Backend login failed:', error.response?.data || error.message);
      this.results.errors.push(`Backend login failed: ${error.response?.data?.error || error.message}`);
      return false;
    }
  }

  async loginToFrontend() {
    console.log('\n🔐 Logging into frontend proxy (port 3000)...');

    try {
      const response = await this.retryRequest(async () => {
        return await axios.post(`${FRONTEND_PROXY_URL}/api/auth/login`, TEST_CREDENTIALS, {
          timeout: TIMEOUT,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }, 'Frontend login');

      this.frontendToken = response.data.token;
      console.log('✅ Frontend login successful');
      console.log('Token preview:', this.frontendToken ? `${this.frontendToken.substring(0, 20)}...` : 'null');

      return true;
    } catch (error) {
      console.error('❌ Frontend login failed:', error.response?.data || error.message);
      this.results.errors.push(`Frontend login failed: ${error.response?.data?.error || error.message}`);
      return false;
    }
  }

  async testBackendGamesAPI() {
    console.log('\n🧪 Testing backend games API with various limits...');

    if (!this.backendToken) {
      console.log('❌ No backend token available, skipping backend tests');
      return;
    }

    for (const limit of LIMIT_VALUES) {
      console.log(`\n📊 Testing backend with limit=${limit}...`);

      try {
        const startTime = performance.now();

        const response = await this.retryRequest(async () => {
          return await axios.get(`${BACKEND_URL}/api/games`, {
            params: { limit, page: 1 },
            headers: {
              'Authorization': `Bearer ${this.backendToken}`,
              'Content-Type': 'application/json'
            },
            timeout: TIMEOUT
          });
        }, `Backend games API with limit=${limit}`);

        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        this.results.backend[limit] = {
          success: true,
          statusCode: response.status,
          dataCount: response.data.data?.length || 0,
          totalGames: response.data.pagination?.total || 0,
          responseTime,
          pagination: response.data.pagination,
          headers: {
            'content-type': response.headers['content-type'],
            'content-length': response.headers['content-length']
          }
        };

        console.log(`✅ Backend limit=${limit}: ${response.status} - ${response.data.data?.length || 0} games returned (${responseTime}ms)`);
        console.log(`   Total games: ${response.data.pagination?.total || 0}, Pages: ${response.data.pagination?.totalPages || 0}`);

      } catch (error) {
        this.results.backend[limit] = {
          success: false,
          statusCode: error.response?.status || 0,
          error: error.response?.data?.error || error.message,
          responseTime: null
        };

        console.log(`❌ Backend limit=${limit}: ${error.response?.status || error.code} - ${error.response?.data?.error || error.message}`);
        this.results.errors.push(`Backend limit=${limit}: ${error.response?.data?.error || error.message}`);
      }
    }
  }

  async testFrontendProxyAPI() {
    console.log('\n🧪 Testing frontend proxy API with various limits...');

    if (!this.frontendToken) {
      console.log('❌ No frontend token available, skipping frontend proxy tests');
      return;
    }

    for (const limit of LIMIT_VALUES) {
      console.log(`\n📊 Testing frontend proxy with limit=${limit}...`);

      try {
        const startTime = performance.now();

        const response = await this.retryRequest(async () => {
          return await axios.get(`${FRONTEND_PROXY_URL}/api/games`, {
            params: { limit, page: 1 },
            headers: {
              'Authorization': `Bearer ${this.frontendToken}`,
              'Content-Type': 'application/json'
            },
            timeout: TIMEOUT
          });
        }, `Frontend proxy games API with limit=${limit}`);

        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        this.results.frontend[limit] = {
          success: true,
          statusCode: response.status,
          dataCount: response.data.data?.length || 0,
          totalGames: response.data.pagination?.total || 0,
          responseTime,
          pagination: response.data.pagination,
          headers: {
            'content-type': response.headers['content-type'],
            'content-length': response.headers['content-length']
          }
        };

        console.log(`✅ Frontend limit=${limit}: ${response.status} - ${response.data.data?.length || 0} games returned (${responseTime}ms)`);
        console.log(`   Total games: ${response.data.pagination?.total || 0}, Pages: ${response.data.pagination?.totalPages || 0}`);

      } catch (error) {
        this.results.frontend[limit] = {
          success: false,
          statusCode: error.response?.status || 0,
          error: error.response?.data?.error || error.message,
          responseTime: null
        };

        console.log(`❌ Frontend limit=${limit}: ${error.response?.status || error.code} - ${error.response?.data?.error || error.message}`);
        this.results.errors.push(`Frontend limit=${limit}: ${error.response?.data?.error || error.message}`);
      }
    }
  }

  async testSpecificLimitCases() {
    console.log('\n🧪 Testing specific edge cases...');

    const edgeCases = [
      { limit: 1, description: 'minimum limit' },
      { limit: 1001, description: 'over maximum limit (should fail)' },
      { limit: 'abc', description: 'invalid string limit' },
      { limit: -10, description: 'negative limit' }
    ];

    for (const testCase of edgeCases) {
      console.log(`\n📊 Testing ${testCase.description}: limit=${testCase.limit}...`);

      // Test backend
      if (this.backendToken) {
        try {
          const response = await axios.get(`${BACKEND_URL}/api/games`, {
            params: { limit: testCase.limit, page: 1 },
            headers: { 'Authorization': `Bearer ${this.backendToken}` },
            timeout: TIMEOUT
          });

          console.log(`✅ Backend ${testCase.description}: ${response.status} - ${response.data.data?.length || 0} games`);
        } catch (error) {
          console.log(`❌ Backend ${testCase.description}: ${error.response?.status || error.code} - ${error.response?.data?.error || error.message}`);
        }
      }

      // Test frontend
      if (this.frontendToken) {
        try {
          const response = await axios.get(`${FRONTEND_PROXY_URL}/api/games`, {
            params: { limit: testCase.limit, page: 1 },
            headers: { 'Authorization': `Bearer ${this.frontendToken}` },
            timeout: TIMEOUT
          });

          console.log(`✅ Frontend ${testCase.description}: ${response.status} - ${response.data.data?.length || 0} games`);
        } catch (error) {
          console.log(`❌ Frontend ${testCase.description}: ${error.response?.status || error.code} - ${error.response?.data?.error || error.message}`);
        }
      }
    }
  }

  compareResults() {
    console.log('\n📊 COMPARING BACKEND vs FRONTEND RESULTS:');
    console.log('=' .repeat(60));

    for (const limit of LIMIT_VALUES) {
      const backend = this.results.backend[limit];
      const frontend = this.results.frontend[limit];

      console.log(`\nLimit ${limit}:`);
      console.log(`  Backend:  ${backend?.success ? '✅' : '❌'} ${backend?.statusCode || 'N/A'} - ${backend?.dataCount || 0} games (${backend?.responseTime || 'N/A'}ms)`);
      console.log(`  Frontend: ${frontend?.success ? '✅' : '❌'} ${frontend?.statusCode || 'N/A'} - ${frontend?.dataCount || 0} games (${frontend?.responseTime || 'N/A'}ms)`);

      if (backend?.success && frontend?.success) {
        if (backend.dataCount === frontend.dataCount) {
          console.log(`  ✅ Data count matches: ${backend.dataCount} games`);
        } else {
          console.log(`  ❌ Data count mismatch: backend=${backend.dataCount}, frontend=${frontend.dataCount}`);
        }
      }
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 COMPREHENSIVE TEST SUMMARY');
    console.log('='.repeat(60));

    const backendSuccesses = Object.values(this.results.backend).filter(r => r?.success).length;
    const frontendSuccesses = Object.values(this.results.frontend).filter(r => r?.success).length;

    console.log(`\n🎯 Results Overview:`);
    console.log(`  Backend Tests:  ${backendSuccesses}/${LIMIT_VALUES.length} successful`);
    console.log(`  Frontend Tests: ${frontendSuccesses}/${LIMIT_VALUES.length} successful`);
    console.log(`  Total Errors:   ${this.results.errors.length}`);

    if (this.results.errors.length > 0) {
      console.log(`\n❌ Errors Encountered:`);
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    console.log(`\n✅ Key Findings:`);
    console.log(`  - limit=500 backend: ${this.results.backend[500]?.success ? 'PASS' : 'FAIL'}`);
    console.log(`  - limit=500 frontend: ${this.results.frontend[500]?.success ? 'PASS' : 'FAIL'}`);
    console.log(`  - limit=1000 backend: ${this.results.backend[1000]?.success ? 'PASS' : 'FAIL'}`);
    console.log(`  - limit=1000 frontend: ${this.results.frontend[1000]?.success ? 'PASS' : 'FAIL'}`);

    console.log(`\n📈 Performance Notes:`);
    Object.entries(this.results.backend).forEach(([limit, result]) => {
      if (result?.success && result.responseTime) {
        console.log(`  Backend limit=${limit}: ${result.responseTime}ms`);
      }
    });

    console.log('\n='.repeat(60));
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Integration Tests');
    console.log('🎯 Target: Games API with limit parameter validation');
    console.log(`⏰ Timeout: ${TIMEOUT}ms per request`);

    try {
      // Login to both systems
      const backendLogin = await this.loginToBackend();
      const frontendLogin = await this.loginToFrontend();

      if (!backendLogin && !frontendLogin) {
        console.log('❌ All logins failed. Cannot proceed with tests.');
        return;
      }

      // Run tests
      await this.testBackendGamesAPI();
      await this.testFrontendProxyAPI();
      await this.testSpecificLimitCases();

      // Compare and summarize
      this.compareResults();
      this.printSummary();

    } catch (error) {
      console.error('💥 Fatal error during test execution:', error);
      this.results.errors.push(`Fatal error: ${error.message}`);
      this.printSummary();
    }
  }
}

// Check if script is being run directly
if (require.main === module) {
  console.log('🧪 Comprehensive Integration Test Starting...');
  console.log('📍 Make sure both servers are running:');
  console.log('   - Backend: http://localhost:3001');
  console.log('   - Frontend: http://localhost:3000');
  console.log('');

  const tester = new IntegrationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = IntegrationTester;