/**
 * @fileoverview Database CRUD Operations Tests
 * Comprehensive tests for all Create, Read, Update, Delete operations
 * Essential for protecting against refactoring and schema changes
 */

const knex = require('knex');
const config = require('../../knexfile');
const bcrypt = require('bcryptjs');

const testDb = knex(config.test);

describe('Database CRUD Operations', () => {
  beforeAll(async () => {
    await testDb.migrate.latest();
  });

  afterAll(async () => {
    await testDb.destroy();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await testDb.raw('TRUNCATE TABLE game_assignments CASCADE');
    await testDb.raw('TRUNCATE TABLE games CASCADE');
    await testDb.raw('TRUNCATE TABLE teams CASCADE');
    await testDb.raw('TRUNCATE TABLE leagues CASCADE');
    await testDb.raw('TRUNCATE TABLE referees CASCADE');
    await testDb.raw('TRUNCATE TABLE users CASCADE');
    await testDb.raw('TRUNCATE TABLE positions CASCADE');
    await testDb.raw('TRUNCATE TABLE referee_levels CASCADE');
  });

  describe('Users CRUD Operations', () => {
    describe('Create User', () => {
      it('should create admin user successfully', async () => {
        const passwordHash = await bcrypt.hash('password123', 12);
        
        const [user] = await testDb('users').insert({
          email: 'admin@test.com',
          password_hash: passwordHash,
          role: 'admin',
          name: 'Test Admin'
        }).returning('*');

        expect(user).toBeDefined();
        expect(user.id).toBeDefined();
        expect(user.email).toBe('admin@test.com');
        expect(user.role).toBe('admin');
        expect(user.name).toBe('Test Admin');
        expect(user.created_at).toBeDefined();
        expect(user.updated_at).toBeDefined();
      });

      it('should create referee user with all fields', async () => {
        const passwordHash = await bcrypt.hash('password123', 12);
        
        const [refLevel] = await testDb('referee_levels').insert({
          name: 'Competitive',
          wage_amount: 65.00
        }).returning('*');

        const [user] = await testDb('users').insert({
          email: 'referee@test.com',
          password_hash: passwordHash,
          role: 'referee',
          name: 'Test Referee',
          phone: '(555) 123-4567',
          location: 'Downtown',
          postal_code: 'T1S 1A1',
          max_distance: 25,
          is_available: true,
          referee_level_id: refLevel.id,
          years_experience: 5,
          games_refereed_season: 10,
          evaluation_score: 4.5
        }).returning('*');

        expect(user.email).toBe('referee@test.com');
        expect(user.role).toBe('referee');
        expect(user.phone).toBe('(555) 123-4567');
        expect(user.max_distance).toBe(25);
        expect(user.is_available).toBe(true);
        expect(user.referee_level_id).toBe(refLevel.id);
        expect(user.years_experience).toBe(5);
        expect(user.evaluation_score).toBe(4.5);
      });

      it('should reject duplicate email addresses', async () => {
        const passwordHash = await bcrypt.hash('password123', 12);
        
        await testDb('users').insert({
          email: 'duplicate@test.com',
          password_hash: passwordHash,
          role: 'admin',
          name: 'First User'
        });

        await expect(
          testDb('users').insert({
            email: 'duplicate@test.com', // Duplicate email
            password_hash: passwordHash,
            role: 'referee',
            name: 'Second User'
          })
        ).rejects.toThrow();
      });

      it('should reject users without required fields', async () => {
        await expect(
          testDb('users').insert({
            // Missing email, password_hash, role
            name: 'Incomplete User'
          })
        ).rejects.toThrow();
      });
    });

    describe('Read User', () => {
      let testUser;

      beforeEach(async () => {
        const passwordHash = await bcrypt.hash('password123', 12);
        [testUser] = await testDb('users').insert({
          email: 'read@test.com',
          password_hash: passwordHash,
          role: 'referee',
          name: 'Read Test User',
          location: 'Testville'
        }).returning('*');
      });

      it('should find user by email', async () => {
        const user = await testDb('users').where('email', 'read@test.com').first();
        
        expect(user).toBeDefined();
        expect(user.id).toBe(testUser.id);
        expect(user.email).toBe('read@test.com');
        expect(user.name).toBe('Read Test User');
      });

      it('should find user by id', async () => {
        const user = await testDb('users').where('id', testUser.id).first();
        
        expect(user).toBeDefined();
        expect(user.email).toBe('read@test.com');
      });

      it('should return null for non-existent user', async () => {
        const user = await testDb('users').where('email', 'nonexistent@test.com').first();
        expect(user).toBeUndefined();
      });

      it('should filter users by role', async () => {
        const referees = await testDb('users').where('role', 'referee');
        expect(referees.length).toBe(1);
        expect(referees[0].role).toBe('referee');

        const admins = await testDb('users').where('role', 'admin');
        expect(admins.length).toBe(0);
      });

      it('should get users with pagination', async () => {
        // Create more test users
        const passwordHash = await bcrypt.hash('password123', 12);
        await testDb('users').insert([
          { email: 'user1@test.com', password_hash: passwordHash, role: 'referee', name: 'User 1' },
          { email: 'user2@test.com', password_hash: passwordHash, role: 'referee', name: 'User 2' },
          { email: 'user3@test.com', password_hash: passwordHash, role: 'referee', name: 'User 3' }
        ]);

        const page1 = await testDb('users').limit(2).offset(0);
        const page2 = await testDb('users').limit(2).offset(2);
        
        expect(page1.length).toBe(2);
        expect(page2.length).toBe(2);
        expect(page1[0].id).not.toBe(page2[0].id);
      });
    });

    describe('Update User', () => {
      let testUser;

      beforeEach(async () => {
        const passwordHash = await bcrypt.hash('password123', 12);
        [testUser] = await testDb('users').insert({
          email: 'update@test.com',
          password_hash: passwordHash,
          role: 'referee',
          name: 'Update Test User',
          location: 'Old Location',
          max_distance: 20
        }).returning('*');
      });

      it('should update user fields', async () => {
        const [updatedUser] = await testDb('users')
          .where('id', testUser.id)
          .update({
            name: 'Updated Name',
            location: 'New Location',
            max_distance: 30
          })
          .returning('*');

        expect(updatedUser.name).toBe('Updated Name');
        expect(updatedUser.location).toBe('New Location');
        expect(updatedUser.max_distance).toBe(30);
        expect(updatedUser.email).toBe('update@test.com'); // Unchanged
        expect(updatedUser.updated_at).not.toBe(testUser.updated_at); // Should be updated
      });

      it('should update availability status', async () => {
        await testDb('users')
          .where('id', testUser.id)
          .update({ is_available: false });

        const user = await testDb('users').where('id', testUser.id).first();
        expect(user.is_available).toBe(false);
      });

      it('should reject invalid email format during update', async () => {
        await expect(
          testDb('users')
            .where('id', testUser.id)
            .update({ email: 'invalid-email' })
        ).rejects.toThrow();
      });

      it('should handle partial updates', async () => {
        const [updatedUser] = await testDb('users')
          .where('id', testUser.id)
          .update({ location: 'Partial Update Location' })
          .returning('*');

        expect(updatedUser.location).toBe('Partial Update Location');
        expect(updatedUser.name).toBe('Update Test User'); // Unchanged
        expect(updatedUser.email).toBe('update@test.com'); // Unchanged
      });
    });

    describe('Delete User', () => {
      let testUser;

      beforeEach(async () => {
        const passwordHash = await bcrypt.hash('password123', 12);
        [testUser] = await testDb('users').insert({
          email: 'delete@test.com',
          password_hash: passwordHash,
          role: 'referee',
          name: 'Delete Test User'
        }).returning('*');
      });

      it('should delete user by id', async () => {
        const deleted = await testDb('users').where('id', testUser.id).del();
        expect(deleted).toBe(1);

        const user = await testDb('users').where('id', testUser.id).first();
        expect(user).toBeUndefined();
      });

      it('should return 0 when deleting non-existent user', async () => {
        const deleted = await testDb('users').where('email', 'nonexistent@test.com').del();
        expect(deleted).toBe(0);
      });

      it('should cascade delete related referee records', async () => {
        // Create referee record
        const [referee] = await testDb('referees').insert({
          user_id: testUser.id
        }).returning('*');

        // Delete user should cascade to referee
        await testDb('users').where('id', testUser.id).del();

        const refereeRecord = await testDb('referees').where('id', referee.id).first();
        expect(refereeRecord).toBeUndefined();
      });
    });
  });

  describe('Games CRUD Operations', () => {
    let league, team1, team2;

    beforeEach(async () => {
      // Create test league and teams
      [league] = await testDb('leagues').insert({
        organization: 'Test League',
        age_group: 'U15',
        gender: 'Boys',
        division: 'Division 1',
        season: '2024/25',
        level: 'Competitive'
      }).returning('*');

      [team1, team2] = await testDb('teams').insert([
        { name: 'Team Alpha', location: 'Stadium A', league_id: league.id },
        { name: 'Team Beta', location: 'Stadium B', league_id: league.id }
      ]).returning('*');
    });

    describe('Create Game', () => {
      it('should create game successfully', async () => {
        const [game] = await testDb('games').insert({
          home_team_id: team1.id,
          away_team_id: team2.id,
          game_date: '2024-12-01',
          game_time: '14:00',
          location: 'Central Stadium',
          postal_code: 'T1S 1A1',
          level: 'Competitive',
          status: 'unassigned',
          refs_needed: 2,
          wage_multiplier: 1.0
        }).returning('*');

        expect(game).toBeDefined();
        expect(game.id).toBeDefined();
        expect(game.home_team_id).toBe(team1.id);
        expect(game.away_team_id).toBe(team2.id);
        expect(game.status).toBe('unassigned');
        expect(game.refs_needed).toBe(2);
        expect(game.created_at).toBeDefined();
      });

      it('should reject game without required fields', async () => {
        await expect(
          testDb('games').insert({
            // Missing required fields
            home_team_id: team1.id,
            game_date: '2024-12-01'
          })
        ).rejects.toThrow();
      });

      it('should reject same team playing against itself', async () => {
        await expect(
          testDb('games').insert({
            home_team_id: team1.id,
            away_team_id: team1.id, // Same team
            game_date: '2024-12-01',
            game_time: '14:00',
            location: 'Stadium',
            postal_code: 'T1S 1A1',
            level: 'Competitive',
            status: 'unassigned',
            refs_needed: 2
          })
        ).rejects.toThrow();
      });

      it('should handle wage multiplier edge cases', async () => {
        // Test with extreme but valid multiplier
        const [game] = await testDb('games').insert({
          home_team_id: team1.id,
          away_team_id: team2.id,
          game_date: '2024-12-01',
          game_time: '14:00',
          location: 'Stadium',
          postal_code: 'T1S 1A1',
          level: 'Competitive',
          status: 'unassigned',
          refs_needed: 2,
          wage_multiplier: 2.5 // Holiday rate
        }).returning('*');

        expect(game.wage_multiplier).toBe('2.5');
      });
    });

    describe('Read Games', () => {
      let testGames;

      beforeEach(async () => {
        testGames = await testDb('games').insert([
          {
            home_team_id: team1.id,
            away_team_id: team2.id,
            game_date: '2024-12-01',
            game_time: '14:00',
            location: 'Stadium A',
            postal_code: 'T1S 1A1',
            level: 'Competitive',
            status: 'unassigned',
            refs_needed: 2
          },
          {
            home_team_id: team2.id,
            away_team_id: team1.id,
            game_date: '2024-12-02',
            game_time: '16:00',
            location: 'Stadium B',
            postal_code: 'T2M 4N3',
            level: 'Recreational',
            status: 'assigned',
            refs_needed: 1
          }
        ]).returning('*');
      });

      it('should get all games', async () => {
        const games = await testDb('games').select('*');
        expect(games.length).toBe(2);
      });

      it('should filter games by status', async () => {
        const unassignedGames = await testDb('games').where('status', 'unassigned');
        const assignedGames = await testDb('games').where('status', 'assigned');
        
        expect(unassignedGames.length).toBe(1);
        expect(assignedGames.length).toBe(1);
        expect(unassignedGames[0].status).toBe('unassigned');
      });

      it('should filter games by date range', async () => {
        const gamesInRange = await testDb('games')
          .whereBetween('game_date', ['2024-12-01', '2024-12-01']);
        
        expect(gamesInRange.length).toBe(1);
        expect(gamesInRange[0].game_date).toEqual(new Date('2024-12-01'));
      });

      it('should get games with team information', async () => {
        const gamesWithTeams = await testDb('games')
          .select('games.*', 'home.name as home_team_name', 'away.name as away_team_name')
          .join('teams as home', 'games.home_team_id', 'home.id')
          .join('teams as away', 'games.away_team_id', 'away.id');

        expect(gamesWithTeams.length).toBe(2);
        expect(gamesWithTeams[0].home_team_name).toBeDefined();
        expect(gamesWithTeams[0].away_team_name).toBeDefined();
      });

      it('should handle complex filtering queries', async () => {
        const filteredGames = await testDb('games')
          .where('level', 'Competitive')
          .andWhere('refs_needed', '>=', 2)
          .andWhere('game_date', '>=', '2024-12-01');

        expect(filteredGames.length).toBe(1);
        expect(filteredGames[0].level).toBe('Competitive');
      });
    });

    describe('Update Games', () => {
      let testGame;

      beforeEach(async () => {
        [testGame] = await testDb('games').insert({
          home_team_id: team1.id,
          away_team_id: team2.id,
          game_date: '2024-12-01',
          game_time: '14:00',
          location: 'Original Stadium',
          postal_code: 'T1S 1A1',
          level: 'Competitive',
          status: 'unassigned',
          refs_needed: 2
        }).returning('*');
      });

      it('should update game fields', async () => {
        const [updatedGame] = await testDb('games')
          .where('id', testGame.id)
          .update({
            location: 'Updated Stadium',
            game_time: '16:00',
            refs_needed: 3
          })
          .returning('*');

        expect(updatedGame.location).toBe('Updated Stadium');
        expect(updatedGame.game_time).toBe('16:00:00');
        expect(updatedGame.refs_needed).toBe(3);
        expect(updatedGame.home_team_id).toBe(team1.id); // Unchanged
      });

      it('should update game status', async () => {
        await testDb('games')
          .where('id', testGame.id)
          .update({ status: 'assigned' });

        const game = await testDb('games').where('id', testGame.id).first();
        expect(game.status).toBe('assigned');
      });

      it('should handle wage multiplier updates', async () => {
        const [updatedGame] = await testDb('games')
          .where('id', testGame.id)
          .update({ 
            wage_multiplier: 1.5,
            wage_multiplier_reason: 'Holiday pay'
          })
          .returning('*');

        expect(updatedGame.wage_multiplier).toBe('1.5');
        expect(updatedGame.wage_multiplier_reason).toBe('Holiday pay');
      });

      it('should reject invalid status transitions', async () => {
        await expect(
          testDb('games')
            .where('id', testGame.id)
            .update({ status: 'invalid-status' })
        ).rejects.toThrow();
      });
    });

    describe('Delete Games', () => {
      let testGame;

      beforeEach(async () => {
        [testGame] = await testDb('games').insert({
          home_team_id: team1.id,
          away_team_id: team2.id,
          game_date: '2024-12-01',
          game_time: '14:00',
          location: 'Stadium',
          postal_code: 'T1S 1A1',
          level: 'Competitive',
          status: 'unassigned',
          refs_needed: 2
        }).returning('*');
      });

      it('should delete game', async () => {
        const deleted = await testDb('games').where('id', testGame.id).del();
        expect(deleted).toBe(1);

        const game = await testDb('games').where('id', testGame.id).first();
        expect(game).toBeUndefined();
      });

      it('should cascade delete game assignments', async () => {
        // Create user, referee, position, and assignment
        const passwordHash = await bcrypt.hash('password123', 12);
        const [user] = await testDb('users').insert({
          email: 'ref@test.com',
          password_hash: passwordHash,
          role: 'referee',
          name: 'Test Referee'
        }).returning('*');

        const [referee] = await testDb('referees').insert({
          user_id: user.id
        }).returning('*');

        const [position] = await testDb('positions').insert({
          name: 'Referee 1',
          description: 'Primary Referee'
        }).returning('*');

        const [assignment] = await testDb('game_assignments').insert({
          game_id: testGame.id,
          referee_id: referee.id,
          position_id: position.id,
          status: 'pending'
        }).returning('*');

        // Delete game should cascade to assignments
        await testDb('games').where('id', testGame.id).del();

        const assignments = await testDb('game_assignments').where('id', assignment.id);
        expect(assignments.length).toBe(0);
      });
    });
  });

  describe('Game Assignments CRUD Operations', () => {
    let game, user, referee, position;

    beforeEach(async () => {
      // Create test data
      const passwordHash = await bcrypt.hash('password123', 12);
      
      [user] = await testDb('users').insert({
        email: 'assignment@test.com',
        password_hash: passwordHash,
        role: 'referee',
        name: 'Assignment Test Referee'
      }).returning('*');

      [referee] = await testDb('referees').insert({
        user_id: user.id
      }).returning('*');

      [position] = await testDb('positions').insert({
        name: 'Referee 1',
        description: 'Primary Referee'
      }).returning('*');

      const [league] = await testDb('leagues').insert({
        organization: 'Test League',
        age_group: 'U15',
        gender: 'Boys',
        division: 'Division 1',
        season: '2024/25',
        level: 'Competitive'
      }).returning('*');

      const [team1, team2] = await testDb('teams').insert([
        { name: 'Team A', location: 'Stadium A', league_id: league.id },
        { name: 'Team B', location: 'Stadium B', league_id: league.id }
      ]).returning('*');

      [game] = await testDb('games').insert({
        home_team_id: team1.id,
        away_team_id: team2.id,
        game_date: '2024-12-01',
        game_time: '14:00',
        location: 'Stadium',
        postal_code: 'T1S 1A1',
        level: 'Competitive',
        status: 'unassigned',
        refs_needed: 2
      }).returning('*');
    });

    it('should create game assignment', async () => {
      const [assignment] = await testDb('game_assignments').insert({
        game_id: game.id,
        referee_id: referee.id,
        position_id: position.id,
        status: 'pending',
        calculated_wage: 75.00
      }).returning('*');

      expect(assignment).toBeDefined();
      expect(assignment.game_id).toBe(game.id);
      expect(assignment.referee_id).toBe(referee.id);
      expect(assignment.status).toBe('pending');
      expect(assignment.calculated_wage).toBe('75.00');
    });

    it('should prevent duplicate assignments', async () => {
      // Create first assignment
      await testDb('game_assignments').insert({
        game_id: game.id,
        referee_id: referee.id,
        position_id: position.id,
        status: 'pending'
      });

      // Try to create duplicate assignment
      await expect(
        testDb('game_assignments').insert({
          game_id: game.id,
          referee_id: referee.id,
          position_id: position.id, // Same combination
          status: 'pending'
        })
      ).rejects.toThrow();
    });

    it('should update assignment status', async () => {
      const [assignment] = await testDb('game_assignments').insert({
        game_id: game.id,
        referee_id: referee.id,
        position_id: position.id,
        status: 'pending'
      }).returning('*');

      const [updated] = await testDb('game_assignments')
        .where('id', assignment.id)
        .update({ status: 'accepted' })
        .returning('*');

      expect(updated.status).toBe('accepted');
    });

    it('should delete assignment', async () => {
      const [assignment] = await testDb('game_assignments').insert({
        game_id: game.id,
        referee_id: referee.id,
        position_id: position.id,
        status: 'pending'
      }).returning('*');

      const deleted = await testDb('game_assignments').where('id', assignment.id).del();
      expect(deleted).toBe(1);

      const found = await testDb('game_assignments').where('id', assignment.id).first();
      expect(found).toBeUndefined();
    });

    it('should get assignments with related data', async () => {
      await testDb('game_assignments').insert({
        game_id: game.id,
        referee_id: referee.id,
        position_id: position.id,
        status: 'pending'
      });

      const assignments = await testDb('game_assignments')
        .select('game_assignments.*', 'users.name as referee_name', 'positions.name as position_name')
        .join('referees', 'game_assignments.referee_id', 'referees.id')
        .join('users', 'referees.user_id', 'users.id')
        .join('positions', 'game_assignments.position_id', 'positions.id');

      expect(assignments.length).toBe(1);
      expect(assignments[0].referee_name).toBe('Assignment Test Referee');
      expect(assignments[0].position_name).toBe('Referee 1');
    });
  });

  describe('Transaction Testing', () => {
    it('should handle atomic game creation with assignments', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      
      await testDb.transaction(async (trx) => {
        // Create league and teams
        const [league] = await trx('leagues').insert({
          organization: 'Transaction Test',
          age_group: 'U15',
          gender: 'Boys',
          division: 'Division 1',
          season: '2024/25',
          level: 'Competitive'
        }).returning('*');

        const [team1, team2] = await trx('teams').insert([
          { name: 'Team TX1', location: 'Stadium A', league_id: league.id },
          { name: 'Team TX2', location: 'Stadium B', league_id: league.id }
        ]).returning('*');

        // Create game
        const [game] = await trx('games').insert({
          home_team_id: team1.id,
          away_team_id: team2.id,
          game_date: '2024-12-01',
          game_time: '14:00',
          location: 'Transaction Stadium',
          postal_code: 'T1S 1A1',
          level: 'Competitive',
          status: 'assigned', // Assigned status
          refs_needed: 2
        }).returning('*');

        // Create users and referees
        const [user1, user2] = await trx('users').insert([
          {
            email: 'ref1@transaction.com',
            password_hash: passwordHash,
            role: 'referee',
            name: 'Transaction Ref 1'
          },
          {
            email: 'ref2@transaction.com',
            password_hash: passwordHash,
            role: 'referee',
            name: 'Transaction Ref 2'
          }
        ]).returning('*');

        const [referee1, referee2] = await trx('referees').insert([
          { user_id: user1.id },
          { user_id: user2.id }
        ]).returning('*');

        const [position1, position2] = await trx('positions').insert([
          { name: 'Referee 1', description: 'Primary' },
          { name: 'Referee 2', description: 'Secondary' }
        ]).returning('*');

        // Create assignments
        await trx('game_assignments').insert([
          {
            game_id: game.id,
            referee_id: referee1.id,
            position_id: position1.id,
            status: 'accepted'
          },
          {
            game_id: game.id,
            referee_id: referee2.id,
            position_id: position2.id,
            status: 'accepted'
          }
        ]);
      });

      // Verify all data was created
      const games = await testDb('games').where('location', 'Transaction Stadium');
      const assignments = await testDb('game_assignments')
        .join('games', 'game_assignments.game_id', 'games.id')
        .where('games.location', 'Transaction Stadium');

      expect(games.length).toBe(1);
      expect(assignments.length).toBe(2);
    });

    it('should rollback transaction on error', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      
      await expect(
        testDb.transaction(async (trx) => {
          // Create a user
          await trx('users').insert({
            email: 'rollback@test.com',
            password_hash: passwordHash,
            role: 'referee',
            name: 'Rollback Test'
          });

          // This should fail and rollback the entire transaction
          await trx('users').insert({
            email: 'rollback@test.com', // Duplicate email
            password_hash: passwordHash,
            role: 'admin',
            name: 'Should Fail'
          });
        })
      ).rejects.toThrow();

      // Verify nothing was created
      const users = await testDb('users').where('email', 'rollback@test.com');
      expect(users.length).toBe(0);
    });
  });
});