/**
 * @fileoverview Comprehensive tests for validation-schemas utility
 * @description Tests all validation schemas with edge cases and error conditions
 */

import Joi from 'joi';
import {
  BaseSchemas,
  COMMON_PATTERNS,
  UserSchemas,
  RefereeSchemas,
  GameSchemas,
  AssignmentSchemas,
  BudgetSchemas,
  AuthSchemas,
  FileSchemas,
  AvailabilitySchemas,
  MentorshipSchemas,
  MenteeGameSchemas,
  PaginationSchema,
  FilterSchemas,
  IdParamSchema
} from '../validation-schemas';

describe('COMMON_PATTERNS', () => {
  describe('TIME pattern', () => {
    test('should match valid time formats', () => {
      const validTimes = ['09:30', '12:00', '23:59', '00:00', '01:15', '8:45'];

      validTimes.forEach(time => {
        expect(COMMON_PATTERNS.TIME.test(time)).toBe(true);
      });
    });

    test('should reject invalid time formats', () => {
      const invalidTimes = ['24:00', '12:60', '123:45', '9:5', '25:30', 'abc:de', ''];

      invalidTimes.forEach(time => {
        expect(COMMON_PATTERNS.TIME.test(time)).toBe(false);
      });
    });
  });

  describe('POSTAL_CODE pattern', () => {
    test('should match valid postal codes', () => {
      const validCodes = ['K1A 0A6', 'M5V 3L9', 'T2X 1V4', 'ABC123', '12345', 'SW1A 1AA'];

      validCodes.forEach(code => {
        expect(COMMON_PATTERNS.POSTAL_CODE.test(code)).toBe(true);
      });
    });

    test('should reject invalid postal codes', () => {
      const invalidCodes = ['', 'AB', 'ABCDEFGHIJK', '!@#$%'];

      invalidCodes.forEach(code => {
        expect(COMMON_PATTERNS.POSTAL_CODE.test(code)).toBe(false);
      });
    });
  });

  describe('UUID pattern', () => {
    test('should match valid UUID formats', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'a1b2c3d4-e5f6-1890-abcd-ef1234567890', // Fixed: version digit should be 1-5
        '00000000-0000-1000-8000-000000000000'
      ];

      validUUIDs.forEach(uuid => {
        expect(COMMON_PATTERNS.UUID.test(uuid)).toBe(true);
      });
    });

    test('should reject invalid UUID formats', () => {
      const invalidUUIDs = [
        '123e4567-e89b-12d3-a456',
        'not-a-uuid',
        '123e4567-e89b-12d3-a456-426614174000-extra',
        ''
      ];

      invalidUUIDs.forEach(uuid => {
        expect(COMMON_PATTERNS.UUID.test(uuid)).toBe(false);
      });
    });
  });

  describe('PHONE pattern', () => {
    test('should match valid phone formats', () => {
      const validPhones = ['+1234567890', '1234567890', '+12345678901234', '5551234567'];

      validPhones.forEach(phone => {
        expect(COMMON_PATTERNS.PHONE.test(phone)).toBe(true);
      });
    });

    test('should reject invalid phone formats', () => {
      const invalidPhones = ['0123456789', '+0123456789', 'abc', '', '+'];

      invalidPhones.forEach(phone => {
        expect(COMMON_PATTERNS.PHONE.test(phone)).toBe(false);
      });
    });
  });
});

