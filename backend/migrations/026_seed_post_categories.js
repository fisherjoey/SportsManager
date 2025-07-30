/**
 * Migration: Seed Default Post Categories
 * Creates default categories for posts
 */

exports.up = function(knex) {
  return knex('post_categories').insert([
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Announcements',
      slug: 'announcements',
      description: 'General announcements and updates',
      icon: 'Megaphone',
      color: '#3b82f6',
      sort_order: 1,
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Rules & Regulations',
      slug: 'rules-regulations',
      description: 'Rule changes and regulatory updates',
      icon: 'BookOpen',
      color: '#dc2626',
      sort_order: 2,
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Events',
      slug: 'events',
      description: 'Upcoming events and activities',
      icon: 'Calendar',
      color: '#059669',
      sort_order: 3,
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Training',
      slug: 'training',
      description: 'Training opportunities and resources',
      icon: 'GraduationCap',
      color: '#7c3aed',
      sort_order: 4,
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Schedule Changes',
      slug: 'schedule-changes',
      description: 'Game schedule updates and changes',
      icon: 'Clock',
      color: '#ea580c',
      sort_order: 5,
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'General',
      slug: 'general',
      description: 'General posts and information',
      icon: 'Info',
      color: '#6b7280',
      sort_order: 6,
      is_active: true
    }
  ]);
};

exports.down = function(knex) {
  return knex('post_categories').del();
};