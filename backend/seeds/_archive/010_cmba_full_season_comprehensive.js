const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Clear existing data (except users and core system data)
  await knex('game_assignments').del();
  await knex('games').del();
  await knex('teams').del();
  await knex('leagues').del();

  console.log('Creating CMBA 2024-25 Season - All Leagues and Teams...');

  // ========================================
  // PREMIUM LEAGUES
  // ========================================

  // Diamond Prep League (U18 Girls)
  const [diamondPrepLeague] = await knex('leagues').insert([{
    organization: 'CMBA',
    age_group: 'U18',
    gender: 'Girls',
    division: 'Diamond Prep',
    season: '2024-25',
    level: 'Elite'
  }]).returning('*');

  // Platinum League (U18 Boys)
  const [platinumLeague] = await knex('leagues').insert([{
    organization: 'CMBA',
    age_group: 'U18',
    gender: 'Boys',
    division: 'Platinum',
    season: '2024-25',
    level: 'Elite'
  }]).returning('*');

  // ========================================
  // BOYS REGULAR SEASON DIVISIONS
  // ========================================

  // Boys U11 Divisions
  const [boysU11Div1, boysU11Div2, boysU11Div5] = await knex('leagues').insert([
    {
      organization: 'CMBA',
      age_group: 'U11',
      gender: 'Boys',
      division: 'Division 1',
      season: '2024-25',
      level: 'Competitive'
    },
    {
      organization: 'CMBA',
      age_group: 'U11',
      gender: 'Boys',
      division: 'Division 2',
      season: '2024-25',
      level: 'Competitive'
    },
    {
      organization: 'CMBA',
      age_group: 'U11',
      gender: 'Boys',
      division: 'Division 5',
      season: '2024-25',
      level: 'Recreational'
    }
  ]).returning('*');

  // Boys U11 Division 1 Teams
  await knex('teams').insert([
    { name: 'Airdrie BU11-1', location: 'Airdrie', league_id: boysU11Div1.id, rank: 1 },
    { name: 'Bow River BU11-1', location: 'Bow River', league_id: boysU11Div1.id, rank: 2 },
    { name: 'Bow River BU11-2', location: 'Bow River', league_id: boysU11Div1.id, rank: 3 },
    { name: 'Calwest BU11-1', location: 'Calgary West', league_id: boysU11Div1.id, rank: 4 },
    { name: 'NCBC BU11-1', location: 'North Calgary', league_id: boysU11Div1.id, rank: 5 },
    { name: 'Okotoks BU11-1', location: 'Okotoks', league_id: boysU11Div1.id, rank: 6 }
  ]);

  // Boys U11 Division 2 Teams
  await knex('teams').insert([
    { name: 'Airdrie BU11-2', location: 'Airdrie', league_id: boysU11Div2.id, rank: 1 },
    { name: 'EastPro BU11-1', location: 'Calgary East', league_id: boysU11Div2.id, rank: 2 },
    { name: 'NW BU11-1', location: 'Calgary Northwest', league_id: boysU11Div2.id, rank: 3 },
    { name: 'Okotoks BU11-1', location: 'Okotoks', league_id: boysU11Div2.id, rank: 4 },
    { name: 'SoCal BU11-1', location: 'Calgary South', league_id: boysU11Div2.id, rank: 5 },
    { name: 'SoCal BU11-2', location: 'Calgary South', league_id: boysU11Div2.id, rank: 6 }
  ]);

  // Boys U11 Division 5 Teams
  await knex('teams').insert([
    { name: 'Cochrane BU11-1', location: 'Cochrane', league_id: boysU11Div5.id, rank: 1 },
    { name: 'NCBC BU11-3', location: 'North Calgary', league_id: boysU11Div5.id, rank: 2 },
    { name: 'NW BU11-3', location: 'Calgary Northwest', league_id: boysU11Div5.id, rank: 3 },
    { name: 'Okotoks BU11-3', location: 'Okotoks', league_id: boysU11Div5.id, rank: 4 },
    { name: 'SoCal BU11-4', location: 'Calgary South', league_id: boysU11Div5.id, rank: 5 },
    { name: 'SoCal BU11-5', location: 'Calgary South', league_id: boysU11Div5.id, rank: 6 }
  ]);

  // Boys U13 Divisions
  const [boysU13Div1, boysU13Div3, boysU13Div4, boysU13Div5, boysU13Div6] = await knex('leagues').insert([
    {
      organization: 'CMBA',
      age_group: 'U13',
      gender: 'Boys',
      division: 'Division 1',
      season: '2024-25',
      level: 'Competitive'
    },
    {
      organization: 'CMBA',
      age_group: 'U13',
      gender: 'Boys',
      division: 'Division 3',
      season: '2024-25',
      level: 'Competitive'
    },
    {
      organization: 'CMBA',
      age_group: 'U13',
      gender: 'Boys',
      division: 'Division 4',
      season: '2024-25',
      level: 'Recreational'
    },
    {
      organization: 'CMBA',
      age_group: 'U13',
      gender: 'Boys',
      division: 'Division 5',
      season: '2024-25',
      level: 'Recreational'
    },
    {
      organization: 'CMBA',
      age_group: 'U13',
      gender: 'Boys',
      division: 'Division 6',
      season: '2024-25',
      level: 'Recreational'
    }
  ]).returning('*');

  // Boys U13 Division 1 Teams
  await knex('teams').insert([
    { name: 'Bow River BU13-1', location: 'Bow River', league_id: boysU13Div1.id, rank: 1 },
    { name: 'Calwest BU13-1', location: 'Calgary West', league_id: boysU13Div1.id, rank: 2 },
    { name: 'EastPro BU13-1', location: 'Calgary East', league_id: boysU13Div1.id, rank: 3 },
    { name: 'NCBC BU13-1', location: 'North Calgary', league_id: boysU13Div1.id, rank: 4 },
    { name: 'Okotoks BU13-1', location: 'Okotoks', league_id: boysU13Div1.id, rank: 5 },
    { name: 'SoCal BU13-1', location: 'Calgary South', league_id: boysU13Div1.id, rank: 6 }
  ]);

  // Boys U13 Division 3 Teams
  await knex('teams').insert([
    { name: 'Calwest BU13-3', location: 'Calgary West', league_id: boysU13Div3.id, rank: 1 },
    { name: 'NCBC BU13-2', location: 'North Calgary', league_id: boysU13Div3.id, rank: 2 },
    { name: 'NCBC BU13-3', location: 'North Calgary', league_id: boysU13Div3.id, rank: 3 },
    { name: 'NW BU13-2', location: 'Calgary Northwest', league_id: boysU13Div3.id, rank: 4 },
    { name: 'Okotoks BU13-2', location: 'Okotoks', league_id: boysU13Div3.id, rank: 5 },
    { name: 'SoCal BU13-2', location: 'Calgary South', league_id: boysU13Div3.id, rank: 6 }
  ]);

  // Boys U13 Division 4 Teams
  await knex('teams').insert([
    { name: 'Airdrie BU13-2', location: 'Airdrie', league_id: boysU13Div4.id, rank: 1 },
    { name: 'Bow River BU13-5', location: 'Bow River', league_id: boysU13Div4.id, rank: 2 },
    { name: 'Calwest BU13-3', location: 'Calgary West', league_id: boysU13Div4.id, rank: 3 },
    { name: 'CLS BU13-1', location: 'Calgary', league_id: boysU13Div4.id, rank: 4 },
    { name: 'NW BU13-3', location: 'Calgary Northwest', league_id: boysU13Div4.id, rank: 5 },
    { name: 'SoCal BU13-3', location: 'Calgary South', league_id: boysU13Div4.id, rank: 6 }
  ]);

  // Boys U13 Division 5 Teams
  await knex('teams').insert([
    { name: 'Bow River BU13-4', location: 'Bow River', league_id: boysU13Div5.id, rank: 1 },
    { name: 'Bow River BU13-5 Alt', location: 'Bow River', league_id: boysU13Div5.id, rank: 2 },
    { name: 'EastPro BU13-3', location: 'Calgary East', league_id: boysU13Div5.id, rank: 3 },
    { name: 'Okotoks BU13-3', location: 'Okotoks', league_id: boysU13Div5.id, rank: 4 },
    { name: 'Okotoks BU13-4', location: 'Okotoks', league_id: boysU13Div5.id, rank: 5 },
    { name: 'SoCal BU13-4', location: 'Calgary South', league_id: boysU13Div5.id, rank: 6 }
  ]);

  // Boys U13 Division 6 Teams
  await knex('teams').insert([
    { name: 'Calwest BU13-4B', location: 'Calgary West', league_id: boysU13Div6.id, rank: 1 },
    { name: 'EastPro BU13-3 Alt', location: 'Calgary East', league_id: boysU13Div6.id, rank: 2 },
    { name: 'EastPro BU13-4', location: 'Calgary East', league_id: boysU13Div6.id, rank: 3 },
    { name: 'SoCal BU13-4 Alt', location: 'Calgary South', league_id: boysU13Div6.id, rank: 4 }
  ]);

  // Boys U15 Divisions
  const [boysU15Div1, boysU15Raptors] = await knex('leagues').insert([
    {
      organization: 'CMBA',
      age_group: 'U15',
      gender: 'Boys',
      division: 'Division 1',
      season: '2024-25',
      level: 'Competitive'
    },
    {
      organization: 'CMBA',
      age_group: 'U15',
      gender: 'Boys',
      division: 'Raptors Division',
      season: '2024-25',
      level: 'Recreational'
    }
  ]).returning('*');

  // Boys U15 Division 1 Teams
  await knex('teams').insert([
    { name: 'Bow River BU15-1', location: 'Bow River', league_id: boysU15Div1.id, rank: 1 },
    { name: 'EastPro BU15-1', location: 'Calgary East', league_id: boysU15Div1.id, rank: 2 },
    { name: 'NCBC BU15-1', location: 'North Calgary', league_id: boysU15Div1.id, rank: 3 },
    { name: 'NW BU15-1', location: 'Calgary Northwest', league_id: boysU15Div1.id, rank: 4 },
    { name: 'SoCal BU15-1', location: 'Calgary South', league_id: boysU15Div1.id, rank: 5 },
    { name: 'SoCal BU15-2', location: 'Calgary South', league_id: boysU15Div1.id, rank: 6 }
  ]);

  // Boys U15 Raptors Division Teams
  await knex('teams').insert([
    { name: 'Airdrie BU15-3', location: 'Airdrie', league_id: boysU15Raptors.id, rank: 1 },
    { name: 'Bow River BU15-5', location: 'Bow River', league_id: boysU15Raptors.id, rank: 2 },
    { name: 'Bow River BU15-6', location: 'Bow River', league_id: boysU15Raptors.id, rank: 3 },
    { name: 'Calwest BU15-4C', location: 'Calgary West', league_id: boysU15Raptors.id, rank: 4 },
    { name: 'EastPro BU15-3', location: 'Calgary East', league_id: boysU15Raptors.id, rank: 5 },
    { name: 'NCBC BU15-4', location: 'North Calgary', league_id: boysU15Raptors.id, rank: 6 },
    { name: 'NW BU15-4', location: 'Calgary Northwest', league_id: boysU15Raptors.id, rank: 7 }
  ]);

  // Boys U18 Division
  const [boysU18Div5] = await knex('leagues').insert([{
    organization: 'CMBA',
    age_group: 'U18',
    gender: 'Boys',
    division: 'Division 5',
    season: '2024-25',
    level: 'Recreational'
  }]).returning('*');

  // Boys U18 Division 5 Teams
  await knex('teams').insert([
    { name: 'Calwest U18 Boys Team 4', location: 'Calgary West', league_id: boysU18Div5.id, rank: 1 },
    { name: 'CLS U18 Boys Team 2', location: 'Calgary', league_id: boysU18Div5.id, rank: 2 },
    { name: 'Okotoks U18 Boys 5', location: 'Okotoks', league_id: boysU18Div5.id, rank: 3 },
    { name: 'SoCal U18 Boys Team 6', location: 'Calgary South', league_id: boysU18Div5.id, rank: 4 }
  ]);

  // ========================================
  // GIRLS REGULAR SEASON DIVISIONS
  // ========================================

  // Girls U11 Divisions
  const [girlsU11Div1, girlsU11Div3, girlsU11Div4] = await knex('leagues').insert([
    {
      organization: 'CMBA',
      age_group: 'U11',
      gender: 'Girls',
      division: 'Division 1',
      season: '2024-25',
      level: 'Competitive'
    },
    {
      organization: 'CMBA',
      age_group: 'U11',
      gender: 'Girls',
      division: 'Division 3',
      season: '2024-25',
      level: 'Competitive'
    },
    {
      organization: 'CMBA',
      age_group: 'U11',
      gender: 'Girls',
      division: 'Division 4',
      season: '2024-25',
      level: 'Recreational'
    }
  ]).returning('*');

  // Girls U11 Division 1 Teams
  await knex('teams').insert([
    { name: 'Airdrie GU11-1', location: 'Airdrie', league_id: girlsU11Div1.id, rank: 1 },
    { name: 'Bow River GU11-1', location: 'Bow River', league_id: girlsU11Div1.id, rank: 2 },
    { name: 'Calwest GU11-1', location: 'Calgary West', league_id: girlsU11Div1.id, rank: 3 },
    { name: 'EastPro GU11-1', location: 'Calgary East', league_id: girlsU11Div1.id, rank: 4 },
    { name: 'NCBC GU11-1', location: 'North Calgary', league_id: girlsU11Div1.id, rank: 5 },
    { name: 'NW GU11-1', location: 'Calgary Northwest', league_id: girlsU11Div1.id, rank: 6 }
  ]);

  // Girls U11 Division 3 Teams
  await knex('teams').insert([
    { name: 'Airdrie GU11-2', location: 'Airdrie', league_id: girlsU11Div3.id, rank: 1 },
    { name: 'Bow River GU11-3', location: 'Bow River', league_id: girlsU11Div3.id, rank: 2 },
    { name: 'Bow River GU11-4', location: 'Bow River', league_id: girlsU11Div3.id, rank: 3 },
    { name: 'Cochrane GU11-1', location: 'Cochrane', league_id: girlsU11Div3.id, rank: 4 },
    { name: 'NW GU11-2', location: 'Calgary Northwest', league_id: girlsU11Div3.id, rank: 5 },
    { name: 'SoCal GU11-2', location: 'Calgary South', league_id: girlsU11Div3.id, rank: 6 }
  ]);

  // Girls U11 Division 4 Teams
  await knex('teams').insert([
    { name: 'Airdrie GU11-2 Alt', location: 'Airdrie', league_id: girlsU11Div4.id, rank: 1 },
    { name: 'Bow River GU11-5', location: 'Bow River', league_id: girlsU11Div4.id, rank: 2 },
    { name: 'Calwest GU11-4A', location: 'Calgary West', league_id: girlsU11Div4.id, rank: 3 },
    { name: 'CalWest GU11-4B', location: 'Calgary West', league_id: girlsU11Div4.id, rank: 4 },
    { name: 'EastPro GU11-2', location: 'Calgary East', league_id: girlsU11Div4.id, rank: 5 },
    { name: 'NCBC GU11-3A', location: 'North Calgary', league_id: girlsU11Div4.id, rank: 6 },
    { name: 'NW GU11-2 Alt', location: 'Calgary Northwest', league_id: girlsU11Div4.id, rank: 7 }
  ]);

  // Girls U13 Division
  const [girlsU13Div2] = await knex('leagues').insert([{
    organization: 'CMBA',
    age_group: 'U13',
    gender: 'Girls',
    division: 'Division 2',
    season: '2024-25',
    level: 'Competitive'
  }]).returning('*');

  // Girls U13 Division 2 Teams
  await knex('teams').insert([
    { name: 'Bow River GU13-3', location: 'Bow River', league_id: girlsU13Div2.id, rank: 1 },
    { name: 'Calwest GU13-2', location: 'Calgary West', league_id: girlsU13Div2.id, rank: 2 },
    { name: 'Cochrane GU13-1', location: 'Cochrane', league_id: girlsU13Div2.id, rank: 3 },
    { name: 'EastPro GU13-1', location: 'Calgary East', league_id: girlsU13Div2.id, rank: 4 },
    { name: 'NW GU13-2', location: 'Calgary Northwest', league_id: girlsU13Div2.id, rank: 5 },
    { name: 'SoCal GU13-1', location: 'Calgary South', league_id: girlsU13Div2.id, rank: 6 }
  ]);

  // Girls U15 Divisions
  const [girlsU15Div5, girlsU15Div6] = await knex('leagues').insert([
    {
      organization: 'CMBA',
      age_group: 'U15',
      gender: 'Girls',
      division: 'Division 5',
      season: '2024-25',
      level: 'Recreational'
    },
    {
      organization: 'CMBA',
      age_group: 'U15',
      gender: 'Girls',
      division: 'Division 6',
      season: '2024-25',
      level: 'Recreational'
    }
  ]).returning('*');

  // Girls U15 Division 5 Teams
  await knex('teams').insert([
    { name: 'Airdrie GU15-2', location: 'Airdrie', league_id: girlsU15Div5.id, rank: 1 },
    { name: 'Bow River GU15-4', location: 'Bow River', league_id: girlsU15Div5.id, rank: 2 },
    { name: 'Bow River GU15-5', location: 'Bow River', league_id: girlsU15Div5.id, rank: 3 },
    { name: 'Calwest GU15-5A', location: 'Calgary West', league_id: girlsU15Div5.id, rank: 4 },
    { name: 'CLS GU15-2', location: 'Calgary', league_id: girlsU15Div5.id, rank: 5 },
    { name: 'NCBC GU15-4A', location: 'North Calgary', league_id: girlsU15Div5.id, rank: 6 }
  ]);

  // Girls U15 Division 6 Teams
  await knex('teams').insert([
    { name: 'Bow River U15 Girls Team 6', location: 'Bow River', league_id: girlsU15Div6.id, rank: 1 },
    { name: 'Calwest U15 Girls Team 4', location: 'Calgary West', league_id: girlsU15Div6.id, rank: 2 },
    { name: 'Cochrane U15 Girls Team 3', location: 'Cochrane', league_id: girlsU15Div6.id, rank: 3 },
    { name: 'SoCal U15 Girls Team 4', location: 'Calgary South', league_id: girlsU15Div6.id, rank: 4 }
  ]);

  // ========================================
  // CLUB LEAGUES
  // ========================================

  // U13 Boys Club Weeknight
  const [u13BoysClub] = await knex('leagues').insert([{
    organization: 'CMBA',
    age_group: 'U13',
    gender: 'Boys',
    division: 'Club Weeknight',
    season: '2024-25',
    level: 'Elite'
  }]).returning('*');

  await knex('teams').insert([
    { name: 'Genesis U12 Black', location: 'Calgary', league_id: u13BoysClub.id, rank: 1 },
    { name: 'Genesis U13 White', location: 'Calgary', league_id: u13BoysClub.id, rank: 2 },
    { name: 'Nxt lvl Basketball Club', location: 'Calgary', league_id: u13BoysClub.id, rank: 3 },
    { name: 'PUREHOOPS Basketball Club', location: 'Calgary', league_id: u13BoysClub.id, rank: 4 },
    { name: 'Skills Elite 13 Black', location: 'Calgary', league_id: u13BoysClub.id, rank: 5 }
  ]);

  // U18 Boys Club Weeknight
  const [u18BoysClub] = await knex('leagues').insert([{
    organization: 'CMBA',
    age_group: 'U18',
    gender: 'Boys',
    division: 'Club Weeknight',
    season: '2024-25',
    level: 'Elite'
  }]).returning('*');

  await knex('teams').insert([
    { name: 'Calgary Elite', location: 'Calgary', league_id: u18BoysClub.id, rank: 1 },
    { name: 'Calgary Selects U18', location: 'Calgary', league_id: u18BoysClub.id, rank: 2 },
    { name: 'Excel HS Boys JV', location: 'Calgary', league_id: u18BoysClub.id, rank: 3 },
    { name: 'Ignite U16', location: 'Calgary', league_id: u18BoysClub.id, rank: 4 },
    { name: 'Ignite U18', location: 'Calgary', league_id: u18BoysClub.id, rank: 5 },
    { name: 'Rise U16 Boys Bwanali/Luistro', location: 'Calgary', league_id: u18BoysClub.id, rank: 6 },
    { name: 'Rise U17 Boys Deleon', location: 'Calgary', league_id: u18BoysClub.id, rank: 7 },
    { name: 'Rise U17 Boys Walker', location: 'Calgary', league_id: u18BoysClub.id, rank: 8 },
    { name: 'Skills Elite HS Boys', location: 'Calgary', league_id: u18BoysClub.id, rank: 9 },
    { name: 'TAC Basketball U16 Teal', location: 'Calgary', league_id: u18BoysClub.id, rank: 10 },
    { name: 'Tsuut\'ina Warriors', location: 'Tsuut\'ina', league_id: u18BoysClub.id, rank: 11 },
    { name: 'Wildfire U18 Boys', location: 'Calgary', league_id: u18BoysClub.id, rank: 12 }
  ]);

  // U18 Girls Club
  const [u18GirlsClub] = await knex('leagues').insert([{
    organization: 'CMBA',
    age_group: 'U18',
    gender: 'Girls',
    division: 'Club',
    season: '2024-25',
    level: 'Elite'
  }]).returning('*');

  await knex('teams').insert([
    { name: 'Excel JV Girls Green', location: 'Calgary', league_id: u18GirlsClub.id, rank: 1 },
    { name: 'Excel HS Girls Orange', location: 'Calgary', league_id: u18GirlsClub.id, rank: 2 }
  ]);

  // ========================================
  // RECREATIONAL (REC) DIVISIONS
  // ========================================

  // Boys REC Teams
  const [boysRec] = await knex('leagues').insert([{
    organization: 'CMBA',
    age_group: 'Mixed',
    gender: 'Boys',
    division: 'Recreational',
    season: '2024-25',
    level: 'Recreational'
  }]).returning('*');

  await knex('teams').insert([
    { name: 'RENEGADES U11', location: 'Calgary', league_id: boysRec.id, rank: 1 },
    { name: 'RENEGADES U13', location: 'Calgary', league_id: boysRec.id, rank: 2 },
    { name: 'Calgary Warriors U15', location: 'Calgary', league_id: boysRec.id, rank: 3 },
    { name: 'Calgary Selects U15', location: 'Calgary', league_id: boysRec.id, rank: 4 },
    { name: 'Supreme Hoops U15 BLACK', location: 'Calgary', league_id: boysRec.id, rank: 5 }
  ]);

  // Girls REC Teams
  const [girlsRec] = await knex('leagues').insert([{
    organization: 'CMBA',
    age_group: 'Mixed',
    gender: 'Girls',
    division: 'Recreational',
    season: '2024-25',
    level: 'Recreational'
  }]).returning('*');

  await knex('teams').insert([
    { name: 'Thunder (U13 Girls)', location: 'Calgary', league_id: girlsRec.id, rank: 1 },
    { name: 'Eastpro (U15 Girls)', location: 'Calgary East', league_id: girlsRec.id, rank: 2 }
  ]);

  // ========================================
  // SPRING LEAGUE STRUCTURE
  // ========================================

  // Spring Club Division A
  const [springClubA] = await knex('leagues').insert([{
    organization: 'CMBA',
    age_group: 'Mixed',
    gender: 'Mixed',
    division: 'Spring Club A',
    season: 'Spring 2025',
    level: 'Elite'
  }]).returning('*');

  // Spring Club Division B
  const [springClubB] = await knex('leagues').insert([{
    organization: 'CMBA',
    age_group: 'Mixed',
    gender: 'Mixed',
    division: 'Spring Club B',
    season: 'Spring 2025',
    level: 'Competitive'
  }]).returning('*');

  // Spring Recreational Division
  const [springRec] = await knex('leagues').insert([{
    organization: 'CMBA',
    age_group: 'Mixed',
    gender: 'Mixed',
    division: 'Spring Recreational',
    season: 'Spring 2025',
    level: 'Recreational'
  }]).returning('*');

  console.log('✅ CMBA 2024-25 Season seeding complete!');
  console.log('📊 Created:');
  
  // Count stats
  const leagueCount = await knex('leagues').where('organization', 'CMBA').count('* as count');
  const teamCount = await knex('teams').count('* as count');
  
  console.log(`   - ${leagueCount[0].count} Leagues`);
  console.log(`   - ${teamCount[0].count} Teams`);
  console.log('');
  console.log('🏀 League Structure:');
  console.log('   - Premium: Diamond Prep (U18G), Platinum (U18B)');
  console.log('   - Regular: Boys U11-U18, Girls U11-U15 divisions');
  console.log('   - Club: Elite club teams with weeknight schedules');
  console.log('   - Recreational: Community and developmental teams');
  console.log('   - Spring: Separate spring league structure');
};