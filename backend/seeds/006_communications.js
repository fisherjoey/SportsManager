/**
 * @fileoverview Communications seed data for testing
 * Seeds sample communications with various types, priorities, and statuses
 */

const { v4: uuidv4 } = require('uuid');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Check if internal_communications table exists
  const hasTable = await knex.schema.hasTable('internal_communications');
  if (!hasTable) {
    console.log('⚠️  internal_communications table does not exist, skipping seed');
    return;
  }

  // Get admin user to use as author
  const adminUser = await knex('users')
    .where('email', 'admin@sportsmanager.com')
    .orWhere('email', 'admin@cmba.ca')
    .first();

  if (!adminUser) {
    console.log('⚠️  No admin user found, skipping communications seed');
    return;
  }

  // Get all users for recipients (using is_available as proxy for active)
  const allUsers = await knex('users').select('id').limit(50);
  const userIds = allUsers.map(u => u.id);

  console.log(`📧 Seeding communications with author: ${adminUser.email}`);
  console.log(`👥 Found ${userIds.length} active users for recipients`);

  // Sample communications
  const communications = [
    {
      id: uuidv4(),
      title: 'Welcome to the 2025 Season!',
      content: `<h2>Welcome Referees!</h2>
<p>We're excited to kick off the 2025 basketball season. This year brings several exciting changes:</p>
<ul>
  <li><strong>New online scheduling system</strong> - Accept and manage your assignments from anywhere</li>
  <li><strong>Updated pay rates</strong> - Competitive compensation for all game levels</li>
  <li><strong>Mobile app improvements</strong> - Check your schedule on the go</li>
</ul>
<p>Please review the updated rulebook and attend one of our pre-season clinics.</p>
<p>Best regards,<br/>The Assignment Team</p>`,
      type: 'announcement',
      priority: 'high',
      author_id: adminUser.id,
      target_audience: JSON.stringify({ all_users: true }),
      status: 'published',
      publish_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      requires_acknowledgment: true,
      tags: JSON.stringify(['season', 'welcome', '2025']),
    },
    {
      id: uuidv4(),
      title: 'Referee Clinic - March 15th',
      content: `<h2>Pre-Season Referee Clinic</h2>
<p>Join us for our annual pre-season clinic!</p>
<p><strong>Date:</strong> Saturday, March 15th, 2025<br/>
<strong>Time:</strong> 9:00 AM - 3:00 PM<br/>
<strong>Location:</strong> Central Community Center, Gym A</p>
<h3>Agenda</h3>
<ol>
  <li>Rule changes for 2025</li>
  <li>Game management techniques</li>
  <li>Positioning and mechanics</li>
  <li>Practical on-court scenarios</li>
</ol>
<p>Lunch will be provided. Please RSVP by March 10th.</p>`,
      type: 'memo',
      priority: 'normal',
      author_id: adminUser.id,
      target_audience: JSON.stringify({ roles: ['referee', 'senior_referee'] }),
      status: 'published',
      publish_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      requires_acknowledgment: false,
      tags: JSON.stringify(['training', 'clinic', 'education']),
    },
    {
      id: uuidv4(),
      title: 'URGENT: Weather Advisory - Games Postponed',
      content: `<h2>⚠️ Weather Alert</h2>
<p><strong>All games scheduled for tonight (Saturday) have been POSTPONED due to severe weather conditions.</strong></p>
<p>The following facilities are affected:</p>
<ul>
  <li>Central Community Center</li>
  <li>Westside Recreation Complex</li>
  <li>Northgate Sports Arena</li>
</ul>
<p>Rescheduled dates will be announced within 48 hours. Please check the app for updates.</p>
<p><strong>Stay safe!</strong></p>`,
      type: 'emergency',
      priority: 'urgent',
      author_id: adminUser.id,
      target_audience: JSON.stringify({ all_users: true }),
      status: 'published',
      publish_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      requires_acknowledgment: true,
      tags: JSON.stringify(['weather', 'emergency', 'postponed']),
    },
    {
      id: uuidv4(),
      title: 'Updated Pay Scale Effective April 1st',
      content: `<h2>Pay Rate Update</h2>
<p>We're pleased to announce updated pay rates effective April 1st, 2025:</p>
<table>
  <tr><th>Game Level</th><th>Previous Rate</th><th>New Rate</th></tr>
  <tr><td>U10</td><td>$25</td><td>$28</td></tr>
  <tr><td>U12</td><td>$30</td><td>$33</td></tr>
  <tr><td>U14</td><td>$35</td><td>$38</td></tr>
  <tr><td>U16</td><td>$40</td><td>$45</td></tr>
  <tr><td>U18</td><td>$45</td><td>$50</td></tr>
  <tr><td>Adult</td><td>$55</td><td>$60</td></tr>
</table>
<p>Mileage reimbursement remains at $0.58/km for distances over 30km.</p>`,
      type: 'policy_update',
      priority: 'high',
      author_id: adminUser.id,
      target_audience: JSON.stringify({ all_users: true }),
      status: 'published',
      publish_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      requires_acknowledgment: true,
      tags: JSON.stringify(['pay', 'policy', 'update']),
    },
    {
      id: uuidv4(),
      title: 'Monthly Newsletter - February 2025',
      content: `<h2>February Newsletter</h2>
<h3>Referee of the Month</h3>
<p>Congratulations to <strong>Sarah Johnson</strong> for being selected as February's Referee of the Month! Sarah has consistently received excellent feedback and has been a great mentor to new officials.</p>
<h3>Upcoming Events</h3>
<ul>
  <li>March 15: Pre-season clinic</li>
  <li>March 22: Season opener</li>
  <li>April 5: Tournament weekend</li>
</ul>
<h3>Tips Corner</h3>
<p>Remember to arrive at least 15 minutes before game time to check the court and meet with coaches.</p>`,
      type: 'newsletter',
      priority: 'low',
      author_id: adminUser.id,
      target_audience: JSON.stringify({ all_users: true }),
      status: 'published',
      publish_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      requires_acknowledgment: false,
      tags: JSON.stringify(['newsletter', 'monthly', 'february']),
    },
    {
      id: uuidv4(),
      title: 'Draft: End of Season Survey',
      content: `<h2>Season Feedback Survey</h2>
<p>As we approach the end of the season, we'd like to hear your feedback.</p>
<p>Please take a few minutes to complete our survey covering:</p>
<ul>
  <li>Assignment process satisfaction</li>
  <li>Communication effectiveness</li>
  <li>Training and development</li>
  <li>Suggestions for improvement</li>
</ul>
<p>[Survey link will be added before publishing]</p>`,
      type: 'memo',
      priority: 'normal',
      author_id: adminUser.id,
      target_audience: JSON.stringify({ all_users: true }),
      status: 'draft',
      publish_date: null,
      requires_acknowledgment: false,
      tags: JSON.stringify(['survey', 'feedback', 'draft']),
    },
    {
      id: uuidv4(),
      title: 'Archived: 2024 Season Wrap-up',
      content: `<h2>Thank You for a Great 2024 Season!</h2>
<p>The 2024 season has officially concluded. Thank you to all referees for your dedication and hard work.</p>
<p><strong>Season Statistics:</strong></p>
<ul>
  <li>1,247 games officiated</li>
  <li>156 active referees</li>
  <li>98.5% game coverage rate</li>
</ul>
<p>See you next season!</p>`,
      type: 'announcement',
      priority: 'low',
      author_id: adminUser.id,
      target_audience: JSON.stringify({ all_users: true }),
      status: 'archived',
      publish_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      requires_acknowledgment: false,
      tags: JSON.stringify(['archive', '2024', 'wrap-up']),
    },
  ];

  // Insert communications
  for (const comm of communications) {
    const existing = await knex('internal_communications').where('title', comm.title).first();
    if (!existing) {
      await knex('internal_communications').insert({
        ...comm,
        created_at: comm.publish_date || new Date(),
        updated_at: new Date(),
      });
      console.log(`  ✅ Created: "${comm.title}" (${comm.status})`);

      // Add recipients for published communications
      if (comm.status === 'published' && userIds.length > 0) {
        const recipients = userIds.map(userId => ({
          id: uuidv4(),
          communication_id: comm.id,
          recipient_id: userId,
          delivery_method: 'app',
          delivery_status: Math.random() > 0.3 ? 'read' : 'delivered', // 70% read rate
          sent_at: comm.publish_date,
          read_at: Math.random() > 0.3 ? new Date() : null,
          acknowledged_at: comm.requires_acknowledgment && Math.random() > 0.5 ? new Date() : null,
        }));

        await knex('communication_recipients').insert(recipients).onConflict(['communication_id', 'recipient_id']).ignore();
        console.log(`    📨 Added ${recipients.length} recipients`);
      }
    } else {
      console.log(`  ⏭️  Skipped (exists): "${comm.title}"`);
    }
  }

  console.log('✅ Communications seed complete!');
};
