const { HTTP } = require('@cerbos/http');

const cerbos = new HTTP('http://localhost:3592');

async function testSimpleAction() {
  console.log('Test 1: Simple actions (no colons)\n');

  const result1 = await cerbos.checkResource({
    principal: {
      id: 'test-user',
      roles: ['admin'],
      attr: {}
    },
    resource: {
      kind: 'role',
      id: 'test-id',
      attr: {}
    },
    actions: ['create', 'update', 'delete']
  });

  console.log('create:', result1.isAllowed('create'));
  console.log('update:', result1.isAllowed('update'));
  console.log('delete:', result1.isAllowed('delete'));

  console.log('\nTest 2: Game resource (known working)\n');

  const result2 = await cerbos.checkResource({
    principal: {
      id: 'test-user',
      roles: ['admin'],
      attr: {
        organizationId: 'test-org'
      }
    },
    resource: {
      kind: 'game',
      id: 'test-game',
      attr: {
        organizationId: 'test-org'
      }
    },
    actions: ['view', 'list', 'create']
  });

  console.log('view:', result2.isAllowed('view'));
  console.log('list:', result2.isAllowed('list'));
  console.log('create:', result2.isAllowed('create'));
}

testSimpleAction().catch(console.error);