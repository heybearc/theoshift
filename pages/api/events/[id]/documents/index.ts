import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// Disable default body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Documents API called:', req.method)
    
    const { id: eventId } = req.query

    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ success: false, error: 'Event ID is required' })
    }

    // Verify event exists
    const event = await prisma.events.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' })
    }

    switch (req.method) {
      case 'GET':
        return handleGetDocuments(req, res, eventId)
      case 'POST':
        return handleUploadDocument(req, res, eventId, 'System Administrator')
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Documents API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGetDocuments(req: NextApiRequest, res: NextApiResponse, eventId: string) {
  try {
    // Fetch documents from database
    const documents = await prisma.event_documents.findMany({
      where: {
        eventId,
        isActive: true
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    })

    return res.status(200).json({
      success: true,
      data: { documents }
    })
  } catch (error) {
    console.error('Get documents error:', error)
    return res.status(500).json({ success: false, error: 'Failed to fetch documents' })
  }
}

async function handleUploadDocument(req: NextApiRequest, res: NextApiResponse, eventId: string, uploadedBy: string) {
  console.log('Upload document - Starting upload for event:', eventId, 'by:', uploadedBy)
  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'documents')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    // Parse form data
    const form = formidable({
      uploadDir: uploadsDir,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB limit
      filename: (name, ext, part) => {
        // Generate unique filename
        const uniqueId = crypto.randomBytes(16).toString('hex')
        const timestamp = Date.now()
        return `${timestamp}_${uniqueId}${ext}`
      }
    })

    const [fields, files] = await form.parse(req)

    const title = Array.isArray(fields.title) ? fields.title[0] : fields.title
    const description = Array.isArray(fields.description) ? fields.description[0] : fields.description
    const file = Array.isArray(files.file) ? files.file[0] : files.file

    if (!title || !file) {
      return res.status(400).json({ success: false, error: 'Title and file are required' })
    }

    // Get file info
    const fileName = file.originalFilename || 'unknown'
    const fileSize = file.size
    const fileType = file.mimetype || 'application/octet-stream'
    const filePath = file.filepath
    const fileUrl = `/uploads/documents/${path.basename(filePath)}`

    // Save document to database
    const document = await prisma.event_documents.create({
      data: {
        eventId,
        title,
        description: description || null,
        fileName,
        fileUrl,
        fileType,
        fileSize,
        uploadedBy,
        publishedTo: 'none',
        publishedCount: 0
      }
    })

    console.log('Document uploaded:', {
      eventId,
      title,
      fileName,
      fileSize,
      fileType,
      uploadedBy
    })

    return res.status(201).json({
      success: true,
      data: { document },
      message: 'Document uploaded successfully'
    })
  } catch (error) {
    console.error('Upload document error:', error)
    return res.status(500).json({ success: false, error: 'Failed to upload document' })
  }
}
