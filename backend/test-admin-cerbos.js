const { HTTP } = require('@cerbos/http');

const cerbos = new HTTP('http://localhost:3592');

async function testAdminAccess() {
  console.log('Testing admin access to role resource...\n');

  console.log('Test 1: With organizationId matching');
  const result = await cerbos.checkResource({
    principal: {
      id: '3b5b94f3-a700-4c59-a297-5dcb543d372d',
      roles: ['admin'],
      attr: {
        organizationId: 'test-org',
        regionIds: ['test-region'],
        permissions: [],
        email: 'admin@refassign.com',
        isActive: true
      }
    },
    resource: {
      kind: 'role',
      id: 'test-role-id',
      attr: {
        organizationId: 'test-org'
      }
    },
    actions: ['view:list', 'view:details', 'create', 'update', 'delete', 'manage_permissions', 'manage_users']
  });

  console.log('Results:');
  console.log('  view:list:', result.isAllowed('view:list'));
  console.log('  create:', result.isAllowed('create'));

  console.log('\nTest 2: Without resource attr');
  const result2 = await cerbos.checkResource({
    principal: {
      id: '3b5b94f3-a700-4c59-a297-5dcb543d372d',
      roles: ['admin'],
      attr: {
        organizationId: 'test-org',
        regionIds: ['test-region'],
        permissions: [],
        email: 'admin@refassign.com',
        isActive: true
      }
    },
    resource: {
      kind: 'role',
      id: 'test-role-id',
      attr: {}
    },
    actions: ['view:list', 'create']
  });

  console.log('Action Results:');
  console.log('  view:list:', result.isAllowed('view:list'));
  console.log('  view:details:', result.isAllowed('view:details'));
  console.log('  create:', result.isAllowed('create'));
  console.log('  update:', result.isAllowed('update'));
  console.log('  delete:', result.isAllowed('delete'));
  console.log('  manage_permissions:', result.isAllowed('manage_permissions'));
  console.log('  manage_users:', result.isAllowed('manage_users'));
}

testAdminAccess().catch(console.error);