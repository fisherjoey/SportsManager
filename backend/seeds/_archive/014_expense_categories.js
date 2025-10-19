/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Get the organization ID (assuming first user is the organization)
  const organization = await knex('users').where('role', 'admin').first();
  
  if (!organization) {
    console.log('No organization found, skipping expense categories seed');
    return;
  }

  // Delete all existing entries
  await knex('expense_categories').del();

  // Insert default expense categories
  const categories = [
    {
      id: knex.raw('gen_random_uuid()'),
      organization_id: organization.id,
      name: 'Travel & Transportation',
      code: 'TRAVEL',
      description: 'Travel expenses including mileage, gas, parking, and public transportation',
      color_code: '#3B82F6',
      icon: 'car',
      keywords: JSON.stringify(['gas', 'fuel', 'parking', 'uber', 'lyft', 'taxi', 'bus', 'train', 'mileage', 'travel']),
      vendor_patterns: JSON.stringify(['shell', 'exxon', 'chevron', 'bp', 'uber', 'lyft', 'parking']),
      amount_ranges: JSON.stringify({ min: 5, max: 500 }),
      requires_approval: false,
      approval_threshold: 100.00
    },
    {
      id: knex.raw('gen_random_uuid()'),
      organization_id: organization.id,
      name: 'Meals & Entertainment',
      code: 'MEALS',
      description: 'Business meals, client entertainment, and food expenses',
      color_code: '#EF4444',
      icon: 'utensils',
      keywords: JSON.stringify(['restaurant', 'food', 'meal', 'lunch', 'dinner', 'coffee', 'catering', 'entertainment']),
      vendor_patterns: JSON.stringify(['restaurant', 'cafe', 'starbucks', 'mcdonalds', 'subway', 'pizza']),
      amount_ranges: JSON.stringify({ min: 5, max: 200 }),
      requires_approval: true,
      approval_threshold: 50.00
    },
    {
      id: knex.raw('gen_random_uuid()'),
      organization_id: organization.id,  
      name: 'Equipment & Supplies',
      code: 'EQUIPMENT',
      description: 'Office supplies, equipment, and referee gear',
      color_code: '#10B981',
      icon: 'shopping-bag',
      keywords: JSON.stringify(['supplies', 'equipment', 'gear', 'uniform', 'whistle', 'cards', 'flags', 'office']),
      vendor_patterns: JSON.stringify(['office depot', 'staples', 'amazon', 'walmart', 'target', 'best buy']),
      amount_ranges: JSON.stringify({ min: 10, max: 1000 }),
      requires_approval: true,
      approval_threshold: 200.00
    },
    {
      id: knex.raw('gen_random_uuid()'),
      organization_id: organization.id,
      name: 'Professional Development',
      code: 'TRAINING',
      description: 'Training, certification, and professional development expenses',
      color_code: '#8B5CF6',
      icon: 'academic-cap',
      keywords: JSON.stringify(['training', 'certification', 'course', 'seminar', 'workshop', 'conference', 'education']),
      vendor_patterns: JSON.stringify(['training', 'academy', 'institute', 'university', 'college']),
      amount_ranges: JSON.stringify({ min: 25, max: 2000 }),
      requires_approval: true,
      approval_threshold: 100.00
    },
    {
      id: knex.raw('gen_random_uuid()'),
      organization_id: organization.id,
      name: 'Communications',
      code: 'COMM',
      description: 'Phone, internet, and communication expenses',
      color_code: '#F59E0B',
      icon: 'phone',
      keywords: JSON.stringify(['phone', 'internet', 'cellular', 'communication', 'wireless', 'data']),
      vendor_patterns: JSON.stringify(['verizon', 'att', 'tmobile', 'sprint', 'comcast', 'xfinity']),
      amount_ranges: JSON.stringify({ min: 10, max: 300 }),
      requires_approval: false,
      approval_threshold: 150.00
    },
    {
      id: knex.raw('gen_random_uuid()'),
      organization_id: organization.id,
      name: 'Accommodation',
      code: 'LODGING',
      description: 'Hotel and lodging expenses for travel',
      color_code: '#6366F1',
      icon: 'home',
      keywords: JSON.stringify(['hotel', 'motel', 'lodging', 'accommodation', 'airbnb', 'booking']),
      vendor_patterns: JSON.stringify(['hotel', 'motel', 'inn', 'lodge', 'airbnb', 'booking.com']),
      amount_ranges: JSON.stringify({ min: 50, max: 500 }),
      requires_approval: true,
      approval_threshold: 200.00
    },
    {
      id: knex.raw('gen_random_uuid()'),
      organization_id: organization.id,
      name: 'Medical & Health',
      code: 'MEDICAL',
      description: 'Medical expenses and health-related costs',
      color_code: '#DC2626',
      icon: 'heart',
      keywords: JSON.stringify(['medical', 'doctor', 'pharmacy', 'health', 'clinic', 'hospital', 'medicine']),
      vendor_patterns: JSON.stringify(['cvs', 'walgreens', 'clinic', 'medical', 'health', 'pharmacy']),
      amount_ranges: JSON.stringify({ min: 5, max: 1000 }),
      requires_approval: true,
      approval_threshold: 100.00
    },
    {
      id: knex.raw('gen_random_uuid()'),
      organization_id: organization.id,
      name: 'Other Expenses',
      code: 'OTHER',
      description: 'Miscellaneous business expenses not covered by other categories',
      color_code: '#6B7280',
      icon: 'document',
      keywords: JSON.stringify(['other', 'miscellaneous', 'misc', 'various']),
      vendor_patterns: JSON.stringify([]),
      amount_ranges: JSON.stringify({ min: 1, max: 10000 }),
      requires_approval: true,
      approval_threshold: 50.00
    }
  ];

  await knex('expense_categories').insert(categories);
  console.log('Expense categories seeded successfully');
};