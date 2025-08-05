/**
 * Validation tests for the new referee system
 * Tests validation schemas and error handling for new fields
 */

const Joi = require('joi');
const { UserSchemas, RefereeSchemas } = require('../../src/utils/validation-schemas');

describe('Referee System Validation', () => {
  describe('UserSchemas validation', () => {
    describe('create schema', () => {
      test('should validate referee creation with new level system', () => {
        const validData = {
          name: 'Test Referee',
          email: 'test@referee.com',
          password: 'testpassword123',
          phone: '+1234567890',
          postal_code: 'T1A1A1',
          new_referee_level: 'Junior',
          is_white_whistle: true
        };
        
        const { error, value } = UserSchemas.create.validate(validData);
        expect(error).toBeUndefined();
        expect(value.new_referee_level).toBe('Junior');
        expect(value.is_white_whistle).toBe(true);
      });
    });
  });
});