/**
 * Fix the Senior Referee role that's missing category
 */

const knex = require('knex')({
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'sports_management'
  }
});

async function fixSeniorRole() {
  try {
    console.log('Fixing Senior Referee role...');

    // Update Senior Referee role to have proper category and config
    const result = await knex('roles')
      .where('name', 'Senior Referee')
      .update({
        category: 'referee_type',
        referee_config: JSON.stringify({
          white_whistle: "never",
          min_experience_years: 3,
          default_wage_rate: 75.00,
          allowed_divisions: ["Premier", "Competitive", "Recreational", "Youth"],
          supervision_required: false,
          can_evaluate_others: true,
          max_games_per_day: 4
        }),
        is_system: true
      });

    console.log(`✓ Updated ${result} Senior Referee role`);

    // Also fix Mentor if needed
    const mentorResult = await knex('roles')
      .where('name', 'Mentor')
      .update({
        category: 'referee_capability',
        referee_config: JSON.stringify({
          requires_certification: true,
          min_referee_type: "Senior Referee",
          mentoring_scope: "rookie_and_junior"
        }),
        is_system: true
      });

    console.log(`✓ Updated ${mentorResult} Mentor role`);

    // Check results
    const roles = await knex('roles')
      .select('name', 'category')
      .where('category', 'referee_type')
      .orWhere('category', 'referee_capability');

    console.log('\nReferee roles now:');
    roles.forEach(role => {
      console.log(`- ${role.name} (${role.category})`);
    });

    console.log('✅ Senior Referee role fixed!');

  } catch (error) {
    console.error('Error fixing role:', error);
  } finally {
    await knex.destroy();
  }
}

fixSeniorRole();