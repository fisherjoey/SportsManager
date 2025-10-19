exports.seed = async function(knex) {
  const bcrypt = require('bcryptjs');
  const saltRounds = 12;

  // Role IDs from the RBAC system
  const ROLE_IDS = {
    'Super Admin': 'cbdeacc1-40b9-4297-9888-cdda640cefe3',
    'Admin': '12df1977-44c0-4787-abae-e2919272ce75', 
    'Assignor': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Referee': 'fb8520e8-7b59-47b8-b5b4-5cc4affc5ee3',
    'Senior Referee': 'sr1234567-89ab-cdef-0123-456789abcdef',
    'Junior Referee': 'jr1234567-89ab-cdef-0123-456789abcdef',
    'Rookie Referee': 'rk1234567-89ab-cdef-0123-456789abcdef'
  };

  // Comprehensive demo users with all fields
  const demoUsers = [
    {
      // Admin user
      first_name: 'Sarah',
      last_name: 'Johnson',
      email: 'admin@cmba.ca',
      password: 'password',
      phone: '+1 (403) 234-5678',
      date_of_birth: '1985-03-15',
      street_address: '123 Admin Avenue',
      city: 'Calgary',
      province_state: 'Alberta',
      postal_zip_code: 'T2P 1A1',
      country: 'Canada',
      availability_status: 'active',
      emergency_contact_name: 'Mike Johnson',
      emergency_contact_phone: '+1 (403) 234-5679',
      admin_notes: 'CMBA System Administrator - Primary contact for all technical issues',
      communication_preferences: {
        email_notifications: true,
        sms_notifications: true,
        preferred_language: 'en',
        communication_method: 'email'
      },
      banking_info: {
        payment_method: 'direct_deposit'
      },
      is_active: true,
      organization_id: '1',
      registration_date: '2020-01-15',
      profile_completion_percentage: 100,
      assignRole: 'Admin'
    },
    {
      // Super Admin user
      first_name: 'Robert',
      last_name: 'Chen',
      email: 'superadmin@refassign.com',
      password: 'password',
      phone: '+1 (403) 567-8901',
      date_of_birth: '1982-07-22',
      street_address: '456 Tech Street',
      city: 'Calgary',
      province_state: 'Alberta',
      postal_zip_code: 'T2N 2B2',
      country: 'Canada',
      availability_status: 'active',
      emergency_contact_name: 'Lisa Chen',
      emergency_contact_phone: '+1 (403) 567-8902',
      admin_notes: 'System Super Administrator - Full system access and configuration',
      communication_preferences: {
        email_notifications: true,
        sms_notifications: false,
        preferred_language: 'en',
        communication_method: 'email'
      },
      banking_info: {
        payment_method: 'e_transfer'
      },
      is_active: true,
      organization_id: '1',
      registration_date: '2019-06-01',
      profile_completion_percentage: 100,
      assignRole: 'Super Admin'
    },
    {
      // Assignor user
      first_name: 'Jennifer',
      last_name: 'Martinez',
      email: 'assignor@cmba.ca',
      password: 'password',
      phone: '+1 (403) 890-1234',
      date_of_birth: '1978-11-08',
      street_address: '789 Assignment Road',
      city: 'Calgary',
      province_state: 'Alberta',
      postal_zip_code: 'T2H 3C3',
      country: 'Canada',
      year_started_refereeing: 2005,
      certifications: ['Level 5 Official', 'Referee Instructor', 'Game Assignor Certification'],
      specializations: ['Senior Games', 'Tournament Management', 'Referee Development'],
      availability_status: 'active',
      emergency_contact_name: 'Carlos Martinez',
      emergency_contact_phone: '+1 (403) 890-1235',
      admin_notes: 'Senior Assignor - Responsible for referee assignments across all divisions',
      communication_preferences: {
        email_notifications: true,
        sms_notifications: true,
        preferred_language: 'en',
        communication_method: 'phone'
      },
      banking_info: {
        account_holder_name: 'Jennifer Martinez',
        account_number: '123456789',
        routing_number: '123456789',
        bank_name: 'Royal Bank of Canada',
        payment_method: 'direct_deposit'
      },
      is_active: true,
      organization_id: '1',
      registration_date: '2020-03-15',
      profile_completion_percentage: 95,
      assignRole: 'Assignor'
    },
    {
      // Senior Referee
      first_name: 'David',
      last_name: 'Thompson',
      email: 'david.thompson@cmba.ca',
      password: 'password',
      phone: '+1 (403) 345-6789',
      date_of_birth: '1975-09-12',
      street_address: '321 Senior Court',
      city: 'Calgary',
      province_state: 'Alberta',
      postal_zip_code: 'T2A 4D4',
      country: 'Canada',
      year_started_refereeing: 2000,
      certifications: ['Level 4 Official', 'Mentor Referee', 'Provincial Certification'],
      specializations: ['Senior Division', 'Playoff Games', 'Referee Mentoring'],
      availability_status: 'active',
      emergency_contact_name: 'Mary Thompson',
      emergency_contact_phone: '+1 (403) 345-6790',
      admin_notes: 'Experienced senior referee with excellent game management skills',
      communication_preferences: {
        email_notifications: true,
        sms_notifications: true,
        preferred_language: 'en',
        communication_method: 'sms'
      },
      banking_info: {
        account_holder_name: 'David Thompson',
        account_number: '987654321',
        routing_number: '987654321',
        bank_name: 'TD Canada Trust',
        payment_method: 'direct_deposit'
      },
      is_available: true,
      is_active: true,
      organization_id: '1',
      registration_date: '2020-02-01',
      profile_completion_percentage: 100,
      assignRole: 'Senior Referee'
    },
    {
      // Junior Referee  
      first_name: 'Amanda',
      last_name: 'Williams',
      email: 'amanda.williams@cmba.ca',
      password: 'password',
      phone: '+1 (403) 456-7890',
      date_of_birth: '1992-04-18',
      street_address: '654 Junior Avenue',
      city: 'Calgary',
      province_state: 'Alberta',
      postal_zip_code: 'T2B 5E5',
      country: 'Canada',
      year_started_refereeing: 2018,
      certifications: ['Level 2 Official', 'Youth Basketball Certification'],
      specializations: ['Junior Division', 'Youth Games', 'Community Basketball'],
      availability_status: 'active',
      emergency_contact_name: 'John Williams',
      emergency_contact_phone: '+1 (403) 456-7891',
      admin_notes: 'Reliable junior referee with strong potential for advancement',
      communication_preferences: {
        email_notifications: true,
        sms_notifications: true,
        preferred_language: 'en',
        communication_method: 'email'
      },
      banking_info: {
        account_holder_name: 'Amanda Williams',
        payment_method: 'e_transfer'
      },
      is_available: true,
      is_active: true,
      organization_id: '1',
      registration_date: '2021-08-15',
      profile_completion_percentage: 85,
      assignRole: 'Junior Referee'
    },
    {
      // Rookie Referee
      first_name: 'Michael',
      last_name: 'Brown',
      email: 'michael.brown@cmba.ca',
      password: 'password',
      phone: '+1 (403) 567-8901',
      date_of_birth: '1998-12-03',
      street_address: '987 Rookie Lane',
      city: 'Calgary',
      province_state: 'Alberta',
      postal_zip_code: 'T2C 6F6',
      country: 'Canada',
      year_started_refereeing: 2023,
      certifications: ['Level 1 Official', 'Basketball Alberta Certification'],
      specializations: ['Rookie Division', 'Elementary Games'],
      availability_status: 'active',
      emergency_contact_name: 'Susan Brown',
      emergency_contact_phone: '+1 (403) 567-8902',
      admin_notes: 'New referee showing great enthusiasm and dedication to learning',
      communication_preferences: {
        email_notifications: true,
        sms_notifications: false,
        preferred_language: 'en',
        communication_method: 'email'
      },
      banking_info: {
        payment_method: 'cash'
      },
      is_available: true,
      is_active: true,
      organization_id: '1',
      registration_date: '2023-09-01',
      profile_completion_percentage: 70,
      assignRole: 'Rookie Referee'
    },
    {
      // French-speaking referee
      first_name: 'Marie',
      last_name: 'Dubois',
      email: 'marie.dubois@cmba.ca',
      password: 'password',
      phone: '+1 (403) 678-9012',
      date_of_birth: '1988-06-25',
      street_address: '147 Francophone Street',
      city: 'Calgary',
      province_state: 'Alberta',
      postal_zip_code: 'T2D 7G7',
      country: 'Canada',
      year_started_refereeing: 2015,
      certifications: ['Level 3 Official', 'Bilingual Referee Certification'],
      specializations: ['Bilingual Games', 'French Immersion League', 'International Rules'],
      availability_status: 'active',
      emergency_contact_name: 'Pierre Dubois',
      emergency_contact_phone: '+1 (403) 678-9013',
      admin_notes: 'Bilingual referee specializing in French-speaking community games',
      communication_preferences: {
        email_notifications: true,
        sms_notifications: true,
        preferred_language: 'fr',
        communication_method: 'phone'
      },
      banking_info: {
        account_holder_name: 'Marie Dubois',
        account_number: '456789123',
        routing_number: '456789123',
        bank_name: 'Banque Nationale',
        payment_method: 'direct_deposit'
      },
      is_available: true,
      is_active: true,
      organization_id: '1',
      registration_date: '2020-11-20',
      profile_completion_percentage: 92,
      assignRole: 'Junior Referee'
    },
    {
      // Referee on break
      first_name: 'James',
      last_name: 'Wilson',
      email: 'james.wilson@cmba.ca',
      password: 'password',
      phone: '+1 (403) 789-0123',
      date_of_birth: '1985-01-30',
      street_address: '258 Break Boulevard',
      city: 'Calgary',
      province_state: 'Alberta',
      postal_zip_code: 'T2E 8H8',
      country: 'Canada',
      year_started_refereeing: 2010,
      certifications: ['Level 3 Official', 'Injury Management Certification'],
      specializations: ['Medical Timeouts', 'Safety Protocols', 'Senior Games'],
      availability_status: 'on_break',
      emergency_contact_name: 'Rachel Wilson',
      emergency_contact_phone: '+1 (403) 789-0124',
      admin_notes: 'Currently on medical leave - expected return in 3 months',
      communication_preferences: {
        email_notifications: false,
        sms_notifications: false,
        preferred_language: 'en',
        communication_method: 'email'
      },
      banking_info: {
        payment_method: 'check'
      },
      is_available: false,
      is_active: true,
      organization_id: '1',
      registration_date: '2020-05-10',
      profile_completion_percentage: 88,
      assignRole: 'Senior Referee'
    },
    {
      // Inactive referee
      first_name: 'Lisa',
      last_name: 'Garcia',
      email: 'lisa.garcia@cmba.ca',
      password: 'password',
      phone: '+1 (403) 890-1234',
      date_of_birth: '1990-10-14',
      street_address: '369 Inactive Street',
      city: 'Calgary',
      province_state: 'Alberta',
      postal_zip_code: 'T2F 9I9',
      country: 'Canada',
      year_started_refereeing: 2019,
      certifications: ['Level 2 Official'],
      specializations: ['Youth Games', 'Community Events'],
      availability_status: 'inactive',
      emergency_contact_name: 'Carlos Garcia',
      emergency_contact_phone: '+1 (403) 890-1235',
      admin_notes: 'Moved out of province - inactive status until further notice',
      communication_preferences: {
        email_notifications: true,
        sms_notifications: false,
        preferred_language: 'es',
        communication_method: 'email'
      },
      banking_info: {
        payment_method: 'e_transfer'
      },
      is_available: false,
      is_active: false,
      organization_id: '1',
      registration_date: '2021-03-22',
      profile_completion_percentage: 75,
      assignRole: 'Junior Referee'
    },
    {
      // High-profile referee with complete information
      first_name: 'Alexander',
      last_name: 'Rodriguez',
      email: 'alex.rodriguez@cmba.ca',
      password: 'password',
      phone: '+1 (403) 901-2345',
      date_of_birth: '1972-08-07',
      street_address: '741 Excellence Drive',
      city: 'Calgary',
      province_state: 'Alberta',
      postal_zip_code: 'T2G 0J0',
      country: 'Canada',
      year_started_refereeing: 1995,
      certifications: [
        'FIBA International Referee',
        'Level 5 Official',
        'Master Referee Instructor',
        'Game Management Specialist',
        'Conflict Resolution Certification'
      ],
      specializations: [
        'Championship Games',
        'Provincial Tournaments',
        'International Competition',
        'Referee Training',
        'Game Management',
        'Conflict Resolution'
      ],
      availability_status: 'active',
      emergency_contact_name: 'Isabella Rodriguez',
      emergency_contact_phone: '+1 (403) 901-2346',
      admin_notes: 'Master referee with 28+ years experience. Primary trainer for new officials. Available for high-profile games and special events.',
      communication_preferences: {
        email_notifications: true,
        sms_notifications: true,
        preferred_language: 'en',
        communication_method: 'phone'
      },
      banking_info: {
        account_holder_name: 'Alexander Rodriguez',
        account_number: '789123456',
        routing_number: '789123456',
        bank_name: 'CIBC',
        payment_method: 'direct_deposit'
      },
      is_available: true,
      is_active: true,
      organization_id: '1',
      registration_date: '2019-12-01',
      profile_completion_percentage: 100,
      assignRole: 'Senior Referee'
    }
  ];

  // Insert comprehensive demo users and assign roles
  for (const userData of demoUsers) {
    const existingUser = await knex('users').where('email', userData.email).first();
    
    if (!existingUser) {
      const { password, assignRole, communication_preferences, banking_info, ...userRecord } = userData;
      
      // Hash password
      userRecord.password_hash = await bcrypt.hash(password, saltRounds);
      
      // Convert JSON fields to strings for database storage
      if (communication_preferences) {
        userRecord.communication_preferences = JSON.stringify(communication_preferences);
      }
      if (banking_info) {
        userRecord.banking_info = JSON.stringify(banking_info);
      }
      if (userRecord.certifications) {
        userRecord.certifications = JSON.stringify(userRecord.certifications);
      }
      if (userRecord.specializations) {
        userRecord.specializations = JSON.stringify(userRecord.specializations);
      }
      
      // Insert user
      const [user] = await knex('users').insert(userRecord).returning('*');
      console.log(`Created comprehensive demo user: ${userData.email}`);
      
      // Assign role to user
      if (assignRole && ROLE_IDS[assignRole]) {
        // Check if role assignment already exists
        const existingRole = await knex('user_roles')
          .where('user_id', user.id)
          .where('role_id', ROLE_IDS[assignRole])
          .first();
          
        if (!existingRole) {
          await knex('user_roles').insert({
            user_id: user.id,
            role_id: ROLE_IDS[assignRole],
            assigned_at: new Date(),
            assigned_by: user.id // Self-assigned during seed
          });
          console.log(`  Assigned ${assignRole} role to ${userData.email}`);
        }
      }
      
      // Create referee profile if it's a referee role
      if (assignRole && assignRole.includes('Referee')) {
        const wageAmounts = {
          'Rookie Referee': 30.00,
          'Junior Referee': 45.00,
          'Senior Referee': 75.00,
          'Referee': 45.00
        };
        
        await knex('referee_profiles').insert({
          user_id: user.id,
          wage_amount: wageAmounts[assignRole] || 45.00,
          years_experience: userData.year_started_refereeing ? new Date().getFullYear() - userData.year_started_refereeing : 1,
          evaluation_score: Math.floor(Math.random() * 20) + 80, // 80-100%
          is_white_whistle: assignRole === 'Rookie Referee' ? Math.random() > 0.5 : false,
          show_white_whistle: assignRole === 'Rookie Referee',
          created_at: new Date(),
          updated_at: new Date()
        });
        console.log(`  Created referee profile for ${userData.email}`);
      }
      
    } else {
      console.log(`Demo user already exists: ${userData.email}`);
      
      // Ensure role is assigned even if user exists
      const assignRole = userData.assignRole;
      if (assignRole && ROLE_IDS[assignRole]) {
        const existingRole = await knex('user_roles')
          .where('user_id', existingUser.id)
          .where('role_id', ROLE_IDS[assignRole])
          .first();
          
        if (!existingRole) {
          await knex('user_roles').insert({
            user_id: existingUser.id,
            role_id: ROLE_IDS[assignRole],
            assigned_at: new Date(),
            assigned_by: existingUser.id
          });
          console.log(`  Assigned ${assignRole} role to existing user ${userData.email}`);
        } else {
          console.log(`  User ${userData.email} already has ${assignRole} role`);
        }
      }
    }
  }
  
  console.log('\n✅ Comprehensive demo users seeded successfully!');
  console.log('Users with complete profiles including:');
  console.log('  - Personal information (name, DOB, address)');
  console.log('  - Contact details (phone, emergency contact)');
  console.log('  - Professional info (experience, certifications, specializations)');
  console.log('  - Communication preferences (language, notifications)');
  console.log('  - Banking information (payment methods, account details)');
  console.log('  - System settings (availability status, admin notes)');
  console.log('\nLogin credentials:');
  demoUsers.forEach(user => {
    console.log(`  - ${user.email} (${user.assignRole}) - password: password`);
  });
};