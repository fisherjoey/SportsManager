// @ts-nocheck

/**
 * @fileoverview Mentorship Management API Routes
 * @description Complete API endpoints for managing mentorship relationships, notes, and documents
 * @version 1.0.0
 * 
 * This module provides comprehensive RESTful API endpoints for the mentorship system,
 * including relationship management, note-taking, and document handling capabilities.
 */

import express from 'express';
const router = express.Router();
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs-extra';
import Joi from 'joi';

// Middleware imports
import { authenticateToken } from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';
import { ResponseFormatter  } from '../utils/response-formatters';
import { enhancedAsyncHandler  } from '../middleware/enhanced-error-handling';
import { validateBody, validateParams, validateQuery  } from '../middleware/validation';
import { ErrorFactory  } from '../utils/errors';
import { MentorshipSchemas  } from '../utils/validation-schemas';
import { mentorshipUploader, 
  mentorshipFileSecurity, 
  mentorshipVirusScan, 
  handleMentorshipUploadErrors 
 } from '../middleware/mentorshipFileUpload';

// Service imports
import db from '../config/database';
import MentorshipService from '../services/MentorshipService';
import MentorshipNotesService from '../services/MentorshipNotesService';
import MentorshipDocumentService from '../services/MentorshipDocumentService';

// Initialize services
const mentorshipService = new MentorshipService(db);
const notesService = new MentorshipNotesService(db);
const documentService = new MentorshipDocumentService(db, {
  uploadPath: path.join(process.cwd(), 'uploads', 'mentorship_documents'),
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain'
  ]
});

// ===== VALIDATION SCHEMAS =====

import { IdParamSchema  } from '../utils/validation-schemas';

const NoteIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
  noteId: Joi.string().uuid().required()
});

const DocumentIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
  docId: Joi.string().uuid().required()
});

// Document upload functionality provided by mentorshipFileUpload middleware

// ===== MAIN MENTORSHIP ROUTES =====

/**
 * GET /api/mentorships/my-mentees
 * Get mentor's assigned mentees
 * Query params: status, include_details
 */
router.get('/my-mentees',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'view:list',
  }),
  validateQuery(Joi.object({
    status: Joi.string().valid('active', 'paused', 'completed', 'terminated').optional(),
    include_details: Joi.boolean().default(true)
  })),
  enhancedAsyncHandler(async (req, res) => {
    const { status, include_details } = req.query;
    const userId = req.user.id;

    try {
      // Check if user can be a mentor
      const canBeMentor = await mentorshipService.canUserBeMentor(userId);

      if (!canBeMentor) {
        return ResponseFormatter.sendSuccess(res, { data: [] }, 'No mentees found');
      }

      // User is a mentor - get their mentees
      const mentorships = await mentorshipService.getMentorshipsByMentor(userId, {
        status,
        includeDetails: include_details
      });

      // Transform to mentee format for frontend
      const mentees = mentorships.map(m => ({
        id: m.mentee_id,
        name: m.mentee_name || 'Unknown',
        email: m.mentee_email || '',
        status: m.status || 'active',
        level: m.mentee_level || null,
        experience_years: m.mentee_experience || null,
        mentorship_id: m.id
      }));

      return ResponseFormatter.sendSuccess(res, { data: mentees }, 'Mentees retrieved successfully');

    } catch (error) {
      console.error('Error getting mentees:', error);
      throw ErrorFactory.internalServer('Failed to retrieve mentees');
    }
  })
);

/**
 * GET /api/mentorships
 * Get mentor's assigned mentees or mentee's mentors based on user role
 * Query params: status, page, limit
 */
