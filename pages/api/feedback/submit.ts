import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.user?.email) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  // Find the user by email to get their ID, or create if admin
  let user = await prisma.users.findUnique({
    where: { email: session.user.email }
  })

  // If user doesn't exist and they're authenticated, create a basic user record
  if (!user) {
    // For admin users or authenticated users, create a minimal user record
    try {
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
    } catch (createError) {
      console.error('Error creating user:', createError)
      return res.status(500).json({ success: false, error: 'Failed to create user record' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { type, title, description, priority } = req.body

      // Validate required fields
      if (!type || !title || !description) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: type, title, description' 
        })
      }

      // Validate enum values
      const validTypes = ['BUG', 'ENHANCEMENT', 'FEATURE']
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

      if (!validTypes.includes(type.toUpperCase())) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid feedback type' 
        })
      }

      if (priority && !validPriorities.includes(priority.toUpperCase())) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid priority level' 
        })
      }

      // Create feedback record
      const feedback = await prisma.feedback.create({
        data: {
          type: type.toUpperCase(),
          title: title.trim(),
          description: description.trim(),
          priority: (priority || 'MEDIUM').toUpperCase(),
          submittedBy: user.id
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

      // TODO: Send email notification to admins
      console.log('New feedback submitted:', {
        id: feedback.id,
        type: feedback.type,
        title: feedback.title,
        submittedBy: `${feedback.user.firstName} ${feedback.user.lastName}`,
        priority: feedback.priority
      })

      return res.json({
        success: true,
        data: {
          id: feedback.id,
          message: 'Feedback submitted successfully'
        }
      })
    } catch (error) {
      console.error('Error submitting feedback:', error)
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to submit feedback' 
      })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
