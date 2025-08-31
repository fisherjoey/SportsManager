const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/resources');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document and media types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|mp4|webm|mp3/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Get all resource categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await db('resource_categories')
      .where('is_active', true)
      .orderBy('order_index', 'asc')
      .orderBy('name', 'asc');
    
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error fetching resource categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

// Create a new category (admin only)
router.post('/categories', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description, icon, order_index } = req.body;
  
  try {
    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const [category] = await db('resource_categories')
      .insert({
        name,
        slug,
        description,
        icon,
        order_index: order_index || 0
      })
      .returning('*');
    
    res.json({
      success: true,
      category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create category'
    });
  }
});

// Update category (admin only)
router.put('/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, icon, order_index, is_active } = req.body;
  
  try {
    const updates = {};
    if (name !== undefined) {
      updates.name = name;
      updates.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (description !== undefined) updates.description = description;
    if (icon !== undefined) updates.icon = icon;
    if (order_index !== undefined) updates.order_index = order_index;
    if (is_active !== undefined) updates.is_active = is_active;
    
    const [category] = await db('resource_categories')
      .where('id', id)
      .update(updates)
      .returning('*');
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update category'
    });
  }
});

// Delete category (admin only)
router.delete('/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const deleted = await db('resource_categories')
      .where('id', id)
      .del();
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete category'
    });
  }
});

// Get all resources with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      category_id, 
      type, 
      search, 
      is_featured,
      limit = 50,
      offset = 0,
      sort = 'created_at',
      order = 'desc'
    } = req.query;
    
    let query = db('resources')
      .select(
        'resources.*',
        'resource_categories.name as category_name',
        'resource_categories.slug as category_slug',
        'resource_categories.icon as category_icon',
        'users.email as created_by_email'
      )
      .leftJoin('resource_categories', 'resources.category_id', 'resource_categories.id')
      .leftJoin('users', 'resources.created_by', 'users.id')
      .where('resources.is_active', true);
    
    if (category_id) {
      query = query.where('resources.category_id', category_id);
    }
    
    if (type) {
      query = query.where('resources.type', type);
    }
    
    if (is_featured !== undefined) {
      query = query.where('resources.is_featured', is_featured === 'true');
    }
    
    if (search) {
      query = query.where(function() {
        this.where('resources.title', 'ilike', `%${search}%`)
          .orWhere('resources.description', 'ilike', `%${search}%`);
      });
    }
    
    // Get total count (simplified to avoid join issues)
    const countResult = await db('resources')
      .where('is_active', true)
      .modify(qb => {
        if (category_id) qb.where('category_id', category_id);
        if (type) qb.where('type', type);
        if (is_featured !== undefined) qb.where('is_featured', is_featured === 'true');
        if (search) {
          qb.where(function() {
            this.where('title', 'ilike', `%${search}%`)
              .orWhere('description', 'ilike', `%${search}%`);
          });
        }
      })
      .count('* as count');
    const count = countResult[0]?.count || 0;
    
    // Apply pagination and sorting
    const resources = await query
      .orderBy(`resources.${sort}`, order)
      .limit(limit)
      .offset(offset);
    
    res.json({
      success: true,
      resources,
      pagination: {
        total: parseInt(count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch resources'
    });
  }
});

// Get single resource
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const resource = await db('resources')
      .select(
        'resources.*',
        'resource_categories.name as category_name',
        'resource_categories.slug as category_slug',
        'resource_categories.icon as category_icon',
        'users.email as created_by_email'
      )
      .leftJoin('resource_categories', 'resources.category_id', 'resource_categories.id')
      .leftJoin('users', 'resources.created_by', 'users.id')
      .where('resources.id', id)
      .first();
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        error: 'Resource not found'
      });
    }
    
    // Log view
    await db('resource_access_logs').insert({
      resource_id: id,
      user_id: req.user.id,
      action: 'view',
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });
    
    // Increment view count
    await db('resources')
      .where('id', id)
      .increment('views', 1);
    
    res.json({
      success: true,
      resource
    });
  } catch (error) {
    console.error('Error fetching resource:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch resource'
    });
  }
});

// Create a new resource (admin only) - handles both file uploads and JSON content
router.post('/', authenticateToken, requireAdmin, (req, res, next) => {
  // Check if this is a multipart request (file upload) or JSON
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    upload.single('file')(req, res, next);
  } else {
    next();
  }
}, async (req, res) => {
  const { 
    category_id, 
    title, 
    description, 
    type, 
    external_url,
    metadata,
    is_featured 
  } = req.body;
  
  try {
    // Parse metadata based on type
    let parsedMetadata = {};
    if (metadata) {
      parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    }
    
    const resourceData = {
      category_id,
      title,
      description,
      type: type || 'document',
      external_url,
      metadata: parsedMetadata,
      is_featured: typeof is_featured === 'string' ? is_featured === 'true' : is_featured,
      created_by: req.user.id,
      updated_by: req.user.id
    };
    
    // If we have content from ResourceEditor, store it in metadata
    if (req.body.content) {
      resourceData.metadata = {
        ...resourceData.metadata,
        content: req.body.content,
        slug: req.body.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      };
    }
    
    // Handle file upload
    if (req.file) {
      resourceData.file_url = `/uploads/resources/${req.file.filename}`;
      resourceData.file_name = req.file.originalname;
      resourceData.file_size = req.file.size;
      resourceData.mime_type = req.file.mimetype;
    }
    
    const [resource] = await db('resources')
      .insert(resourceData)
      .returning('*');
    
    res.json({
      success: true,
      resource
    });
  } catch (error) {
    console.error('Error creating resource:', error);
    // Clean up uploaded file if database insert fails
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create resource'
    });
  }
});

