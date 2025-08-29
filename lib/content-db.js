/**
 * Content Management Database Layer
 * 
 * This module provides database operations for the content management system.
 * It implements the interface expected by our tests.
 */

const knex = require('knex');
const crypto = require('crypto');

// Database configuration - use PostgreSQL test database for tests
const dbConfig = {
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.NODE_ENV === 'test' ? 'sportsmanager_test' : 'sportsmanager',
    port: process.env.DB_PORT || 5432
  },
  migrations: {
    directory: './backend/migrations',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: './backend/seeds'
  }
};

const db = knex(dbConfig);

/**
 * Utility function to generate URL-friendly slug from title
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim('-'); // Remove leading/trailing hyphens
}

/**
 * Extract plain text from HTML content
 */
function extractPlainText(html) {
  if (!html) return '';
  
  // Simple HTML tag removal - in production, use a proper HTML parser
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
    .replace(/<[^>]*>/g, ' ') // Remove all HTML tags
    .replace(/\s+/g, ' ') // Replace multiple spaces with single
    .trim();
}

/**
 * Ensure slug is unique by appending number if needed
 */
async function ensureUniqueSlug(baseSlug, excludeId = null) {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const query = db('content_items')
      .where('slug', slug)
      .where('status', '!=', 'deleted'); // Allow reusing slugs from deleted content
      
    if (excludeId) {
      query.where('id', '!=', excludeId);
    }
    
    const existing = await query.first();
    
    if (!existing) {
      return slug;
    }
    
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

/**
 * Content Items Operations
 */
const contentItems = {
  async create(data) {
    const {
      title,
      content,
      description,
      category_id,
      type = 'document',
      status = 'draft',
      visibility = 'public',
      search_keywords = [],
      author_id = null // Will be set to actual admin user or test user
    } = data;
    
    // Validation
    if (!title) {
      throw new Error('Title is required');
    }
    if (!content) {
      throw new Error('Content is required');
    }
    if (category_id && !(await db('content_categories').where('id', category_id).first())) {
      throw new Error('Invalid category');
    }
    
    // Set default author_id if not provided (for tests)
    if (!author_id) {
      // Try to find an admin user, or create a test user entry
      const adminUser = await db('users').where('role', 'admin').first();
      author_id = adminUser ? adminUser.id : null;
    }
    
    // Generate slug
    const baseSlug = generateSlug(title);
    const slug = await ensureUniqueSlug(baseSlug);
    
    // Extract plain text
    const content_plain = extractPlainText(content);
    
    // Insert content item
    const [inserted] = await db('content_items')
      .insert({
        title,
        slug,
        content,
        content_plain,
        description,
        category_id,
        type,
        status,
        visibility,
        search_keywords: JSON.stringify(search_keywords),
        author_id,
        published_at: status === 'published' ? db.fn.now() : null
      })
      .returning('*');
    
    // Update search index
    await updateSearchIndex(inserted.id);
    
    return {
      ...inserted,
      search_keywords: JSON.parse(inserted.search_keywords || '[]')
    };
  },
  
  async findById(id) {
    const item = await db('content_items')
      .where('id', id)
      .where('status', '!=', 'deleted')
      .first();
      
    if (item) {
      item.search_keywords = JSON.parse(item.search_keywords || '[]');
    }
    
    return item || null;
  },
  
  async findBySlug(slug) {
    const item = await db('content_items')
      .where('slug', slug)
      .where('status', '!=', 'deleted')
      .first();
      
    if (item) {
      item.search_keywords = JSON.parse(item.search_keywords || '[]');
    }
    
    return item || null;
  },
  
  async findByStatus(status) {
    const items = await db('content_items')
      .where('status', status)
      .orderBy('updated_at', 'desc');
      
    return items.map(item => ({
      ...item,
      search_keywords: JSON.parse(item.search_keywords || '[]')
    }));
  },
  
  async update(id, updates) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Content not found');
    }
    
    // Create version before updating
    await contentVersions.createVersion(existing);
    
    const updateData = { ...updates };
    
    // Handle slug update if title changed
    if (updates.title && updates.title !== existing.title) {
      const baseSlug = generateSlug(updates.title);
      updateData.slug = await ensureUniqueSlug(baseSlug, id);
    }
    
    // Update plain text if content changed
    if (updates.content) {
      updateData.content_plain = extractPlainText(updates.content);
    }
    
    // Handle status change
    if (updates.status === 'published' && existing.status !== 'published') {
      updateData.published_at = db.fn.now();
    }
    
    // Update search keywords format
    if (updates.search_keywords) {
      updateData.search_keywords = JSON.stringify(updates.search_keywords);
    }
    
    const [updated] = await db('content_items')
      .where('id', id)
      .update({
        ...updateData,
        updated_at: db.fn.now()
      })
      .returning('*');
    
    // Update search index
    await updateSearchIndex(id);
    
    return {
      ...updated,
      search_keywords: JSON.parse(updated.search_keywords || '[]')
    };
  },
  
  async search(query, options = {}) {
    const { limit = 20, offset = 0 } = options;
    
    if (!query || query.trim().length === 0) {
      return [];
    }
    
    // Simple search implementation - in production, use PostgreSQL full-text search
    const searchTerms = query.toLowerCase().split(/\s+/);
    
    const results = await db('content_items')
      .select([
        'content_items.*',
        db.raw(`
          CASE 
            WHEN LOWER(title) LIKE ? THEN 3
            WHEN LOWER(content_plain) LIKE ? THEN 2
            ELSE 1
          END as rank
        `, [`%${searchTerms[0]}%`, `%${searchTerms[0]}%`])
      ])
      .where(function() {
        searchTerms.forEach(term => {
          this.orWhere('title', 'ilike', `%${term}%`)
              .orWhere('content_plain', 'ilike', `%${term}%`)
              .orWhere('description', 'ilike', `%${term}%`);
        });
      })
      .where('status', 'published')
      .where('visibility', 'public')
      .orderBy('rank', 'desc')
      .orderBy('published_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    return results.map(item => ({
      ...item,
      snippet: this.createSnippet(item.content_plain, searchTerms[0]),
      search_keywords: JSON.parse(item.search_keywords || '[]')
    }));
  },
  
  async searchByKeywords(keywords) {
    const results = await db('content_items')
      .where('status', 'published')
      .where('visibility', 'public')
      .where(function() {
        keywords.forEach(keyword => {
          this.orWhereRaw("search_keywords::text ILIKE ?", [`%${keyword}%`]);
        });
      })
      .orderBy('published_at', 'desc');
    
    return results.map(item => ({
      ...item,
      search_keywords: JSON.parse(item.search_keywords || '[]')
    }));
  },
  
  createSnippet(text, searchTerm) {
    if (!text || !searchTerm) return '';
    
    const index = text.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (index === -1) return text.substring(0, 150) + '...';
    
    const start = Math.max(0, index - 75);
    const end = Math.min(text.length, index + searchTerm.length + 75);
    
    let snippet = text.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet += '...';
    
    return snippet;
  }
};

