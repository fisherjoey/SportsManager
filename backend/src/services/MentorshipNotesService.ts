// @ts-nocheck

/**
 * MentorshipNotesService - Mentorship notes management service
 * 
 * This service extends BaseService to provide specialized mentorship note management
 * operations, including rich text content handling, note categorization, privacy controls,
 * and authorization ensuring mentors can only manage their own notes.
 * 
 * Key Features:
 * - Complete CRUD operations for mentorship notes
 * - Support for rich text content from TinyMCE editor
 * - Note categorization (progress, concern, achievement, general)
 * - Privacy controls with is_private flag for mentor-only notes
 * - Authorization controls ensuring proper access permissions
 * - Filtering and sorting capabilities for notes
 * - Note statistics and progress tracking
 * - HTML content sanitization for security
 */

import BaseService from './BaseService';

class MentorshipNotesService extends BaseService {
  /**
   * Constructor for MentorshipNotesService
   * @param {Object} db - Knex database instance
   */
  constructor(db) {
    super('mentorship_notes', db, {
      defaultOrderBy: 'created_at',
      defaultOrderDirection: 'desc',
      enableAuditTrail: true,
      throwOnNotFound: true
    });
  }

  /**
   * Create a new mentorship note
   * @param {Object} noteData - Note data
   * @param {string} noteData.mentorship_id - ID of the mentorship relationship
   * @param {string} noteData.author_id - ID of the note author (must be mentor)
   * @param {string} noteData.title - Title of the note
   * @param {string} noteData.content - Rich text content from TinyMCE
   * @param {string} [noteData.note_type='general'] - Type of note
   * @param {boolean} [noteData.is_private=false] - Privacy setting
   * @param {Object} options - Creation options
   * @returns {Object} Created note record
   * @throws {Error} If authorization fails or validation errors occur
   */
  async createNote(noteData, options = {}) {
    try {
      const { 
        mentorship_id, 
        author_id, 
        title, 
        content, 
        note_type = 'general', 
        is_private = false 
      } = noteData;

      // Validate required fields
      if (!mentorship_id || !author_id || !title || !content) {
        throw new Error('mentorship_id, author_id, title, and content are required');
      }

      // Validate note_type
      const validNoteTypes = ['progress', 'concern', 'achievement', 'general'];
      if (!validNoteTypes.includes(note_type)) {
        throw new Error(`Invalid note_type: ${note_type}. Must be one of: ${validNoteTypes.join(', ')}`);
      }

      // Verify mentorship exists and author is the mentor
      await this.validateMentorshipAccess(mentorship_id, author_id, 'write');

      // Sanitize content (basic HTML sanitization)
      const sanitizedContent = this.sanitizeHtmlContent(content);

      const noteRecord = {
        mentorship_id,
        author_id,
        title: title.trim(),
        content: sanitizedContent,
        note_type,
        is_private
      };

      const note = await this.create(noteRecord, options);

      console.log(`Mentorship note created: ${note.id} (${note_type}, private: ${is_private})`);
      return note;

    } catch (error) {
      console.error('Error creating mentorship note:', error);
      throw new Error(`Failed to create note: ${error.message}`);
    }
  }

