import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  type: z.enum(['INFO', 'WARNING', 'URGENT']).default('INFO'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(1000).optional(),
  type: z.enum(['INFO', 'WARNING', 'URGENT']).optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: eventId } = req.query

  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ error: 'Event ID is required' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const user = await prisma.users.findUnique({
    where: { email: session.user.email! },
    select: { id: true, role: true }
  })

  if (!user) {
    return res.status(401).json({ error: 'User not found' })
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, eventId)
      case 'POST':
        if (!['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN'].includes(user.role)) {
          return res.status(403).json({ error: 'Insufficient permissions' })
        }
        return await handlePost(req, res, eventId, user.id)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Announcements API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, eventId: string) {
  const { activeOnly } = req.query

  const now = new Date()
  
  const where: any = { eventId }
  
  if (activeOnly === 'true') {
    where.isActive = true
    where.OR = [
      { startDate: null },
      { startDate: { lte: now } }
    ]
    where.AND = [
      {
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      }
    ]
  }

  const announcements = await prisma.announcements.findMany({
    where,
    include: {
      users: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: [
      { type: 'desc' }, // URGENT first, then WARNING, then INFO
      { createdAt: 'desc' }
    ]
  })

  return res.status(200).json({
    success: true,
    data: announcements
  })
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, eventId: string, userId: string) {
  const validation = createAnnouncementSchema.safeParse(req.body)
  
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const data = validation.data

  const announcement = await prisma.announcements.create({
    data: {
      id: crypto.randomUUID(),
      eventId,
      title: data.title,
      message: data.message,
      type: data.type,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      createdBy: userId,
      updatedAt: new Date()
    },
    include: {
      users: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  })

  return res.status(201).json({
    success: true,
    data: announcement,
    message: 'Announcement created successfully'
  })
}