router.get('/',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'view:list',
  }),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('active', 'paused', 'completed', 'terminated').optional()
  })),
  enhancedAsyncHandler(async (req, res) => {
    const { status, page, limit } = req.query;
    const userId = req.user.id;

    try {
      let mentorships;
      let userRole = 'mentee'; // default

      // Check if user has admin/manage permissions directly from database
      const hasManagePermission = await db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .join('role_permissions', 'roles.id', 'role_permissions.role_id')
        .join('permissions', 'role_permissions.permission_id', 'permissions.id')
        .where('user_roles.user_id', userId)
        .where('user_roles.is_active', true)
        .where('permissions.name', 'mentorships:manage')
        .first();

      console.log(`User ${userId} has manage permission:`, !!hasManagePermission);
      const isAdmin = !!hasManagePermission;

      if (isAdmin) {
        // Admin - get ALL mentorships
        mentorships = await mentorshipService.getAllMentorships({
          status,
          includeDetails: true
        });
        userRole = 'admin';
      } else {
        // Check if user can be a mentor
        const canBeMentor = await mentorshipService.canUserBeMentor(userId);

        if (canBeMentor) {
          // User is a mentor - get their mentees
          mentorships = await mentorshipService.getMentorshipsByMentor(userId, {
            status,
            includeDetails: true
          });
          userRole = 'mentor';
        } else {
          // User is a mentee - get their mentors
          mentorships = await mentorshipService.getMentorshipsByMentee(userId, {
            status,
            includeDetails: true
          });
        }
      }

      // Apply pagination if needed
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedMentorships = mentorships.slice(startIndex, endIndex);

      const response = {
        data: paginatedMentorships,
        pagination: {
          page,
          limit,
          total: mentorships.length,
          totalPages: Math.ceil(mentorships.length / limit),
          hasNextPage: endIndex < mentorships.length,
          hasPreviousPage: page > 1
        },
        meta: {
          userRole,
          canBeMentor: userRole === 'admin' ? true : await mentorshipService.canUserBeMentor(userId)
        }
      };

      return ResponseFormatter.sendSuccess(res, response, 'Mentorships retrieved successfully');

    } catch (error) {
      console.error('Error getting mentorships:', error);
      throw ErrorFactory.internalServer('Failed to retrieve mentorships');
    }
  })
);

/**
 * GET /api/mentorships/:id
 * Get specific mentorship details with full information
 */
router.get('/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'view:details',
    getResourceId: (req) => req.params.id,
  }),
  validateParams(IdParamSchema),
  enhancedAsyncHandler(async (req, res) => {
    const mentorshipId = req.params.id;
    const userId = req.user.id;

    try {
      const mentorship = await mentorshipService.getMentorshipWithDetails(mentorshipId, userId);
      
      return ResponseFormatter.sendSuccess(res, { mentorship }, 'Mentorship details retrieved successfully');

    } catch (error) {
      console.error(`Error getting mentorship ${mentorshipId}:`, error);
      if (error.message.includes('not found')) {
        throw ErrorFactory.notFound('Mentorship not found');
      }
      if (error.message.includes('Access denied')) {
        throw ErrorFactory.forbidden('Access denied to this mentorship');
      }
      throw ErrorFactory.internalServer('Failed to retrieve mentorship details');
    }
  })
);

/**
 * POST /api/mentorships
 * Create new mentorship (admin or mentorship coordinators only)
 */
router.post('/',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'create',
  }),
  validateBody(MentorshipSchemas.create),
  enhancedAsyncHandler(async (req, res) => {
    const mentorshipData = req.body;
    console.log('Creating mentorship with data:', mentorshipData);

    try {
      const mentorship = await mentorshipService.createMentorship(mentorshipData);
      console.log('Mentorship created successfully:', mentorship);

      return ResponseFormatter.sendCreated(
        res,
        { mentorship },
        'Mentorship created successfully',
        `/api/mentorships/${mentorship.id}`
      );

    } catch (error: any) {
      console.error('Error creating mentorship:', error);
      console.error('Error stack:', error.stack);
      if (error.message.includes('already exists')) {
        throw ErrorFactory.conflict('Mentorship relationship already exists');
      }
      if (error.message.includes('eligibility')) {
        throw ErrorFactory.badRequest('Mentor eligibility validation failed: ' + error.message);
      }
      if (error.message.includes('not found')) {
        throw ErrorFactory.notFound('One or more users not found');
      }
      throw ErrorFactory.internalServer('Failed to create mentorship');
    }
  })
);

/**
 * PUT /api/mentorships/:id
 * Update mentorship (mentor can update their mentorships, admin can update any)
 */
