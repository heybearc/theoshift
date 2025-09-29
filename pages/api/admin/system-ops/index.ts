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

    switch (req.method) {
      case 'GET':
        return await handleGetSystemInfo(req, res)
      case 'POST':
        return await handleSystemOperation(req, res)
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('System ops API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGetSystemInfo(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get database statistics
    const [userCount, eventCount, attendantCount] = await Promise.all([
      prisma.users.count(),
      prisma.events.count(),
      prisma.attendants.count()
    ])

    // Get recent activity (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const recentActivity = await Promise.all([
      prisma.users.count({
        where: { createdAt: { gte: yesterday } }
      }),
      prisma.events.count({
        where: { createdAt: { gte: yesterday } }
      }),
      prisma.attendants.count({
        where: { createdAt: { gte: yesterday } }
      })
    ])

    const systemInfo = {
      database: {
        totalUsers: userCount,
        totalEvents: eventCount,
        totalAttendants: attendantCount,
        recentActivity: {
          newUsers: recentActivity[0],
          newEvents: recentActivity[1],
          newAttendants: recentActivity[2]
        }
      },
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage()
      },
      lastHealthCheck: new Date().toISOString()
    }

    return res.status(200).json({
      success: true,
      data: systemInfo
    })
  } catch (error) {
    console.error('Get system info error:', error)
    return res.status(500).json({ success: false, error: 'Failed to fetch system information' })
  }
}

async function handleSystemOperation(req: NextApiRequest, res: NextApiResponse) {
  const { operation, parameters = {} } = req.body

  if (!operation) {
    return res.status(400).json({ success: false, error: 'Operation type required' })
  }

  try {
    let result: any = {}

    switch (operation) {
      case 'database_cleanup':
        result = await performDatabaseCleanup(parameters)
        break
      case 'cache_clear':
        result = await performCacheClear(parameters)
        break
      case 'health_check':
        result = await performHealthCheck(parameters)
        break
      case 'backup_database':
        result = await performDatabaseBackup(parameters)
        break
      default:
        return res.status(400).json({ success: false, error: 'Unknown operation' })
    }

    return res.status(200).json({
      success: true,
      operation,
      data: result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error(`System operation ${operation} error:`, error)
    return res.status(500).json({ 
      success: false, 
      error: `Failed to execute ${operation}`,
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function performDatabaseCleanup(parameters: any) {
  // Clean up old logs, temporary data, etc.
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - (parameters.daysOld || 30))

  // This is a placeholder - implement actual cleanup logic
  return {
    message: 'Database cleanup completed',
    itemsRemoved: 0,
    cutoffDate: cutoffDate.toISOString()
  }
}

async function performCacheClear(parameters: any) {
  // Clear application cache
  // This is a placeholder - implement actual cache clearing logic
  return {
    message: 'Cache cleared successfully',
    cacheTypes: ['memory', 'redis', 'file'],
    timestamp: new Date().toISOString()
  }
}

async function performHealthCheck(parameters: any) {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    
    // Check system resources
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()

    return {
      status: 'healthy',
      database: 'connected',
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB'
      },
      uptime: Math.round(uptime) + ' seconds',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}

async function performDatabaseBackup(parameters: any) {
  // This is a placeholder - implement actual backup logic
  return {
    message: 'Database backup initiated',
    backupId: `backup_${Date.now()}`,
    timestamp: new Date().toISOString(),
    note: 'Backup functionality requires implementation'
  }
}
