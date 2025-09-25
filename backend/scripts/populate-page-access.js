const db = require('../dist/config/database').default;

async function populatePageAccess() {
  try {
    console.log('Populating role_page_access table...\n');

    // Get all roles
    const roles = await db('roles').select('id', 'name');
    console.log('Found roles:', roles.map(r => r.name));

    // Define page access for each role
    const pageAccessDefinitions = {
      'Super Admin': [
        // All pages - Super Admin has access to everything
        { page_path: 'dashboard', page_name: 'Dashboard', page_category: 'Core', can_access: true },
        { page_path: 'leagues', page_name: 'League Management', page_category: 'Sports Management', can_access: true },
        { page_path: 'tournaments', page_name: 'Tournament Generator', page_category: 'Sports Management', can_access: true },
        { page_path: 'games', page_name: 'Games', page_category: 'Sports Management', can_access: true },
        { page_path: 'assigning', page_name: 'Game Assignment', page_category: 'Sports Management', can_access: true },
        { page_path: 'ai-assignments', page_name: 'AI Assignments', page_category: 'Sports Management', can_access: true },
        { page_path: 'locations', page_name: 'Teams & Locations', page_category: 'Sports Management', can_access: true },
        { page_path: 'referees', page_name: 'Referees', page_category: 'Sports Management', can_access: true },
        { page_path: 'calendar', page_name: 'Calendar', page_category: 'Core', can_access: true },
        { page_path: 'communications', page_name: 'Communications', page_category: 'Communications', can_access: true },
        { page_path: 'resources', page_name: 'Resource Centre', page_category: 'Resources', can_access: true },
        { page_path: 'assignments', page_name: 'My Assignments', page_category: 'Referee', can_access: true },
        { page_path: 'available', page_name: 'Available Games', page_category: 'Referee', can_access: true },
        { page_path: 'availability', page_name: 'My Availability', page_category: 'Referee', can_access: true },
        { page_path: 'expenses', page_name: 'My Expenses', page_category: 'Finance', can_access: true },
        { page_path: 'expense-create', page_name: 'Submit Expense', page_category: 'Finance', can_access: true },
        { page_path: 'profile', page_name: 'Profile Settings', page_category: 'Account', can_access: true },
        { page_path: 'organization-settings', page_name: 'Organization Settings', page_category: 'Administration', can_access: true },
        { page_path: 'admin-access-control', page_name: 'Access Control', page_category: 'Administration', can_access: true }
      ],
      'Admin': [
        // Admin has most access except system settings
        { page_path: 'dashboard', page_name: 'Dashboard', page_category: 'Core', can_access: true },
        { page_path: 'leagues', page_name: 'League Management', page_category: 'Sports Management', can_access: true },
        { page_path: 'tournaments', page_name: 'Tournament Generator', page_category: 'Sports Management', can_access: true },
        { page_path: 'games', page_name: 'Games', page_category: 'Sports Management', can_access: true },
        { page_path: 'assigning', page_name: 'Game Assignment', page_category: 'Sports Management', can_access: true },
        { page_path: 'locations', page_name: 'Teams & Locations', page_category: 'Sports Management', can_access: true },
        { page_path: 'referees', page_name: 'Referees', page_category: 'Sports Management', can_access: true },
        { page_path: 'calendar', page_name: 'Calendar', page_category: 'Core', can_access: true },
        { page_path: 'communications', page_name: 'Communications', page_category: 'Communications', can_access: true },
        { page_path: 'resources', page_name: 'Resource Centre', page_category: 'Resources', can_access: true },
        { page_path: 'profile', page_name: 'Profile Settings', page_category: 'Account', can_access: true },
        { page_path: 'organization-settings', page_name: 'Organization Settings', page_category: 'Administration', can_access: true }
      ],
      'Assignor': [
        // Assignor can manage games and assignments
        { page_path: 'dashboard', page_name: 'Dashboard', page_category: 'Core', can_access: true },
        { page_path: 'games', page_name: 'Games', page_category: 'Sports Management', can_access: true },
        { page_path: 'assigning', page_name: 'Game Assignment', page_category: 'Sports Management', can_access: true },
        { page_path: 'ai-assignments', page_name: 'AI Assignments', page_category: 'Sports Management', can_access: true },
        { page_path: 'referees', page_name: 'Referees', page_category: 'Sports Management', can_access: true },
        { page_path: 'calendar', page_name: 'Calendar', page_category: 'Core', can_access: true },
        { page_path: 'communications', page_name: 'Communications', page_category: 'Communications', can_access: true },
        { page_path: 'resources', page_name: 'Resource Centre', page_category: 'Resources', can_access: true },
        { page_path: 'profile', page_name: 'Profile Settings', page_category: 'Account', can_access: true }
      ],
      'Referee Coordinator': [
        // Similar to Assignor
        { page_path: 'dashboard', page_name: 'Dashboard', page_category: 'Core', can_access: true },
        { page_path: 'games', page_name: 'Games', page_category: 'Sports Management', can_access: true },
        { page_path: 'assigning', page_name: 'Game Assignment', page_category: 'Sports Management', can_access: true },
        { page_path: 'ai-assignments', page_name: 'AI Assignments', page_category: 'Sports Management', can_access: true },
        { page_path: 'referees', page_name: 'Referees', page_category: 'Sports Management', can_access: true },
        { page_path: 'calendar', page_name: 'Calendar', page_category: 'Core', can_access: true },
        { page_path: 'communications', page_name: 'Communications', page_category: 'Communications', can_access: true },
        { page_path: 'resources', page_name: 'Resource Centre', page_category: 'Resources', can_access: true },
        { page_path: 'profile', page_name: 'Profile Settings', page_category: 'Account', can_access: true }
      ],
      'Referee': [
        // Referee can see their assignments and availability
        { page_path: 'dashboard', page_name: 'Dashboard', page_category: 'Core', can_access: true },
        { page_path: 'calendar', page_name: 'Calendar', page_category: 'Core', can_access: true },
        { page_path: 'assignments', page_name: 'My Assignments', page_category: 'Referee', can_access: true },
        { page_path: 'available', page_name: 'Available Games', page_category: 'Referee', can_access: true },
        { page_path: 'availability', page_name: 'My Availability', page_category: 'Referee', can_access: true },
        { page_path: 'expenses', page_name: 'My Expenses', page_category: 'Finance', can_access: true },
        { page_path: 'expense-create', page_name: 'Submit Expense', page_category: 'Finance', can_access: true },
        { page_path: 'resources', page_name: 'Resource Centre', page_category: 'Resources', can_access: true },
        { page_path: 'profile', page_name: 'Profile Settings', page_category: 'Account', can_access: true }
      ],
      'Team Manager': [
        // Team Manager can view games and locations
        { page_path: 'dashboard', page_name: 'Dashboard', page_category: 'Core', can_access: true },
        { page_path: 'games', page_name: 'Games', page_category: 'Sports Management', can_access: true },
        { page_path: 'locations', page_name: 'Teams & Locations', page_category: 'Sports Management', can_access: true },
        { page_path: 'calendar', page_name: 'Calendar', page_category: 'Core', can_access: true },
        { page_path: 'communications', page_name: 'Communications', page_category: 'Communications', can_access: true },
        { page_path: 'resources', page_name: 'Resource Centre', page_category: 'Resources', can_access: true },
        { page_path: 'profile', page_name: 'Profile Settings', page_category: 'Account', can_access: true }
      ],
      'Treasurer': [
        // Treasurer can manage financial aspects
        { page_path: 'dashboard', page_name: 'Dashboard', page_category: 'Core', can_access: true },
        { page_path: 'expenses', page_name: 'My Expenses', page_category: 'Finance', can_access: true },
        { page_path: 'expense-create', page_name: 'Submit Expense', page_category: 'Finance', can_access: true },
        { page_path: 'resources', page_name: 'Resource Centre', page_category: 'Resources', can_access: true },
        { page_path: 'profile', page_name: 'Profile Settings', page_category: 'Account', can_access: true }
      ],
      'Viewer': [
        // Viewer has limited read-only access
        { page_path: 'dashboard', page_name: 'Dashboard', page_category: 'Core', can_access: true },
        { page_path: 'calendar', page_name: 'Calendar', page_category: 'Core', can_access: true },
        { page_path: 'resources', page_name: 'Resource Centre', page_category: 'Resources', can_access: true },
        { page_path: 'profile', page_name: 'Profile Settings', page_category: 'Account', can_access: true }
      ]
    };

    // Clear existing role_page_access entries
    await db('role_page_access').del();
    console.log('Cleared existing role_page_access entries\n');

    // Insert page access for each role
    for (const role of roles) {
      const accessList = pageAccessDefinitions[role.name];
      if (!accessList) {
        console.log(`No page access defined for role: ${role.name}`);
        continue;
      }

      console.log(`\nInserting page access for ${role.name}:`);
      for (const access of accessList) {
        await db('role_page_access').insert({
          role_id: role.id,
          ...access,
          page_description: `Access to ${access.page_name}`,
          conditions: null,
          created_at: new Date(),
          updated_at: new Date()
        });
        console.log(`  ✓ ${access.page_path}`);
      }
    }

    // Verify the data
    const totalEntries = await db('role_page_access').count('* as count').first();
    console.log(`\n✅ Successfully populated ${totalEntries.count} page access entries`);

    // Check Super Admin specifically
    const superAdminRole = roles.find(r => r.name === 'Super Admin');
    if (superAdminRole) {
      const superAdminPages = await db('role_page_access')
        .where('role_id', superAdminRole.id)
        .where('can_access', true)
        .select('page_path');
      console.log(`\nSuper Admin has access to ${superAdminPages.length} pages`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

populatePageAccess();