  /**
   * Get notes for a specific mentorship
   * @param {string} mentorshipId - Mentorship ID
   * @param {string} requestingUserId - ID of user requesting notes
   * @param {Object} options - Query options
   * @param {string} [options.note_type] - Filter by note type
   * @param {boolean} [options.include_private] - Include private notes (mentor only)
   * @param {number} [options.page=1] - Page number for pagination
   * @param {number} [options.limit=20] - Number of notes per page
   * @returns {Object} Paginated notes with metadata
   */
  async getNotesByMentorship(mentorshipId, requestingUserId, options = {}) {
    try {
      const { 
        note_type, 
        include_private = false, 
        page = 1, 
        limit = 20 
      } = options;

      // Verify access to the mentorship
      const mentorship = await this.validateMentorshipAccess(mentorshipId, requestingUserId, 'read');

      // Determine if user can see private notes (only mentor can)
      const canSeePrivate = mentorship.mentor_id === requestingUserId && include_private;

      let query = this.db('mentorship_notes')
        .leftJoin('users', 'mentorship_notes.author_id', 'users.id')
        .select(
          'mentorship_notes.*',
          'users.name as author_name'
        )
        .where('mentorship_notes.mentorship_id', mentorshipId);

      // Apply privacy filter
      if (!canSeePrivate) {
        query = query.where('mentorship_notes.is_private', false);
      }

      // Apply note type filter
      if (note_type) {
        query = query.where('mentorship_notes.note_type', note_type);
      }

      // Get total count for pagination
      const countQuery = query.clone().clearSelect().count('* as total').first();

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query
        .orderBy('mentorship_notes.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      // Execute queries
      const [notes, countResult] = await Promise.all([
        query,
        countQuery
      ]);

      const total = parseInt(countResult.total) || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: notes,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        meta: {
          canSeePrivate,
          mentorship_id: mentorshipId
        }
      };

    } catch (error) {
      console.error(`Error getting notes for mentorship ${mentorshipId}:`, error);
      throw new Error(`Failed to get notes: ${error.message}`);
    }
  }

  /**
   * Get a specific note by ID
   * @param {string} noteId - Note ID
   * @param {string} requestingUserId - ID of user requesting the note
   * @param {Object} options - Query options
   * @returns {Object} Note record with metadata
   * @throws {Error} If access is denied or note not found
   */
  async getNoteById(noteId, requestingUserId, options = {}) {
    try {
      const note = await this.db('mentorship_notes')
        .leftJoin('users', 'mentorship_notes.author_id', 'users.id')
        .leftJoin('mentorships', 'mentorship_notes.mentorship_id', 'mentorships.id')
        .select(
          'mentorship_notes.*',
          'users.name as author_name',
          'mentorships.mentor_id',
          'mentorships.mentee_id'
        )
        .where('mentorship_notes.id', noteId)
        .first();

      if (!note) {
        throw new Error('Note not found');
      }

      // Check access permissions
      const hasAccess = note.mentor_id === requestingUserId || note.mentee_id === requestingUserId;
      if (!hasAccess) {
        throw new Error('Access denied: You can only view notes from your own mentorship relationships');
      }

      // Check privacy permissions
      if (note.is_private && note.mentor_id !== requestingUserId) {
        throw new Error('Access denied: This is a private note visible only to the mentor');
      }

      return note;

    } catch (error) {
      console.error(`Error getting note ${noteId}:`, error);
      throw new Error(`Failed to get note: ${error.message}`);
    }
  }

