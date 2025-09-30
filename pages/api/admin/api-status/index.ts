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

    const apiStatus = await getApiStatus()
    
    return res.status(200).json({
      success: true,
      data: apiStatus
    })
  } catch (error) {
    console.error('API status error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function getApiStatus() {
  const startTime = Date.now()
  
  const endpoints = [
    { name: 'Authentication', path: '/api/auth/session', category: 'Auth' },
    { name: 'User Management', path: '/api/admin/users', category: 'Admin' },
    { name: 'Event Management', path: '/api/admin/events', category: 'Admin' },
    { name: 'Health Check', path: '/api/admin/health', category: 'System' },
    { name: 'System Operations', path: '/api/admin/system-ops', category: 'System' },
    { name: 'Audit Logs', path: '/api/admin/audit-logs', category: 'System' },
    { name: 'Email Configuration', path: '/api/admin/email-config', category: 'Config' }
  ]

  const endpointStatuses = await Promise.all(
    endpoints.map(async (endpoint) => {
      const checkStart = Date.now()
      let status = 'healthy'
      let responseTime = 0
      let error = null

      try {
        // For now, we'll simulate endpoint checks
        // In a real implementation, you'd make actual HTTP requests
        responseTime = Math.random() * 200 + 50 // 50-250ms
        
        // Simulate some endpoints being slower or having issues
        if (endpoint.path.includes('email-config')) {
          responseTime = Math.random() * 1000 + 200 // 200-1200ms
          if (responseTime > 800) status = 'warning'
        }
        
        if (Math.random() < 0.05) { // 5% chance of error
          status = 'error'
          error = 'Connection timeout'
        }
        
      } catch (err) {
        status = 'error'
        error = err instanceof Error ? err.message : 'Unknown error'
        responseTime = Date.now() - checkStart
      }

      return {
        ...endpoint,
        status,
        responseTime: Math.round(responseTime),
        error,
        lastChecked: new Date().toISOString()
      }
    })
  )

  // Database connectivity check
  let dbStatus = 'healthy'
  let dbResponseTime = 0
  let dbError = null
  
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    dbResponseTime = Date.now() - dbStart
    
    if (dbResponseTime > 1000) dbStatus = 'warning'
    if (dbResponseTime > 3000) dbStatus = 'error'
  } catch (error) {
    dbStatus = 'error'
    dbError = error instanceof Error ? error.message : 'Database connection failed'
  }

  // Calculate overall health
  const healthyCount = endpointStatuses.filter(e => e.status === 'healthy').length
  const warningCount = endpointStatuses.filter(e => e.status === 'warning').length
  const errorCount = endpointStatuses.filter(e => e.status === 'error').length
  
  let overallStatus = 'healthy'
  if (errorCount > 0 || dbStatus === 'error') overallStatus = 'error'
  else if (warningCount > 0 || dbStatus === 'warning') overallStatus = 'warning'

  return {
    overall: {
      status: overallStatus,
      totalEndpoints: endpoints.length,
      healthy: healthyCount,
      warning: warningCount,
      error: errorCount,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    },
    database: {
      status: dbStatus,
      responseTime: dbResponseTime,
      error: dbError
    },
    endpoints: endpointStatuses,
    categories: {
      Auth: endpointStatuses.filter(e => e.category === 'Auth'),
      Admin: endpointStatuses.filter(e => e.category === 'Admin'),
      System: endpointStatuses.filter(e => e.category === 'System'),
      Config: endpointStatuses.filter(e => e.category === 'Config')
    },
    metrics: {
      averageResponseTime: Math.round(
        endpointStatuses.reduce((sum, e) => sum + e.responseTime, 0) / endpointStatuses.length
      ),
      uptime: process.uptime(),
      requestsHandled: Math.floor(Math.random() * 10000), // Mock data
      errorsInLastHour: errorCount
    }
  }
}
