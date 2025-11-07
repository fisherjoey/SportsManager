/**
 * Seed 003: Venues (Locations)
 * Creates 50+ Calgary basketball venues with GPS coordinates
 */

const { v4: uuidv4 } = require('uuid');
const venues = require('./data/venues.json');

exports.seed = async function(knex) {
  console.log('🏀 Seeding venues...\n');

  const orgId = global.defaultOrgId || (await knex('organizations').first()).id;
  const regions = await knex('regions').where('organization_id', orgId);

  // Map venues to regions based on location
  function getRegionForVenue(venue) {
    const lat = venue.latitude;
    const lon = venue.longitude;

    // Simple quadrant logic for Calgary
    // Central Calgary: ~51.045, -114.07
    const isCentral = Math.abs(lat - 51.045) < 0.02 && Math.abs(lon + 114.07) < 0.02;

    if (isCentral) {
      return regions.find(r => r.slug === 'central-calgary');
    }

    const isNorth = lat > 51.05;
    const isWest = lon < -114.07;

    if (isNorth && isWest) {
      return regions.find(r => r.slug === 'nw-calgary');
    } else if (isNorth && !isWest) {
      return regions.find(r => r.slug === 'ne-calgary');
    } else if (!isNorth && isWest) {
      return regions.find(r => r.slug === 'sw-calgary');
    } else {
      return regions.find(r => r.slug === 'se-calgary');
    }
  }

  const createdVenues = [];

  for (const venue of venues) {
    const region = getRegionForVenue(venue);

    const [created] = await knex('locations')
      .insert({
        id: uuidv4(),
        name: venue.name,
        abbreviation: venue.abbreviation,
        address: venue.address,
        city: venue.city,
        province: venue.province,
        postal_code: venue.postal_code,
        country: venue.country,
        latitude: venue.latitude,
        longitude: venue.longitude,
        capacity: venue.capacity,
        type: venue.type,
        facilities: JSON.stringify(venue.facilities),
        surface_type: venue.surface_type,
        is_active: true,
        has_parking: true,
        has_accessibility: true,
        organization_id: orgId,
        region_id: region ? region.id : null,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    createdVenues.push(created);
  }

  console.log(`  ✓ Created ${createdVenues.length} venues across Calgary`);

  // Display region distribution
  const regionCounts = {};
  for (const venue of createdVenues) {
    const region = regions.find(r => r.id === venue.region_id);
    const regionName = region ? region.name : 'Unknown';
    regionCounts[regionName] = (regionCounts[regionName] || 0) + 1;
  }

  console.log('\n  Regional Distribution:');
  Object.entries(regionCounts).forEach(([region, count]) => {
    console.log(`    • ${region}: ${count} venues`);
  });

  console.log(`\n✅ Seeded ${createdVenues.length} venues\n`);

  // Store for use in other seeds
  global.venues = createdVenues;
};
