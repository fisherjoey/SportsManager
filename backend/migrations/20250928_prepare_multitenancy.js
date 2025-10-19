exports.up = async function(knex) {
  console.log('Starting multitenancy preparation migration...');

  await knex.schema.alterTable('organizations', (table) => {
    table.uuid('parent_organization_id').nullable().references('id').inTable('organizations').onDelete('RESTRICT');
    table.check('parent_organization_id IS NULL OR parent_organization_id != id', [], 'no_self_parent');
    table.index('parent_organization_id', 'idx_organizations_parent');

    console.log('  ✓ Added parent_organization_id to organizations');
  });

  await knex.schema.alterTable('teams', (table) => {
    table.uuid('organization_id').nullable().references('id').inTable('organizations').onDelete('SET NULL');
    table.index('organization_id', 'idx_teams_organization');

    console.log('  ✓ Added organization_id to teams');
  });

  await knex.schema.alterTable('leagues', (table) => {
    table.uuid('organization_id').nullable().references('id').inTable('organizations').onDelete('SET NULL');
    table.index('organization_id', 'idx_leagues_organization');

    console.log('  ✓ Added organization_id to leagues');
  });

  const defaultOrg = await knex('organizations').where({ slug: 'default' }).first();

  if (!defaultOrg) {
    console.log('  ⚠ No default organization found, creating one...');
    const [newOrg] = await knex('organizations').insert({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Default Organization',
      slug: 'default',
      settings: JSON.stringify({ is_default: true })
    }).returning('id');

    defaultOrgId = newOrg.id;
  } else {
    defaultOrgId = defaultOrg.id;
  }

  const [orgForCMBA] = await knex('organizations').where({ name: 'Calgary Minor Basketball Association' }).orWhere({ slug: 'cmba' });
  const cmbaOrgId = orgForCMBA?.id || defaultOrgId;

  const updatedTeams = await knex('teams').update({ organization_id: cmbaOrgId });
  console.log(`  ✓ Set organization_id for ${updatedTeams} teams`);

  const updatedLeagues = await knex('leagues')
    .where('organization', 'CMBA')
    .orWhereNull('organization')
    .update({ organization_id: cmbaOrgId });
  console.log(`  ✓ Set organization_id for ${updatedLeagues} leagues`);

  await knex('leagues')
    .whereNotNull('organization')
    .whereNot('organization', 'CMBA')
    .update({ organization_id: defaultOrgId });
  console.log('  ✓ Set default organization_id for other leagues');

  console.log('✅ Multitenancy preparation complete!');
  console.log('📝 Note: leagues.organization string field kept for backwards compatibility');
};

exports.down = async function(knex) {
  console.log('Rolling back multitenancy preparation...');

  await knex.schema.alterTable('leagues', (table) => {
    table.dropColumn('organization_id');
  });
  console.log('  ✓ Removed organization_id from leagues');

  await knex.schema.alterTable('teams', (table) => {
    table.dropColumn('organization_id');
  });
  console.log('  ✓ Removed organization_id from teams');

  await knex.schema.alterTable('organizations', (table) => {
    table.dropColumn('parent_organization_id');
  });
  console.log('  ✓ Removed parent_organization_id from organizations');

  console.log('✅ Rollback complete');
};