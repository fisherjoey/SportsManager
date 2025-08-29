/**
 * File Upload API for Content Management
 * Handles file uploads with deduplication and validation
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';


// Allowed file types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'audio/mp3',
  'audio/wav',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/content/upload - Upload file with deduplication
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const contentItemId = formData.get('content_item_id') as string;
    const isEmbedded = formData.get('is_embedded') === 'true';
    const altText = formData.get('alt_text') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'File size exceeds limit',
          max_size: MAX_FILE_SIZE,
          actual_size: file.size
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'File type not allowed',
          allowed_types: ALLOWED_MIME_TYPES
        },
        { status: 400 }
      );
    }

    // Read file buffer and calculate hash
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Sanitize filename
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .replace(/\.+/g, '.')
      .replace(/-+/g, '-');

    // Determine attachment type
    let attachmentType: string;
    if (file.type.startsWith('image/')) {
      attachmentType = 'image';
    } else if (file.type.startsWith('video/')) {
      attachmentType = 'video';
    } else if (file.type.startsWith('audio/')) {
      attachmentType = 'audio';
    } else if (file.type === 'application/pdf' || file.type.includes('document')) {
      attachmentType = 'document';
    } else {
      attachmentType = 'other';
    }

    // Create upload directory structure
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', attachmentType + 's', String(year), month);

    try {
      await fs.mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }

    // Generate unique filename using hash
    const fileExtension = path.extname(sanitizedName);
    const fileName = `${fileHash}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);
    const relativePath = path.posix.join('/uploads', attachmentType + 's', String(year), month, fileName);

    // Check if file with same hash already exists
    const existingFile = await contentDb('content_attachments')
      .where('file_hash', fileHash)
      .first();

    let fileUrl = relativePath;
    
    // Only write file if it doesn't exist (deduplication)
    if (!existingFile) {
      try {
        await fs.writeFile(filePath, buffer);
      } catch (error) {
        console.error('Error writing file:', error);
        return NextResponse.json(
          { error: 'Failed to save file' },
          { status: 500 }
        );
      }
    } else {
      // Use existing file URL
      fileUrl = existingFile.file_url;
    }

    // Create database record for this attachment
    const [attachment] = await contentDb('content_attachments')
      .insert({
        content_item_id: contentItemId ? parseInt(contentItemId) : null,
        file_name: sanitizedName,
        file_path: existingFile ? existingFile.file_path : filePath,
        file_url: fileUrl,
        file_hash: fileHash,
        file_size: file.size,
        mime_type: file.type,
        attachment_type: attachmentType,
        is_embedded: isEmbedded,
        alt_text: altText || null,
        uploaded_by: null // Would be set from auth token in real app
      })
      .returning('*');

    // Format response
    const response = {
      id: attachment.id,
      file_url: fileUrl,
      file_name: sanitizedName,
      file_size: file.size,
      file_hash: fileHash,
      mime_type: file.type,
      attachment_type: attachmentType,
      is_embedded: isEmbedded,
      alt_text: altText || null,
      created_at: attachment.created_at
    };

    // TinyMCE expects 'location' field
    if (request.headers.get('x-requested-with') === 'TinyMCE') {
      response.location = fileUrl;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}