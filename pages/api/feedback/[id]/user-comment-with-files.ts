import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'
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

  const { id } = req.query
  
  if (typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid feedback ID' })
  }

  if (req.method === 'POST') {
    try {
      // Parse form data including files
      const form = formidable({
        uploadDir: path.join(process.cwd(), 'public', 'uploads', 'feedback'),
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5
      })

      // Ensure upload directory exists
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'feedback')
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }

      const [fields, files] = await form.parse(req)

      // Extract comment content
      const content = Array.isArray(fields.content) ? fields.content[0] : fields.content

      // Validate that we have either content or files
      if (!content?.trim() && Object.keys(files).length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Comment must have content or attachments' 
        })
      }

      // Find the user
      const user = await prisma.users.findUnique({
        where: { email: session.user.email }
      })

      if (!user) {
        return res.status(401).json({ success: false, error: 'User not found' })
      }

      // Verify feedback exists and belongs to the user
      const feedback = await prisma.feedback.findUnique({
        where: { id }
      })

      if (!feedback) {
        return res.status(404).json({ success: false, error: 'Feedback not found' })
      }

      if (feedback.submittedBy !== user.id) {
        return res.status(403).json({ success: false, error: 'You can only comment on your own feedback' })
      }

      // Check if feedback is still active (only allow comments on NEW or IN_PROGRESS)
      if (!['NEW', 'IN_PROGRESS'].includes(feedback.status)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Comments can only be added to feedback that is new or in progress' 
        })
      }

      // Create comment
      const comment = await prisma.feedback_comments.create({
        data: {
          feedbackId: id,
          authorId: user.id,
          content: content?.trim() || `[File attachment${Object.keys(files).length > 1 ? 's' : ''}]`
        },
        include: {
          author: {
            select: {
              firstName: true,
              lastName: true,
              role: true
            }
          }
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
          const filename = `comment_${timestamp}_${randomStr}${extension}`
          const newPath = path.join(uploadDir, filename)

          // Move file to permanent location
          fs.renameSync(file.filepath, newPath)

          // Create attachment record
          return prisma.feedback_attachments.create({
            data: {
              feedbackId: id,
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

      // Update feedback timestamp
      await prisma.feedback.update({
        where: { id },
        data: { updatedAt: new Date() }
      })

      console.log('User comment added with attachments:', {
        commentId: comment.id,
        feedbackId: id,
        attachmentCount: validAttachments.length
      })

      return res.json({
        success: true,
        data: {
          id: comment.id,
          content: comment.content,
          author: `${comment.author.firstName} ${comment.author.lastName}`,
          createdAt: comment.createdAt.toISOString(),
          attachmentCount: validAttachments.length
        }
      })
    } catch (error) {
      console.error('Error adding user comment with files:', error)
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to add comment' 
      })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