/**
 * Content Versions Operations
 */
const contentVersions = {
  async createVersion(contentItem) {
    // Get next version number
    const lastVersion = await db('content_versions')
      .where('content_item_id', contentItem.id)
      .orderBy('version_number', 'desc')
      .first();
    
    const versionNumber = (lastVersion?.version_number || 0) + 1;
    
    return await db('content_versions').insert({
      content_item_id: contentItem.id,
      version_number: versionNumber,
      title: contentItem.title,
      content: contentItem.content,
      description: contentItem.description,
      search_keywords: contentItem.search_keywords,
      created_by: contentItem.author_id,
      change_summary: 'Content updated'
    });
  },
  
  async findByContentId(contentId) {
    return await db('content_versions')
      .where('content_item_id', contentId)
      .orderBy('version_number', 'desc');
  }
};

/**
 * Content Categories Operations
 */
const contentCategories = {
  async create(data) {
    const { name, slug, description, parent_id } = data;
    
    if (!name) {
      throw new Error('Category name is required');
    }
    
    const categorySlug = slug || generateSlug(name);
    
    const [inserted] = await db('content_categories')
      .insert({
        name,
        slug: categorySlug,
        description,
        parent_id
      })
      .returning('*');
    
    return inserted;
  },
  
  async update(id, updates) {
    // Check for circular references if updating parent_id
    if (updates.parent_id) {
      const wouldCreateCircle = await this.checkCircularReference(id, updates.parent_id);
      if (wouldCreateCircle) {
        throw new Error('Circular reference detected');
      }
    }
    
    const [updated] = await db('content_categories')
      .where('id', id)
      .update(updates)
      .returning('*');
    
    return updated;
  },
  
  async findChildren(parentId) {
    return await db('content_categories')
      .where('parent_id', parentId)
      .where('is_active', true)
      .orderBy('sort_order')
      .orderBy('name');
  },
  
  async checkCircularReference(categoryId, newParentId) {
    let currentId = newParentId;
    
    while (currentId) {
      if (currentId === categoryId) {
        return true; // Circular reference found
      }
      
      const parent = await db('content_categories')
        .where('id', currentId)
        .first();
      
      currentId = parent?.parent_id;
    }
    
    return false;
  }
};

/**
 * Search index update function
 */
async function updateSearchIndex(contentId) {
  const content = await contentItems.findById(contentId);
  if (!content) return;
  
  // Simple search index - in production, use PostgreSQL tsvector
  await db('content_search_index')
    .insert({
      content_item_id: contentId,
      search_vector: db.raw("to_tsvector('english', ? || ' ' || ? || ' ' || ?)", [
        content.title,
        content.content_plain,
        content.description || ''
      ]),
      last_indexed_at: db.fn.now()
    })
    .onConflict('content_item_id')
    .merge({
      search_vector: db.raw("to_tsvector('english', ? || ' ' || ? || ' ' || ?)", [
        content.title,
        content.content_plain,
        content.description || ''
      ]),
      last_indexed_at: db.fn.now()
    });
}

// Export the database interface
module.exports = {
  // Raw Knex instance for direct queries
  ...db,
  
  // Structured operations
  contentItems,
  contentVersions,
  contentCategories,
  
  // Utility functions
  generateSlug,
  extractPlainText,
  ensureUniqueSlug,
  updateSearchIndex,
  
  // Database management
  async destroy() {
    return db.destroy();
  },
  
  // Expose knex instance for migrations and raw queries
  migrate: db.migrate,
  raw: db.raw,
  schema: db.schema
};