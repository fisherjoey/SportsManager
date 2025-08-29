const express = require('express');
const router = express.Router();
const DOMPurify = require('isomorphic-dompurify');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler, ValidationError } = require('../middleware/errorHandling');

// Helper function to generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// GET /api/content/items - List content items
router.get('/items', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    status, 
    category_id, 
    search 
  } = req.query;

  let query = db('content_items')
    .select([
      'content_items.*',
      'content_categories.name as category_name',
      'content_categories.slug as category_slug'
    ])
    .leftJoin('content_categories', 'content_items.category_id', 'content_categories.id')
    .orderBy('content_items.updated_at', 'desc');

  // Apply filters
  if (status) {
    query = query.where('content_items.status', status);
  }

  if (category_id) {
    query = query.where('content_items.category_id', category_id);
  }

  if (search) {
    query = query.where(function() {
      this.whereRaw('LOWER(content_items.title) LIKE LOWER(?)', [`%${search}%`])
          .orWhereRaw('LOWER(content_items.description) LIKE LOWER(?)', [`%${search}%`])
          .orWhereRaw('LOWER(content_items.content) LIKE LOWER(?)', [`%${search}%`]);
    });
  }

  // Get total count for pagination
  const totalQuery = query.clone().clearSelect().clearOrder().count('* as count');
  const [{ count: total }] = await totalQuery;

  // Apply pagination
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const items = await query.limit(parseInt(limit)).offset(offset);

  // Format items
  const formattedItems = items.map(item => ({
    ...item,
    category: item.category_name ? {
      id: item.category_id,
      name: item.category_name,
      slug: item.category_slug
    } : null,
    content: undefined // Don't return content in list view
  }));

  res.json({
    items: formattedItems,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

// GET /api/content/items/slug/:slug - Get content item by slug
router.get('/items/slug/:slug', asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const item = await db('content_items')
    .select([
      'content_items.*',
      'content_categories.name as category_name',
      'content_categories.slug as category_slug'
    ])
    .leftJoin('content_categories', 'content_items.category_id', 'content_categories.id')
    .where('content_items.slug', slug)
    .andWhere('content_items.status', 'published')
    .first();

  if (!item) {
    return res.status(404).json({ error: 'Content not found' });
  }

  const response = {
    ...item,
    category: item.category_name ? {
      id: item.category_id,
      name: item.category_name,
      slug: item.category_slug
    } : null
  };

  res.json(response);
}));

// POST /api/content/items - Create new content item
router.post('/items', authenticateToken, asyncHandler(async (req, res) => {
  const {
    title,
    content,
    description,
    category,
    type = 'document',
    status = 'draft',
    visibility = 'public'
  } = req.body;

  // Validation
  if (!title?.trim()) {
    throw new ValidationError('Title is required');
  }

  if (!content?.trim()) {
    throw new ValidationError('Content is required');
  }

  // Sanitize HTML content
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'u', 's', 
      'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'table', 
      'thead', 'tbody', 'tr', 'td', 'th', 'span', 'div'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style']
  });

  // Generate slug
  const slug = generateSlug(title);

  // Check if slug already exists
  let finalSlug = slug;
  let counter = 1;
  while (await db('content_items').where('slug', finalSlug).first()) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  // Find or create category
  let categoryId = null;
  if (category && category.trim()) {
    let categoryRecord = await db('content_categories')
      .where('name', category.trim())
      .first();

    if (!categoryRecord) {
      const categorySlug = generateSlug(category.trim());
      [categoryRecord] = await db('content_categories')
        .insert({
          name: category.trim(),
          slug: categorySlug,
          description: `Category for ${category.trim()}`
        })
        .returning('*');
    }
    
    categoryId = categoryRecord.id;
  }

  // Create content item
  const [contentItem] = await db('content_items')
    .insert({
      title: title.trim(),
      slug: finalSlug,
      content: sanitizedContent,
      description: description?.trim(),
      category_id: categoryId,
      type,
      status,
      visibility,
      author_id: req.user.userId,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    })
    .returning('*');

  // Get full item with relations
  const fullItem = await db('content_items')
    .select([
      'content_items.*',
      'content_categories.name as category_name',
      'content_categories.slug as category_slug'
    ])
    .leftJoin('content_categories', 'content_items.category_id', 'content_categories.id')
    .where('content_items.id', contentItem.id)
    .first();

  const response = {
    ...fullItem,
    category: fullItem.category_name ? {
      id: fullItem.category_id,
      name: fullItem.category_name,
      slug: fullItem.category_slug
    } : null
  };

  res.status(201).json(response);
}));

// GET /api/content/categories - List categories
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await db('content_categories')
    .select('*')
    .orderBy('name', 'asc');
  
  res.json(categories);
}));

module.exports = router;