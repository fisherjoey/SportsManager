const {
  BaseSchemas,
  UserSchemas,
  GameSchemas,
  AssignmentSchemas,
  BudgetSchemas,
  AuthSchemas,
  FileSchemas,
  AvailabilitySchemas,
  PaginationSchema,
  FilterSchemas,
  IdParamSchema,
  COMMON_PATTERNS
} = require('../../src/utils/validation-schemas');

describe('Validation Schemas', () => {
  describe('BaseSchemas', () => {
    describe('id', () => {
      it('should validate valid UUID', () => {
        const validUuid = '123e4567-e89b-12d3-a456-426614174000';
        const { error } = BaseSchemas.id.validate(validUuid);
        expect(error).toBeUndefined();
      });

      it('should reject invalid UUID', () => {
        const invalidUuid = 'not-a-uuid';
        const { error } = BaseSchemas.id.validate(invalidUuid);
        expect(error).toBeDefined();
      });

      it('should reject empty string', () => {
        const { error } = BaseSchemas.id.validate('');
        expect(error).toBeDefined();
      });
    });

    describe('email', () => {
      it('should validate valid email and convert to lowercase', () => {
        const { error, value } = BaseSchemas.email.validate('TEST@EXAMPLE.COM');
        expect(error).toBeUndefined();
        expect(value).toBe('test@example.com');
      });

      it('should reject invalid email', () => {
        const { error } = BaseSchemas.email.validate('invalid-email');
        expect(error).toBeDefined();
      });
    });

    describe('postalCode', () => {
      it('should validate valid postal codes', () => {
        const validCodes = ['K1A 0A6', '90210', 'SW1A 1AA', '10001'];
        validCodes.forEach(code => {
          const { error } = BaseSchemas.postalCode.validate(code);
          expect(error).toBeUndefined();
        });
      });

      it('should reject invalid postal codes', () => {
        const invalidCodes = ['', 'AB', 'TOOLONGPOSTALCODE'];
        invalidCodes.forEach(code => {
          const { error } = BaseSchemas.postalCode.validate(code);
          expect(error).toBeDefined();
        });
      });
    });

    describe('time', () => {
      it('should validate valid time formats', () => {
        const validTimes = ['09:30', '14:45', '00:00', '23:59'];
        validTimes.forEach(time => {
          const { error } = BaseSchemas.time.validate(time);
          expect(error).toBeUndefined();
        });
      });

      it('should reject invalid time formats', () => {
        const invalidTimes = ['25:00', '14:60', '9:30', 'not-time'];
        invalidTimes.forEach(time => {
          const { error } = BaseSchemas.time.validate(time);
          expect(error).toBeDefined();
        });
      });
    });
  });

  describe('UserSchemas', () => {
    describe('create', () => {
      const validUserData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        postal_code: 'K1A 0A6'
      };

      it('should validate valid user creation data', () => {
        const { error } = UserSchemas.create.validate(validUserData);
        expect(error).toBeUndefined();
      });

      it('should apply default values', () => {
        const { error, value } = UserSchemas.create.validate(validUserData);
        expect(error).toBeUndefined();
        expect(value.role).toBe('referee');
        expect(value.max_distance).toBe(25);
        expect(value.is_available).toBe(true);
        expect(value.white_whistle).toBe(false);
      });

      it('should require name, email, password, and postal_code', () => {
        const requiredFields = ['name', 'email', 'password', 'postal_code'];
        requiredFields.forEach(field => {
          const incompleteData = { ...validUserData };
          delete incompleteData[field];
          const { error } = UserSchemas.create.validate(incompleteData);
          expect(error).toBeDefined();
        });
      });

      it('should validate password minimum length', () => {
        const shortPassword = { ...validUserData, password: '1234567' };
        const { error } = UserSchemas.create.validate(shortPassword);
        expect(error).toBeDefined();
      });

      it('should validate role enum', () => {
        const invalidRole = { ...validUserData, role: 'invalid-role' };
        const { error } = UserSchemas.create.validate(invalidRole);
        expect(error).toBeDefined();
      });
    });

    describe('update', () => {
      it('should allow partial updates', () => {
        const partialUpdate = { name: 'Updated Name' };
        const { error } = UserSchemas.update.validate(partialUpdate);
        expect(error).toBeUndefined();
      });

      it('should validate availability_strategy enum', () => {
        const validStrategies = ['WHITELIST', 'BLACKLIST'];
        validStrategies.forEach(strategy => {
          const { error } = UserSchemas.update.validate({ availability_strategy: strategy });
          expect(error).toBeUndefined();
        });

        const { error } = UserSchemas.update.validate({ availability_strategy: 'INVALID' });
        expect(error).toBeDefined();
      });
    });
  });

  describe('GameSchemas', () => {
    describe('create', () => {
      const validGameData = {
        homeTeam: {
          organization: 'CMBA',
          ageGroup: 'U16',
          gender: 'Boys',
          rank: 1
        },
        awayTeam: {
          organization: 'OMHA',
          ageGroup: 'U16',
          gender: 'Boys',
          rank: 2
        },
        date: new Date('2024-12-01'),
        time: '14:30',
        location: 'Arena A',
        postalCode: 'K1A 0A6',
        level: 'Elite',
        division: 'A',
        season: '2024-25',
        payRate: 75.00
      };

      it('should validate valid game creation data', () => {
        const { error } = GameSchemas.create.validate(validGameData);
        expect(error).toBeUndefined();
      });

      it('should apply default values', () => {
        const { error, value } = GameSchemas.create.validate(validGameData);
        expect(error).toBeUndefined();
        expect(value.gameType).toBe('Community');
        expect(value.refsNeeded).toBe(2);
        expect(value.wageMultiplier).toBe(1.0);
      });

      it('should validate team gender enum', () => {
        const invalidGender = {
          ...validGameData,
          homeTeam: { ...validGameData.homeTeam, gender: 'Invalid' }
        };
        const { error } = GameSchemas.create.validate(invalidGender);
        expect(error).toBeDefined();
      });

      it('should validate gameType enum', () => {
        const validTypes = ['Community', 'Club', 'Tournament', 'Private Tournament'];
        validTypes.forEach(type => {
          const gameData = { ...validGameData, gameType: type };
          const { error } = GameSchemas.create.validate(gameData);
          expect(error).toBeUndefined();
        });

        const invalidType = { ...validGameData, gameType: 'Invalid' };
        const { error } = GameSchemas.create.validate(invalidType);
        expect(error).toBeDefined();
      });

      it('should validate refsNeeded range', () => {
        const tooFew = { ...validGameData, refsNeeded: 0 };
        const tooMany = { ...validGameData, refsNeeded: 11 };
        
        expect(GameSchemas.create.validate(tooFew).error).toBeDefined();
        expect(GameSchemas.create.validate(tooMany).error).toBeDefined();
        
        const validCount = { ...validGameData, refsNeeded: 3 };
        expect(GameSchemas.create.validate(validCount).error).toBeUndefined();
      });

      it('should validate wageMultiplier range', () => {
        const tooLow = { ...validGameData, wageMultiplier: 0.05 };
        const tooHigh = { ...validGameData, wageMultiplier: 6.0 };
        
        expect(GameSchemas.create.validate(tooLow).error).toBeDefined();
        expect(GameSchemas.create.validate(tooHigh).error).toBeDefined();
        
        const validMultiplier = { ...validGameData, wageMultiplier: 1.5 };
        expect(GameSchemas.create.validate(validMultiplier).error).toBeUndefined();
      });
    });
  });

  describe('AssignmentSchemas', () => {
    describe('create', () => {
      const validAssignmentData = {
        game_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        position_id: '123e4567-e89b-12d3-a456-426614174002'
      };

      it('should validate valid assignment creation data', () => {
        const { error } = AssignmentSchemas.create.validate(validAssignmentData);
        expect(error).toBeUndefined();
      });

      it('should apply default status', () => {
        const { error, value } = AssignmentSchemas.create.validate(validAssignmentData);
        expect(error).toBeUndefined();
        expect(value.status).toBe('assigned');
      });

      it('should validate status enum', () => {
        const validStatuses = ['assigned', 'accepted', 'declined', 'completed'];
        validStatuses.forEach(status => {
          const assignmentData = { ...validAssignmentData, status };
          const { error } = AssignmentSchemas.create.validate(assignmentData);
          expect(error).toBeUndefined();
        });

        const invalidStatus = { ...validAssignmentData, status: 'invalid' };
        const { error } = AssignmentSchemas.create.validate(invalidStatus);
        expect(error).toBeDefined();
      });
    });

    describe('bulk', () => {
      it('should validate bulk assignment data', () => {
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

      it('should reject empty assignments array', () => {
        const { error } = AssignmentSchemas.bulk.validate({ assignments: [] });
        expect(error).toBeDefined();
      });

      it('should reject too many assignments', () => {
        const assignments = Array(101).fill().map((_, i) => ({
          game_id: '123e4567-e89b-12d3-a456-426614174000',
          user_id: '123e4567-e89b-12d3-a456-426614174001',
          position_id: '123e4567-e89b-12d3-a456-426614174002'
        }));

        const { error } = AssignmentSchemas.bulk.validate({ assignments });
        expect(error).toBeDefined();
      });
    });
  });

  describe('PaginationSchema', () => {
    it('should apply default values', () => {
      const { error, value } = PaginationSchema.validate({});
      expect(error).toBeUndefined();
      expect(value.page).toBe(1);
      expect(value.limit).toBe(50);
      expect(value.sort_order).toBe('asc');
    });

    it('should validate page minimum', () => {
      const { error } = PaginationSchema.validate({ page: 0 });
      expect(error).toBeDefined();
    });

    it('should validate limit maximum', () => {
      const { error } = PaginationSchema.validate({ limit: 101 });
      expect(error).toBeDefined();
    });

    it('should validate sort_order enum', () => {
      const validOrders = ['asc', 'desc'];
      validOrders.forEach(order => {
        const { error } = PaginationSchema.validate({ sort_order: order });
        expect(error).toBeUndefined();
      });

      const { error } = PaginationSchema.validate({ sort_order: 'invalid' });
      expect(error).toBeDefined();
    });
  });

  describe('FilterSchemas', () => {
    describe('games', () => {
      it('should validate game filters with pagination', () => {
        const filters = {
          status: 'scheduled',
          level: 'Elite',
          game_type: 'Community',
          postal_code: 'K1A 0A6',
          date_from: new Date('2024-01-01'),
          date_to: new Date('2024-12-31'),
          page: 1,
          limit: 25
        };

        const { error } = FilterSchemas.games.validate(filters);
        expect(error).toBeUndefined();
      });

      it('should allow partial filters', () => {
        const { error } = FilterSchemas.games.validate({ status: 'completed' });
        expect(error).toBeUndefined();
      });
    });

    describe('referees', () => {
      it('should validate referee filters', () => {
        const filters = {
          level: 'Elite',
          postal_code: 'K1A 0A6',
          is_available: true,
          search: 'john',
          white_whistle: false,
          page: 2,
          limit: 10
        };

        const { error } = FilterSchemas.referees.validate(filters);
        expect(error).toBeUndefined();
      });
    });
  });

  describe('AuthSchemas', () => {
    describe('login', () => {
      it('should validate login data', () => {
        const loginData = {
          email: 'test@example.com',
          password: 'password123'
        };

        const { error } = AuthSchemas.login.validate(loginData);
        expect(error).toBeUndefined();
      });

      it('should require email and password', () => {
        const { error: emailError } = AuthSchemas.login.validate({ password: 'test' });
        const { error: passwordError } = AuthSchemas.login.validate({ email: 'test@example.com' });
        
        expect(emailError).toBeDefined();
        expect(passwordError).toBeDefined();
      });
    });

    describe('register', () => {
      it('should validate registration data', () => {
        const registerData = {
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          postal_code: 'K1A 0A6'
        };

        const { error } = AuthSchemas.register.validate(registerData);
        expect(error).toBeUndefined();
      });

      it('should validate password confirmation', () => {
        const registerData = {
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
          confirmPassword: 'different',
          postal_code: 'K1A 0A6'
        };

        const { error } = AuthSchemas.register.validate(registerData);
        expect(error).toBeDefined();
      });
    });
  });

  describe('AvailabilitySchemas', () => {
    describe('create', () => {
      const validAvailabilityData = {
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07'),
        start_time: '09:00',
        end_time: '17:00',
        is_available: true
      };

      it('should validate valid availability data', () => {
        const { error } = AvailabilitySchemas.create.validate(validAvailabilityData);
        expect(error).toBeUndefined();
      });

      it('should validate optional fields', () => {
        const withOptionals = {
          ...validAvailabilityData,
          max_games: 3,
          preferred_locations: ['Arena A', 'Arena B'],
          comments: 'Available all week'
        };

        const { error } = AvailabilitySchemas.create.validate(withOptionals);
        expect(error).toBeUndefined();
      });

      it('should validate max_games range', () => {
        const tooMany = { ...validAvailabilityData, max_games: 11 };
        const { error } = AvailabilitySchemas.create.validate(tooMany);
        expect(error).toBeDefined();
      });
    });
  });

  describe('IdParamSchema', () => {
    it('should validate UUID parameter', () => {
      const validId = { id: '123e4567-e89b-12d3-a456-426614174000' };
      const { error } = IdParamSchema.validate(validId);
      expect(error).toBeUndefined();
    });

    it('should reject invalid UUID parameter', () => {
      const invalidId = { id: 'not-a-uuid' };
      const { error } = IdParamSchema.validate(invalidId);
      expect(error).toBeDefined();
    });
  });

  describe('COMMON_PATTERNS', () => {
    it('should validate time pattern', () => {
      const validTimes = ['00:00', '12:30', '23:59'];
      const invalidTimes = ['24:00', '12:60', '1:30'];

      validTimes.forEach(time => {
        expect(COMMON_PATTERNS.TIME.test(time)).toBe(true);
      });

      invalidTimes.forEach(time => {
        expect(COMMON_PATTERNS.TIME.test(time)).toBe(false);
      });
    });

    it('should validate UUID pattern', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const invalidUuid = 'not-a-uuid';

      expect(COMMON_PATTERNS.UUID.test(validUuid)).toBe(true);
      expect(COMMON_PATTERNS.UUID.test(invalidUuid)).toBe(false);
    });

    it('should validate postal code pattern', () => {
      const validCodes = ['K1A 0A6', '90210', 'SW1A1AA'];
      const invalidCodes = ['AB', 'TOOLONG'];

      validCodes.forEach(code => {
        expect(COMMON_PATTERNS.POSTAL_CODE.test(code)).toBe(true);
      });

      invalidCodes.forEach(code => {
        expect(COMMON_PATTERNS.POSTAL_CODE.test(code)).toBe(false);
      });
    });
  });
});