/**
 * Resource Centre Seed - Creates initial categories and sample resources
 */

exports.seed = async function(knex) {
  console.log('Seeding resource centre data...');
  
  // Clear existing data
  await knex('resource_access_logs').del();
  await knex('resources').del();
  await knex('resource_categories').del();
  
  // Create categories
  const categories = await knex('resource_categories').insert([
    {
      name: 'Referee Guides',
      slug: 'referee-guides',
      description: 'Official referee handbooks, rule guides, and best practices',
      icon: 'book',
      order_index: 1,
      is_active: true
    },
    {
      name: 'Training Materials',
      slug: 'training-materials',
      description: 'Training videos, presentations, and educational resources',
      icon: 'graduation-cap',
      order_index: 2,
      is_active: true
    },
    {
      name: 'Forms & Documents',
      slug: 'forms-documents',
      description: 'Official forms, templates, and administrative documents',
      icon: 'file-text',
      order_index: 3,
      is_active: true
    },
    {
      name: 'Rule Updates',
      slug: 'rule-updates',
      description: 'Latest rule changes, interpretations, and clarifications',
      icon: 'alert-circle',
      order_index: 4,
      is_active: true
    },
    {
      name: 'Game Reports',
      slug: 'game-reports',
      description: 'Templates and guides for game reporting and documentation',
      icon: 'clipboard',
      order_index: 5,
      is_active: true
    },
    {
      name: 'Safety & Health',
      slug: 'safety-health',
      description: 'Safety protocols, health guidelines, and emergency procedures',
      icon: 'shield',
      order_index: 6,
      is_active: true
    }
  ]).returning('*');
  
  console.log(`Created ${categories.length} resource categories`);
  
  // Get admin user for created_by field
  const adminUser = await knex('users')
    .where('role', 'admin')
    .first();
  
  if (!adminUser) {
    console.log('No admin user found, skipping resource creation');
    return;
  }
  
  // Create sample resources
  const resources = [];
  
  // Referee Guides
  const refereeGuidesCategory = categories.find(c => c.slug === 'referee-guides');
  resources.push(
    {
      category_id: refereeGuidesCategory.id,
      title: 'Official Basketball Referee Handbook 2024-25',
      description: 'Complete guide for basketball referees including rules, mechanics, and best practices',
      type: 'document',
      external_url: 'https://example.com/referee-handbook.pdf',
      metadata: {
        tags: ['handbook', 'rules', 'basketball'],
        pages: 156,
        year: 2024,
        author: 'Basketball Canada'
      },
      is_featured: true,
      is_active: true,
      created_by: adminUser.id,
      updated_by: adminUser.id
    },
    {
      category_id: refereeGuidesCategory.id,
      title: 'Two-Person Mechanics Guide',
      description: 'Detailed guide on two-person officiating mechanics and positioning',
      type: 'document',
      external_url: 'https://example.com/two-person-mechanics.pdf',
      metadata: {
        tags: ['mechanics', 'positioning', 'two-person'],
        pages: 48,
        year: 2024
      },
      is_featured: false,
      is_active: true,
      created_by: adminUser.id,
      updated_by: adminUser.id
    },
    {
      category_id: refereeGuidesCategory.id,
      title: 'Three-Person Mechanics Guide',
      description: 'Comprehensive three-person officiating system for advanced games',
      type: 'document',
      external_url: 'https://example.com/three-person-mechanics.pdf',
      metadata: {
        tags: ['mechanics', 'positioning', 'three-person'],
        pages: 62,
        year: 2024
      },
      is_featured: false,
      is_active: true,
      created_by: adminUser.id,
      updated_by: adminUser.id
    }
  );
  
  // Training Materials
  const trainingCategory = categories.find(c => c.slug === 'training-materials');
  resources.push(
    {
      category_id: trainingCategory.id,
      title: 'Rookie Referee Training Video Series',
      description: 'Complete video training series for new referees',
      type: 'video',
      external_url: 'https://example.com/rookie-training',
      metadata: {
        tags: ['training', 'rookie', 'video'],
        duration: '4 hours',
        modules: 12
      },
      is_featured: true,
      is_active: true,
      created_by: adminUser.id,
      updated_by: adminUser.id
    },
    {
      category_id: trainingCategory.id,
      title: 'Advanced Officiating Techniques',
      description: 'Advanced training for senior referees',
      type: 'video',
      external_url: 'https://example.com/advanced-techniques',
      metadata: {
        tags: ['training', 'advanced', 'senior'],
        duration: '2.5 hours',
        level: 'Senior'
      },
      is_featured: false,
      is_active: true,
      created_by: adminUser.id,
      updated_by: adminUser.id
    },
    {
      category_id: trainingCategory.id,
      title: 'Game Management Presentation',
      description: 'PowerPoint presentation on effective game management',
      type: 'document',
      external_url: 'https://example.com/game-management.pptx',
      metadata: {
        tags: ['game-management', 'presentation'],
        slides: 45
      },
      is_featured: false,
      is_active: true,
      created_by: adminUser.id,
      updated_by: adminUser.id
    }
  );
  
  // Forms & Documents
  const formsCategory = categories.find(c => c.slug === 'forms-documents');
  resources.push(
    {
      category_id: formsCategory.id,
      title: 'Game Report Template',
      description: 'Standard template for submitting game reports',
      type: 'document',
      external_url: 'https://example.com/game-report-template.docx',
      metadata: {
        tags: ['template', 'game-report', 'form'],
        format: 'Word Document'
      },
      is_featured: false,
      is_active: true,
      created_by: adminUser.id,
      updated_by: adminUser.id
    },
    {
      category_id: formsCategory.id,
      title: 'Incident Report Form',
      description: 'Form for reporting game incidents and ejections',
      type: 'document',
      external_url: 'https://example.com/incident-report.pdf',
      metadata: {
        tags: ['incident', 'report', 'form'],
        format: 'PDF'
      },
      is_featured: false,
      is_active: true,
      created_by: adminUser.id,
      updated_by: adminUser.id
    },
    {
      category_id: formsCategory.id,
      title: 'Expense Claim Form',
      description: 'Form for submitting referee expense claims',
      type: 'document',
      external_url: 'https://example.com/expense-claim.xlsx',
      metadata: {
        tags: ['expense', 'claim', 'form'],
        format: 'Excel'
      },
      is_featured: false,
      is_active: true,
      created_by: adminUser.id,
      updated_by: adminUser.id
    }
  );
  
  // Rule Updates
  const rulesCategory = categories.find(c => c.slug === 'rule-updates');
  resources.push(
    {
      category_id: rulesCategory.id,
      title: '2024-25 Rule Changes Summary',
      description: 'Summary of all rule changes for the 2024-25 season',
      type: 'document',
      external_url: 'https://example.com/rule-changes-2024.pdf',
      metadata: {
        tags: ['rules', 'changes', '2024-25'],
        pages: 12,
        effectiveDate: '2024-09-01'
      },
      is_featured: true,
      is_active: true,
      created_by: adminUser.id,
      updated_by: adminUser.id
    },
    {
      category_id: rulesCategory.id,
      title: 'Points of Emphasis 2024-25',
      description: 'Key points of emphasis for referees this season',
      type: 'document',
      external_url: 'https://example.com/points-emphasis.pdf',
      metadata: {
        tags: ['emphasis', 'rules', 'guidelines'],
        pages: 8
      },
      is_featured: false,
      is_active: true,
      created_by: adminUser.id,
      updated_by: adminUser.id
    }
  );
  
  // Safety & Health
  const safetyCategory = categories.find(c => c.slug === 'safety-health');
  resources.push(
    {
      category_id: safetyCategory.id,
      title: 'COVID-19 Safety Protocols',
      description: 'Updated safety protocols for referees during games',
      type: 'document',
      external_url: 'https://example.com/covid-protocols.pdf',
      metadata: {
        tags: ['safety', 'covid-19', 'health'],
        pages: 15,
        lastUpdated: '2024-08-15'
      },
      is_featured: false,
      is_active: true,
      created_by: adminUser.id,
      updated_by: adminUser.id
    },
    {
      category_id: safetyCategory.id,
      title: 'Concussion Recognition Guide',
      description: 'Guide for recognizing and responding to concussion incidents',
      type: 'document',
      external_url: 'https://example.com/concussion-guide.pdf',
      metadata: {
        tags: ['safety', 'concussion', 'medical'],
        pages: 20
      },
      is_featured: true,
      is_active: true,
      created_by: adminUser.id,
      updated_by: adminUser.id
    },
    {
      category_id: safetyCategory.id,
      title: 'Emergency Procedures',
      description: 'Emergency response procedures for various situations',
      type: 'document',
      external_url: 'https://example.com/emergency-procedures.pdf',
      metadata: {
        tags: ['emergency', 'safety', 'procedures'],
        pages: 18
      },
      is_featured: false,
      is_active: true,
      created_by: adminUser.id,
      updated_by: adminUser.id
    }
  );
  
  // Insert resources
  await knex('resources').insert(resources);
  
  const totalResources = await knex('resources').count('* as count');
  console.log(`✅ Successfully seeded ${totalResources[0].count} resources across ${categories.length} categories`);
};