describe('BaseSchemas', () => {
  describe('id schema', () => {
    test('should validate valid UUIDs', () => {
      const { error } = BaseSchemas.id.validate('123e4567-e89b-12d3-a456-426614174000');
      expect(error).toBeUndefined();
    });

    test('should reject invalid UUIDs', () => {
      const { error } = BaseSchemas.id.validate('not-a-uuid');
      expect(error).toBeDefined();
    });

    test('should require value', () => {
      const { error } = BaseSchemas.id.validate(undefined);
      expect(error).toBeDefined();
    });
  });

  describe('name schema', () => {
    test('should validate valid names', () => {
      const { error } = BaseSchemas.name.validate('John Doe');
      expect(error).toBeUndefined();
    });

    test('should trim whitespace', () => {
      const { error, value } = BaseSchemas.name.validate('  John Doe  ');
      expect(error).toBeUndefined();
      expect(value).toBe('John Doe');
    });

    test('should reject names that are too long', () => {
      const longName = 'a'.repeat(101);
      const { error } = BaseSchemas.name.validate(longName);
      expect(error).toBeDefined();
    });

    test('should reject empty names', () => {
      const { error } = BaseSchemas.name.validate('');
      expect(error).toBeDefined();
    });
  });

  describe('email schema', () => {
    test('should validate valid emails', () => {
      const { error } = BaseSchemas.email.validate('test@example.com');
      expect(error).toBeUndefined();
    });

    test('should convert to lowercase', () => {
      const { error, value } = BaseSchemas.email.validate('TEST@EXAMPLE.COM');
      expect(error).toBeUndefined();
      expect(value).toBe('test@example.com');
    });

    test('should reject invalid email formats', () => {
      const invalidEmails = ['not-an-email', '@example.com', 'test@', 'test..test@example.com'];

      invalidEmails.forEach(email => {
        const { error } = BaseSchemas.email.validate(email);
        expect(error).toBeDefined();
      });
    });
  });

  describe('currency schema', () => {
    test('should validate valid currency amounts', () => {
      const validAmounts = [0, 10.50, 100, 999.99];

      validAmounts.forEach(amount => {
        const { error } = BaseSchemas.currency.validate(amount);
        expect(error).toBeUndefined();
      });
    });

    test('should reject negative amounts', () => {
      const { error } = BaseSchemas.currency.validate(-10);
      expect(error).toBeDefined();
    });

    test('should round to decimal precision', () => {
      const { error, value } = BaseSchemas.currency.validate(10.123);
      expect(error).toBeUndefined();
      expect(value).toBe(10.12); // Joi rounds to 2 decimal places
    });
  });
});

describe('UserSchemas', () => {
  describe('create schema', () => {
    const validUserData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      phone: '+1234567890',
      postal_code: 'K1A 0A6'
    };

    test('should validate complete user data', () => {
      const { error } = UserSchemas.create.validate(validUserData);
      expect(error).toBeUndefined();
    });

    test('should apply defaults', () => {
      const { error, value } = UserSchemas.create.validate(validUserData);
      expect(error).toBeUndefined();
      expect(value.role).toBe('referee');
      expect(value.max_distance).toBe(25);
      expect(value.is_available).toBe(true);
      expect(value.white_whistle).toBe(false);
    });

    test('should validate role options', () => {
      const userData = { ...validUserData, role: 'admin' };
      const { error } = UserSchemas.create.validate(userData);
      expect(error).toBeUndefined();
    });

    test('should reject invalid roles', () => {
      const userData = { ...validUserData, role: 'invalid' };
      const { error } = UserSchemas.create.validate(userData);
      expect(error).toBeDefined();
    });

    test('should validate password requirements', () => {
      const userData = { ...validUserData, password: 'short' };
      const { error } = UserSchemas.create.validate(userData);
      expect(error).toBeDefined();
    });

    test('should validate max_distance limits', () => {
      const userData = { ...validUserData, max_distance: 501 };
      const { error } = UserSchemas.create.validate(userData);
      expect(error).toBeDefined();
    });
  });

  describe('update schema', () => {
    test('should allow partial updates', () => {
      const updateData = { name: 'Jane Doe' };
      const { error } = UserSchemas.update.validate(updateData);
      expect(error).toBeUndefined();
    });

    test('should validate availability_strategy', () => {
      const updateData = { availability_strategy: 'WHITELIST' };
      const { error } = UserSchemas.update.validate(updateData);
      expect(error).toBeUndefined();
    });

    test('should reject invalid availability_strategy', () => {
      const updateData = { availability_strategy: 'INVALID' };
      const { error } = UserSchemas.update.validate(updateData);
      expect(error).toBeDefined();
    });
  });

  describe('adminUpdate schema', () => {
    test('should allow admin-specific fields', () => {
      const adminData = { role: 'admin', wage_per_game: 50.00 };
      const { error } = UserSchemas.adminUpdate.validate(adminData);
      expect(error).toBeUndefined();
    });

    test('should validate wage_per_game constraints', () => {
      const adminData = { wage_per_game: -10 };
      const { error } = UserSchemas.adminUpdate.validate(adminData);
      expect(error).toBeDefined();
    });
  });
});

