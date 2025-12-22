import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session || !session.user?.email) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const { id: eventId } = req.query

  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ success: false, error: 'Event ID is required' })
  }

  const user = await prisma.users.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true }
  })

  if (!user) {
    return res.status(401).json({ success: false, error: 'User not found' })
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, eventId)
      case 'POST':
        if (!['ADMIN', 'OVERSEER'].includes(user.role)) {
          return res.status(403).json({ success: false, error: 'Admin or Overseer access required' })
        }
        return await handlePost(req, res, eventId)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Event departments API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, eventId: string) {
  const { includeInactive, includeVolunteers } = req.query

  const event = await prisma.events.findUnique({
    where: { id: eventId },
    select: { id: true, name: true }
  })

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' })
  }

  const departments = await prisma.event_departments.findMany({
    where: {
      eventId,
      ...(includeInactive !== 'true' && { isActive: true })
    },
    include: {
      template: {
        select: {
          id: true,
          name: true,
          icon: true
        }
      },
      parent: {
        select: {
          id: true,
          name: true
        }
      },
      children: {
        where: includeInactive !== 'true' ? { isActive: true } : {},
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          sortOrder: true
        },
        orderBy: { sortOrder: 'asc' }
      },
      ...(includeVolunteers === 'true' && {
        event_volunteers: {
          include: {
            volunteer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }),
      _count: {
        select: {
          event_volunteers: true
        }
      }
    },
    orderBy: [
      { sortOrder: 'asc' },
      { name: 'asc' }
    ]
  })

  return res.status(200).json({
    success: true,
    data: {
      event,
      departments
    }
  })
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, eventId: string) {
  const { templateId, name, description, parentId, customSettings, sortOrder, isActive } = req.body

  if (!name) {
    return res.status(400).json({ success: false, error: 'Department name is required' })
  }

  const event = await prisma.events.findUnique({
    where: { id: eventId }
  })

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' })
  }

  const existing = await prisma.event_departments.findFirst({
    where: {
      eventId,
      name
    }
  })

  if (existing) {
    return res.status(400).json({ success: false, error: 'Department already exists for this event' })
  }

  const department = await prisma.event_departments.create({
    data: {
      eventId,
      templateId: templateId || null,
      name,
      description: description || null,
      parentId: parentId || null,
      customSettings: customSettings || null,
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true
    },
    include: {
      template: {
        select: {
          id: true,
          name: true,
          icon: true
        }
      },
      parent: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  return res.status(201).json({
    success: true,
    data: department
  })
}
