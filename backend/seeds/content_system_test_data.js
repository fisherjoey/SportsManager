/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Clean existing content data
  await knex('content_analytics_monthly').del();
  await knex('content_analytics').del();
  await knex('content_permissions').del();
  await knex('content_search_index').del();
  await knex('content_item_tags').del();
  await knex('content_tags').del();
  await knex('content_attachments').del();
  await knex('content_versions').del();
  await knex('content_items').del();
  await knex('content_categories').del();

  // Insert test categories
  await knex('content_categories').insert([
    {
      id: 1,
      name: 'Training Materials',
      slug: 'training-materials',
      description: 'Training and educational content for referees',
      color: '#3b82f6',
      icon: 'book'
    },
    {
      id: 2,
      name: 'Procedures',
      slug: 'procedures',
      description: 'Standard operating procedures and guidelines',
      color: '#10b981',
      icon: 'clipboard'
    },
    {
      id: 3,
      name: 'Member Services',
      slug: 'member-services',
      description: 'Services and resources for members',
      color: '#8b5cf6',
      icon: 'users'
    }
  ]);

  // Insert test content items (using a default admin user UUID)
  const adminUserId = '550e8400-e29b-41d4-a716-446655440000';
  
  await knex('content_items').insert([
    {
      id: 1,
      title: 'Referee Training Manual',
      slug: 'referee-training-manual',
      description: 'Complete training guide for new basketball referees',
      content: '<h1>Basketball Referee Training</h1><p>This comprehensive manual covers all aspects of <strong>basketball officiating</strong>.</p><h2>Basic Rules</h2><p>Understanding the fundamental rules is essential for all referees.</p>',
      content_plain: 'Basketball Referee Training This comprehensive manual covers all aspects of basketball officiating. Basic Rules Understanding the fundamental rules is essential for all referees.',
      type: 'document',
      status: 'published',
      visibility: 'public',
      category_id: 1,
      author_id: adminUserId,
      search_keywords: JSON.stringify(['basketball', 'referee', 'training', 'manual']),
      published_at: knex.fn.now()
    },
    {
      id: 2,
      title: 'Game Day Procedures',
      slug: 'game-day-procedures',
      description: 'Step-by-step procedures for game day operations',
      content: '<h1>Game Day Checklist</h1><p>Follow these procedures for smooth game operations:</p><ul><li>Arrive 30 minutes early</li><li>Check equipment</li><li>Meet with coaches</li></ul>',
      content_plain: 'Game Day Checklist Follow these procedures for smooth game operations: Arrive 30 minutes early Check equipment Meet with coaches',
      type: 'document',
      status: 'draft',
      visibility: 'public',
      category_id: 2,
      author_id: adminUserId,
      search_keywords: JSON.stringify(['game', 'procedures', 'checklist'])
    }
  ]);

  // Insert test tags
  await knex('content_tags').insert([
    {
      id: 1,
      name: 'Basketball',
      slug: 'basketball',
      color: '#f59e0b',
      usage_count: 1
    },
    {
      id: 2,
      name: 'Training',
      slug: 'training',
      color: '#ef4444',
      usage_count: 1
    }
  ]);

  // Link content to tags
  await knex('content_item_tags').insert([
    { content_item_id: 1, tag_id: 1 },
    { content_item_id: 1, tag_id: 2 }
  ]);
};