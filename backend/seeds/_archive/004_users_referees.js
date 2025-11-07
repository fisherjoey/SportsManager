/**
 * Seed 004: Users and Referees
 * Creates 1 admin, 5 assignors, and 150 referees with realistic profiles
 */

const { v4: uuidv4 } = require('uuid');
const {
  hashPassword,
  randomElement,
  randomInt,
  generatePhoneNumber,
  generatePostalCode,
  randomDate
} = require('./utils/seeder');
const {
  firstNames,
  lastNames,
  calgaryNeighborhoods,
  certificationLevels,
  paymentMethods
} = require('./data/users-config');

exports.seed = async function(knex) {
  console.log('👤 Seeding users and referees...\n');

  const orgId = global.defaultOrgId || (await knex('organizations').first()).id;
  const regions = await knex('regions').where('organization_id', orgId);
  const roles = global.roles || {};

  const createdUsers = [];
  const password = await hashPassword('password123');

  // 1. Create Super Admin
  console.log('  Creating administrators...');
  const [superAdmin] = await knex('users')
    .insert({
      id: uuidv4(),
      email: 'admin@calgarybasketball.com',
      password_hash: password,
      name: 'Admin User',
      phone: '403-555-0001',
      organization_id: orgId,
      primary_region_id: regions.find(r => r.slug === 'central-calgary')?.id,
      is_active: true,
      is_available: true,
      created_at: new Date(),
      updated_at: new Date()
    })
    .returning('*');

  createdUsers.push(superAdmin);

  // Assign Super Admin role
  if (roles['Super Admin']) {
    await knex('user_roles').insert({
      id: uuidv4(),
      user_id: superAdmin.id,
      role_id: roles['Super Admin'].id,
      assigned_at: new Date(),
      is_active: true
    });
  }

  console.log(`    ✓ Super Admin: ${superAdmin.email}`);

  // 2. Create 5 Assignors (one per region)
  console.log('  Creating assignors...');
  const assignorRegions = regions.slice(0, 5);

  for (let i = 0; i < assignorRegions.length; i++) {
    const region = assignorRegions[i];
    const firstName = randomElement(firstNames);
    const lastName = randomElement(lastNames);

    const [assignor] = await knex('users')
      .insert({
        id: uuidv4(),
        email: `assignor${i + 1}@calgarybasketball.com`,
        password_hash: password,
        name: `${firstName} ${lastName}`,
        phone: generatePhoneNumber(),
        organization_id: orgId,
        primary_region_id: region.id,
        is_active: true,
        is_available: true,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    createdUsers.push(assignor);

    // Assign Assignor role
    if (roles['Assignor']) {
      await knex('user_roles').insert({
        id: uuidv4(),
        user_id: assignor.id,
        role_id: roles['Assignor'].id,
        assigned_at: new Date(),
        is_active: true
      });
    }

    // Assign to region
    await knex('user_region_assignments').insert({
      user_id: assignor.id,
      region_id: region.id,
      role: 'assignor',
      assigned_at: new Date()
    });

    console.log(`    ✓ Assignor: ${assignor.email} (${region.name})`);
  }

  // 3. Create 150 Referees
  console.log('  Creating 150 referees...');

  const refereeRole = roles['Referee'];
  const seniorRefereeRole = roles['Senior Referee'];

  for (let i = 0; i < 150; i++) {
    const firstName = randomElement(firstNames);
    const lastName = randomElement(lastNames);
    const neighborhood = randomElement(calgaryNeighborhoods);
    const region = regions.find(r => r.settings?.quadrant === neighborhood.quadrant) || randomElement(regions);

    // Weighted certification level distribution
    // 30% Level 1, 30% Level 2, 25% Level 3, 10% Level 4, 5% Level 5
    const certLevel = (() => {
      const rand = Math.random();
      if (rand < 0.30) return certificationLevels[0]; // Level 1
      if (rand < 0.60) return certificationLevels[1]; // Level 2
      if (rand < 0.85) return certificationLevels[2]; // Level 3
      if (rand < 0.95) return certificationLevels[3]; // Level 4
      return certificationLevels[4]; // Level 5
    })();

    const yearsExperience = randomInt(certLevel.experience_min, certLevel.experience_max);
    const evaluationScore = (70 + Math.random() * 30).toFixed(1); // 70-100
    const isSenior = certLevel.level >= 4 && Math.random() < 0.3; // 30% of high-level refs are senior

    const [referee] = await knex('users')
      .insert({
        id: uuidv4(),
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@referee.com`,
        password_hash: password,
        name: `${firstName} ${lastName}`,
        phone: generatePhoneNumber(),
        location: neighborhood.name,
        postal_code: generatePostalCode(),
        max_distance: randomElement([10, 15, 20, 25, 30]),
        organization_id: orgId,
        primary_region_id: region.id,
        is_active: true,
        is_available: Math.random() < 0.9, // 90% available
        wage_per_game: certLevel.baseRate + randomInt(-5, 10),
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    createdUsers.push(referee);

    // Create referee profile
    const certDate = randomDate(
      new Date(2020, 0, 1),
      new Date(2024, 11, 31)
    );
    const certExpiry = new Date(certDate);
    certExpiry.setFullYear(certExpiry.getFullYear() + 2);

    await knex('referee_profiles').insert({
      id: uuidv4(),
      user_id: referee.id,
      wage_amount: certLevel.baseRate + randomInt(-5, 10),
      wage_currency: 'CAD',
      payment_method: randomElement(paymentMethods),
      years_experience: yearsExperience,
      evaluation_score: parseFloat(evaluationScore),
      certification_number: `CERT-${String(i + 1).padStart(4, '0')}`,
      certification_date: certDate,
      certification_expiry: certExpiry,
      certification_level: certLevel.level,
      home_latitude: neighborhood.latitude,
      home_longitude: neighborhood.longitude,
      max_travel_distance: randomElement([10, 15, 20, 25, 30]),
      preferred_age_groups: JSON.stringify(
        randomElement([
          ['U10', 'U12'],
          ['U12', 'U14'],
          ['U14', 'U16'],
          ['U16', 'U18'],
          ['U18', 'ADULT'],
          ['ADULT']
        ])
      ),
      languages: JSON.stringify(['English']),
      is_mentor: isSenior,
      is_evaluator: isSenior && Math.random() < 0.5,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Assign role
    const roleToAssign = isSenior && seniorRefereeRole ? seniorRefereeRole : refereeRole;
    if (roleToAssign) {
      await knex('user_roles').insert({
        id: uuidv4(),
        user_id: referee.id,
        role_id: roleToAssign.id,
        assigned_at: new Date(),
        is_active: true
      });
    }

    // Assign to region
    await knex('user_region_assignments').insert({
      user_id: referee.id,
      region_id: region.id,
      role: 'referee',
      assigned_at: new Date()
    });

    if ((i + 1) % 30 === 0) {
      console.log(`    ✓ Created ${i + 1} referees...`);
    }
  }

  console.log(`    ✓ Created 150 referees`);

  // Display statistics
  const levelCounts = await knex('referee_profiles')
    .select('certification_level')
    .count('* as count')
    .groupBy('certification_level')
    .orderBy('certification_level');

  console.log('\n  Certification Level Distribution:');
  levelCounts.forEach(({ certification_level, count }) => {
    console.log(`    • Level ${certification_level}: ${count} referees`);
  });

  const regionCounts = await knex('user_region_assignments')
    .join('regions', 'user_region_assignments.region_id', 'regions.id')
    .where('user_region_assignments.role', 'referee')
    .select('regions.name')
    .count('* as count')
    .groupBy('regions.name');

  console.log('\n  Regional Distribution:');
  regionCounts.forEach(({ name, count }) => {
    console.log(`    • ${name}: ${count} referees`);
  });

  console.log(`\n✅ Created ${createdUsers.length} total users (1 admin, 5 assignors, 150 referees)\n`);

  global.users = createdUsers;
  global.referees = createdUsers.filter(u => u.email.includes('@referee.com'));
};
