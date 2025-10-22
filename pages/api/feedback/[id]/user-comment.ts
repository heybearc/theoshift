import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'

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
      const { content } = req.body

      if (!content || !content.trim()) {
        return res.status(400).json({ 
          success: false, 
          error: 'Comment content is required' 
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

      // Create comment
      const comment = await prisma.feedback_comments.create({
        data: {
          feedbackId: id,
          authorId: user.id,
          content: content.trim()
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

      // Update feedback timestamp
      await prisma.feedback.update({
        where: { id },
        data: { updatedAt: new Date() }
      })

      return res.json({
        success: true,
        data: {
          id: comment.id,
          content: comment.content,
          author: `${comment.author.firstName} ${comment.author.lastName}`,
          createdAt: comment.createdAt.toISOString()
        }
      })
    } catch (error) {
      console.error('Error adding user comment:', error)
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to add comment' 
      })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
