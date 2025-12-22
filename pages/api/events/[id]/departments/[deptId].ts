import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session || !session.user?.email) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const { id: eventId, deptId } = req.query

  if (!eventId || typeof eventId !== 'string' || !deptId || typeof deptId !== 'string') {
    return res.status(400).json({ success: false, error: 'Event ID and Department ID are required' })
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
        return await handleGet(req, res, eventId, deptId)
      case 'PUT':
        if (!['ADMIN', 'OVERSEER'].includes(user.role)) {
          return res.status(403).json({ success: false, error: 'Admin or Overseer access required' })
        }
        return await handlePut(req, res, eventId, deptId)
      case 'DELETE':
        if (!['ADMIN', 'OVERSEER'].includes(user.role)) {
          return res.status(403).json({ success: false, error: 'Admin or Overseer access required' })
        }
        return await handleDelete(req, res, eventId, deptId)
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Event department API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, eventId: string, deptId: string) {
  const department = await prisma.event_departments.findUnique({
    where: { id: deptId },
    include: {
      event: {
        select: {
          id: true,
          name: true
        }
      },
      template: {
        select: {
          id: true,
          name: true,
          description: true,
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
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true
        }
      },
      event_volunteers: {
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
          }
        }
      }
    }
  })

  if (!department) {
    return res.status(404).json({ success: false, error: 'Department not found' })
  }

  if (department.eventId !== eventId) {
    return res.status(400).json({ success: false, error: 'Department does not belong to this event' })
  }

  return res.status(200).json({
    success: true,
    data: department
  })
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, eventId: string, deptId: string) {
  const { name, description, parentId, customSettings, sortOrder, isActive } = req.body

  const existing = await prisma.event_departments.findUnique({
    where: { id: deptId }
  })

  if (!existing) {
    return res.status(404).json({ success: false, error: 'Department not found' })
  }

  if (existing.eventId !== eventId) {
    return res.status(400).json({ success: false, error: 'Department does not belong to this event' })
  }

  if (name && name !== existing.name) {
    const duplicate = await prisma.event_departments.findFirst({
      where: {
        eventId,
        name,
        id: { not: deptId }
      }
    })

    if (duplicate) {
      return res.status(400).json({ success: false, error: 'Department name already exists for this event' })
    }
  }

  const department = await prisma.event_departments.update({
    where: { id: deptId },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(parentId !== undefined && { parentId }),
      ...(customSettings !== undefined && { customSettings }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(isActive !== undefined && { isActive })
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

  return res.status(200).json({
    success: true,
    data: department
  })
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, eventId: string, deptId: string) {
  const department = await prisma.event_departments.findUnique({
    where: { id: deptId },
    include: {
      event_volunteers: {
        select: { id: true }
      },
      children: {
        select: { id: true }
      }
    }
  })

  if (!department) {
    return res.status(404).json({ success: false, error: 'Department not found' })
  }

  if (department.eventId !== eventId) {
    return res.status(400).json({ success: false, error: 'Department does not belong to this event' })
  }

  if (department.event_volunteers.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete department with assigned volunteers. Remove volunteers first.'
    })
  }

  if (department.children.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete department with child departments'
    })
  }

  await prisma.event_departments.delete({
    where: { id: deptId }
  })

  return res.status(200).json({
    success: true,
    message: 'Department deleted successfully'
  })
}