router.put('/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'update',
    getResourceId: (req) => req.params.id,
  }),
  validateParams(IdParamSchema),
  validateBody(MentorshipSchemas.update),
  enhancedAsyncHandler(async (req, res) => {
    const mentorshipId = req.params.id;
    const updateData = req.body;

    console.log('[Mentorship Route] User object:', req.user);
    const userId = req.user.id || req.user.userId;
    console.log('[Mentorship Route] Extracted userId:', userId);

    try {
      // For status updates, use the specialized method
      if (updateData.status) {
        const updatedMentorship = await mentorshipService.updateMentorshipStatus(
          mentorshipId, 
          updateData.status, 
          userId
        );
        return ResponseFormatter.sendSuccess(res, { mentorship: updatedMentorship }, 'Mentorship status updated successfully');
      }

      // For other updates, use the general update method
      const updatedMentorship = await mentorshipService.update(mentorshipId, updateData);
      
      return ResponseFormatter.sendSuccess(res, { mentorship: updatedMentorship }, 'Mentorship updated successfully');

    } catch (error) {
      console.error(`Error updating mentorship ${mentorshipId}:`, error);
      if (error.message.includes('not found')) {
        throw ErrorFactory.notFound('Mentorship not found');
      }
      if (error.message.includes('Access denied')) {
        throw ErrorFactory.forbidden('Access denied to update this mentorship');
      }
      throw ErrorFactory.internalServer('Failed to update mentorship');
    }
  })
);

/**
 * DELETE /api/mentorships/:id
 * End mentorship (admin only)
 */
router.delete('/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'delete',
    getResourceId: (req) => req.params.id,
  }),
  validateParams(IdParamSchema),
  enhancedAsyncHandler(async (req, res) => {
    const mentorshipId = req.params.id;

    try {
      const deleted = await mentorshipService.delete(mentorshipId);
      
      if (!deleted) {
        throw ErrorFactory.notFound('Mentorship not found');
      }

      return ResponseFormatter.sendSuccess(res, null, 'Mentorship ended successfully');

    } catch (error) {
      console.error(`Error deleting mentorship ${mentorshipId}:`, error);
      if (error.message.includes('not found')) {
        throw ErrorFactory.notFound('Mentorship not found');
      }
      throw ErrorFactory.internalServer('Failed to end mentorship');
    }
  })
);

/**
 * GET /api/mentorships/:id/stats
 * Get mentorship statistics (for mentors)
 */
router.get('/:id/stats',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'view:stats',
    getResourceId: (req) => req.params.id,
  }),
  validateParams(IdParamSchema),
  enhancedAsyncHandler(async (req, res) => {
    const mentorshipId = req.params.id;
    const userId = req.user.id;

    try {
      // Verify user has access to this mentorship
      await mentorshipService.getMentorshipWithDetails(mentorshipId, userId);

      // Get mentorship statistics (assuming mentor)
      const stats = await mentorshipService.getMentorshipStats(userId);
      
      return ResponseFormatter.sendSuccess(res, { stats }, 'Mentorship statistics retrieved successfully');

    } catch (error) {
      console.error(`Error getting mentorship stats ${mentorshipId}:`, error);
      if (error.message.includes('not found')) {
        throw ErrorFactory.notFound('Mentorship not found');
      }
      if (error.message.includes('Access denied')) {
        throw ErrorFactory.forbidden('Access denied to mentorship statistics');
      }
      throw ErrorFactory.internalServer('Failed to retrieve mentorship statistics');
    }
  })
);

// ===== MENTORSHIP NOTES ROUTES =====

/**
 * GET /api/mentorships/:id/notes
 * Get all notes for a mentorship with pagination and filtering
 */
router.get('/:id/notes',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'view:notes',
    getResourceId: (req) => req.params.id,
  }),
  validateParams(IdParamSchema),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    note_type: Joi.string().valid('progress', 'concern', 'achievement', 'general').optional(),
    include_private: Joi.boolean().default(false)
  })),
  enhancedAsyncHandler(async (req, res) => {
    const mentorshipId = req.params.id;
    const userId = req.user.id;
    const { page, limit, note_type, include_private } = req.query;

    try {
      const result = await notesService.getNotesByMentorship(mentorshipId, userId, {
        page,
        limit,
        note_type,
        include_private
      });

      return ResponseFormatter.sendSuccess(res, result, 'Notes retrieved successfully');

    } catch (error) {
      console.error(`Error getting notes for mentorship ${mentorshipId}:`, error);
      if (error.message.includes('not found')) {
        throw ErrorFactory.notFound('Mentorship not found');
      }
      if (error.message.includes('Access denied')) {
        throw ErrorFactory.forbidden('Access denied to mentorship notes');
      }
      throw ErrorFactory.internalServer('Failed to retrieve notes');
    }
  })
);

