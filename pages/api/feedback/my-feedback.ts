import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.user?.email) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    try {
      // Find user by email
      const user = await prisma.users.findUnique({
        where: { email: session.user.email }
      })

      if (!user) {
        return res.json({
          success: true,
          data: {
            feedback: [],
            message: 'No feedback found'
          }
        })
      }

      // Fetch user's feedback with comments and attachments
      const feedback = await prisma.feedback.findMany({
        where: {
          submittedBy: user.id
        },
        include: {
          feedback_attachments: true,
          feedback_comments: {
            include: {
              users: {
                select: {
                  firstName: true,
                  lastName: true,
                  role: true
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      // Transform data for frontend
      const transformedFeedback = feedback.map(item => ({
        id: item.id,
        type: item.type.toLowerCase(),
        title: item.title,
        description: item.description,
        priority: item.priority.toLowerCase(),
        status: item.status.toLowerCase().replace('_', '_'),
        submittedAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        comments: (item.feedback_comments || []).map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          author: comment.users ? `${comment.users.firstName} ${comment.users.lastName}` : 'Unknown',
          createdAt: comment.createdAt.toISOString()
        })),
        attachments: (item.feedback_attachments || []).map((attachment: any) => ({
          id: attachment.id,
          filename: attachment.filename,
          url: attachment.filePath,
          size: attachment.fileSize
        }))
      }))

      return res.json({
        success: true,
        data: {
          feedback: transformedFeedback,
          total: transformedFeedback.length
        }
      })
    } catch (error) {
      console.error('Error fetching user feedback:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch feedback' })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