describe('GameSchemas', () => {
  describe('team schema', () => {
    const validTeamData = {
      organization: 'Test Org',
      ageGroup: 'U18',
      gender: 'Boys',
      rank: 1
    };

    test('should validate complete team data', () => {
      const { error } = GameSchemas.team.validate(validTeamData);
      expect(error).toBeUndefined();
    });

    test('should validate gender options', () => {
      const teamData = { ...validTeamData, gender: 'Girls' };
      const { error } = GameSchemas.team.validate(teamData);
      expect(error).toBeUndefined();
    });

    test('should reject invalid gender', () => {
      const teamData = { ...validTeamData, gender: 'Mixed' };
      const { error } = GameSchemas.team.validate(teamData);
      expect(error).toBeDefined();
    });

    test('should validate rank constraints', () => {
      const teamData = { ...validTeamData, rank: 0 };
      const { error } = GameSchemas.team.validate(teamData);
      expect(error).toBeDefined();
    });
  });

  describe('create schema', () => {
    const validGameData = {
      homeTeam: {
        organization: 'Home Org',
        ageGroup: 'U18',
        gender: 'Boys',
        rank: 1
      },
      awayTeam: {
        organization: 'Away Org',
        ageGroup: 'U18',
        gender: 'Boys',
        rank: 2
      },
      date: new Date('2024-12-01'),
      time: '14:30',
      location: 'Test Field',
      postalCode: 'K1A 0A6',
      level: 'Recreational',
      division: 'Division 1',
      season: '2024 Fall',
      payRate: 75.00
    };

    test('should validate complete game data', () => {
      const { error } = GameSchemas.create.validate(validGameData);
      expect(error).toBeUndefined();
    });

    test('should apply defaults', () => {
      const { error, value } = GameSchemas.create.validate(validGameData);
      expect(error).toBeUndefined();
      expect(value.gameType).toBe('Community');
      expect(value.refsNeeded).toBe(2);
      expect(value.wageMultiplier).toBe(1.0);
    });

    test('should validate gameType options', () => {
      const gameData = { ...validGameData, gameType: 'Tournament' };
      const { error } = GameSchemas.create.validate(gameData);
      expect(error).toBeUndefined();
    });

    test('should validate refsNeeded limits', () => {
      const gameData = { ...validGameData, refsNeeded: 15 };
      const { error } = GameSchemas.create.validate(gameData);
      expect(error).toBeDefined();
    });

    test('should validate wageMultiplier constraints', () => {
      const gameData = { ...validGameData, wageMultiplier: 0.05 };
      const { error } = GameSchemas.create.validate(gameData);
      expect(error).toBeDefined();
    });
  });
});

describe('AssignmentSchemas', () => {
  describe('create schema', () => {
    const validAssignmentData = {
      game_id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '123e4567-e89b-12d3-a456-426614174001',
      position_id: '123e4567-e89b-12d3-a456-426614174002'
    };

    test('should validate complete assignment data', () => {
      const { error } = AssignmentSchemas.create.validate(validAssignmentData);
      expect(error).toBeUndefined();
    });

    test('should apply default status', () => {
      const { error, value } = AssignmentSchemas.create.validate(validAssignmentData);
      expect(error).toBeUndefined();
      expect(value.status).toBe('pending');
    });

    test('should validate status options', () => {
      const assignmentData = { ...validAssignmentData, status: 'accepted' };
      const { error } = AssignmentSchemas.create.validate(assignmentData);
      expect(error).toBeUndefined();
    });
  });

  describe('bulk schema', () => {
    test('should validate bulk assignments', () => {
      const bulkData = {
        assignments: [
          {
            game_id: '123e4567-e89b-12d3-a456-426614174000',
            user_id: '123e4567-e89b-12d3-a456-426614174001',
            position_id: '123e4567-e89b-12d3-a456-426614174002'
          }
        ]
      };
      const { error } = AssignmentSchemas.bulk.validate(bulkData);
      expect(error).toBeUndefined();
    });

    test('should enforce minimum assignments', () => {
      const bulkData = { assignments: [] };
      const { error } = AssignmentSchemas.bulk.validate(bulkData);
      expect(error).toBeDefined();
    });

    test('should enforce maximum assignments', () => {
      const assignments = Array(101).fill({
        game_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        position_id: '123e4567-e89b-12d3-a456-426614174002'
      });
      const bulkData = { assignments };
      const { error } = AssignmentSchemas.bulk.validate(bulkData);
      expect(error).toBeDefined();
    });
  });
});

