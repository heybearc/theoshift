import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'
import { z } from 'zod'

const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(1000).optional(),
  type: z.enum(['INFO', 'WARNING', 'URGENT']).optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: eventId, announcementId } = req.query

  if (!eventId || typeof eventId !== 'string' || !announcementId || typeof announcementId !== 'string') {
    return res.status(400).json({ error: 'Event ID and Announcement ID are required' })
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

  // Only ADMIN, OVERSEER, ASSISTANT_OVERSEER, KEYMAN can modify announcements
  if (!['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN'].includes(user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }

  try {
    switch (req.method) {
      case 'PUT':
        return await handlePut(req, res, eventId, announcementId)
      case 'DELETE':
        return await handleDelete(req, res, eventId, announcementId)
      default:
        res.setHeader('Allow', ['PUT', 'DELETE'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Announcement API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, eventId: string, announcementId: string) {
  const validation = updateAnnouncementSchema.safeParse(req.body)
  
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors
    })
  }

  const data = validation.data

  // Verify announcement exists and belongs to event
  const existing = await prisma.announcements.findUnique({
    where: { id: announcementId },
    select: { eventId: true }
  })

  if (!existing) {
    return res.status(404).json({ error: 'Announcement not found' })
  }

  if (existing.eventId !== eventId) {
    return res.status(400).json({ error: 'Announcement does not belong to this event' })
  }

  const updateData: any = {
    updatedAt: new Date()
  }

  if (data.title !== undefined) updateData.title = data.title
  if (data.message !== undefined) updateData.message = data.message
  if (data.type !== undefined) updateData.type = data.type
  if (data.isActive !== undefined) updateData.isActive = data.isActive
  if (data.startDate !== undefined) {
    updateData.startDate = data.startDate ? new Date(data.startDate) : null
  }
  if (data.endDate !== undefined) {
    updateData.endDate = data.endDate ? new Date(data.endDate) : null
  }

  const announcement = await prisma.announcements.update({
    where: { id: announcementId },
    data: updateData,
    include: {
      users: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  })

  return res.status(200).json({
    success: true,
    data: announcement,
    message: 'Announcement updated successfully'
  })
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, eventId: string, announcementId: string) {
  // Verify announcement exists and belongs to event
  const existing = await prisma.announcements.findUnique({
    where: { id: announcementId },
    select: { eventId: true }
  })

  if (!existing) {
    return res.status(404).json({ error: 'Announcement not found' })
  }

  if (existing.eventId !== eventId) {
    return res.status(400).json({ error: 'Announcement does not belong to this event' })
  }

  await prisma.announcements.delete({
    where: { id: announcementId }
  })

  return res.status(200).json({
    success: true,
    message: 'Announcement deleted successfully'
  })
}
