import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session || session.user?.role !== 'ADMIN') {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    try {
      // Fetch real feedback from database
      const feedback = await prisma.feedback.findMany({
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          attachments: true,
          comments: {
            include: {
              author: {
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
        submittedBy: {
          name: `${item.user.firstName} ${item.user.lastName}`,
          email: item.user.email,
          role: item.user.role
        },
        submittedAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        comments: item.comments.map(comment => ({
          id: comment.id,
          content: comment.content,
          author: `${comment.author.firstName} ${comment.author.lastName}`,
          createdAt: comment.createdAt.toISOString()
        })),
        attachments: item.attachments.map(attachment => ({
          id: attachment.id,
          filename: attachment.filename,
          url: attachment.filePath,
          size: attachment.fileSize
        }))
      }))

      // Calculate stats
      const stats = {
        total: transformedFeedback.length,
        new: transformedFeedback.filter(f => f.status === 'new').length,
        inProgress: transformedFeedback.filter(f => f.status === 'in_progress').length,
        resolved: transformedFeedback.filter(f => f.status === 'resolved').length
      }

      return res.json({
        success: true,
        data: {
          feedback: transformedFeedback,
          stats
        }
      })
    } catch (error) {
      console.error('Error fetching feedback:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch feedback' })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
