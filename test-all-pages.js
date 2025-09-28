const pages = [
  // Static Routes (22 Next.js pages)
  { url: 'http://localhost:3000/', name: 'Home/Dashboard' },
  { url: 'http://localhost:3000/login', name: 'Login page' },
  { url: 'http://localhost:3000/complete-signup', name: 'Complete signup' },
  { url: 'http://localhost:3000/games', name: 'Games page' },
  { url: 'http://localhost:3000/budget', name: 'Budget page' },
  { url: 'http://localhost:3000/financial-budgets', name: 'Financial budgets page' },
  { url: 'http://localhost:3000/financial-dashboard', name: 'Financial dashboard page' },
  { url: 'http://localhost:3000/resources', name: 'Resources listing' },
  { url: 'http://localhost:3000/resources/categories/1/manage', name: 'Category management (test ID: 1)' },
  { url: 'http://localhost:3000/resources/test-doc', name: 'Resource documentation (test slug)' },
  { url: 'http://localhost:3000/theme-demo', name: 'Theme demo' },
  { url: 'http://localhost:3000/demo/ai-assignments', name: 'AI assignments demo' },
  { url: 'http://localhost:3000/admin-permissions', name: 'Admin permissions' },
  { url: 'http://localhost:3000/admin-access-control', name: 'Admin access control' },
  { url: 'http://localhost:3000/admin-roles', name: 'Admin roles' },
  { url: 'http://localhost:3000/admin-security', name: 'Admin security' },
  { url: 'http://localhost:3000/admin-settings', name: 'Admin settings' },
  { url: 'http://localhost:3000/admin-users', name: 'Admin users' },
  { url: 'http://localhost:3000/admin-workflows', name: 'Admin workflows' },
  { url: 'http://localhost:3000/admin/audit-logs', name: 'Audit logs' },
  { url: 'http://localhost:3000/admin/page-access', name: 'Page access management' },
  { url: 'http://localhost:3000/admin/permissions', name: 'Permissions management' },

  // Unified Dashboard Views (via /?view=XXX) - 25 views
  { url: 'http://localhost:3000/?view=dashboard', name: 'Dashboard overview' },
  { url: 'http://localhost:3000/?view=leagues', name: 'League creation/management' },
  { url: 'http://localhost:3000/?view=tournaments', name: 'Tournament generator' },
  { url: 'http://localhost:3000/?view=games', name: 'Games management' },
  { url: 'http://localhost:3000/?view=assigning', name: 'Game assignment board' },
  { url: 'http://localhost:3000/?view=ai-assignments', name: 'AI assignments' },
  { url: 'http://localhost:3000/?view=locations', name: 'Teams & Locations' },
  { url: 'http://localhost:3000/?view=referees', name: 'Referee management' },
  { url: 'http://localhost:3000/?view=calendar', name: 'Calendar view' },
  { url: 'http://localhost:3000/?view=communications', name: 'Communications management' },
  { url: 'http://localhost:3000/?view=resources', name: 'Resource centre' },
  { url: 'http://localhost:3000/?view=assignments', name: 'My assignments (referee)' },
  { url: 'http://localhost:3000/?view=available', name: 'Available games (referee)' },
  { url: 'http://localhost:3000/?view=availability', name: 'My availability (referee)' },
  { url: 'http://localhost:3000/?view=expenses', name: 'My expenses' },
  { url: 'http://localhost:3000/?view=expense-create', name: 'Submit expense' },
  { url: 'http://localhost:3000/?view=profile', name: 'Profile settings' },
  { url: 'http://localhost:3000/?view=organization-settings', name: 'Organization settings' },
  { url: 'http://localhost:3000/?view=admin-access-control', name: 'Access control dashboard' },
  { url: 'http://localhost:3000/?view=financial-dashboard', name: 'Financial dashboard (coming soon)' },
  { url: 'http://localhost:3000/?view=financial-receipts', name: 'Financial receipts (coming soon)' },
  { url: 'http://localhost:3000/?view=financial-budgets', name: 'Financial budgets (coming soon)' },
  { url: 'http://localhost:3000/?view=financial-expenses', name: 'Financial expenses (coming soon)' },
  { url: 'http://localhost:3000/?view=financial-expense-create', name: 'Create financial expense (coming soon)' },
  { url: 'http://localhost:3000/?view=financial-expense-approvals', name: 'Expense approvals (coming soon)' },
  { url: 'http://localhost:3000/?view=financial-reports', name: 'Financial reports (coming soon)' },
];

const loginCredentials = {
  email: 'admin@refassign.com',
  password: 'admin123'
};

console.log('Total pages to test:', pages.length);
console.log('Super Admin credentials:', loginCredentials.email);
console.log('\nAll pages to be tested:');
pages.forEach((page, index) => {
  console.log(`${index + 1}. ${page.name} - ${page.url}`);
});

module.exports = { pages, loginCredentials };