describe('BudgetSchemas', () => {
  describe('period schema', () => {
    const validPeriodData = {
      name: 'Q1 2024',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-03-31'),
      budget_limit: 10000
    };

    test('should validate complete period data', () => {
      const { error } = BudgetSchemas.period.validate(validPeriodData);
      expect(error).toBeUndefined();
    });

    test('should apply default is_active', () => {
      const { error, value } = BudgetSchemas.period.validate(validPeriodData);
      expect(error).toBeUndefined();
      expect(value.is_active).toBe(true);
    });

    test('should validate end_date is after start_date', () => {
      const periodData = {
        ...validPeriodData,
        end_date: new Date('2023-12-31')
      };
      const { error } = BudgetSchemas.period.validate(periodData);
      expect(error).toBeDefined();
    });
  });
});

describe('AuthSchemas', () => {
  describe('login schema', () => {
    test('should validate login credentials', () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };
      const { error } = AuthSchemas.login.validate(loginData);
      expect(error).toBeUndefined();
    });

    test('should require both email and password', () => {
      const { error } = AuthSchemas.login.validate({ email: 'test@example.com' });
      expect(error).toBeDefined();
    });
  });

  describe('register schema', () => {
    const validRegisterData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      phone: '+1234567890',
      postal_code: 'K1A 0A6'
    };

    test('should validate complete registration data', () => {
      const { error } = AuthSchemas.register.validate(validRegisterData);
      expect(error).toBeUndefined();
    });

    test('should validate password confirmation', () => {
      const registerData = {
        ...validRegisterData,
        confirmPassword: 'different'
      };
      const { error } = AuthSchemas.register.validate(registerData);
      expect(error).toBeDefined();
    });
  });

  describe('passwordUpdate schema', () => {
    test('should validate password update', () => {
      const updateData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123'
      };
      const { error } = AuthSchemas.passwordUpdate.validate(updateData);
      expect(error).toBeUndefined();
    });

    test('should validate new password confirmation', () => {
      const updateData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'different'
      };
      const { error } = AuthSchemas.passwordUpdate.validate(updateData);
      expect(error).toBeDefined();
    });
  });
});

describe('RefereeSchemas', () => {
  describe('levelAssignment schema', () => {
    test('should validate level assignment', () => {
      const levelData = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        new_referee_level: 'Senior'
      };
      const { error } = RefereeSchemas.levelAssignment.validate(levelData);
      expect(error).toBeUndefined();
    });

    test('should validate level options', () => {
      const levelData = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        new_referee_level: 'InvalidLevel'
      };
      const { error } = RefereeSchemas.levelAssignment.validate(levelData);
      expect(error).toBeDefined();
    });
  });

  describe('roleDefinition schema', () => {
    test('should validate role definition', () => {
      const roleData = {
        name: 'Test Role',
        description: 'A test role for validation'
      };
      const { error } = RefereeSchemas.roleDefinition.validate(roleData);
      expect(error).toBeUndefined();
    });

    test('should apply default permissions', () => {
      const roleData = { name: 'Test Role' };
      const { error, value } = RefereeSchemas.roleDefinition.validate(roleData);
      expect(error).toBeUndefined();
      expect(value.permissions).toEqual({}); // Joi applies empty object as default
      expect(value.is_active).toBe(true);
    });
  });
});

