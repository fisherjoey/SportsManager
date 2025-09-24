/**
 * Integration Tests for Complete Content Management Workflow
 * 
 * These tests will FAIL initially (Red Phase) - this is expected in TDD!
 * We'll implement the full system to make them pass.
 */

describe('Content Management Integration Workflow', () => {
  let db;
  let testServer;
  let authToken;

  beforeAll(async () => {
    // Setup test database and server
    db = await require('../../lib/content-db');
    testServer = await require('../../lib/test-server');
    
    // Get auth token for admin user
    const authResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'testpassword'
      })
    });
    const authData = await authResponse.json();
    authToken = authData.token;
  });

  afterAll(async () => {
    await db.destroy();
    await testServer.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await db('content_attachments').del();
    await db('content_versions').del();
    await db('content_items').del();
    await db('content_categories').del();
    
    // Seed test categories
    await db('content_categories').insert([
      { id: 1, name: 'Training Materials', slug: 'training-materials' },
      { id: 2, name: 'Procedures', slug: 'procedures' }
    ]);
  });

  describe('Complete Content Creation Workflow', () => {
    test('should create content with attachments and search indexing', async () => {
      // Step 1: Create content item
      const contentResponse = await fetch('http://localhost:3001/api/content/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: 'Advanced Referee Training',
          content: '<h1>Training Overview</h1><p>This comprehensive guide covers <strong>advanced techniques</strong> for basketball referees.</p>',
          description: 'Complete training manual for advanced referees',
          category_id: 1,
          type: 'document',
          status: 'published',
          visibility: 'public',
          search_keywords: ['referee', 'training', 'basketball', 'advanced']
        })
      });

      expect(contentResponse.status).toBe(201);
      const content = await contentResponse.json();
      
      expect(content).toMatchObject({
        id: expect.any(Number),
        title: 'Advanced Referee Training',
        slug: 'advanced-referee-training',
        content_plain: expect.stringContaining('Training Overview'),
        status: 'published'
      });

      // Step 2: Upload image attachment
      const formData = new FormData();
      const imageBuffer = Buffer.from('fake-image-data');
      formData.append('file', new Blob([imageBuffer], { type: 'image/png' }), 'training-diagram.png');
      formData.append('content_item_id', content.id.toString());
      formData.append('is_embedded', 'true');
      formData.append('alt_text', 'Training diagram showing referee positions');

      const uploadResponse = await fetch('http://localhost:3001/api/content/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      expect(uploadResponse.status).toBe(200);
      const attachment = await uploadResponse.json();
      
      expect(attachment).toMatchObject({
        file_name: 'training-diagram.png',
        attachment_type: 'image',
        is_embedded: true,
        alt_text: 'Training diagram showing referee positions'
      });

      // Step 3: Verify content can be retrieved with attachments
      const getResponse = await fetch(`http://localhost:3001/api/content/items/${content.id}`);
      expect(getResponse.status).toBe(200);
      
      const fullContent = await getResponse.json();
      expect(fullContent.attachments).toHaveLength(1);
      expect(fullContent.attachments[0].file_name).toBe('training-diagram.png');

      // Step 4: Verify content appears in search
      const searchResponse = await fetch('http://localhost:3001/api/content/search?q=referee training');
      expect(searchResponse.status).toBe(200);
      
      const searchResults = await searchResponse.json();
      expect(searchResults.results).toHaveLength(1);
      expect(searchResults.results[0].title).toBe('Advanced Referee Training');
      expect(searchResults.results[0].rank).toBeGreaterThan(0);

      // Step 5: Update content and verify versioning
      const updateResponse = await fetch(`http://localhost:3001/api/content/items/${content.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: 'Advanced Referee Training - Updated',
          content: '<h1>Updated Training Overview</h1><p>This guide has been <strong>updated</strong> with new techniques.</p>'
        })
      });

      expect(updateResponse.status).toBe(200);
      const updated = await updateResponse.json();
      expect(updated.title).toBe('Advanced Referee Training - Updated');

      // Step 6: Verify version was created
      const versionsResponse = await fetch(`http://localhost:3001/api/content/items/${content.id}/versions`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      const versions = await versionsResponse.json();
      expect(versions).toHaveLength(1);
      expect(versions[0].title).toBe('Advanced Referee Training'); // Original title
      expect(versions[0].content).toContain('Training Overview'); // Original content
    });

    test('should handle file deduplication across content items', async () => {
      // Create two content items
      const content1Response = await fetch('http://localhost:3001/api/content/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: 'Document One',
          content: '<p>First document</p>',
          category_id: 1
        })
      });
      const content1 = await content1Response.json();

      const content2Response = await fetch('http://localhost:3001/api/content/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: 'Document Two',
          content: '<p>Second document</p>',
          category_id: 1
        })
      });
      const content2 = await content2Response.json();

      // Upload same file to both documents
      const sameImageBuffer = Buffer.from('identical-image-data');
      
      const formData1 = new FormData();
      formData1.append('file', new Blob([sameImageBuffer], { type: 'image/jpeg' }), 'shared-image.jpg');
      formData1.append('content_item_id', content1.id.toString());

      const formData2 = new FormData();
      formData2.append('file', new Blob([sameImageBuffer], { type: 'image/jpeg' }), 'same-image.jpg'); // Different name
      formData2.append('content_item_id', content2.id.toString());

      const upload1 = await fetch('http://localhost:3001/api/content/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData1
      });
      const upload2 = await fetch('http://localhost:3001/api/content/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData2
      });

      const attachment1 = await upload1.json();
      const attachment2 = await upload2.json();

      // Files should have same hash and URL (deduplication)
      expect(attachment1.file_hash).toBe(attachment2.file_hash);
      expect(attachment1.file_url).toBe(attachment2.file_url);
      
      // But different database records with different names
      expect(attachment1.id).not.toBe(attachment2.id);
      expect(attachment1.file_name).toBe('shared-image.jpg');
      expect(attachment2.file_name).toBe('same-image.jpg');

      // Verify both content items can access their attachments
      const fullContent1 = await fetch(`http://localhost:3001/api/content/items/${content1.id}`).then(r => r.json());
      const fullContent2 = await fetch(`http://localhost:3001/api/content/items/${content2.id}`).then(r => r.json());

      expect(fullContent1.attachments).toHaveLength(1);
      expect(fullContent2.attachments).toHaveLength(1);
      expect(fullContent1.attachments[0].file_name).toBe('shared-image.jpg');
      expect(fullContent2.attachments[0].file_name).toBe('same-image.jpg');
    });

    test('should enforce content permissions and visibility', async () => {
      // Create private content as admin
      const privateContent = await fetch('http://localhost:3001/api/content/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: 'Private Admin Content',
          content: '<p>This is confidential information</p>',
          category_id: 1,
          visibility: 'private'
        })
      });
      
      const content = await privateContent.json();

      // Try to access private content without authentication
      const unauthorizedResponse = await fetch(`http://localhost:3001/api/content/items/${content.id}`);
      expect(unauthorizedResponse.status).toBe(403);

      // Try to access with regular user token
      const userAuthResponse = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          password: 'testpassword'
        })
      });
      const userData = await userAuthResponse.json();

      const userAccessResponse = await fetch(`http://localhost:3001/api/content/items/${content.id}`, {
        headers: { 'Authorization': `Bearer ${userData.token}` }
      });
      expect(userAccessResponse.status).toBe(403);

      // Admin should be able to access
      const adminResponse = await fetch(`http://localhost:3001/api/content/items/${content.id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      expect(adminResponse.status).toBe(200);
    });

    test('should handle concurrent content updates with versioning', async () => {
      // Create content
      const contentResponse = await fetch('http://localhost:3001/api/content/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: 'Concurrent Test Document',
          content: '<p>Original content</p>',
          category_id: 1
        })
      });
      const content = await contentResponse.json();

      // Simulate concurrent updates
      const update1Promise = fetch(`http://localhost:3001/api/content/items/${content.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: 'Update from User 1',
          content: '<p>Modified by user 1</p>'
        })
      });

      const update2Promise = fetch(`http://localhost:3001/api/content/items/${content.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: 'Update from User 2',
          content: '<p>Modified by user 2</p>'
        })
      });

      const [update1, update2] = await Promise.all([update1Promise, update2Promise]);

      // Both should succeed (last write wins)
      expect(update1.status).toBe(200);
      expect(update2.status).toBe(200);

      // Check versions were created for both updates
      const versionsResponse = await fetch(`http://localhost:3001/api/content/items/${content.id}/versions`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      const versions = await versionsResponse.json();
      expect(versions.length).toBeGreaterThanOrEqual(2); // At least 2 versions created
    });

    test('should maintain search index consistency', async () => {
      // Create content
      const content1 = await fetch('http://localhost:3001/api/content/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: 'Basketball Training Fundamentals',
          content: '<h1>Basic Skills</h1><p>Learn fundamental <strong>basketball</strong> officiating skills.</p>',
          category_id: 1,
          search_keywords: ['basketball', 'training', 'fundamentals']
        })
      }).then(r => r.json());

      const content2 = await fetch('http://localhost:3001/api/content/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: 'Advanced Basketball Techniques',
          content: '<h1>Advanced Methods</h1><p>Advanced <strong>basketball</strong> officiating techniques.</p>',
          category_id: 1,
          search_keywords: ['basketball', 'advanced', 'techniques']
        })
      }).then(r => r.json());

      // Search for 'basketball' should return both
      const basketballSearch = await fetch('http://localhost:3001/api/content/search?q=basketball')
        .then(r => r.json());
      
      expect(basketballSearch.results).toHaveLength(2);

      // Search for 'fundamentals' should return only first
      const fundamentalsSearch = await fetch('http://localhost:3001/api/content/search?q=fundamentals')
        .then(r => r.json());
      
      expect(fundamentalsSearch.results).toHaveLength(1);
      expect(fundamentalsSearch.results[0].title).toBe('Basketball Training Fundamentals');

      // Update first content to remove 'fundamentals'
      await fetch(`http://localhost:3001/api/content/items/${content1.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: 'Basketball Training Basics',
          content: '<h1>Basic Skills</h1><p>Learn basic <strong>basketball</strong> officiating skills.</p>',
          search_keywords: ['basketball', 'training', 'basics']
        })
      });

      // Search for 'fundamentals' should now return empty
      const updatedFundamentalsSearch = await fetch('http://localhost:3001/api/content/search?q=fundamentals')
        .then(r => r.json());
      
      expect(updatedFundamentalsSearch.results).toHaveLength(0);

      // Search for 'basics' should now return the updated content
      const basicsSearch = await fetch('http://localhost:3001/api/content/search?q=basics')
        .then(r => r.json());
      
      expect(basicsSearch.results).toHaveLength(1);
      expect(basicsSearch.results[0].title).toBe('Basketball Training Basics');
    });

    test('should handle content deletion and cleanup', async () => {
      // Create content with attachment
      const content = await fetch('http://localhost:3001/api/content/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: 'Content to Delete',
          content: '<p>This will be deleted</p>',
          category_id: 1
        })
      }).then(r => r.json());

      // Add attachment
      const formData = new FormData();
      formData.append('file', new Blob([Buffer.from('test-file')], { type: 'application/pdf' }), 'test.pdf');
      formData.append('content_item_id', content.id.toString());

      const attachment = await fetch('http://localhost:3001/api/content/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      }).then(r => r.json());

      // Update content to create version
      await fetch(`http://localhost:3001/api/content/items/${content.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: 'Updated Before Delete',
          content: '<p>Updated content</p>'
        })
      });

      // Verify search finds it
      const searchBefore = await fetch(`http://localhost:3001/api/content/search?q=delete`)
        .then(r => r.json());
      expect(searchBefore.results).toHaveLength(1);

      // Delete content
      const deleteResponse = await fetch(`http://localhost:3001/api/content/items/${content.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      expect(deleteResponse.status).toBe(200);

      // Content should not be accessible
      const getResponse = await fetch(`http://localhost:3001/api/content/items/${content.id}`);
      expect(getResponse.status).toBe(404);

      // Should not appear in search
      const searchAfter = await fetch(`http://localhost:3001/api/content/search?q=delete`)
        .then(r => r.json());
      expect(searchAfter.results).toHaveLength(0);

      // Attachment should still be accessible (soft delete)
      const attachmentResponse = await fetch(`http://localhost:3001/api/content/media/${attachment.id}`);
      expect(attachmentResponse.status).toBe(200);

      // Versions should still exist for audit purposes
      const versionsResponse = await fetch(`http://localhost:3001/api/content/items/${content.id}/versions`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      expect(versionsResponse.status).toBe(200);
      
      const versions = await versionsResponse.json();
      expect(versions.length).toBeGreaterThan(0);
    });
  });
});