/**
 * POST /api/mentorships/:id/notes
 * Create new note for mentorship (mentors only)
 */
router.post('/:id/notes',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'create:notes',
    getResourceId: (req) => req.params.id,
  }),
  validateParams(IdParamSchema),
  validateBody(MentorshipSchemas.noteCreate),
  enhancedAsyncHandler(async (req, res) => {
    const mentorshipId = req.params.id;
    const userId = req.user.id;
    const noteData = {
      ...req.body,
      mentorship_id: mentorshipId,
      author_id: userId
    };

    try {
      const note = await notesService.createNote(noteData);
      
      return ResponseFormatter.sendCreated(
        res, 
        { note }, 
        'Note created successfully',
        `/api/mentorships/${mentorshipId}/notes/${note.id}`
      );

    } catch (error) {
      console.error(`Error creating note for mentorship ${mentorshipId}:`, error);
      if (error.message.includes('not found')) {
        throw ErrorFactory.notFound('Mentorship not found');
      }
      if (error.message.includes('Access denied')) {
        throw ErrorFactory.forbidden('Access denied to create notes');
      }
      throw ErrorFactory.internalServer('Failed to create note');
    }
  })
);

/**
 * PUT /api/mentorships/:id/notes/:noteId
 * Update existing note
 */
router.put('/:id/notes/:noteId',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'update:notes',
    getResourceId: (req) => req.params.id,
  }),
  validateParams(NoteIdParamSchema),
  validateBody(MentorshipSchemas.noteUpdate),
  enhancedAsyncHandler(async (req, res) => {
    const { noteId } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    try {
      const updatedNote = await notesService.updateNote(noteId, updateData, userId);
      
      return ResponseFormatter.sendSuccess(res, { note: updatedNote }, 'Note updated successfully');

    } catch (error) {
      console.error(`Error updating note ${noteId}:`, error);
      if (error.message.includes('not found')) {
        throw ErrorFactory.notFound('Note not found');
      }
      if (error.message.includes('Access denied')) {
        throw ErrorFactory.forbidden('Access denied to update this note');
      }
      throw ErrorFactory.internalServer('Failed to update note');
    }
  })
);

/**
 * DELETE /api/mentorships/:id/notes/:noteId
 * Delete note
 */
router.delete('/:id/notes/:noteId',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'delete:notes',
    getResourceId: (req) => req.params.id,
  }),
  validateParams(NoteIdParamSchema),
  enhancedAsyncHandler(async (req, res) => {
    const { noteId } = req.params;
    const userId = req.user.id;

    try {
      const deleted = await notesService.deleteNote(noteId, userId);
      
      if (!deleted) {
        throw ErrorFactory.notFound('Note not found');
      }

      return ResponseFormatter.sendSuccess(res, null, 'Note deleted successfully');

    } catch (error) {
      console.error(`Error deleting note ${noteId}:`, error);
      if (error.message.includes('not found')) {
        throw ErrorFactory.notFound('Note not found');
      }
      if (error.message.includes('Access denied')) {
        throw ErrorFactory.forbidden('Access denied to delete this note');
      }
      throw ErrorFactory.internalServer('Failed to delete note');
    }
  })
);

// ===== DOCUMENT MANAGEMENT ROUTES =====

/**
 * GET /api/mentorships/:id/documents
 * List documents for mentorship
 */
router.get('/:id/documents',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'view:documents',
    getResourceId: (req) => req.params.id,
  }),
  validateParams(IdParamSchema),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })),
  enhancedAsyncHandler(async (req, res) => {
    const mentorshipId = req.params.id;
    const userId = req.user.id;
    const { page, limit } = req.query;

    try {
      const result = await documentService.getDocumentsByMentorship(mentorshipId, userId, {
        page,
        limit
      });

      return ResponseFormatter.sendSuccess(res, result, 'Documents retrieved successfully');

    } catch (error) {
      console.error(`Error getting documents for mentorship ${mentorshipId}:`, error);
      if (error.message.includes('not found')) {
        throw ErrorFactory.notFound('Mentorship not found');
      }
      if (error.message.includes('Access denied')) {
        throw ErrorFactory.forbidden('Access denied to mentorship documents');
      }
      throw ErrorFactory.internalServer('Failed to retrieve documents');
    }
  })
);

/**
 * POST /api/mentorships/:id/documents
 * Upload document for mentorship
 */