// Update resource (admin only) - handles both file uploads and JSON content
router.put('/:id', authenticateToken, requireAdmin, (req, res, next) => {
  // Check if this is a multipart request (file upload) or JSON
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    upload.single('file')(req, res, next);
  } else {
    next();
  }
}, async (req, res) => {
  const { id } = req.params;
  const { 
    category_id, 
    title, 
    description, 
    type, 
    external_url,
    metadata,
    is_featured,
    is_active
  } = req.body;
  
  try {
    // Get existing resource
    const existingResource = await db('resources')
      .where('id', id)
      .first();
    
    if (!existingResource) {
      return res.status(404).json({
        success: false,
        error: 'Resource not found'
      });
    }
    
    const updates = {
      updated_by: req.user.id,
      updated_at: new Date()
    };
    
    if (category_id !== undefined) updates.category_id = category_id;
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (type !== undefined) updates.type = type;
    if (external_url !== undefined) updates.external_url = external_url;
    if (metadata !== undefined) {
      updates.metadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    }
    if (is_featured !== undefined) {
      updates.is_featured = typeof is_featured === 'string' ? is_featured === 'true' : is_featured;
    }
    if (is_active !== undefined) {
      updates.is_active = typeof is_active === 'string' ? is_active === 'true' : is_active;
    }
    
    // If we have content from ResourceEditor, update metadata
    if (req.body.content !== undefined) {
      const existingMetadata = existingResource.metadata || {};
      updates.metadata = {
        ...existingMetadata,
        ...updates.metadata,
        content: req.body.content,
        slug: req.body.slug || title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || existingResource.metadata?.slug
      };
    }
    
    // Handle file upload
    if (req.file) {
      // Delete old file if exists
      if (existingResource.file_url) {
        const oldFilePath = path.join(__dirname, '../..', existingResource.file_url);
        try {
          await fs.unlink(oldFilePath);
        } catch (error) {
          console.error('Error deleting old file:', error);
        }
      }
      
      updates.file_url = `/uploads/resources/${req.file.filename}`;
      updates.file_name = req.file.originalname;
      updates.file_size = req.file.size;
      updates.mime_type = req.file.mimetype;
    }
    
    const [resource] = await db('resources')
      .where('id', id)
      .update(updates)
      .returning('*');
    
    res.json({
      success: true,
      resource
    });
  } catch (error) {
    console.error('Error updating resource:', error);
    // Clean up uploaded file if database update fails
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update resource'
    });
  }
});

// Delete resource (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get resource to delete associated file
    const resource = await db('resources')
      .where('id', id)
      .first();
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        error: 'Resource not found'
      });
    }
    
    // Delete file if exists
    if (resource.file_url) {
      const filePath = path.join(__dirname, '../..', resource.file_url);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
    
    // Delete resource from database
    await db('resources')
      .where('id', id)
      .del();
    
    res.json({
      success: true,
      message: 'Resource deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete resource'
    });
  }
});

// Download resource file
router.get('/:id/download', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const resource = await db('resources')
      .where('id', id)
      .first();
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        error: 'Resource not found'
      });
    }
    
    if (!resource.file_url) {
      return res.status(400).json({
        success: false,
        error: 'This resource does not have a downloadable file'
      });
    }
    
    // Log download
    await db('resource_access_logs').insert({
      resource_id: id,
      user_id: req.user.id,
      action: 'download',
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });
    
    // Increment download count
    await db('resources')
      .where('id', id)
      .increment('downloads', 1);
    
    // Send file
    const filePath = path.join(__dirname, '../..', resource.file_url);
    res.download(filePath, resource.file_name);
  } catch (error) {
    console.error('Error downloading resource:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download resource'
    });
  }
});

// Get resource statistics (admin only)
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [totalResources] = await db('resources').count('* as count');
    const [totalCategories] = await db('resource_categories').count('* as count');
    const [totalViews] = await db('resources').sum('views as total');
    const [totalDownloads] = await db('resources').sum('downloads as total');
    
    const resourcesByType = await db('resources')
      .select('type')
      .count('* as count')
      .groupBy('type');
    
    const resourcesByCategory = await db('resources')
      .select('resource_categories.name as category')
      .count('* as count')
      .leftJoin('resource_categories', 'resources.category_id', 'resource_categories.id')
      .groupBy('resource_categories.name');
    
    const recentActivity = await db('resource_access_logs')
      .select(
        'resource_access_logs.*',
        'resources.title as resource_title',
        'users.email as user_email'
      )
      .leftJoin('resources', 'resource_access_logs.resource_id', 'resources.id')
      .leftJoin('users', 'resource_access_logs.user_id', 'users.id')
      .orderBy('resource_access_logs.accessed_at', 'desc')
      .limit(20);
    
    res.json({
      success: true,
      stats: {
        totalResources: totalResources.count,
        totalCategories: totalCategories.count,
        totalViews: totalViews.total || 0,
        totalDownloads: totalDownloads.total || 0,
        resourcesByType,
        resourcesByCategory,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Error fetching resource stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// File upload endpoint for TinyMCE and other file uploads
router.post('/upload', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Generate public URL for the file
    const file_url = `/uploads/resources/${req.file.filename}`;
    
    res.json({
      success: true,
      file_url: file_url,
      file_name: req.file.originalname,
      file_size: req.file.size,
      mime_type: req.file.mimetype
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file'
    });
  }
});

module.exports = router;