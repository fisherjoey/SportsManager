/**
 * Seed 007: Game Assignments
 * Smart matching of referees to games based on:
 * - Certification level (must meet or exceed game requirement)
 * - Proximity to venue (prefer closer referees)
 * - Availability
 * - No double-booking
 */

const { v4: uuidv4 } = require('uuid');
const { calculateDistance, randomElement } = require('./utils/seeder');

exports.seed = async function(knex) {
  console.log('📋 Creating smart game assignments...\n');

  const games = global.games || (await knex('games').orderBy('date_time'));
  const referees = global.referees || (await knex('users')
    .join('referee_profiles', 'users.id', 'referee_profiles.user_id')
    .select('users.*', 'referee_profiles.*', 'referee_profiles.id as profile_id')
  );

  console.log(`  Total games: ${games.length}`);
  console.log(`  Total referees: ${referees.length}\n`);

  let assignmentsMade = 0;
  let gamesFullyAssigned = 0;
  let gamesPartiallyAssigned = 0;
  let gamesUnassigned = 0;

  const positions = ['Referee 1', 'Referee 2', 'Referee 3'];

  // Track referee assignments to prevent double-booking
  const refereeSchedule = new Map(); // referee_id -> Set of game date-times

  for (const game of games) {
    const gameDateTime = new Date(game.date_time);
    const venue = await knex('locations').where('id', game.location_id).first();

    if (!venue || !venue.latitude || !venue.longitude) continue;

    // Find eligible referees for this game
    const eligibleReferees = referees.filter(ref => {
      // Must meet certification level requirement
      if (ref.certification_level < game.required_level) return false;

      // Must be available
      if (!ref.is_available) return false;

      // Check for double-booking
      if (!refereeSchedule.has(ref.user_id)) {
        refereeSchedule.set(ref.user_id, new Set());
      }

      const refSchedule = refereeSchedule.get(ref.user_id);
      const gameTimeKey = gameDateTime.toISOString();

      // Check if referee has a game within 2 hours of this one
      for (const scheduledTime of refSchedule) {
        const scheduled = new Date(scheduledTime);
        const timeDiff = Math.abs(gameDateTime - scheduled) / (1000 * 60 * 60); // hours
        if (timeDiff < 2) return false;
      }

      return true;
    });

    if (eligibleReferees.length === 0) {
      gamesUnassigned++;
      continue;
    }

    // Calculate distances and sort by proximity
    const refWithDistances = eligibleReferees.map(ref => {
      const distance = ref.home_latitude && ref.home_longitude
        ? calculateDistance(
            ref.home_latitude,
            ref.home_longitude,
            venue.latitude,
            venue.longitude
          )
        : 999; // Unknown location = far distance

      return { ref, distance };
    });

    refWithDistances.sort((a, b) => a.distance - b.distance);

    // Assign referees (prefer closer ones, but add some randomness for realism)
    const refsToAssign = Math.min(game.refs_needed, refWithDistances.length);
    const assignedRefs = [];

    for (let i = 0; i < refsToAssign; i++) {
      // Pick from top 5 closest referees (or all if less than 5)
      const candidateCount = Math.min(5, refWithDistances.length - assignedRefs.length);
      const candidateIndex = Math.floor(Math.random() * candidateCount);
      const availableRefs = refWithDistances.filter(
        r => !assignedRefs.some(ar => ar.ref.user_id === r.ref.user_id)
      );

      if (availableRefs.length === 0) break;

      const selected = availableRefs[candidateIndex];
      assignedRefs.push(selected);

      // Calculate wage for this assignment
      const baseWage = selected.ref.wage_amount || 50;
      const calculatedWage = baseWage * (game.wage_multiplier || 1.0);

      // Create assignment
      await knex('game_assignments').insert({
        id: uuidv4(),
        game_id: game.id,
        referee_id: selected.ref.user_id,
        position: positions[i] || `Referee ${i + 1}`,
        status: 'confirmed',
        calculated_wage: calculatedWage,
        metadata: {
          distance_km: selected.distance.toFixed(1),
          assigned_at: new Date().toISOString(),
          certification_level: selected.ref.certification_level,
          experience_years: selected.ref.years_experience
        },
        created_at: new Date(),
        updated_at: new Date()
      });

      // Mark this time slot as taken for this referee
      const gameTimeKey = gameDateTime.toISOString();
      refereeSchedule.get(selected.ref.user_id).add(gameTimeKey);

      assignmentsMade++;
    }

    if (assignedRefs.length === game.refs_needed) {
      gamesFullyAssigned++;
    } else if (assignedRefs.length > 0) {
      gamesPartiallyAssigned++;
    } else {
      gamesUnassigned++;
    }
  }

  console.log(`  Assignment Statistics:`);
  console.log(`    ✓ Total assignments made: ${assignmentsMade}`);
  console.log(`    ✓ Games fully assigned: ${gamesFullyAssigned}`);
  console.log(`    ⚠ Games partially assigned: ${gamesPartiallyAssigned}`);
  console.log(`    ✗ Games unassigned: ${gamesUnassigned}`);

  // Referee workload statistics
  const refWorkload = await knex('game_assignments')
    .select('referee_id')
    .count('* as game_count')
    .groupBy('referee_id')
    .orderBy('game_count', 'desc')
    .limit(10);

  console.log(`\n  Top 10 Busiest Referees:`);
  for (const { referee_id, game_count } of refWorkload) {
    const ref = referees.find(r => r.user_id === referee_id);
    console.log(`    • ${ref?.name || 'Unknown'}: ${game_count} games`);
  }

  // Average assignments per referee
  const avgAssignments = assignmentsMade / referees.length;
  console.log(`\n  Average assignments per referee: ${avgAssignments.toFixed(1)}`);

  // Level distribution of assignments
  const levelAssignments = await knex('game_assignments')
    .join('referee_profiles', 'game_assignments.referee_id', 'referee_profiles.user_id')
    .select('referee_profiles.certification_level')
    .count('* as count')
    .groupBy('referee_profiles.certification_level')
    .orderBy('referee_profiles.certification_level');

  console.log(`\n  Assignments by Certification Level:`);
  levelAssignments.forEach(({ certification_level, count }) => {
    console.log(`    • Level ${certification_level}: ${count} assignments`);
  });

  console.log(`\n✅ Created ${assignmentsMade} smart assignments\n`);
};
