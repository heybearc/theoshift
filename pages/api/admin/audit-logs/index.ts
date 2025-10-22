import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session || session.user?.role !== 'ADMIN') {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' })
    }

    const { page = '1', limit = '50', level = '', action = '', startDate, endDate } = req.query
    
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)

    // Generate mock audit logs for now
    const auditLogs = generateMockAuditLogs(pageNum, limitNum, {
      level: level as string,
      action: action as string,
      startDate: startDate as string,
      endDate: endDate as string
    })

    return res.status(200).json({
      success: true,
      data: {
        logs: auditLogs.logs,
        pagination: auditLogs.pagination,
        filters: {
          levels: ['INFO', 'WARN', 'ERROR', 'DEBUG'],
          actions: ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT']
        }
      }
    })
  } catch (error) {
    console.error('Audit logs API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

function generateMockAuditLogs(page: number, limit: number, filters: any) {
  const actions = ['LOGIN', 'LOGOUT', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'CREATE_EVENT', 'UPDATE_EVENT', 'EXPORT_DATA']
  const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG']
  const users = ['admin@example.com', 'user1@example.com', 'user2@example.com']
  
  const totalLogs = 500 // Mock total
  const startIndex = (page - 1) * limit
  
  const logs = Array.from({ length: Math.min(limit, totalLogs - startIndex) }, (_, i) => {
    const logIndex = startIndex + i
    const timestamp = new Date(Date.now() - (logIndex * 60000)) // 1 minute apart
    
    return {
      id: `log_${logIndex}`,
      timestamp: timestamp.toISOString(),
      level: levels[Math.floor(Math.random() * levels.length)],
      action: actions[Math.floor(Math.random() * actions.length)],
      userId: users[Math.floor(Math.random() * users.length)],
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (compatible)',
      resource: '/admin/users',
      details: {
        method: 'POST',
        statusCode: 200,
        duration: Math.floor(Math.random() * 1000),
        changes: logIndex % 3 === 0 ? { field: 'email', oldValue: 'old@example.com', newValue: 'new@example.com' } : null
      },
      metadata: {
        sessionId: `session_${Math.floor(Math.random() * 1000)}`,
        requestId: `req_${logIndex}`
      }
    }
  })

  return {
    logs,
    pagination: {
      page,
      limit,
      total: totalLogs,
      pages: Math.ceil(totalLogs / limit)
    }
  }
}
