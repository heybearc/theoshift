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
    console.error('Event volunteers API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, eventId: string) {
  const { departmentId, role, isActive } = req.query

  const event = await prisma.events.findUnique({
    where: { id: eventId },
    select: { id: true, name: true }
  })

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' })
  }

  const eventVolunteers = await prisma.event_volunteers.findMany({
    where: {
      eventId,
      ...(departmentId && typeof departmentId === 'string' && { departmentId }),
      ...(role && typeof role === 'string' && { role }),
      ...(isActive !== undefined && { isActive: isActive === 'true' })
    },
    include: {
      volunteer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          congregation: true,
          formsOfService: true,
          isActive: true,
          availabilityStatus: true,
          preferredDepartments: true
        }
      },
      department: {
        select: {
          id: true,
          name: true,
          description: true
        }
      }
    },
    orderBy: [
      { department: { name: 'asc' } },
      { volunteer: { lastName: 'asc' } },
      { volunteer: { firstName: 'asc' } }
    ]
  })

  return res.status(200).json({
    success: true,
    data: {
      event,
      volunteers: eventVolunteers
    }
  })
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, eventId: string) {
  const { volunteerId, departmentId, role, isActive, assignedStationRanges } = req.body

  if (!volunteerId || !departmentId) {
    return res.status(400).json({ success: false, error: 'Volunteer ID and Department ID are required' })
  }

  const event = await prisma.events.findUnique({
    where: { id: eventId }
  })

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' })
  }

  const volunteer = await prisma.volunteers.findUnique({
    where: { id: volunteerId }
  })

  if (!volunteer) {
    return res.status(404).json({ success: false, error: 'Volunteer not found' })
  }

  const department = await prisma.event_departments.findUnique({
    where: { id: departmentId }
  })

  if (!department || department.eventId !== eventId) {
    return res.status(404).json({ success: false, error: 'Department not found for this event' })
  }

  const existing = await prisma.event_volunteers.findFirst({
    where: {
      eventId,
      volunteerId,
      departmentId
    }
  })

  if (existing) {
    return res.status(400).json({ success: false, error: 'Volunteer already assigned to this department' })
  }

  const eventVolunteer = await prisma.event_volunteers.create({
    data: {
      eventId,
      volunteerId,
      departmentId,
      role: role || 'VOLUNTEER',
      isActive: isActive !== undefined ? isActive : true,
      assignedStationRanges: assignedStationRanges || null
    },
    include: {
      volunteer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          congregation: true
        }
      },
      department: {
        select: {
          id: true,
          name: true,
          description: true
        }
      }
    }
  })

  return res.status(201).json({
    success: true,
    data: eventVolunteer
  })
}
