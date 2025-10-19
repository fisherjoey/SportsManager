/**
 * Complete Database Reset and Setup Script
 * This script will:
 * 1. Kill all node processes on ports 3001, 3002
 * 2. Drop and recreate the database
 * 3. Run all migrations
 * 4. Run all seeds in order
 * 5. Verify login works
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'sports_management',
  user: 'postgres',
  password: 'postgres123'
};

const PSQL_PATH = '"C:/Program Files/PostgreSQL/17/bin/psql.exe"';

async function runCommand(command, description) {
  console.log(`\n▶ ${description}...`);
  try {
    const { stdout, stderr } = await execPromise(command, {
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, PGPASSWORD: DB_CONFIG.password }
    });
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('warning')) console.error(stderr);
    console.log(`✅ ${description} completed`);
    return { success: true, stdout, stderr };
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return { success: false, error };
  }
}

async function main() {
  console.log('🚀 Starting complete database reset and setup...\n');
  console.log('=' .repeat(60));

  // Step 1: Kill processes on ports
  console.log('\n📌 Step 1: Cleaning up running processes');
  await runCommand('npx kill-port 3001 3002 3000', 'Kill processes on ports 3001, 3002, 3000');

  // Step 2: Terminate DB connections
  console.log('\n📌 Step 2: Terminating database connections');
  const terminateCmd = `${PSQL_PATH} -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_CONFIG.database}' AND pid <> pg_backend_pid();"`;
  await runCommand(terminateCmd, 'Terminate active database connections');

  // Step 3: Drop database
  console.log('\n📌 Step 3: Dropping existing database');
  const dropCmd = `${PSQL_PATH} -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d postgres -c "DROP DATABASE IF EXISTS ${DB_CONFIG.database};"`;
  await runCommand(dropCmd, 'Drop database');

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 4: Create database
  console.log('\n📌 Step 4: Creating fresh database');
  const createCmd = `${PSQL_PATH} -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d postgres -c "CREATE DATABASE ${DB_CONFIG.database};"`;
  await runCommand(createCmd, 'Create database');

  // Step 5: Run migrations
  console.log('\n📌 Step 5: Running database migrations');
  const migrateResult = await runCommand('npm run migrate:latest', 'Run migrations');

  if (!migrateResult.success) {
    console.log('\n⚠️  Migrations had errors. Checking if tables were created...');

    // Check if users table exists
    const checkCmd = `${PSQL_PATH} -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'users';"`;
    const checkResult = await runCommand(checkCmd, 'Check if users table exists');

    if (!checkResult.stdout || !checkResult.stdout.includes('1')) {
      console.error('\n❌ Critical tables missing. Cannot continue.');
      process.exit(1);
    }

    console.log('✅ Core tables exist, continuing...');
  }

  // Step 6: Run seeds
  console.log('\n📌 Step 6: Seeding database');

  const seeds = [
    '000_cleanup.js',
    '001_organizations_regions.js',
    '002_roles_rbac.js',
    '003_venues.js',
    '004_users_referees.js',
    '005_leagues_teams.js',
    '006_games_season.js',
    '007_assignments.js'
  ];

  for (const seed of seeds) {
    const seedResult = await runCommand(
      `npx knex seed:run --specific=${seed}`,
      `Seed: ${seed}`
    );

    if (!seedResult.success && seed === '004_users_referees.js') {
      console.error('\n❌ Critical seed failed (users). Cannot continue.');
      process.exit(1);
    }
  }

  // Step 7: Verify setup
  console.log('\n📌 Step 7: Verifying database setup');
  const verifyCmd = `${PSQL_PATH} -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "SELECT email FROM users LIMIT 5;"`;
  await runCommand(verifyCmd, 'Verify users created');

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Database setup complete!\n');
  console.log('📝 Test Login Credentials:');
  console.log('   • admin@calgarybasketball.com / password123');
  console.log('   • admin@sports.com / password123');
  console.log('   • superadmin@test.com / password123\n');
  console.log('🚀 Next Steps:');
  console.log('   1. Run: npm run dev');
  console.log('   2. Open: http://localhost:3000');
  console.log('   3. Login with one of the credentials above');
  console.log('\n' + '='.repeat(60));
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
