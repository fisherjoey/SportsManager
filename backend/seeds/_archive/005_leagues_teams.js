/**
 * Seed 005: Leagues and Teams
 * Creates multiple leagues and teams for the season
 */

const { v4: uuidv4 } = require('uuid');
const { randomElement } = require('./utils/seeder');

exports.seed = async function(knex) {
  console.log('🏆 Seeding leagues and teams...\n');

  const orgId = global.defaultOrgId || (await knex('organizations').first()).id;

  // League configurations
  const leagueConfigs = [
    {
      organization: 'Calgary Minor Basketball Association',
      age_group: 'U10',
      gender: 'Boys',
      division: 'A',
      season: 'Fall 2025',
      name: 'CMBA U10 Boys A',
      teamCount: 8
    },
    {
      organization: 'Calgary Minor Basketball Association',
      age_group: 'U10',
      gender: 'Girls',
      division: 'A',
      season: 'Fall 2025',
      name: 'CMBA U10 Girls A',
      teamCount: 6
    },
    {
      organization: 'Calgary Minor Basketball Association',
      age_group: 'U12',
      gender: 'Boys',
      division: 'A',
      season: 'Fall 2025',
      name: 'CMBA U12 Boys A',
      teamCount: 10
    },
    {
      organization: 'Calgary Minor Basketball Association',
      age_group: 'U12',
      gender: 'Girls',
      division: 'A',
      season: 'Fall 2025',
      name: 'CMBA U12 Girls A',
      teamCount: 8
    },
    {
      organization: 'Calgary Minor Basketball Association',
      age_group: 'U14',
      gender: 'Boys',
      division: 'A',
      season: 'Fall 2025',
      name: 'CMBA U14 Boys A',
      teamCount: 10
    },
    {
      organization: 'Calgary Minor Basketball Association',
      age_group: 'U14',
      gender: 'Girls',
      division: 'A',
      season: 'Fall 2025',
      name: 'CMBA U14 Girls A',
      teamCount: 10
    },
    {
      organization: 'Calgary Minor Basketball Association',
      age_group: 'U16',
      gender: 'Boys',
      division: 'A',
      season: 'Fall 2025',
      name: 'CMBA U16 Boys A',
      teamCount: 8
    },
    {
      organization: 'Calgary Minor Basketball Association',
      age_group: 'U16',
      gender: 'Girls',
      division: 'A',
      season: 'Fall 2025',
      name: 'CMBA U16 Girls A',
      teamCount: 8
    },
    {
      organization: 'Calgary Minor Basketball Association',
      age_group: 'U18',
      gender: 'Boys',
      division: 'A',
      season: 'Fall 2025',
      name: 'CMBA U18 Boys A',
      teamCount: 6
    },
    {
      organization: 'Calgary Minor Basketball Association',
      age_group: 'U18',
      gender: 'Girls',
      division: 'A',
      season: 'Fall 2025',
      name: 'CMBA U18 Girls A',
      teamCount: 6
    },
    {
      organization: 'Calgary Adult Basketball League',
      age_group: 'Adult',
      gender: 'Men',
      division: 'Rec',
      season: 'Fall 2025',
      name: 'CABL Mens Rec',
      teamCount: 12
    },
    {
      organization: 'Calgary Adult Basketball League',
      age_group: 'Adult',
      gender: 'Women',
      division: 'Rec',
      season: 'Fall 2025',
      name: 'CABL Womens Rec',
      teamCount: 8
    },
    {
      organization: 'Calgary Adult Basketball League',
      age_group: 'Masters',
      gender: 'Men',
      division: 'Rec',
      season: 'Fall 2025',
      name: 'CABL Masters',
      teamCount: 6
    }
  ];

  const teamNames = [
    'Thunder', 'Lightning', 'Storm', 'Hurricanes', 'Tornadoes', 'Cyclones',
    'Warriors', 'Knights', 'Titans', 'Spartans', 'Vikings', 'Gladiators',
    'Eagles', 'Hawks', 'Falcons', 'Ravens', 'Phoenix', 'Owls',
    'Lions', 'Tigers', 'Bears', 'Panthers', 'Jaguars', 'Wolves',
    'Dragons', 'Cobras', 'Vipers', 'Raptors', 'Hornets', 'Scorpions',
    'Mavericks', 'Outlaws', 'Rebels', 'Bandits', 'Rogues', 'Pirates',
    'Blazers', 'Flames', 'Inferno', 'Heat', 'Comets', 'Meteors',
    'Titans', 'Giants', 'Legends', 'Champions', 'Elite', 'Dynasty',
    'Surge', 'Rush', 'Blitz', 'Impact', 'Force', 'Power'
  ];

  const createdLeagues = [];
  const createdTeams = [];

  for (const config of leagueConfigs) {
    // Create league
    const [league] = await knex('leagues')
      .insert({
        id: uuidv4(),
        organization: config.organization,
        age_group: config.age_group,
        gender: config.gender,
        division: config.division,
        season: config.season,
        name: config.name,
        display_name: config.name,
        status: 'active',
        metadata: {
          start_date: '2025-09-01',
          end_date: '2025-11-30',
          max_teams: config.teamCount,
          game_format: config.age_group.startsWith('U') ? 'youth' : 'adult'
        },
        organization_id: orgId,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    createdLeagues.push(league);

    // Create teams for this league
    const usedNames = new Set();
    for (let i = 0; i < config.teamCount; i++) {
      let teamName;
      do {
        teamName = randomElement(teamNames);
      } while (usedNames.has(teamName));
      usedNames.add(teamName);

      const [team] = await knex('teams')
        .insert({
          id: uuidv4(),
          league_id: league.id,
          team_number: `${config.age_group}-${i + 1}`,
          name: teamName,
          display_name: `${config.age_group} ${teamName}`,
          contact_email: `${teamName.toLowerCase()}@team.com`,
          contact_phone: `403-555-${String(1000 + createdTeams.length).padStart(4, '0')}`,
          metadata: {
            jersey_color: randomElement(['Red', 'Blue', 'Green', 'Black', 'White', 'Yellow', 'Orange', 'Purple']),
            home_venue: null
          },
          organization_id: orgId,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      createdTeams.push(team);
    }

    console.log(`  ✓ ${config.name}: ${config.teamCount} teams`);
  }

  console.log(`\n✅ Created ${createdLeagues.length} leagues with ${createdTeams.length} teams\n`);

  global.leagues = createdLeagues;
  global.teams = createdTeams;
};