  /**
   * Update an existing note
   * @param {string} noteId - Note ID
   * @param {Object} updateData - Data to update
   * @param {string} requestingUserId - ID of user making the update
   * @param {Object} options - Update options
   * @returns {Object} Updated note record
   * @throws {Error} If user is not the author or validation fails
   */
  async updateNote(noteId, updateData, requestingUserId, options = {}) {
    try {
      // Get existing note and verify ownership
      const existingNote = await this.db('mentorship_notes')
        .where('id', noteId)
        .first();

      if (!existingNote) {
        throw new Error('Note not found');
      }

      if (existingNote.author_id !== requestingUserId) {
        throw new Error('Access denied: You can only edit your own notes');
      }

      // Validate update data
      const allowedFields = ['title', 'content', 'note_type', 'is_private'];
      const filteredData = {};

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          filteredData[key] = updateData[key];
        }
      });

      // Validate note_type if being updated
      if (filteredData.note_type) {
        const validNoteTypes = ['progress', 'concern', 'achievement', 'general'];
        if (!validNoteTypes.includes(filteredData.note_type)) {
          throw new Error(`Invalid note_type: ${filteredData.note_type}. Must be one of: ${validNoteTypes.join(', ')}`);
        }
      }

      // Sanitize content if being updated
      if (filteredData.content) {
        filteredData.content = this.sanitizeHtmlContent(filteredData.content);
      }

      // Trim title if being updated
      if (filteredData.title) {
        filteredData.title = filteredData.title.trim();
      }

      if (Object.keys(filteredData).length === 0) {
        throw new Error('No valid fields to update');
      }

      const updatedNote = await this.update(noteId, filteredData, options);

      console.log(`Mentorship note updated: ${noteId}`);
      return updatedNote;

    } catch (error) {
      console.error(`Error updating note ${noteId}:`, error);
      throw new Error(`Failed to update note: ${error.message}`);
    }
  }

  /**
   * Delete a note
   * @param {string} noteId - Note ID
   * @param {string} requestingUserId - ID of user requesting deletion
   * @param {Object} options - Delete options
   * @returns {boolean} Success status
   * @throws {Error} If user is not the author
   */
  async deleteNote(noteId, requestingUserId, options = {}) {
    try {
      // Get existing note and verify ownership
      const existingNote = await this.db('mentorship_notes')
        .where('id', noteId)
        .first();

      if (!existingNote) {
        if (this.options.throwOnNotFound) {
          throw new Error('Note not found');
        }
        return false;
      }

      if (existingNote.author_id !== requestingUserId) {
        throw new Error('Access denied: You can only delete your own notes');
      }

      const deleted = await this.delete(noteId, options);

      console.log(`Mentorship note deleted: ${noteId}`);
      return deleted;

    } catch (error) {
      console.error(`Error deleting note ${noteId}:`, error);
      throw new Error(`Failed to delete note: ${error.message}`);
    }
  }

  /**
   * Get note statistics for a mentorship
   * @param {string} mentorshipId - Mentorship ID
   * @param {string} requestingUserId - ID of user requesting stats
   * @returns {Object} Statistics object
   */
  async getNoteStatistics(mentorshipId, requestingUserId) {
    try {
      // Verify access to the mentorship
      const mentorship = await this.validateMentorshipAccess(mentorshipId, requestingUserId, 'read');

      // Get comprehensive statistics
      const stats = await this.db('mentorship_notes')
        .select(
          this.db.raw('COUNT(*) as total_notes'),
          this.db.raw('COUNT(CASE WHEN note_type = \'progress\' THEN 1 END) as progress_notes'),
          this.db.raw('COUNT(CASE WHEN note_type = \'concern\' THEN 1 END) as concern_notes'),
          this.db.raw('COUNT(CASE WHEN note_type = \'achievement\' THEN 1 END) as achievement_notes'),
          this.db.raw('COUNT(CASE WHEN note_type = \'general\' THEN 1 END) as general_notes'),
          this.db.raw('COUNT(CASE WHEN is_private = true THEN 1 END) as private_notes'),
          this.db.raw('MAX(created_at) as latest_note_date')
        )
        .where('mentorship_id', mentorshipId)
        .first();

      return {
        total: parseInt(stats.total_notes) || 0,
        by_type: {
          progress: parseInt(stats.progress_notes) || 0,
          concern: parseInt(stats.concern_notes) || 0,
          achievement: parseInt(stats.achievement_notes) || 0,
          general: parseInt(stats.general_notes) || 0
        },
        private_notes: parseInt(stats.private_notes) || 0,
        latest_note_date: stats.latest_note_date,
        can_see_private: mentorship.mentor_id === requestingUserId
      };

    } catch (error) {
      console.error(`Error getting note statistics for mentorship ${mentorshipId}:`, error);
      throw new Error(`Failed to get note statistics: ${error.message}`);
    }
  }

  /**
   * Search notes within a mentorship
   * @param {string} mentorshipId - Mentorship ID
   * @param {string} searchQuery - Search query
   * @param {string} requestingUserId - ID of user performing search
   * @param {Object} options - Search options
   * @returns {Array} Matching notes
   */
  async searchNotes(mentorshipId, searchQuery, requestingUserId, options = {}) {
    try {
      const { note_type, include_private = false, limit = 50 } = options;

      // Verify access to the mentorship
      const mentorship = await this.validateMentorshipAccess(mentorshipId, requestingUserId, 'read');

      // Determine if user can see private notes
      const canSeePrivate = mentorship.mentor_id === requestingUserId && include_private;

      let query = this.db('mentorship_notes')
        .leftJoin('users', 'mentorship_notes.author_id', 'users.id')
        .select(
          'mentorship_notes.*',
          'users.name as author_name'
        )
        .where('mentorship_notes.mentorship_id', mentorshipId)
        .where(function() {
          this.where('mentorship_notes.title', 'ilike', `%${searchQuery}%`)
              .orWhere('mentorship_notes.content', 'ilike', `%${searchQuery}%`);
        });

      // Apply privacy filter
      if (!canSeePrivate) {
        query = query.where('mentorship_notes.is_private', false);
      }

      // Apply note type filter
      if (note_type) {
        query = query.where('mentorship_notes.note_type', note_type);
      }

      const results = await query
        .orderBy('mentorship_notes.created_at', 'desc')
        .limit(limit);

      return results;

    } catch (error) {
      console.error(`Error searching notes in mentorship ${mentorshipId}:`, error);
      throw new Error(`Failed to search notes: ${error.message}`);
    }
  }

  /**
   * Validate mentorship access for note operations
   * @private
   * @param {string} mentorshipId - Mentorship ID
   * @param {string} userId - User ID to validate
   * @param {string} operation - Operation type ('read' or 'write')
   * @returns {Object} Mentorship record
   * @throws {Error} If access is denied
   */
  async validateMentorshipAccess(mentorshipId, userId, operation = 'read') {
    try {
      const mentorship = await this.db('mentorships')
        .where('id', mentorshipId)
        .first();

      if (!mentorship) {
        throw new Error('Mentorship not found');
      }

      const isMentor = mentorship.mentor_id === userId;
      const isMentee = mentorship.mentee_id === userId;

      if (!isMentor && !isMentee) {
        throw new Error('Access denied: You can only access notes from your own mentorship relationships');
      }

      // For write operations, only mentors can create/edit notes
      if (operation === 'write' && !isMentor) {
        throw new Error('Access denied: Only mentors can create and edit notes');
      }

      return mentorship;

    } catch (error) {
      console.error(`Error validating mentorship access ${mentorshipId} for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Basic HTML content sanitization for security
   * @private
   * @param {string} content - HTML content to sanitize
   * @returns {string} Sanitized content
   */
  sanitizeHtmlContent(content) {
    if (!content || typeof content !== 'string') {
      return '';
    }

    // Basic sanitization - remove potentially dangerous tags and attributes
    // In production, consider using a proper HTML sanitization library like DOMPurify
    let sanitized = content
      // Remove script tags and content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove on* event handlers
      .replace(/\s*on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/\s*on\w+\s*=\s*'[^']*'/gi, '')
      // Remove javascript: links
      .replace(/javascript:/gi, '')
      // Remove potentially dangerous attributes
      .replace(/\s*(href|src|action)\s*=\s*["']javascript:[^"']*["']/gi, '');

    return sanitized.trim();
  }

  /**
   * Hook called after note creation
   * @param {Object} note - Created note
   * @param {Object} options - Creation options
   */
  async afterCreate(note, options) {
    if (this.options.enableAuditTrail) {
      console.log(`Mentorship note created: ${note.id} (mentorship: ${note.mentorship_id}, type: ${note.note_type})`);
    }
  }

  /**
   * Hook called after note update
   * @param {Object} note - Updated note
   * @param {Object} previousNote - Previous note state
   * @param {Object} options - Update options
   */
  async afterUpdate(note, previousNote, options) {
    if (this.options.enableAuditTrail) {
      const changes = [];
      if (previousNote.title !== note.title) changes.push('title');
      if (previousNote.content !== note.content) changes.push('content');
      if (previousNote.note_type !== note.note_type) changes.push('type');
      if (previousNote.is_private !== note.is_private) changes.push('privacy');

      if (changes.length > 0) {
        console.log(`Mentorship note updated: ${note.id}, changed: ${changes.join(', ')}`);
      }
    }
  }
}

export default MentorshipNotesService;