/**
 * Phase 2.2: Assignment Scenario Validation
 * 
 * This validation script tests the comprehensive assignment scenarios created in 012_assignment_scenario_testing.js
 * It verifies that all scenarios were created correctly and can be used for testing assignment logic.
 */

exports.seed = async function(knex) {
  console.log('🔍 Phase 2.2: Validating assignment scenario test data...\n');

  try {
    // Validate positions exist
    const positions = await knex('positions').select('id', 'name');
    console.log(`✅ Found ${positions.length} position types:`);
    positions.forEach(pos => console.log(`   - ${pos.name}`));

    // Validate referee levels exist
    const levels = await knex('referee_levels').select('id', 'name');
    console.log(`\n✅ Found ${levels.length} referee levels:`);
    levels.forEach(level => console.log(`   - ${level.name}`));

    // Validate test referees were created
    const testReferees = await knex('users')
      .where('email', 'like', '%@scenario.ca')
      .select('id', 'name', 'email', 'roles', 'is_white_whistle', 'postal_code', 'max_distance');
    
    console.log(`\n✅ Found ${testReferees.length} test scenario referees:`);
    testReferees.forEach(ref => {
      const roles = Array.isArray(ref.roles) ? ref.roles.join(', ') : ref.roles;
      const whistle = ref.is_white_whistle ? ' (White Whistle)' : '';
      console.log(`   - ${ref.name}: ${roles}${whistle} (Max: ${ref.max_distance}km)`);
    });

    // Validate test games were created
    const testGames = await knex('games as g')
      .join('teams as ht', 'g.home_team_id', 'ht.id')
      .join('teams as at', 'g.away_team_id', 'at.id')
      .where('ht.name', 'like', 'Test_%')
      .select('g.id', 'ht.name as home_team_name', 'at.name as away_team_name', 'g.game_date', 'g.game_type', 'g.status', 'g.refs_needed')
      .orderBy('g.game_date');

    console.log(`\n✅ Found ${testGames.length} test scenario games:`);
    
    // Group by scenario type - since we don't have scenario_type in DB, group by game type for now
    const scenarioGroups = {};
    testGames.forEach(game => {
      const type = game.game_type || 'unspecified';
      if (!scenarioGroups[type]) scenarioGroups[type] = [];
      scenarioGroups[type].push(game);
    });

    Object.entries(scenarioGroups).forEach(([type, games]) => {
      console.log(`\n   📋 ${type.replace(/_/g, ' ').toUpperCase()} (${games.length} games):`);
      games.forEach(game => {
        console.log(`      - ${game.home_team_name} vs ${game.away_team_name}`);
        console.log(`        Date: ${game.game_date}, Type: ${game.game_type}, Status: ${game.status}, Refs: ${game.refs_needed}`);
      });
    });

    // Validate assignments were created
    const testAssignments = await knex('game_assignments as ga')
      .join('games as g', 'ga.game_id', 'g.id')
      .join('teams as ht', 'g.home_team_id', 'ht.id')
      .join('users as u', 'ga.user_id', 'u.id')
      .join('positions as p', 'ga.position_id', 'p.id')
      .where('ht.name', 'like', 'Test_%')
      .select('ga.*', 'ht.name as home_team_name', 'u.name as referee_name', 'p.name as position_name', 'ga.calculated_wage')
      .orderBy('g.game_date');

    console.log(`\n✅ Found ${testAssignments.length} test scenario assignments:`);
    testAssignments.forEach(assignment => {
      console.log(`   - ${assignment.referee_name} → ${assignment.home_team_name} (${assignment.position_name})`);
      console.log(`     Status: ${assignment.status}, Wage: $${assignment.calculated_wage}`);
    });

    // Validate specific test scenarios
    console.log('\n🎯 Scenario-Specific Validations:\n');

    // 1. Multi-referee games validation
    const multiRefGames = testGames.filter(g => g.game_type === 'Tournament');
    console.log(`1️⃣ Multi-Position Assignment Games: ${multiRefGames.length}`);
    for (const game of multiRefGames) {
      const assignments = await knex('game_assignments as ga')
        .join('positions as p', 'ga.position_id', 'p.id')
        .where('ga.game_id', game.id)
        .select('p.name as position_name');
      
      console.log(`   - ${game.home_team_name}: ${assignments.length}/${game.refs_needed} positions filled`);
      assignments.forEach(a => console.log(`     └ ${a.position_name}`));
    }

    // 2. Evaluator/Mentor games validation
    const devGames = testGames.filter(g => g.refs_needed === 3 && g.game_type === 'Community');
    console.log(`\n2️⃣ Evaluator/Mentor Development Games: ${devGames.length}`);
    for (const game of devGames) {
      const assignments = await knex('game_assignments as ga')
        .join('positions as p', 'ga.position_id', 'p.id')
        .join('users as u', 'ga.user_id', 'u.id')
        .where('ga.game_id', game.id)
        .select('p.name as position_name', 'u.name as referee_name', 'u.roles');
      
      console.log(`   - ${game.home_team_name}: ${assignments.length}/${game.refs_needed} positions filled`);
      assignments.forEach(a => {
        const roles = Array.isArray(a.roles) ? a.roles.join(', ') : a.roles;
        console.log(`     └ ${a.referee_name} (${a.position_name}) - ${roles}`);
      });
    }

    // 3. Time conflict scenarios validation
    const conflictGames = testGames.filter(g => g.game_date === '2024-12-20');
    console.log(`\n3️⃣ Time Conflict Testing Games: ${conflictGames.length}`);
    
    // Group by date to show overlaps
    const gamesByDate = {};
    conflictGames.forEach(game => {
      if (!gamesByDate[game.game_date]) gamesByDate[game.game_date] = [];
      gamesByDate[game.game_date].push(game);
    });

    Object.entries(gamesByDate).forEach(([date, games]) => {
      console.log(`   Date: ${date}`);
      games.sort((a, b) => a.game_time?.localeCompare(b.game_time) || 0).forEach(game => {
        console.log(`     - ${game.home_team_name} at ${game.game_time || 'TBD'} (${game.status})`);
      });
    });

    // 4. Travel distance boundary testing
    const distanceGames = testGames.filter(g => g.home_team_name.includes('Distance'));
    console.log(`\n4️⃣ Travel Distance Boundary Games: ${distanceGames.length}`);
    for (const game of distanceGames) {
      console.log(`   - ${game.home_team_name}: Location ${game.postal_code || 'Unknown'}`);
    }

    // 5. Self-assignment games
    const selfAssignGames = testGames.filter(g => g.status === 'up-for-grabs');
    console.log(`\n5️⃣ Self-Assignment Workflow Games: ${selfAssignGames.length}`);
    selfAssignGames.forEach(game => {
      console.log(`   - ${game.home_team_name}: Status ${game.status}, Refs needed: ${game.refs_needed}`);
    });

    // 6. Sequential game patterns
    const sequentialGames = testGames.filter(g => g.home_team_name.includes('Sequential'));
    console.log(`\n6️⃣ Sequential Game Assignment Patterns: ${sequentialGames.length}`);
    sequentialGames.sort((a, b) => a.game_time?.localeCompare(b.game_time) || 0).forEach(game => {
      console.log(`   - ${game.home_team_name} at ${game.game_time || 'TBD'}`);
    });

    // Summary validation
    console.log('\n📊 Validation Summary:');
    console.log('======================');
    console.log(`✅ Test referees created: ${testReferees.length}`);
    console.log(`✅ Test games created: ${testGames.length}`);
    console.log(`✅ Test assignments created: ${testAssignments.length}`);
    console.log(`✅ Position types available: ${positions.length}`);
    console.log(`✅ Scenario types covered: ${Object.keys(scenarioGroups).length}`);

    // Check for potential issues
    const issues = [];
    
    if (testReferees.length < 10) {
      issues.push(`Only ${testReferees.length} test referees created (expected 10+)`);
    }
    
    if (testGames.length < 15) {
      issues.push(`Only ${testGames.length} test games created (expected 15+)`);
    }

    if (positions.length < 8) {
      issues.push(`Only ${positions.length} positions available (expected 8+)`);
    }

    const unassignedGames = testGames.filter(g => g.status === 'unassigned').length;
    if (unassignedGames === testGames.length) {
      issues.push('All test games are unassigned - pre-assignments may have failed');
    }

    if (issues.length > 0) {
      console.log('\n⚠️  Potential Issues Found:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log('\n🎉 All validations passed! Assignment scenarios are ready for testing.');
    }

    console.log('\n💡 Next Steps:');
    console.log('   - Use these scenarios to test assignment algorithms');
    console.log('   - Validate conflict detection logic');
    console.log('   - Test self-assignment workflows');
    console.log('   - Verify evaluator/mentor assignment patterns');
    console.log('   - Test travel distance calculations');

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    throw error;
  }
};