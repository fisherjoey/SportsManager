#!/usr/bin/env node

/**
 * Frontend Application Simulation Test
 *
 * This test simulates exactly how the frontend application would call the API,
 * including the transformation logic in the API client and the exact calls
 * that the games-management-page.tsx component makes.
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

const FRONTEND_PROXY_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
  email: 'admin@cmba.ca',
  password: 'admin123'
};

class FrontendSimulator {
  constructor() {
    this.token = null;
    this.results = [];
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Simulate the apiClient.login() method
   */
  async simulateLogin() {
    console.log('🔐 Simulating frontend login...');

    try {
      const response = await axios.post(`${FRONTEND_PROXY_URL}/api/auth/login`, TEST_CREDENTIALS, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.token = response.data.token;
      console.log('✅ Frontend login simulation successful');
      console.log('Token set:', !!this.token);
      return true;

    } catch (error) {
      console.error('❌ Frontend login simulation failed:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Simulate the exact API client getGames() call with limit=500
   * This replicates the logic in frontend/lib/api.ts getGames method
   */
  async simulateApiClientGetGames(params = { limit: 500 }) {
    console.log(`\n🎯 Simulating apiClient.getGames(${JSON.stringify(params)})...`);

    if (!this.token) {
      throw new Error('No token available - authentication required');
    }

    // Transform frontend params to backend format (from api.ts lines 230-237)
    const transformedParams = {};
    if (params.status) transformedParams.status = params.status;
    if (params.level) transformedParams.level = params.level;
    if (params.startDate) transformedParams.date_from = params.startDate;
    if (params.endDate) transformedParams.date_to = params.endDate;
    if (params.search) transformedParams.search = params.search;
    if (params.page) transformedParams.page = params.page;
    if (params.limit) transformedParams.limit = params.limit;

    console.log('📋 Transformed params:', transformedParams);

    // Build query string (from api.ts line 239)
    const queryString = Object.keys(transformedParams).length > 0
      ? new URLSearchParams(transformedParams).toString()
      : '';

    const url = `/api/games${queryString ? `?${queryString}` : ''}`;
    console.log('🌐 Request URL:', `${FRONTEND_PROXY_URL}${url}`);

    try {
      const startTime = performance.now();

      const response = await axios.get(`${FRONTEND_PROXY_URL}${url}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      // Simulate the response transformation (api.ts lines 242-249)
      const transformedGames = response.data.data.map((game) => ({
        id: game.id,
        homeTeam: game.homeTeam || { name: game.home_team_name },
        awayTeam: game.awayTeam || { name: game.away_team_name },
        date: game.date || game.game_date,
        time: game.time || game.game_time,
        startTime: game.startTime || game.time || game.game_time,
        // ... other fields would be mapped here
      }));

      const result = {
        success: true,
        statusCode: response.status,
        originalDataCount: response.data.data?.length || 0,
        transformedDataCount: transformedGames.length,
        totalGames: response.data.pagination?.total || 0,
        pagination: response.data.pagination,
        responseTime,
        requestParams: params,
        transformedParams,
        url
      };

      console.log(`✅ API client simulation successful:`);
      console.log(`   Status: ${result.statusCode}`);
      console.log(`   Games returned: ${result.originalDataCount}`);
      console.log(`   Response time: ${result.responseTime}ms`);
      console.log(`   Total in DB: ${result.totalGames}`);
      console.log(`   Pagination: page=${result.pagination?.page}, limit=${result.pagination?.limit}`);

      return result;

    } catch (error) {
      const result = {
        success: false,
        statusCode: error.response?.status || 0,
        error: error.response?.data?.error || error.message,
        requestParams: params,
        transformedParams,
        url
      };

      console.log(`❌ API client simulation failed:`);
      console.log(`   Status: ${result.statusCode}`);
      console.log(`   Error: ${result.error}`);

      return result;
    }
  }

  /**
   * Simulate the fetchGames() function from games-management-page.tsx
   */
  async simulateFetchGames() {
    console.log('\n📱 Simulating fetchGames() from games-management-page.tsx...');

    // This is the exact call from line 113 in games-management-page.tsx
    const response = await this.simulateApiClientGetGames({ limit: 500 });

    if (response.success) {
      console.log('✅ fetchGames() simulation successful - games would be set in React state');
      console.log(`   React setState would be called with ${response.originalDataCount} games`);
      console.log(`   Total games count would be set to ${response.totalGames}`);
    } else {
      console.log('❌ fetchGames() simulation failed - error would be shown in UI');
    }

    return response;
  }

  /**
   * Test various limit values to ensure robustness
   */
  async testVariousLimits() {
    console.log('\n🧪 Testing various limit values with frontend simulation...');

    const testLimits = [50, 100, 300, 500, 1000];
    const results = [];

    for (const limit of testLimits) {
      console.log(`\n📊 Testing limit=${limit} through frontend simulation...`);

      const result = await this.simulateApiClientGetGames({ limit });
      results.push({ limit, ...result });

      // Small delay between requests
      await this.delay(100);
    }

    return results;
  }

  /**
   * Test edge cases that might break the frontend
   */
  async testEdgeCases() {
    console.log('\n🔍 Testing edge cases with frontend simulation...');

    const edgeCases = [
      { params: { limit: 1001 }, description: 'over maximum limit' },
      { params: { limit: 'abc' }, description: 'string limit' },
      { params: { limit: -10 }, description: 'negative limit' },
      { params: {}, description: 'no limit (should default to 50)' },
      { params: { limit: 500, status: 'assigned' }, description: 'limit with filter' }
    ];

    const results = [];

    for (const testCase of edgeCases) {
      console.log(`\n📋 Testing ${testCase.description}...`);

      try {
        const result = await this.simulateApiClientGetGames(testCase.params);
        results.push({
          testCase: testCase.description,
          params: testCase.params,
          ...result
        });
      } catch (error) {
        console.log(`❌ Edge case "${testCase.description}" threw error: ${error.message}`);
        results.push({
          testCase: testCase.description,
          params: testCase.params,
          success: false,
          error: error.message
        });
      }

      await this.delay(100);
    }

    return results;
  }

  /**
   * Comprehensive test summary
   */
  printSummary(limitResults, edgeResults, fetchGamesResult) {
    console.log('\n' + '='.repeat(70));
    console.log('📊 FRONTEND APPLICATION SIMULATION SUMMARY');
    console.log('='.repeat(70));

    console.log(`\n🎯 Primary Test (fetchGames with limit=500):`);
    console.log(`   Status: ${fetchGamesResult.success ? '✅ PASS' : '❌ FAIL'}`);
    if (fetchGamesResult.success) {
      console.log(`   Games returned: ${fetchGamesResult.originalDataCount}`);
      console.log(`   Response time: ${fetchGamesResult.responseTime}ms`);
      console.log(`   Frontend would display ${fetchGamesResult.originalDataCount} games`);
    } else {
      console.log(`   Error: ${fetchGamesResult.error}`);
    }

    console.log(`\n📈 Limit Value Tests (${limitResults.length} tests):`);
    const successfulLimits = limitResults.filter(r => r.success);
    console.log(`   Successful: ${successfulLimits.length}/${limitResults.length}`);

    successfulLimits.forEach(result => {
      console.log(`   limit=${result.limit}: ${result.originalDataCount} games (${result.responseTime}ms)`);
    });

    const failedLimits = limitResults.filter(r => !r.success);
    if (failedLimits.length > 0) {
      console.log(`\n❌ Failed Limits:`);
      failedLimits.forEach(result => {
        console.log(`   limit=${result.limit}: ${result.error}`);
      });
    }

    console.log(`\n🔍 Edge Case Tests (${edgeResults.length} tests):`);
    edgeResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${result.testCase}: ${result.success ? `${result.originalDataCount} games` : result.error}`);
    });

    console.log(`\n✨ Key Findings:`);
    console.log(`   - Frontend can successfully call limit=500: ${fetchGamesResult.success ? 'YES' : 'NO'}`);
    console.log(`   - All valid limits work: ${successfulLimits.length === limitResults.length ? 'YES' : 'NO'}`);
    console.log(`   - Invalid limits properly rejected: ${edgeResults.some(r => !r.success && r.params.limit > 1000) ? 'YES' : 'NO'}`);
    console.log(`   - No "Invalid query parameters" errors for valid requests: ${!limitResults.some(r => r.error?.includes('Invalid query parameters')) ? 'YES' : 'NO'}`);

    console.log('\n='.repeat(70));
  }

  /**
   * Run all frontend simulation tests
   */
  async runAllTests() {
    console.log('🚀 Starting Frontend Application Simulation Tests');
    console.log('🎯 Goal: Verify games-management-page.tsx can fetch with limit=500');

    try {
      // Login first
      const loginSuccess = await this.simulateLogin();
      if (!loginSuccess) {
        console.log('❌ Cannot proceed without successful login');
        return;
      }

      // Run the primary test (exact fetchGames simulation)
      const fetchGamesResult = await this.simulateFetchGames();

      // Test various limits
      const limitResults = await this.testVariousLimits();

      // Test edge cases
      const edgeResults = await this.testEdgeCases();

      // Print comprehensive summary
      this.printSummary(limitResults, edgeResults, fetchGamesResult);

    } catch (error) {
      console.error('💥 Fatal error during frontend simulation:', error);
    }
  }
}

// Run the simulation
if (require.main === module) {
  console.log('🎭 Frontend Application Simulation Starting...');
  console.log('📍 Testing against: http://localhost:3000 (frontend proxy)');
  console.log('🎯 Simulating: games-management-page.tsx behavior\n');

  const simulator = new FrontendSimulator();
  simulator.runAllTests().catch(console.error);
}

module.exports = FrontendSimulator;