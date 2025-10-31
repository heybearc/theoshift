import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './[...nextauth]'
import { prisma } from '../../../src/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { action, sessionId } = req.body
    const userId = session.user.id
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                      req.socket.remoteAddress || 
                      'unknown'
    const userAgent = req.headers['user-agent'] || 'unknown'
    
    // Detect which server node we're running on
    const serverNode = process.env.SERVER_NODE || 
                       (ipAddress === '10.92.3.22' ? 'BLUE' : 
                        ipAddress === '10.92.3.24' ? 'GREEN' : 'UNKNOWN')

    // Check if table exists (graceful handling if migration not applied yet)
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_activity'
      );
    `
    
    if (!tableExists || !(tableExists as any)[0]?.exists) {
      console.log('[ACTIVITY] user_activity table does not exist yet')
      return res.status(200).json({ 
        success: true, 
        message: 'Activity tracking not available yet' 
      })
    }

    if (action === 'login') {
      // Create new session record
      const newSessionId = sessionId || uuidv4()
      
      await prisma.user_activity.create({
        data: {
          userId,
          sessionId: newSessionId,
          ipAddress,
          userAgent,
          serverNode,
          isActive: true
        }
      })

      return res.status(200).json({ 
        success: true, 
        sessionId: newSessionId 
      })
    }

    if (action === 'activity') {
      // Update last activity timestamp
      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId required for activity update' })
      }

      await prisma.user_activity.updateMany({
        where: {
          sessionId,
          userId,
          isActive: true
        },
        data: {
          lastActivityAt: new Date()
        }
      })

      return res.status(200).json({ success: true })
    }

    if (action === 'logout') {
      // Mark session as inactive
      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId required for logout' })
      }

      await prisma.user_activity.updateMany({
        where: {
          sessionId,
          userId
        },
        data: {
          isActive: false,
          logoutAt: new Date()
        }
      })

      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (error) {
    console.error('[ACTIVITY] Error tracking activity:', error)
    // Don't fail the request if activity tracking fails
    return res.status(200).json({ 
      success: false, 
      message: 'Activity tracking failed but request continues' 
    })
  }
}
