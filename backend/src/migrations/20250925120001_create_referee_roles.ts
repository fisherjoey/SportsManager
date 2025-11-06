import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Step 1: Insert base and secondary referee roles
  const roles = [
    {
      name: 'Referee',
      description: 'Base role for all referees',
      is_system: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Rookie Referee',
      description: 'New referee with limited permissions',
      is_system: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Junior Referee',
      description: 'Standard referee',
      is_system: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Senior Referee',
      description: 'Experienced referee with mentoring capabilities',
      is_system: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Head Referee',
      description: 'Lead referee with management permissions',
      is_system: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Referee Coach',
      description: 'Referee trainer and evaluator',
      is_system: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ];

  // Insert roles if they don't exist
  for (const role of roles) {
    const existing = await knex('roles').where('name', role.name).first();
    if (!existing) {
      await knex('roles').insert(role);
    }
  }

  console.log('✅ Referee roles created');
}

export async function down(knex: Knex): Promise<void> {
  // Remove the referee roles
  await knex('roles')
    .whereIn('name', [
      'Referee',
      'Rookie Referee',
      'Junior Referee',
      'Senior Referee',
      'Head Referee',
      'Referee Coach'
    ])
    .delete();
}