router.post('/:id/documents',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'create:documents',
    getResourceId: (req) => req.params.id,
  }),
  validateParams(IdParamSchema),
  mentorshipUploader.single('document'),
  mentorshipFileSecurity,
  mentorshipVirusScan,
  enhancedAsyncHandler(async (req, res) => {
    const mentorshipId = req.params.id;
    const userId = req.user.id;

    if (!req.file) {
      throw ErrorFactory.badRequest('No file uploaded');
    }

    try {
      const documentData = {
        mentorship_id: mentorshipId,
        uploaded_by: userId
      };

      const document = await documentService.uploadDocument(documentData, req.file);
      
      return ResponseFormatter.sendCreated(
        res, 
        { document }, 
        'Document uploaded successfully',
        `/api/mentorships/${mentorshipId}/documents/${document.id}`
      );

    } catch (error) {
      console.error(`Error uploading document for mentorship ${mentorshipId}:`, error);
      if (error.message.includes('not found')) {
        throw ErrorFactory.notFound('Mentorship not found');
      }
      if (error.message.includes('Access denied')) {
        throw ErrorFactory.forbidden('Access denied to upload documents');
      }
      if (error.message.includes('File size exceeds')) {
        throw ErrorFactory.badRequest(error.message);
      }
      if (error.message.includes('not allowed')) {
        throw ErrorFactory.badRequest('File type not allowed');
      }
      throw ErrorFactory.internalServer('Failed to upload document');
    }
  }),
  handleMentorshipUploadErrors
);

/**
 * GET /api/mentorships/:id/documents/:docId
 * Download document
 */
router.get('/:id/documents/:docId',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'view:documents',
    getResourceId: (req) => req.params.id,
  }),
  validateParams(DocumentIdParamSchema),
  enhancedAsyncHandler(async (req, res) => {
    const { docId } = req.params;
    const userId = req.user.id;

    try {
      const fileInfo = await documentService.downloadDocument(docId, userId);
      
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.originalName}"`);
      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Length', fileInfo.fileSize);
      
      return res.sendFile(path.resolve(fileInfo.filePath));

    } catch (error) {
      console.error(`Error downloading document ${docId}:`, error);
      if (error.message.includes('not found')) {
        throw ErrorFactory.notFound('Document not found');
      }
      if (error.message.includes('Access denied')) {
        throw ErrorFactory.forbidden('Access denied to download this document');
      }
      throw ErrorFactory.internalServer('Failed to download document');
    }
  })
);

/**
 * DELETE /api/mentorships/:id/documents/:docId
 * Delete document
 */
router.delete('/:id/documents/:docId',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'delete:documents',
    getResourceId: (req) => req.params.id,
  }),
  validateParams(DocumentIdParamSchema),
  enhancedAsyncHandler(async (req, res) => {
    const { docId } = req.params;
    const userId = req.user.id;

    try {
      const deleted = await documentService.deleteDocument(docId, userId);
      
      if (!deleted) {
        throw ErrorFactory.notFound('Document not found');
      }

      return ResponseFormatter.sendSuccess(res, null, 'Document deleted successfully');

    } catch (error) {
      console.error(`Error deleting document ${docId}:`, error);
      if (error.message.includes('not found')) {
        throw ErrorFactory.notFound('Document not found');
      }
      if (error.message.includes('Access denied')) {
        throw ErrorFactory.forbidden('Access denied to delete this document');
      }
      throw ErrorFactory.internalServer('Failed to delete document');
    }
  })
);

// ===== UTILITY ROUTES =====

/**
 * GET /api/mentorships/available-mentors/:menteeId
 * Get available mentors for a specific mentee (admin only)
 */
router.get('/available-mentors/:menteeId',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'manage',
    getResourceId: (req) => req.params.menteeId,
  }),
  validateParams(Joi.object({ menteeId: Joi.string().uuid().required() })),
  enhancedAsyncHandler(async (req, res) => {
    const { menteeId } = req.params;

    try {
      const availableMentors = await mentorshipService.findAvailableMentors(menteeId);
      
      return ResponseFormatter.sendSuccess(res, { mentors: availableMentors }, 'Available mentors retrieved successfully');

    } catch (error) {
      console.error(`Error getting available mentors for ${menteeId}:`, error);
      throw ErrorFactory.internalServer('Failed to retrieve available mentors');
    }
  })
);

export default router;