import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== FEEDBACK SUBMISSION DEBUG ===')
  
  try {
    const session = await getServerSession(req, res, authOptions)
    console.log('Session:', session ? 'Found' : 'Not found')
    console.log('User email:', session?.user?.email)
    
    if (!session || !session.user?.email) {
      console.log('❌ No session or email')
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    if (req.method === 'POST') {
      const { type, title, description, priority } = req.body
      console.log('Request body:', { type, title, description, priority })

      // Find user
      console.log('🔍 Looking up user by email:', session.user.email)
      let user = await prisma.users.findUnique({
        where: { email: session.user.email }
      })
      console.log('User found:', user ? `${user.firstName} ${user.lastName}` : 'Not found')

      if (!user) {
        console.log('🚀 Creating new user...')
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
        console.log('✅ User created:', user.id)
      }

      // Create feedback
      console.log('💾 Creating feedback record...')
      const feedback = await prisma.feedback.create({
        data: {
          type: type.toUpperCase(),
          title: title.trim(),
          description: description.trim(),
          priority: (priority || 'MEDIUM').toUpperCase(),
          submittedBy: user.id
        }
      })
      console.log('✅ Feedback created:', feedback.id)

      return res.json({
        success: true,
        data: {
          id: feedback.id,
          message: 'Feedback submitted successfully'
        }
      })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('❌ FEEDBACK SUBMISSION ERROR:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
