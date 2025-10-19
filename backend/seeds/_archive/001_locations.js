/**
 * Locations seed - creates sample sports venues/facilities
 */

exports.seed = async function(knex) {
  console.log('🏟️  Seeding locations...\n');

  // Clear existing locations
  await knex('locations').del();
  console.log('✓ Cleared existing locations\n');

  // Create sample locations (sports facilities in Calgary area)
  const locations = [
    {
      name: 'Genesis Centre',
      address: '7555 Falconridge Blvd NE',
      city: 'Calgary',
      province: 'AB',
      postal_code: 'T3J 0C9',
      country: 'Canada',
      latitude: 51.0992,
      longitude: -113.9619,
      capacity: 500,
      contact_name: 'Genesis Centre Front Desk',
      contact_phone: '403-974-4100',
      contact_email: 'genesis@calgary.ca',
      hourly_rate: 150.00,
      game_rate: 200.00,
      parking_spaces: 300,
      facilities: JSON.stringify({
        arenas: 2,
        dressing_rooms: 8,
        concession: true,
        pro_shop: false
      }),
      accessibility_features: JSON.stringify({
        wheelchair_accessible: true,
        accessible_parking: true,
        elevator: true
      }),
      notes: 'Premier facility with two ice surfaces',
      is_active: true
    },
    {
      name: 'Repsol Sport Centre',
      address: '2225 Macleod Trail SE',
      city: 'Calgary',
      province: 'AB',
      postal_code: 'T2G 5B6',
      country: 'Canada',
      latitude: 51.0299,
      longitude: -114.0628,
      capacity: 800,
      contact_name: 'Repsol Reception',
      contact_phone: '403-233-8393',
      contact_email: 'repsol@calgary.ca',
      hourly_rate: 180.00,
      game_rate: 250.00,
      parking_spaces: 400,
      facilities: JSON.stringify({
        arenas: 2,
        dressing_rooms: 10,
        concession: true,
        pro_shop: true
      }),
      accessibility_features: JSON.stringify({
        wheelchair_accessible: true,
        accessible_parking: true,
        elevator: true
      }),
      notes: 'Large multi-purpose sports facility',
      is_active: true
    },
    {
      name: 'MNP Community Centre',
      address: '151 Saddletowne Circle NE',
      city: 'Calgary',
      province: 'AB',
      postal_code: 'T3J 0L4',
      country: 'Canada',
      latitude: 51.1247,
      longitude: -113.9661,
      capacity: 400,
      contact_name: 'MNP Front Desk',
      contact_phone: '403-974-4300',
      contact_email: 'mnp@calgary.ca',
      hourly_rate: 140.00,
      game_rate: 180.00,
      parking_spaces: 250,
      facilities: JSON.stringify({
        arenas: 1,
        dressing_rooms: 6,
        concession: true,
        pro_shop: false
      }),
      accessibility_features: JSON.stringify({
        wheelchair_accessible: true,
        accessible_parking: true,
        elevator: true
      }),
      notes: 'Community recreation facility',
      is_active: true
    },
    {
      name: 'Westside Recreation Centre',
      address: '2000 69 St SW',
      city: 'Calgary',
      province: 'AB',
      postal_code: 'T3E 5M7',
      country: 'Canada',
      latitude: 50.9961,
      longitude: -114.1386,
      capacity: 300,
      contact_name: 'Westside Reception',
      contact_phone: '403-246-9600',
      contact_email: 'westside@calgary.ca',
      hourly_rate: 130.00,
      game_rate: 170.00,
      parking_spaces: 200,
      facilities: JSON.stringify({
        arenas: 1,
        dressing_rooms: 4,
        concession: true,
        pro_shop: false
      }),
      accessibility_features: JSON.stringify({
        wheelchair_accessible: true,
        accessible_parking: true,
        elevator: false
      }),
      notes: 'Smaller community facility',
      is_active: true
    },
    {
      name: 'Cardel Rec South',
      address: '333 Shawville Blvd SE',
      city: 'Calgary',
      province: 'AB',
      postal_code: 'T2Y 4H3',
      country: 'Canada',
      latitude: 50.8969,
      longitude: -113.9578,
      capacity: 600,
      contact_name: 'Cardel South Front Desk',
      contact_phone: '403-278-7542',
      contact_email: 'cardelsouth@calgary.ca',
      hourly_rate: 160.00,
      game_rate: 210.00,
      parking_spaces: 350,
      facilities: JSON.stringify({
        arenas: 2,
        dressing_rooms: 8,
        concession: true,
        pro_shop: true
      }),
      accessibility_features: JSON.stringify({
        wheelchair_accessible: true,
        accessible_parking: true,
        elevator: true
      }),
      notes: 'Modern facility in south Calgary',
      is_active: true
    },
    {
      name: 'Vivo Recreation Centre',
      address: '11950 Country Village Link NE',
      city: 'Calgary',
      province: 'AB',
      postal_code: 'T3K 6E3',
      country: 'Canada',
      latitude: 51.1753,
      longitude: -114.0436,
      capacity: 450,
      contact_name: 'Vivo Reception',
      contact_phone: '403-290-0086',
      contact_email: 'vivo@calgary.ca',
      hourly_rate: 155.00,
      game_rate: 195.00,
      parking_spaces: 300,
      facilities: JSON.stringify({
        arenas: 1,
        dressing_rooms: 6,
        concession: true,
        pro_shop: false
      }),
      accessibility_features: JSON.stringify({
        wheelchair_accessible: true,
        accessible_parking: true,
        elevator: true
      }),
      notes: 'North Calgary recreation facility',
      is_active: true
    },
    {
      name: 'Shouldice Athletic Park',
      address: '2225 18 St NW',
      city: 'Calgary',
      province: 'AB',
      postal_code: 'T2M 3T8',
      country: 'Canada',
      latitude: 51.0669,
      longitude: -114.0936,
      capacity: 350,
      contact_name: 'Shouldice Park Office',
      contact_phone: '403-221-3690',
      contact_email: 'shouldice@calgary.ca',
      hourly_rate: 125.00,
      game_rate: 160.00,
      parking_spaces: 150,
      facilities: JSON.stringify({
        arenas: 1,
        dressing_rooms: 4,
        concession: false,
        pro_shop: false
      }),
      accessibility_features: JSON.stringify({
        wheelchair_accessible: true,
        accessible_parking: true,
        elevator: false
      }),
      notes: 'Community athletic park',
      is_active: true
    },
    {
      name: 'Airdrie Recreation Centre',
      address: '800 East Lake Blvd NE',
      city: 'Airdrie',
      province: 'AB',
      postal_code: 'T4A 2K5',
      country: 'Canada',
      latitude: 51.2986,
      longitude: -113.9894,
      capacity: 400,
      contact_name: 'Airdrie Rec Front Desk',
      contact_phone: '403-948-8804',
      contact_email: 'recreation@airdrie.ca',
      hourly_rate: 120.00,
      game_rate: 150.00,
      parking_spaces: 250,
      facilities: JSON.stringify({
        arenas: 1,
        dressing_rooms: 6,
        concession: true,
        pro_shop: false
      }),
      accessibility_features: JSON.stringify({
        wheelchair_accessible: true,
        accessible_parking: true,
        elevator: true
      }),
      notes: 'Main recreation facility in Airdrie',
      is_active: true
    },
    {
      name: 'Okotoks Recreation Centre',
      address: '1 Recreation Dr',
      city: 'Okotoks',
      province: 'AB',
      postal_code: 'T1S 1C9',
      country: 'Canada',
      latitude: 50.7275,
      longitude: -113.9747,
      capacity: 350,
      contact_name: 'Okotoks Rec Reception',
      contact_phone: '403-938-7333',
      contact_email: 'recreation@okotoks.ca',
      hourly_rate: 115.00,
      game_rate: 145.00,
      parking_spaces: 200,
      facilities: JSON.stringify({
        arenas: 1,
        dressing_rooms: 4,
        concession: true,
        pro_shop: false
      }),
      accessibility_features: JSON.stringify({
        wheelchair_accessible: true,
        accessible_parking: true,
        elevator: false
      }),
      notes: 'Okotoks community facility',
      is_active: true
    },
    {
      name: 'Cochrane Spray Lake Sawmills Arena',
      address: '203 1 St W',
      city: 'Cochrane',
      province: 'AB',
      postal_code: 'T4C 1A7',
      country: 'Canada',
      latitude: 51.1886,
      longitude: -114.4686,
      capacity: 300,
      contact_name: 'Cochrane Arena Office',
      contact_phone: '403-851-2510',
      contact_email: 'arena@cochrane.ca',
      hourly_rate: 110.00,
      game_rate: 140.00,
      parking_spaces: 150,
      facilities: JSON.stringify({
        arenas: 1,
        dressing_rooms: 4,
        concession: true,
        pro_shop: false
      }),
      accessibility_features: JSON.stringify({
        wheelchair_accessible: true,
        accessible_parking: true,
        elevator: false
      }),
      notes: 'Cochrane arena facility',
      is_active: true
    }
  ];

  await knex('locations').insert(locations);
  console.log(`✅ Successfully seeded ${locations.length} locations!\n`);
};
