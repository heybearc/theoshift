import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Test database connection
      console.log('Testing database connection...')
      
      // Check if feedback table exists by trying to count records
      const feedbackCount = await prisma.feedback.count()
      console.log('Feedback table accessible, count:', feedbackCount)
      
      // Test user lookup
      const users = await prisma.users.findMany({
        take: 5,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true
        }
      })
      console.log('Users found:', users.length)

      return res.json({
        success: true,
        data: {
          feedbackTableExists: true,
          feedbackCount: feedbackCount,
          usersCount: users.length,
          users: users,
          timestamp: new Date().toISOString(),
          prismaVersion: 'Connected'
        }
      })
    } catch (error) {
      console.error('Database test error:', error)
      return res.status(500).json({ 
        success: false, 
        error: 'Database test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
