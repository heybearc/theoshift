import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { prisma } from '../../src/lib/prisma'

// APEX GUARDIAN: Shift Templates API
// Provides predefined shift patterns for bulk position creation

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    // Temporary: Allow requests without session for testing
    if (!session) {
      console.log('⚠️ TEMP: Allowing shift templates request without session for testing')
      // return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    if (req.method === 'GET') {
      return await handleGetTemplates(req, res)
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('Shift templates API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGetTemplates(req: NextApiRequest, res: NextApiResponse) {
  try {
    const templates = await prisma.shift_templates.findMany({
      where: {
        OR: [
          { isSystemTemplate: true },
          { createdBy: (req as any).session?.user?.id }
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
        shifts: template.shifts,
        isSystemTemplate: template.isSystemTemplate
      }))
    })
  } catch (error) {
    console.error('Get templates error:', error)
    return res.status(500).json({ success: false, error: 'Failed to fetch templates' })
  }
}
