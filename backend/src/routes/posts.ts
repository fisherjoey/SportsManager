// @ts-nocheck

import express from 'express';
const router = express.Router();
import db from '../config/database';
import Joi from 'joi';
import { authenticateToken, requireRole  } from '../middleware/auth';
import { receiptUploader  } from '../middleware/fileUpload';
import path from 'path';
import fs from 'fs'.promises;

// Using shared file upload configuration from middleware

// Validation schemas
const postSchema = Joi.object({
  title: Joi.string().max(255).required(),
  content: Joi.string().required(),
  excerpt: Joi.string().max(500).allow(''),
  status: Joi.string().valid('draft', 'published', 'archived').default('draft'),
  category: Joi.string().max(50).allow(''),
  tags: Joi.array().items(Joi.string().max(50)).default([]),
  published_at: Joi.date().allow(null)
});

const postUpdateSchema = Joi.object({
  title: Joi.string().max(255),
  content: Joi.string(),
  excerpt: Joi.string().max(500).allow(''),
  status: Joi.string().valid('draft', 'published', 'archived'),
  category: Joi.string().max(50).allow(''),
  tags: Joi.array().items(Joi.string().max(50)),
  published_at: Joi.date().allow(null)
});

// GET /api/posts - Get all posts with filters
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      category, 
      author_id, 
      search,
      page = 1, 
      limit = 10,
      include_drafts = false 
    } = req.query;
    
    let query = db('posts')
      .select(
        'posts.*',
        'users.name as author_name',
        'users.email as author_email',
        'post_categories.name as category_name',
        'post_categories.color as category_color',
        'post_categories.icon as category_icon'
      )
      .leftJoin('users', 'posts.author_id', 'users.id')
      .leftJoin('post_categories', 'posts.category', 'post_categories.slug')
      .orderBy('posts.created_at', 'desc');

    // Default to published posts only unless admin requests drafts
    if (!include_drafts && (!req.user || req.user.role !== 'admin')) {
      query = query.where('posts.status', 'published');
    }

    if (status) {
      query = query.where('posts.status', status);
    }
    
    if (category) {
      query = query.where('posts.category', category);
    }
    
    if (author_id) {
      query = query.where('posts.author_id', author_id);
    }
    
    if (search) {
      query = query.where(function() {
        this.where('posts.title', 'ilike', `%${search}%`)
          .orWhere('posts.content', 'ilike', `%${search}%`)
          .orWhere('posts.excerpt', 'ilike', `%${search}%`);
      });
    }

    const offset = (page - 1) * limit;
    const posts = await query.limit(limit).offset(offset);
    
    // Get read receipts for each post (if user is authenticated)
    const postsWithReads = await Promise.all(posts.map(async (post) => {
      let hasRead = false;
      let readCount = 0;
      
      if (req.user) {
        // Check if current user has read this post
        const userRead = await db('post_reads')
          .where({ post_id: post.id, user_id: req.user.userId })
          .first();
        hasRead = !!userRead;
        
        // Get total read count for admins
        if (req.user.role === 'admin') {
          const reads = await db('post_reads')
            .where('post_id', post.id)
            .count('* as count')
            .first();
          readCount = parseInt(reads.count);
        }
      }
      
      // Get media attachments
      const media = await db('post_media')
        .where('post_id', post.id)
        .orderBy('sort_order', 'asc');
      
      return {
        ...post,
        hasRead,
        readCount,
        media,
        tags: Array.isArray(post.tags) ? post.tags : []
      };
    }));

    res.json({
      success: true,
      data: {
        posts: postsWithReads,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: postsWithReads.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch posts' 
    });
  }
});

// GET /api/posts/categories - Get all post categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await db('post_categories')
      .where('is_active', true)
      .orderBy('sort_order', 'asc');
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch categories' 
    });
  }
});

// GET /api/posts/:id - Get specific post
router.get('/:id', async (req, res) => {
  try {
    const post = await db('posts')
      .select(
        'posts.*',
        'users.name as author_name',
        'users.email as author_email',
        'post_categories.name as category_name',
        'post_categories.color as category_color',
        'post_categories.icon as category_icon'
      )
      .leftJoin('users', 'posts.author_id', 'users.id')
      .leftJoin('post_categories', 'posts.category', 'post_categories.slug')
      .where('posts.id', req.params.id)
      .first();
    
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    // Check if post is published or user has permission to view drafts
    if (post.status !== 'published' && (!req.user || req.user.role !== 'admin')) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Get media attachments
    const media = await db('post_media')
      .where('post_id', post.id)
      .orderBy('sort_order', 'asc');
    
    // Mark as read if user is authenticated
    if (req.user) {
      await db('post_reads').insert({
        post_id: post.id,
        user_id: req.user.userId
      }).onConflict(['post_id', 'user_id']).ignore();
    }

    res.json({
      success: true,
      data: {
        ...post,
        media,
        tags: Array.isArray(post.tags) ? post.tags : []
      }
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch post' 
    });
  }
});

// POST /api/posts - Create new post (Admin only)
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = postSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.details[0].message 
      });
    }

    const postData = {
      ...value,
      author_id: req.user.userId,
      tags: JSON.stringify(value.tags),
      published_at: value.status === 'published' ? new Date() : value.published_at
    };

    const [post] = await db('posts').insert(postData).returning('*');
    
    res.status(201).json({
      success: true,
      data: {
        ...post,
        tags: Array.isArray(post.tags) ? post.tags : JSON.parse(post.tags || '[]')
      }
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create post' 
    });
  }
});

// PUT /api/posts/:id - Update post (Admin only)
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = postUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.details[0].message 
      });
    }

    const updateData = {
      ...value,
      updated_at: new Date()
    };

    if (value.tags) {
      updateData.tags = JSON.stringify(value.tags);
    }

    if (value.status === 'published' && !value.published_at) {
      updateData.published_at = new Date();
    }

    const [post] = await db('posts')
      .where('id', req.params.id)
      .update(updateData)
      .returning('*');

    if (!post) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    res.json({
      success: true,
      data: {
        ...post,
        tags: Array.isArray(post.tags) ? post.tags : JSON.parse(post.tags || '[]')
      }
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update post' 
    });
  }
});

// DELETE /api/posts/:id - Delete post (Admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const deletedCount = await db('posts').where('id', req.params.id).del();
    
    if (deletedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete post' 
    });
  }
});

// POST /api/posts/:id/media - Upload media for post (Admin only)
router.post('/:id/media', authenticateToken, requireRole('admin'), receiptUploader.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const post = await db('posts').where('id', req.params.id).first();
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    const mediaData = {
      post_id: req.params.id,
      file_name: req.file.originalname,
      file_url: `/uploads/posts/${req.file.filename}`,
      file_type: req.file.mimetype,
      file_size: req.file.size,
      alt_text: req.body.alt_text || '',
      sort_order: parseInt(req.body.sort_order) || 0
    };

    const [media] = await db('post_media').insert(mediaData).returning('*');
    
    res.status(201).json({
      success: true,
      data: media
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload media' 
    });
  }
});

// GET /api/posts/:id/reads - Get read receipts for post (Admin only)
router.get('/:id/reads', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const reads = await db('post_reads')
      .join('users', 'post_reads.user_id', 'users.id')
      .select('users.name', 'users.email', 'post_reads.read_at')
      .where('post_reads.post_id', req.params.id)
      .orderBy('post_reads.read_at', 'desc');

    res.json({
      success: true,
      data: reads
    });
  } catch (error) {
    console.error('Error fetching read receipts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch read receipts' 
    });
  }
});

export default router;