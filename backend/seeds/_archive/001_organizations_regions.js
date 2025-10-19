/**
 * Seed 001: Organizations and Regions
 * Creates the multi-tenancy foundation
 */

const { v4: uuidv4 } = require('uuid');

exports.seed = async function(knex) {
  console.log('🏢 Seeding organizations and regions...\n');

  // Create default organization
  const [organization] = await knex('organizations')
    .insert({
      id: uuidv4(),
      name: 'Calgary Basketball Association',
      slug: 'calgary-basketball',
      settings: {
        timezone: 'America/Edmonton',
        currency: 'CAD',
        locale: 'en-CA'
      },
      created_at: new Date(),
      updated_at: new Date()
    })
    .returning('*');

  console.log(`  ✓ Created organization: ${organization.name}`);

  // Create Calgary regions (quadrants)
  const regions = [
    {
      name: 'Northwest Calgary',
      slug: 'nw-calgary',
      description: 'Northwest quadrant of Calgary',
      settings: { quadrant: 'NW' }
    },
    {
      name: 'Northeast Calgary',
      slug: 'ne-calgary',
      description: 'Northeast quadrant of Calgary',
      settings: { quadrant: 'NE' }
    },
    {
      name: 'Southwest Calgary',
      slug: 'sw-calgary',
      description: 'Southwest quadrant of Calgary',
      settings: { quadrant: 'SW' }
    },
    {
      name: 'Southeast Calgary',
      slug: 'se-calgary',
      description: 'Southeast quadrant of Calgary',
      settings: { quadrant: 'SE' }
    },
    {
      name: 'Central Calgary',
      slug: 'central-calgary',
      description: 'Central Calgary (Downtown, Beltline)',
      settings: { quadrant: 'CENTRAL' }
    }
  ];

  for (const region of regions) {
    await knex('regions').insert({
      id: uuidv4(),
      organization_id: organization.id,
      name: region.name,
      slug: region.slug,
      parent_region_id: null,
      settings: region.settings,
      created_at: new Date(),
      updated_at: new Date()
    });
    console.log(`  ✓ Created region: ${region.name}`);
  }

  console.log(`\n✅ Created 1 organization and ${regions.length} regions\n`);

  // Store organization ID for use in other seeds
  global.defaultOrgId = organization.id;
};
