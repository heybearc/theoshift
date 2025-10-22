import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session || session.user?.role !== 'ADMIN') {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const { id } = req.query
  
  if (typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid feedback ID' })
  }

  if (req.method === 'PATCH') {
    try {
      const { status } = req.body

      if (!status) {
        return res.status(400).json({ 
          success: false, 
          error: 'Status is required' 
        })
      }

      // Validate status value
      const validStatuses = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
      const upperStatus = status.toUpperCase()
      
      if (!validStatuses.includes(upperStatus)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid status value' 
        })
      }

      // Verify feedback exists
      const existingFeedback = await prisma.feedback.findUnique({
        where: { id }
      })

      if (!existingFeedback) {
        return res.status(404).json({ success: false, error: 'Feedback not found' })
      }

      // Update feedback status
      const updatedFeedback = await prisma.feedback.update({
        where: { id },
        data: { 
          status: upperStatus,
          updatedAt: new Date()
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      })

      return res.json({
        success: true,
        data: {
          id: updatedFeedback.id,
          status: updatedFeedback.status.toLowerCase(),
          updatedAt: updatedFeedback.updatedAt.toISOString()
        }
      })
    } catch (error) {
      console.error('Error updating status:', error)
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update status' 
      })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