describe('AvailabilitySchemas', () => {
  describe('create schema', () => {
    const validAvailabilityData = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      start_time: '09:00',
      end_time: '17:00',
      is_available: true
    };

    test('should validate complete availability data', () => {
      const { error } = AvailabilitySchemas.create.validate(validAvailabilityData);
      expect(error).toBeUndefined();
    });

    test('should validate max_games constraints', () => {
      const availabilityData = { ...validAvailabilityData, max_games: 15 };
      const { error } = AvailabilitySchemas.create.validate(availabilityData);
      expect(error).toBeDefined();
    });

    test('should validate comments length', () => {
      const longComment = 'a'.repeat(501);
      const availabilityData = { ...validAvailabilityData, comments: longComment };
      const { error } = AvailabilitySchemas.create.validate(availabilityData);
      expect(error).toBeDefined();
    });
  });
});

describe('MentorshipSchemas', () => {
  describe('create schema', () => {
    const validMentorshipData = {
      mentor_id: '123e4567-e89b-12d3-a456-426614174000',
      mentee_id: '123e4567-e89b-12d3-a456-426614174001',
      start_date: new Date('2024-01-01')
    };

    test('should validate complete mentorship data', () => {
      const { error } = MentorshipSchemas.create.validate(validMentorshipData);
      expect(error).toBeUndefined();
    });
  });

  describe('noteCreate schema', () => {
    test('should validate note creation', () => {
      const noteData = {
        title: 'Progress Update',
        content: 'Mentee has shown improvement in game management.',
        note_type: 'progress'
      };
      const { error } = MentorshipSchemas.noteCreate.validate(noteData);
      expect(error).toBeUndefined();
    });

    test('should apply defaults', () => {
      const noteData = {
        title: 'General Note',
        content: 'General observation.'
      };
      const { error, value } = MentorshipSchemas.noteCreate.validate(noteData);
      expect(error).toBeUndefined();
      expect(value.note_type).toBe('general');
      expect(value.is_private).toBe(false);
    });

    test('should validate content length', () => {
      const longContent = 'a'.repeat(10001);
      const noteData = {
        title: 'Test',
        content: longContent
      };
      const { error } = MentorshipSchemas.noteCreate.validate(noteData);
      expect(error).toBeDefined();
    });
  });
});

describe('PaginationSchema', () => {
  test('should validate pagination parameters', () => {
    const paginationData = { page: 2, limit: 25 };
    const { error } = PaginationSchema.validate(paginationData);
    expect(error).toBeUndefined();
  });

  test('should apply defaults', () => {
    const { error, value } = PaginationSchema.validate({});
    expect(error).toBeUndefined();
    expect(value.page).toBe(1);
    expect(value.limit).toBe(50);
    expect(value.sort_order).toBe('asc');
  });

  test('should validate page minimum', () => {
    const { error } = PaginationSchema.validate({ page: 0 });
    expect(error).toBeDefined();
  });

  test('should validate limit maximum', () => {
    const { error } = PaginationSchema.validate({ limit: 301 });
    expect(error).toBeDefined();
  });

  test('should validate sort_order values', () => {
    const { error } = PaginationSchema.validate({ sort_order: 'invalid' });
    expect(error).toBeDefined();
  });
});

describe('FilterSchemas', () => {
  describe('games filter', () => {
    test('should validate game filters', () => {
      const filterData = {
        status: 'scheduled',
        level: 'Recreational',
        page: 1,
        limit: 20
      };
      const { error } = FilterSchemas.games.validate(filterData);
      expect(error).toBeUndefined();
    });

    test('should validate status options', () => {
      const filterData = { status: 'invalid_status' };
      const { error } = FilterSchemas.games.validate(filterData);
      expect(error).toBeDefined();
    });
  });

  describe('referees filter', () => {
    test('should validate referee filters', () => {
      const filterData = {
        level: 'Senior',
        is_available: true,
        search: 'John'
      };
      const { error } = FilterSchemas.referees.validate(filterData);
      expect(error).toBeUndefined();
    });

    test('should validate search length', () => {
      const longSearch = 'a'.repeat(101);
      const filterData = { search: longSearch };
      const { error } = FilterSchemas.referees.validate(filterData);
      expect(error).toBeDefined();
    });
  });

  describe('assignments filter', () => {
    test('should validate assignment filters', () => {
      const filterData = {
        game_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'pending'
      };
      const { error } = FilterSchemas.assignments.validate(filterData);
      expect(error).toBeUndefined();
    });

    test('should handle both game_id and gameId', () => {
      const filterData1 = { game_id: '123e4567-e89b-12d3-a456-426614174000' };
      const filterData2 = { gameId: '123e4567-e89b-12d3-a456-426614174000' };

      const { error: error1 } = FilterSchemas.assignments.validate(filterData1);
      const { error: error2 } = FilterSchemas.assignments.validate(filterData2);

      expect(error1).toBeUndefined();
      expect(error2).toBeUndefined();
    });
  });
});

