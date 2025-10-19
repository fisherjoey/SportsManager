/**
 * Seed 002: Roles and RBAC
 * Creates roles with proper schema fields
 */

const { v4: uuidv4 } = require('uuid');

exports.seed = async function(knex) {
  console.log('👥 Seeding roles and RBAC configuration...\n');

  const roles = [
    {
      name: 'Super Admin',
      code: 'super_admin',
      description: 'Full system access - can manage everything',
      is_active: true,
      is_system: true,
      category: 'admin',
      color: '#dc2626'
    },
    {
      name: 'Admin',
      code: 'admin',
      description: 'Administrative access - can manage users, games, and assignments',
      is_active: true,
      is_system: true,
      category: 'admin',
      color: '#ea580c'
    },
    {
      name: 'Assignor',
      code: 'assignor',
      description: 'Can create games and assign referees',
      is_active: true,
      is_system: true,
      category: 'assignor',
      color: '#0891b2',
      referee_config: {
        can_assign: true,
        can_view_wages: true,
        can_view_all_refs: true
      }
    },
    {
      name: 'Regional Assignor',
      code: 'regional_assignor',
      description: 'Can assign referees within their region only',
      is_active: true,
      is_system: false,
      category: 'assignor',
      color: '#06b6d4',
      referee_config: {
        can_assign: true,
        can_view_wages: false,
        can_view_all_refs: false,
        region_scoped: true
      }
    },
    {
      name: 'Referee Coordinator',
      code: 'referee_coordinator',
      description: 'Manages referee development and evaluations',
      is_active: true,
      is_system: false,
      category: 'coordinator',
      color: '#7c3aed'
    },
    {
      name: 'Referee',
      code: 'referee',
      description: 'Standard referee - can view and accept assignments',
      is_active: true,
      is_system: true,
      category: 'referee',
      color: '#059669',
      referee_config: {
        can_self_assign: false,
        can_view_wages: true,
        can_update_availability: true
      }
    },
    {
      name: 'Senior Referee',
      code: 'senior_referee',
      description: 'Experienced referee - can mentor and evaluate',
      is_active: true,
      is_system: false,
      category: 'referee',
      color: '#10b981',
      referee_config: {
        can_self_assign: false,
        can_view_wages: true,
        can_update_availability: true,
        can_mentor: true,
        can_evaluate: true
      }
    },
    {
      name: 'Finance Manager',
      code: 'finance_manager',
      description: 'Manages payments and financial reporting',
      is_active: true,
      is_system: false,
      category: 'finance',
      color: '#eab308'
    },
    {
      name: 'Observer',
      code: 'observer',
      description: 'Read-only access for viewing games and reports',
      is_active: true,
      is_system: false,
      category: 'observer',
      color: '#64748b'
    }
  ];

  const createdRoles = [];

  for (const role of roles) {
    const [createdRole] = await knex('roles')
      .insert({
        id: uuidv4(),
        name: role.name,
        code: role.code,
        description: role.description,
        is_active: role.is_active,
        is_system: role.is_system,
        category: role.category,
        color: role.color,
        referee_config: role.referee_config || null,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    createdRoles.push(createdRole);
    console.log(`  ✓ Created role: ${createdRole.name} (${createdRole.category})`);
  }

  console.log(`\n✅ Created ${createdRoles.length} roles\n`);

  // Store role IDs for use in other seeds
  global.roles = createdRoles.reduce((acc, role) => {
    acc[role.name] = role;
    return acc;
  }, {});
};
