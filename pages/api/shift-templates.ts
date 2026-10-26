import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { prisma } from '../../src/lib/prisma'
import { handleApiError } from '@/lib/apiError'

// APEX GUARDIAN: Shift Templates API
// Provides predefined shift patterns for bulk position creation

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    if (req.method === 'GET') {
      const userId = (session.user as { id?: string } | undefined)?.id
      return await handleGetTemplates(res, userId)
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error) {
    // Error logged by handleApiError
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGetTemplates(res: NextApiResponse, userId?: string) {
  try {
    const templates = await prisma.shift_templates.findMany({
      where: {
        OR: [
          { isSystemTemplate: true },
          ...(userId ? [{ createdBy: userId }] : [])
        ]
      },
      orderBy: [
        { isSystemTemplate: 'desc' },
        { name: 'asc' }
      ]
    })

    return res.status(200).json({
      success: true,
      data: templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        shifts: Array.isArray(template.shifts) ? template.shifts : [],
        isSystemTemplate: template.isSystemTemplate
      }))
    })
  } catch (error) {
    // Error logged by handleApiError
    return res.status(500).json({ success: false, error: 'Failed to fetch templates' })
  }
}
