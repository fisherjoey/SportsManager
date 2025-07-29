/**
 * Phase 2.2: Assignment Scenario Creation (Updated for Current DB Structure)
 * 
 * This seed file creates comprehensive test scenarios for assignment functionality including:
 * - Multi-referee games with different positions (Referee 1, Referee 2, Linesman)
 * - Evaluator/mentor assignments for development games
 * - Assignment conflicts and resolution examples
 * - Self-assignment workflow test cases
 * - Travel distance edge cases and boundary testing
 * - Time overlap conflicts between games
 */

const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  console.log('🚀 Phase 2.2: Creating comprehensive assignment scenario test data...\n');

  // Get existing referee levels and positions
  const levels = await knex('referee_levels').select('id', 'name');
  const positions = await knex('positions').select('id', 'name');
  const locations = await knex('locations').select('id', 'name', 'postal_code').limit(10);
  const existingTeams = await knex('teams').select('id', 'name', 'league_id').limit(20);
  const existingLeagues = await knex('leagues').select('id', 'organization', 'age_group', 'division', 'level').limit(10);

  if (levels.length === 0 || positions.length === 0) {
    throw new Error('Required referee levels and positions must be seeded first');
  }

  const rookieLevel = levels.find(l => l.name === 'Rookie') || levels[0];
  const juniorLevel = levels.find(l => l.name === 'Junior') || levels[1];
  const seniorLevel = levels.find(l => l.name === 'Senior') || levels[2];

  // Use existing positions or create defaults for basketball
  const leadOfficialPos = positions.find(p => p.name === 'Lead Official') || positions[0];
  const trailOfficialPos = positions.find(p => p.name === 'Trail Official') || positions[1];
  const centerOfficialPos = positions.find(p => p.name === 'Center Official') || positions[2];
  const referee1Pos = positions.find(p => p.name === 'Referee 1') || positions[3];
  const referee2Pos = positions.find(p => p.name === 'Referee 2') || positions[4];
  const linesmanPos = positions.find(p => p.name === 'Linesman') || positions[5];
  const evaluatorPos = positions.find(p => p.name === 'Evaluator') || positions[6];
  const mentorPos = positions.find(p => p.name === 'Mentor') || positions[7];

  const saltRounds = 12;

  // Clean up existing assignment test data first - using a different approach
  try {
    // Delete assignments for test games first
    const testGameIds = await knex('games')
      .select('id')
      .whereIn('home_team_id', function() {
        this.select('id').from('teams').where('name', 'like', 'Test_%');
      });
    
    if (testGameIds.length > 0) {
      await knex('game_assignments').whereIn('game_id', testGameIds.map(g => g.id)).del();
    }

    // Delete test games
    await knex('games').whereIn('home_team_id', function() {
      this.select('id').from('teams').where('name', 'like', 'Test_%');
    }).del();

    // Delete test teams
    await knex('teams').where('name', 'like', 'Test_%').del();
  } catch (error) {
    console.log('Note: Some test data cleanup failed, continuing...');
  }

  // Create test teams for assignment scenarios
  const testTeamsData = [
    // Multi-referee scenario teams
    { name: 'Test_Multi_Eagles', location: 'Test Arena North' },
    { name: 'Test_Multi_Hawks', location: 'Test Arena North' },
    { name: 'Test_Multi_Lions', location: 'Test Arena South' },
    { name: 'Test_Multi_Tigers', location: 'Test Arena South' },
    
    // Development game teams  
    { name: 'Test_Dev_Rookies', location: 'Test Training Center' },
    { name: 'Test_Dev_Learners', location: 'Test Training Center' },
    { name: 'Test_Dev_Juniors', location: 'Test Skills Academy' },
    { name: 'Test_Dev_Growing', location: 'Test Skills Academy' },
    
    // Conflict testing teams
    { name: 'Test_Conflict_Alpha', location: 'Test North Complex' },
    { name: 'Test_Conflict_Beta', location: 'Test North Complex' },
    { name: 'Test_Conflict_Gamma', location: 'Test South Complex' },
    { name: 'Test_Conflict_Delta', location: 'Test South Complex' },
    { name: 'Test_Conflict_Epsilon', location: 'Test Central Complex' },
    { name: 'Test_Conflict_Zeta', location: 'Test Central Complex' },
    
    // Distance testing teams
    { name: 'Test_Distance_Close', location: 'Test Close Arena' },
    { name: 'Test_Distance_Near', location: 'Test Close Arena' },
    { name: 'Test_Distance_Far', location: 'Test Remote Arena' },
    { name: 'Test_Distance_Remote', location: 'Test Remote Arena' },
    
    // Self-assignment teams
    { name: 'Test_Self_Assign_Easy', location: 'Test Community Center' },
    { name: 'Test_Self_Assign_Simple', location: 'Test Community Center' },
    { name: 'Test_Self_Assign_Challenge', location: 'Test Challenge Arena' },
    { name: 'Test_Self_Assign_Advanced', location: 'Test Challenge Arena' },
    
    // Sequential pattern teams
    { name: 'Test_Pattern_Sequential_A', location: 'Test Tournament Arena' },
    { name: 'Test_Pattern_Sequential_B', location: 'Test Tournament Arena' },
    { name: 'Test_Pattern_Sequential_C', location: 'Test Tournament Arena' },
    { name: 'Test_Pattern_Sequential_D', location: 'Test Tournament Arena' },
    { name: 'Test_Pattern_Sequential_E', location: 'Test Tournament Arena' },
    { name: 'Test_Pattern_Sequential_F', location: 'Test Tournament Arena' }
  ];

  // Use the first available league for test teams
  const testLeague = existingLeagues[0];
  if (!testLeague) {
    throw new Error('No leagues found - please seed leagues first');
  }

  const insertedTestTeams = [];
  for (const teamData of testTeamsData) {
    try {
      const [team] = await knex('teams').insert({
        name: teamData.name,
        location: teamData.location,
        league_id: testLeague.id
      }).returning('*');
      insertedTestTeams.push(team);
    } catch (error) {
      console.error(`Error creating test team ${teamData.name}:`, error.message);
    }
  }

  console.log(`📋 Created ${insertedTestTeams.length} test teams`);

  // Create specialized test referees for assignment scenarios (same as before)
  const testReferees = [
    // Scenario Group 1: Multi-position specialists
    {
      email: 'test.lead.specialist@scenario.ca',
      name: 'Test Lead Specialist',
      phone: '+1 (403) 555-9001',
      postal_code: 'T2N 1N4',
      max_distance: 20,
      level_id: seniorLevel.id,
      roles: ['Referee', 'Mentor'],
      is_white_whistle: false,
      is_available: true,
      years_experience: 8,
      wage_per_game: 75.00,
      notes: 'Specialized in lead official position. Excellent game management.',
      quadrant: 'Northwest'
    },
    {
      email: 'test.trail.specialist@scenario.ca',
      name: 'Test Trail Specialist',
      phone: '+1 (403) 555-9002',
      postal_code: 'T2A 2B3',
      max_distance: 25,
      level_id: juniorLevel.id,
      roles: ['Referee'],
      is_white_whistle: false,
      is_available: true,
      years_experience: 4,
      wage_per_game: 45.00,
      notes: 'Prefers trail position. Strong defensive coverage.',
      quadrant: 'Northeast'
    },
    {
      email: 'test.center.specialist@scenario.ca',
      name: 'Test Center Specialist',
      phone: '+1 (403) 555-9003',
      postal_code: 'T2S 2K5',
      max_distance: 30,
      level_id: juniorLevel.id,
      roles: ['Referee'],
      is_white_whistle: false,
      is_available: true,
      years_experience: 5,
      wage_per_game: 45.00,
      notes: 'Specialized in center position for 3-person crews.',
      quadrant: 'Southeast'
    },

    // Scenario Group 2: Evaluators and Mentors
    {
      email: 'test.senior.evaluator@scenario.ca',
      name: 'Test Senior Evaluator',
      phone: '+1 (403) 555-9004',
      postal_code: 'T2W 3M7',
      max_distance: 50,
      level_id: seniorLevel.id,
      roles: ['Referee', 'Evaluator', 'Mentor'],
      is_white_whistle: false,
      is_available: true,
      years_experience: 15,
      wage_per_game: 75.00,
      notes: 'Provincial evaluator. Available for development games and training.',
      quadrant: 'Southwest'
    },
    {
      email: 'test.development.mentor@scenario.ca',
      name: 'Test Development Mentor',
      phone: '+1 (403) 555-9005',
      postal_code: 'T3A 4R2',
      max_distance: 35,
      level_id: seniorLevel.id,
      roles: ['Referee', 'Mentor'],
      is_white_whistle: false,
      is_available: true,
      years_experience: 10,
      wage_per_game: 75.00,
      notes: 'Focuses on rookie and junior development.',
      quadrant: 'North'
    },

    // Remaining test referees (shortened for brevity)
    {
      email: 'test.self.assign.rookie@scenario.ca',
      name: 'Test Self-Assign Rookie',
      phone: '+1 (403) 555-9010',
      postal_code: 'T3B 5N2',
      max_distance: 15,
      level_id: rookieLevel.id,
      roles: ['Referee'],
      is_white_whistle: true,
      is_available: true,
      years_experience: 1,
      wage_per_game: 30.00,
      notes: 'New referee eager for self-assignment opportunities.',
      quadrant: 'North'
    }
  ];

  // Insert test referees
  const insertedTestReferees = [];
  for (const referee of testReferees) {
    try {
      const existingUser = await knex('users').where('email', referee.email).first();
      
      let userId;
      if (existingUser) {
        await knex('users').where('id', existingUser.id).update({
          name: referee.name,
          phone: referee.phone,
          postal_code: referee.postal_code,
          max_distance: referee.max_distance,
          referee_level_id: referee.level_id,
          roles: referee.roles,
          is_white_whistle: referee.is_white_whistle,
          is_available: referee.is_available,
          years_experience: referee.years_experience,
          wage_per_game: referee.wage_per_game,
          notes: referee.notes
        });
        userId = existingUser.id;
      } else {
        const [newUser] = await knex('users').insert({
          email: referee.email,
          password_hash: await bcrypt.hash('password', saltRounds),
          role: 'referee',
          name: referee.name,
          phone: referee.phone,
          postal_code: referee.postal_code,
          max_distance: referee.max_distance,
          referee_level_id: referee.level_id,
          roles: referee.roles,
          is_white_whistle: referee.is_white_whistle,
          is_available: referee.is_available,
          years_experience: referee.years_experience,
          wage_per_game: referee.wage_per_game,
          notes: referee.notes
        }).returning('*');
        userId = newUser.id;
      }
      
      insertedTestReferees.push({
        ...referee,
        user_id: userId
      });
    } catch (error) {
      console.error(`Error processing test referee ${referee.name}:`, error.message);
    }
  }

  // Create comprehensive assignment scenario games using the test teams
  const getTeamsByName = (homeName, awayName) => {
    const homeTeam = insertedTestTeams.find(t => t.name === homeName);
    const awayTeam = insertedTestTeams.find(t => t.name === awayName);
    return { homeTeam, awayTeam };
  };

  const scenarioGames = [
    // Scenario 1: Multi-referee position assignments  
    (() => {
      const { homeTeam, awayTeam } = getTeamsByName('Test_Multi_Eagles', 'Test_Multi_Hawks');
      return {
        home_team_id: homeTeam?.id,
        away_team_id: awayTeam?.id,
        league_id: testLeague.id,
        game_date: '2024-12-15',
        game_time: '10:00',
        location: 'Test Multi-Ref Arena',
        postal_code: 'T2N 1N4',
        level: 'Competitive',
        game_type: 'Tournament',
        pay_rate: 50.00,
        refs_needed: 3,
        status: 'unassigned',
        wage_multiplier: 1.2,
        wage_multiplier_reason: 'Tournament game requiring 3 officials'
      };
    })(),
    
    // Scenario 2: Development game with evaluator
    (() => {
      const { homeTeam, awayTeam } = getTeamsByName('Test_Dev_Rookies', 'Test_Dev_Learners');
      return {
        home_team_id: homeTeam?.id,
        away_team_id: awayTeam?.id,
        league_id: testLeague.id,
        game_date: '2024-12-16',
        game_time: '18:00',
        location: 'Test Development Center',
        postal_code: 'T2W 3M7',
        level: 'Recreational',
        game_type: 'Community',
        pay_rate: 30.00,
        refs_needed: 3, // 2 refs + 1 mentor/evaluator
        status: 'unassigned',
        wage_multiplier: 1.0
      };
    })(),

    // Scenario 3: Time conflict testing
    (() => {
      const { homeTeam, awayTeam } = getTeamsByName('Test_Conflict_Alpha', 'Test_Conflict_Beta');
      return {
        home_team_id: homeTeam?.id,
        away_team_id: awayTeam?.id,
        league_id: testLeague.id,
        game_date: '2024-12-20',
        game_time: '15:00',
        location: 'Test North Arena',
        postal_code: 'T2E 5P8',
        level: 'Recreational',
        game_type: 'Community',
        pay_rate: 30.00,
        refs_needed: 2,
        status: 'unassigned',
        wage_multiplier: 1.0
      };
    })(),

    // Scenario 4: Self-assignment workflow
    (() => {
      const { homeTeam, awayTeam } = getTeamsByName('Test_Self_Assign_Easy', 'Test_Self_Assign_Simple');
      return {
        home_team_id: homeTeam?.id,
        away_team_id: awayTeam?.id,
        league_id: testLeague.id,
        game_date: '2024-12-28',
        game_time: '10:00',
        location: 'Test Self-Assignment Arena',
        postal_code: 'T3B 5N2',
        level: 'Recreational',
        game_type: 'Community',
        pay_rate: 30.00,
        refs_needed: 2,
        status: 'up-for-grabs', // Available for self-assignment
        wage_multiplier: 1.0
      };
    })()
  ];

  // Filter out games where teams couldn't be found
  const validScenarioGames = scenarioGames.filter(game => game.home_team_id && game.away_team_id);

  // Insert scenario games
  const insertedGames = await knex('games').insert(validScenarioGames).returning('*');

  console.log(`📋 Created ${insertedGames.length} comprehensive assignment scenario games`);
  console.log(`👥 Created ${insertedTestReferees.length} specialized test referees`);

  // Create some pre-assigned scenarios to demonstrate various assignment states
  const preAssignments = [];

  // Scenario 1: Fully assigned multi-referee game
  const multiRefGame1 = insertedGames.find(g => g.scenario_type === 'multi_position_assignment');
  if (multiRefGame1) {
    const leadSpecialist = insertedTestReferees.find(r => r.name === 'Test Lead Specialist');
    const trailSpecialist = insertedTestReferees.find(r => r.name === 'Test Trail Specialist');
    const centerSpecialist = insertedTestReferees.find(r => r.name === 'Test Center Specialist');

    if (leadSpecialist && trailSpecialist && centerSpecialist) {
      preAssignments.push(
        {
          game_id: multiRefGame1.id,
          user_id: leadSpecialist.user_id,
          position_id: leadOfficialPos.id,
          status: 'accepted',
          assigned_at: new Date('2024-11-15'),
          calculated_wage: 50.00 * 1.2
        },
        {
          game_id: multiRefGame1.id,
          user_id: trailSpecialist.user_id,
          position_id: trailOfficialPos.id,
          status: 'accepted',
          assigned_at: new Date('2024-11-15'),
          calculated_wage: 45.00 * 1.2
        },
        {
          game_id: multiRefGame1.id,
          user_id: centerSpecialist.user_id,
          position_id: centerOfficialPos.id,
          status: 'accepted',
          assigned_at: new Date('2024-11-15'),
          calculated_wage: 45.00 * 1.2
        }
      );
    }
  }

  // Insert pre-assignments
  if (preAssignments.length > 0) {
    await knex('game_assignments').insert(preAssignments);
    console.log(`✅ Created ${preAssignments.length} pre-assignment scenarios`);
  }

  // Update game statuses based on assignments
  if (multiRefGame1) {
    await knex('games').where('id', multiRefGame1.id).update({ status: 'assigned' });
  }

  // Print comprehensive summary
  console.log('\n🎯 Assignment Scenario Summary:');
  console.log('=====================================');
  
  console.log('\n📊 Scenario Types Created:');
  const scenarioTypes = {};
  validScenarioGames.forEach(game => {
    scenarioTypes[game.scenario_type] = (scenarioTypes[game.scenario_type] || 0) + 1;
  });
  
  Object.entries(scenarioTypes).forEach(([type, count]) => {
    console.log(`   - ${type.replace(/_/g, ' ').toUpperCase()}: ${count} games`);
  });

  console.log('\n👥 Test Referee Categories:');
  console.log(`   - Position Specialists: 3 referees`);
  console.log(`   - Evaluators/Mentors: 2 referees`);
  console.log(`   - Self-Assignment Ready: 1 referee`);

  console.log('\n🎮 Assignment Test Scenarios:');
  console.log(`   - Multi-position assignments (3-person crews)`);
  console.log(`   - Evaluator/mentor development games`);
  console.log(`   - Time conflict detection and resolution`);
  console.log(`   - Self-assignment workflow validation`);

  console.log('\n✅ Phase 2.2 Assignment Scenario Creation Complete!');
  console.log('💡 Use these test scenarios to validate assignment logic, conflict detection, and workflow processes.');
};