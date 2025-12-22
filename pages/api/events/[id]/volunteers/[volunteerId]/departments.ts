import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]'
import { prisma } from '../../../../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session || !session.user?.email) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const { id: eventId, volunteerId } = req.query

  if (!eventId || typeof eventId !== 'string' || !volunteerId || typeof volunteerId !== 'string') {
    return res.status(400).json({ success: false, error: 'Event ID and Volunteer ID are required' })
  }

  const user = await prisma.users.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true }
  })

  if (!user) {
    return res.status(401).json({ success: false, error: 'User not found' })
  }

  if (!['ADMIN', 'OVERSEER'].includes(user.role)) {
    return res.status(403).json({ success: false, error: 'Admin or Overseer access required' })
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, eventId, volunteerId)
      case 'DELETE':
        return await handleDelete(req, res, eventId, volunteerId)
      default:
        res.setHeader('Allow', ['GET', 'DELETE'])
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Volunteer departments API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, eventId: string, volunteerId: string) {
  const volunteer = await prisma.volunteers.findUnique({
    where: { id: volunteerId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true
    }
  })

  if (!volunteer) {
    return res.status(404).json({ success: false, error: 'Volunteer not found' })
  }

  const departments = await prisma.event_volunteers.findMany({
    where: {
      eventId,
      volunteerId
    },
    include: {
      department: {
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true
        }
      }
    }
  })

  return res.status(200).json({
    success: true,
    data: {
      volunteer,
      departments
    }
  })
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, eventId: string, volunteerId: string) {
  const { departmentId } = req.query

  if (!departmentId || typeof departmentId !== 'string') {
    return res.status(400).json({ success: false, error: 'Department ID is required' })
  }

  const assignment = await prisma.event_volunteers.findFirst({
    where: {
      eventId,
      volunteerId,
      departmentId
    }
  })

  if (!assignment) {
    return res.status(404).json({ success: false, error: 'Assignment not found' })
  }

  await prisma.event_volunteers.delete({
    where: { id: assignment.id }
  })

  return res.status(200).json({
    success: true,
    message: 'Volunteer removed from department successfully'
  })
}
