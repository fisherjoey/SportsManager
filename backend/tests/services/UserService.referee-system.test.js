/**
 * Unit tests for UserService referee system functionality
 * Tests the new level system (Rookie/Junior/Senior) and white whistle logic
 */

const UserService = require('../../src/services/UserService');
const { setupTestDatabase, cleanupTestDatabase } = require('../helpers/test-helpers');

describe('UserService - Referee System', () => {
  let db;
  let userService;
  
  beforeAll(async () => {
    db = await setupTestDatabase();
    userService = new UserService(db);
  });
  
  afterAll(async () => {
    await cleanupTestDatabase(db);
  });
  
  beforeEach(async () => {
    // Clean up data before each test
    await db('user_referee_roles').del();
    await db('users').where('role', 'referee').del();
  });
  
  describe('White Whistle Display Logic', () => {
    test('should display white whistle for Rookie level (always)', () => {
      const result = userService.shouldDisplayWhiteWhistle('Rookie', false);
      expect(result).toBe(true);
      
      const resultWithFlag = userService.shouldDisplayWhiteWhistle('Rookie', true);
      expect(resultWithFlag).toBe(true);
    });
    
    test('should conditionally display white whistle for Junior level', () => {
      const resultWithoutFlag = userService.shouldDisplayWhiteWhistle('Junior', false);
      expect(resultWithoutFlag).toBe(false);
      
      const resultWithFlag = userService.shouldDisplayWhiteWhistle('Junior', true);
      expect(resultWithFlag).toBe(true);
    });
    
    test('should never display white whistle for Senior level', () => {
      const result = userService.shouldDisplayWhiteWhistle('Senior', false);
      expect(result).toBe(false);
      
      const resultWithFlag = userService.shouldDisplayWhiteWhistle('Senior', true);
      expect(resultWithFlag).toBe(false);
    });
    
    test('should handle case-insensitive level names', () => {
      expect(userService.shouldDisplayWhiteWhistle('rookie', false)).toBe(true);
      expect(userService.shouldDisplayWhiteWhistle('JUNIOR', true)).toBe(true);
      expect(userService.shouldDisplayWhiteWhistle('senior', true)).toBe(false);
    });
  });
});