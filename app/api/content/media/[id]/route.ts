/**
 * Media Serving API
 * Serves uploaded files with permission checks and range support
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { stat } from 'fs/promises';


/**
 * GET /api/content/media/[id] - Serve uploaded file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const attachmentId = parseInt(id);

    if (!attachmentId || isNaN(attachmentId)) {
      return NextResponse.json(
        { error: 'Invalid attachment ID' },
        { status: 400 }
      );
    }

    // Get attachment record
    const attachment = await contentDb('content_attachments')
      .select([
        'content_attachments.*',
        'content_items.visibility',
        'content_items.status'
      ])
      .leftJoin('content_items', 'content_attachments.content_item_id', 'content_items.id')
      .where('content_attachments.id', attachmentId)
      .first();

    if (!attachment) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Check permissions for private content
    if (attachment.visibility === 'private' || attachment.status === 'deleted') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    try {
      // Check if file exists
      const fileStats = await stat(attachment.file_path);
      const fileBuffer = await fs.readFile(attachment.file_path);

      // Handle range requests for large files
      const range = request.headers.get('range');
      
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileStats.size - 1;
        
        const chunkSize = (end - start) + 1;
        const chunk = fileBuffer.slice(start, end + 1);

        return new NextResponse(chunk, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileStats.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Content-Type': attachment.mime_type,
          },
        });
      }

      // Regular file response
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': attachment.mime_type,
          'Content-Length': fileStats.size.toString(),
          'Cache-Control': 'public, max-age=31536000', // 1 year cache
          'ETag': `"${attachment.file_hash}"`,
        },
      });

    } catch (fileError) {
      console.error('Error reading file:', fileError);
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Error serving media file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/content/media/[id] - Delete uploaded file
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication - require admin for delete
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== 'admin-token') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const attachmentId = parseInt(id);

    if (!attachmentId || isNaN(attachmentId)) {
      return NextResponse.json(
        { error: 'Invalid attachment ID' },
        { status: 400 }
      );
    }

    // Check if file is referenced by multiple content items
    const references = await contentDb('content_attachments')
      .select([
        'content_items.id as content_id',
        'content_items.title'
      ])
      .join('content_items', 'content_attachments.content_item_id', 'content_items.id')
      .where('content_attachments.file_hash', function() {
        return this.select('file_hash')
          .from('content_attachments')
          .where('id', attachmentId)
          .first();
      })
      .where('content_items.status', '!=', 'deleted');

    if (references.length > 1) {
      return NextResponse.json(
        {
          error: 'File is referenced by multiple content items',
          references: references
        },
        { status: 409 }
      );
    }

    // Delete attachment record
    const deleted = await contentDb('content_attachments')
      .where('id', attachmentId)
      .del();

    if (!deleted) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting media file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}