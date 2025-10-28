import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

// Disable default body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.user?.email) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  if (req.method === 'POST') {
    try {
      console.log('🔍 FEEDBACK SUBMIT: Starting form parse')
      
      // Ensure upload directory exists FIRST
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'feedback')
      console.log('📁 Upload directory:', uploadDir)
      
      if (!fs.existsSync(uploadDir)) {
        console.log('📁 Creating upload directory...')
        fs.mkdirSync(uploadDir, { recursive: true })
      }

      // Parse form data including files
      const form = formidable({
        uploadDir: uploadDir,
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5
      })

      console.log('📝 Parsing form data...')
      const [fields, files] = await form.parse(req)
      console.log('✅ Form parsed successfully:', { fields: Object.keys(fields), files: Object.keys(files) })

      // Extract form fields
      const type = Array.isArray(fields.type) ? fields.type[0] : fields.type
      const title = Array.isArray(fields.title) ? fields.title[0] : fields.title
      const description = Array.isArray(fields.description) ? fields.description[0] : fields.description
      const priority = Array.isArray(fields.priority) ? fields.priority[0] : fields.priority

      // Validate required fields
      if (!type || !title || !description) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: type, title, description' 
        })
      }

      // Find or create user
      let user = await prisma.users.findUnique({
        where: { email: session.user.email }
      })

      if (!user) {
        user = await prisma.users.create({
          data: {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: session.user.email,
            firstName: session.user.name?.split(' ')[0] || 'Unknown',
            lastName: session.user.name?.split(' ').slice(1).join(' ') || 'User',
            role: (session.user.role as any) || 'ADMIN',
            isActive: true,
            updatedAt: new Date()
          }
        })
      }

      // Create feedback record
      const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const feedback = await prisma.feedback.create({
        data: {
          id: feedbackId,
          type: type.toUpperCase(),
          title: title.trim(),
          description: description.trim(),
          priority: (priority || 'MEDIUM').toUpperCase(),
          submittedBy: user.id
        }
      })

      // Process uploaded files
      const attachmentPromises = Object.entries(files)
        .filter(([key]) => key.startsWith('attachment_'))
        .map(async ([key, fileArray]) => {
          const file = Array.isArray(fileArray) ? fileArray[0] : fileArray
          if (!file) return null

          // Generate unique filename
          const timestamp = Date.now()
          const randomStr = Math.random().toString(36).substr(2, 9)
          const extension = path.extname(file.originalFilename || '')
          const filename = `${timestamp}_${randomStr}${extension}`
          const newPath = path.join(uploadDir, filename)

          // Move file to permanent location
          fs.renameSync(file.filepath, newPath)

          // Create attachment record
          const attachmentId = `attachment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          return prisma.feedback_attachments.create({
            data: {
              id: attachmentId,
              feedbackId: feedback.id,
              filename: file.originalFilename || filename,
              filePath: `/uploads/feedback/${filename}`,
              fileSize: file.size || 0,
              mimeType: file.mimetype || 'application/octet-stream'
            }
          })
        })

      // Wait for all attachments to be processed
      const attachments = await Promise.all(attachmentPromises)
      const validAttachments = attachments.filter(Boolean)

      console.log('Feedback submitted with attachments:', {
        feedbackId: feedback.id,
        attachmentCount: validAttachments.length
      })

      return res.json({
        success: true,
        data: {
          id: feedback.id,
          attachmentCount: validAttachments.length,
          message: 'Feedback submitted successfully'
        }
      })
    } catch (error) {
      console.error('❌ Error submitting feedback with files:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to submit feedback',
        details: error instanceof Error ? error.stack : undefined
      })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
