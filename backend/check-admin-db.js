const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: 'postgres',
  password: 'postgres123',
  host: 'localhost',
  database: 'sports_management',
  port: 5432,
});

async function checkAdminUser() {
  try {
    console.log('Checking database for admin@refassign.com...\n');

    // First, check the table structure
    const tableStructureQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;

    const structureResult = await pool.query(tableStructureQuery);
    console.log('📋 Users table structure:');
    structureResult.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    console.log();

    // Check if user exists - using generic query first
    const userQuery = `
      SELECT *
      FROM users u
      WHERE u.email = 'admin@refassign.com'
    `;

    const userResult = await pool.query(userQuery);

    if (userResult.rows.length === 0) {
      console.log('❌ User admin@refassign.com NOT FOUND in database');
      return;
    }

    const user = userResult.rows[0];
    console.log('✅ User found:');
    console.log('   User data:', JSON.stringify(user, null, 2));
    console.log();

    // Check user roles
    const rolesQuery = `
      SELECT r.name as role, r.id as role_id
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.email = 'admin@refassign.com'
    `;

    const rolesResult = await pool.query(rolesQuery);

    console.log('🔑 User roles:');
    if (rolesResult.rows.length === 0) {
      console.log('   ❌ NO ROLES ASSIGNED');
    } else {
      rolesResult.rows.forEach(role => {
        console.log(`   - ${role.role} (ID: ${role.role_id})`);
      });
    }
    console.log();

    // Check all available roles
    const allRolesQuery = `SELECT id, name FROM roles ORDER BY name`;
    const allRolesResult = await pool.query(allRolesQuery);

    console.log('📋 All available roles:');
    allRolesResult.rows.forEach(role => {
      console.log(`   - ${role.name} (ID: ${role.id})`);
    });
    console.log();

    // Check if Super Admin and Admin roles exist
    const adminRoles = allRolesResult.rows.filter(role =>
      ['Super Admin', 'Admin'].includes(role.name)
    );

    console.log('🔍 Required admin roles status:');
    ['Super Admin', 'Admin'].forEach(roleName => {
      const found = adminRoles.find(r => r.name === roleName);
      if (found) {
        console.log(`   ✅ ${roleName} role exists (ID: ${found.id})`);
      } else {
        console.log(`   ❌ ${roleName} role MISSING`);
      }
    });

  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

checkAdminUser();