import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' })
  }

  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`

    // Get basic stats
    const [userCount, eventCount] = await Promise.all([
      prisma.users.count(),
      prisma.events.count(),
    ])

    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      app: 'Theocratic Shift Scheduler',
      version: process.env.npm_package_version || '2.2.0',
      database: {
        connected: true,
        users: userCount,
        events: eventCount,
      },
      uptime: process.uptime(),
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      app: 'Theocratic Shift Scheduler',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
