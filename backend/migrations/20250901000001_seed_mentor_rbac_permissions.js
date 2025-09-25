/**
 * Seed Mentor RBAC Permissions Migration
 * 
 * Creates a dedicated "Mentor" role in the main RBAC system and associated permissions
 * for the mentoring functionality. This complements the existing referee capability
 * "Mentor" role by providing RBAC permissions for mentorship management.
 * 
 * Permissions added:
 * - mentees:read - View assigned mentees
 * - mentees:manage - Manage mentee information
 * - mentee_games:read - View mentee game assignments
 * - mentorship_notes:create - Add notes about mentees
 * - mentorship_notes:read - Read own notes
 * - mentorship_notes:update - Update own notes
 * - mentorship_documents:upload - Upload documents for mentees
 * - mentorship_documents:read - View mentee documents
 */

exports.up = async function(knex) {
  console.log('Seeding mentor RBAC permissions...');

  // Define mentorship permissions
  const mentorshipPermissions = [
    {
      name: 'mentees:read',
      category: 'mentorship',
      description: 'View assigned mentees and their basic information',
      is_system: true
    },
    {
      name: 'mentees:manage',
      category: 'mentorship',
      description: 'Manage mentee information and mentorship relationships',
      is_system: true
    },
    {
      name: 'mentee_games:read',
      category: 'mentorship',
      description: 'View mentee game assignments and performance data',
      is_system: true
    },
    {
      name: 'mentorship_notes:create',
      category: 'mentorship',
      description: 'Create notes about mentee progress and development',
      is_system: true
    },
    {
      name: 'mentorship_notes:read',
      category: 'mentorship',
      description: 'Read mentorship notes (own notes and shared notes)',
      is_system: true
    },
    {
      name: 'mentorship_notes:update',
      category: 'mentorship',
      description: 'Update and edit own mentorship notes',
      is_system: true
    },
    {
      name: 'mentorship_documents:upload',
      category: 'mentorship',
      description: 'Upload documents and resources for mentees',
      is_system: true
    },
    {
      name: 'mentorship_documents:read',
      category: 'mentorship',
      description: 'View and download mentee documents and resources',
      is_system: true
    }
  ];

  // Insert mentorship permissions (with existence check)
  const insertedPermissions = [];
  for (const permission of mentorshipPermissions) {
    // Check if permission already exists
    const existing = await knex('permissions')
      .where('name', permission.name)
      .first();
    
    if (!existing) {
      const [inserted] = await knex('permissions').insert({
        id: knex.raw('gen_random_uuid()'),
        name: permission.name,
        category: permission.category,
        description: permission.description,
        is_system: permission.is_system,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      }).returning('*');
      
      insertedPermissions.push(inserted);
      console.log(`✓ Inserted permission: ${permission.name}`);
    } else {
      insertedPermissions.push(existing);
      console.log(`- Permission already exists: ${permission.name}`);
    }
  }

  // Create a mapping of permission names to IDs
  const permissionMap = insertedPermissions.reduce((map, permission) => {
    map[permission.name] = permission.id;
    return map;
  }, {});

  // Check if Mentorship Coordinator role already exists in the main RBAC system
  let mentorRole = await knex('roles')
    .where('name', 'Mentorship Coordinator')
    .first();

  // Create the main RBAC Mentorship Coordinator role if it doesn't exist
  if (!mentorRole) {
    [mentorRole] = await knex('roles').insert({
      id: knex.raw('gen_random_uuid()'),
      name: 'Mentorship Coordinator',
      description: 'Mentorship coordinator role with permissions to manage mentee relationships, track progress, and share resources. Complements the referee capability Mentor role.',
      category: 'system',
      is_system: true,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }).returning('*');
    
    console.log(`✓ Created Mentorship Coordinator role: ${mentorRole.name}`);
  } else {
    console.log(`- Mentorship Coordinator role already exists: ${mentorRole.name}`);
  }

  // Assign all mentorship permissions to the Mentorship Coordinator role
  const mentorPermissions = Object.keys(permissionMap).map(permissionName => ({
    role_id: mentorRole.id,
    permission_id: permissionMap[permissionName],
    created_at: knex.fn.now(),
    created_by: null // System assignment
  }));

  // Insert role permissions (with existence check)
  for (const rolePermission of mentorPermissions) {
    const existing = await knex('role_permissions')
      .where('role_id', rolePermission.role_id)
      .where('permission_id', rolePermission.permission_id)
      .first();

    if (!existing) {
      await knex('role_permissions').insert({
        id: knex.raw('gen_random_uuid()'),
        ...rolePermission
      });
      console.log(`✓ Assigned permission to Mentorship Coordinator role`);
    } else {
      console.log(`- Permission already assigned to Mentorship Coordinator role`);
    }
  }

  // Also assign some basic permissions that mentors would typically need
  const basicPermissions = [
    'games:read', // View games to understand mentee assignments
    'assignments:read', // View assignments to track mentee progress
    'referees:read', // View referee information for mentee context
    'content:read' // Access training materials and resources
  ];

  for (const permissionName of basicPermissions) {
    // Find the permission
    const permission = await knex('permissions')
      .where('name', permissionName)
      .first();

    if (permission) {
      // Check if already assigned
      const existing = await knex('role_permissions')
        .where('role_id', mentorRole.id)
        .where('permission_id', permission.id)
        .first();

      if (!existing) {
        await knex('role_permissions').insert({
          id: knex.raw('gen_random_uuid()'),
          role_id: mentorRole.id,
          permission_id: permission.id,
          created_at: knex.fn.now(),
          created_by: null
        });
        console.log(`✓ Assigned basic permission to Mentorship Coordinator role: ${permissionName}`);
      }
    }
  }

  console.log('✅ Mentor RBAC permissions seeded successfully');
  console.log('📋 Summary:');
  console.log(`  • ${mentorshipPermissions.length} mentorship permissions added`);
  console.log('  • 1 Mentorship Coordinator role created/updated');
  console.log('  • Basic system permissions assigned to Mentorship Coordinator role');
  console.log('  • All permissions linked to Mentorship Coordinator role');
};

exports.down = async function(knex) {
  console.log('Rolling back mentor RBAC permissions seed...');

  // Remove mentorship permissions
  const mentorshipPermissionNames = [
    'mentees:read',
    'mentees:manage',
    'mentee_games:read',
    'mentorship_notes:create',
    'mentorship_notes:read',
    'mentorship_notes:update',
    'mentorship_documents:upload',
    'mentorship_documents:read'
  ];

  // Find the Mentorship Coordinator role
  const mentorRole = await knex('roles')
    .where('name', 'Mentorship Coordinator')
    .first();

  if (mentorRole) {
    // Remove role permissions for this role
    await knex('role_permissions')
      .where('role_id', mentorRole.id)
      .del();
    console.log('✓ Removed all Mentorship Coordinator role permissions');

    // Remove the Mentorship Coordinator role itself
    await knex('roles')
      .where('id', mentorRole.id)
      .del();
    console.log('✓ Removed Mentorship Coordinator role');
  }

  // Remove mentorship permissions
  const deletedPermissions = await knex('permissions')
    .whereIn('name', mentorshipPermissionNames)
    .del();
  
  console.log(`✓ Removed ${deletedPermissions} mentorship permissions`);
  console.log('✓ Mentor RBAC permissions seed rollback completed');
};