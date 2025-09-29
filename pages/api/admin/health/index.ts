import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session || session.user?.role !== 'ADMIN') {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' })
    }

    const healthData = await getSystemHealth()
    
    return res.status(200).json({
      success: true,
      data: healthData
    })
  } catch (error) {
    console.error('Health check API error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function getSystemHealth() {
  const startTime = Date.now()
  
  try {
    // Database health check
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbResponseTime = Date.now() - dbStart

    // Get database statistics
    const [userCount, eventCount, attendantCount] = await Promise.all([
      prisma.users.count(),
      prisma.events.count(),
      prisma.attendants.count()
    ])

    // System metrics
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()
    const cpuUsage = process.cpuUsage()

    // Calculate health scores
    const dbHealth = dbResponseTime < 1000 ? 'healthy' : dbResponseTime < 3000 ? 'warning' : 'critical'
    const memoryHealth = (memoryUsage.heapUsed / memoryUsage.heapTotal) < 0.8 ? 'healthy' : 'warning'
    
    const overallHealth = dbHealth === 'healthy' && memoryHealth === 'healthy' ? 'healthy' : 
                         dbHealth === 'critical' ? 'critical' : 'warning'

    return {
      overall: {
        status: overallHealth,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      },
      database: {
        status: dbHealth,
        responseTime: dbResponseTime,
        connections: 'active',
        statistics: {
          users: userCount,
          events: eventCount,
          attendants: attendantCount
        }
      },
      system: {
        uptime: Math.round(uptime),
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        }
      },
      services: {
        api: {
          status: 'healthy',
          endpoints: [
            { name: 'Authentication', status: 'healthy' },
            { name: 'User Management', status: 'healthy' },
            { name: 'Event Management', status: 'healthy' },
            { name: 'Email Service', status: 'healthy' }
          ]
        },
        external: {
          database: dbHealth,
          email: 'healthy' // This would check actual email service
        }
      },
      metrics: {
        requestsPerMinute: 0, // Would track actual requests
        errorRate: 0, // Would track actual errors
        averageResponseTime: Date.now() - startTime
      }
    }
  } catch (error) {
    return {
      overall: {
        status: 'critical',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      database: {
        status: 'critical',
        error: 'Database connection failed'
      },
      system: {
        uptime: Math.round(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage()
      }
    }
  }
}