describe('IdParamSchema', () => {
  test('should validate UUID parameter', () => {
    const paramData = { id: '123e4567-e89b-12d3-a456-426614174000' };
    const { error } = IdParamSchema.validate(paramData);
    expect(error).toBeUndefined();
  });

  test('should reject invalid UUID parameter', () => {
    const paramData = { id: 'not-a-uuid' };
    const { error } = IdParamSchema.validate(paramData);
    expect(error).toBeDefined();
  });
});

describe('MenteeGameSchemas', () => {
  describe('gameFilters schema', () => {
    test('should validate game filters', () => {
      const filterData = {
        page: 1,
        limit: 20,
        status: 'pending',
        sort_by: 'game_date'
      };
      const { error } = MenteeGameSchemas.gameFilters.validate(filterData);
      expect(error).toBeUndefined();
    });

    test('should apply defaults', () => {
      const { error, value } = MenteeGameSchemas.gameFilters.validate({});
      expect(error).toBeUndefined();
      expect(value.page).toBe(1);
      expect(value.limit).toBe(20);
      expect(value.include_details).toBe(true);
      expect(value.sort_by).toBe('game_date');
      expect(value.sort_order).toBe('desc');
    });

    test('should validate sort_by options', () => {
      const filterData = { sort_by: 'invalid_field' };
      const { error } = MenteeGameSchemas.gameFilters.validate(filterData);
      expect(error).toBeDefined();
    });
  });

  describe('analytics schema', () => {
    test('should validate analytics parameters', () => {
      const analyticsData = {
        date_from: new Date('2024-01-01'),
        date_to: new Date('2024-12-31'),
        group_by: 'month'
      };
      const { error } = MenteeGameSchemas.analytics.validate(analyticsData);
      expect(error).toBeUndefined();
    });

    test('should apply defaults', () => {
      const { error, value } = MenteeGameSchemas.analytics.validate({});
      expect(error).toBeUndefined();
      expect(value.compare_to_previous).toBe(false);
      expect(value.group_by).toBe('month');
      expect(value.include_trends).toBe(true);
    });
  });
});

describe('Edge cases and integration', () => {
  test('should handle empty objects gracefully', () => {
    const schemas = [
      UserSchemas.update,
      GameSchemas.update,
      AssignmentSchemas.update,
      MentorshipSchemas.update
    ];

    schemas.forEach(schema => {
      const { error } = schema.validate({});
      expect(error).toBeUndefined();
    });
  });

  test('should handle null and undefined values appropriately', () => {
    const { error: errorNull } = BaseSchemas.optionalName.validate(null);
    const { error: errorUndefined } = BaseSchemas.optionalName.validate(undefined);

    // Note: Joi's optional() doesn't allow null by default, only undefined
    expect(errorNull).toBeDefined(); // null is not allowed
    expect(errorUndefined).toBeUndefined(); // undefined is allowed
  });

  test('should validate complex nested objects', () => {
    const complexGameData = {
      homeTeam: {
        organization: 'Complex Org',
        ageGroup: 'U16',
        gender: 'Girls',
        rank: 3
      },
      awayTeam: {
        organization: 'Another Org',
        ageGroup: 'U16',
        gender: 'Girls',
        rank: 1
      },
      date: new Date('2024-06-15'),
      time: '19:00',
      location: 'Championship Field',
      postalCode: 'M5V 3L9',
      level: 'Competitive',
      division: 'Premier',
      season: '2024 Spring',
      payRate: 125.50,
      gameType: 'Tournament',
      refsNeeded: 3,
      wageMultiplier: 1.5,
      wageMultiplierReason: 'Championship game'
    };

    const { error } = GameSchemas.create.validate(complexGameData);
    expect(error).toBeUndefined();
  });
});