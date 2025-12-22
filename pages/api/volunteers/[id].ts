import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session || !session.user?.email) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Volunteer ID is required' })
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
        return await handleGet(req, res, id)
      case 'PUT':
        if (!['ADMIN', 'OVERSEER'].includes(user.role)) {
          return res.status(403).json({ success: false, error: 'Admin or Overseer access required' })
        }
        return await handlePut(req, res, id)
      case 'DELETE':
        if (user.role !== 'ADMIN') {
          return res.status(403).json({ success: false, error: 'Admin access required' })
        }
        return await handleDelete(req, res, id)
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Volunteer API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, id: string) {
  const volunteer = await prisma.volunteers.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true
        }
      },
      event_volunteers: {
        include: {
          event: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true
            }
          },
          department: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  })

  if (!volunteer) {
    return res.status(404).json({ success: false, error: 'Volunteer not found' })
  }

  return res.status(200).json({
    success: true,
    data: volunteer
  })
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, id: string) {
  const {
    firstName,
    lastName,
    email,
    phone,
    congregation,
    formsOfService,
    isActive,
    availabilityStatus,
    isAvailable,
    notes,
    servingAs,
    skills,
    preferredDepartments,
    unavailableDates
  } = req.body

  const existing = await prisma.volunteers.findUnique({
    where: { id }
  })

  if (!existing) {
    return res.status(404).json({ success: false, error: 'Volunteer not found' })
  }

  if (email && email !== existing.email) {
    const duplicate = await prisma.volunteers.findFirst({
      where: {
        email,
        id: { not: id }
      }
    })

    if (duplicate) {
      return res.status(400).json({ success: false, error: 'Email already in use' })
    }
  }

  const volunteer = await prisma.volunteers.update({
    where: { id },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(congregation !== undefined && { congregation }),
      ...(formsOfService !== undefined && { formsOfService }),
      ...(isActive !== undefined && { isActive }),
      ...(availabilityStatus !== undefined && { availabilityStatus }),
      ...(isAvailable !== undefined && { isAvailable }),
      ...(notes !== undefined && { notes }),
      ...(servingAs !== undefined && { servingAs }),
      ...(skills !== undefined && { skills }),
      ...(preferredDepartments !== undefined && { preferredDepartments }),
      ...(unavailableDates !== undefined && { unavailableDates })
    }
  })

  return res.status(200).json({
    success: true,
    data: volunteer
  })
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, id: string) {
  const volunteer = await prisma.volunteers.findUnique({
    where: { id },
    include: {
      event_volunteers: {
        select: { id: true }
      }
    }
  })

  if (!volunteer) {
    return res.status(404).json({ success: false, error: 'Volunteer not found' })
  }

  if (volunteer.event_volunteers.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete volunteer with event assignments. Remove from events first.'
    })
  }

  await prisma.volunteers.delete({
    where: { id }
  })

  return res.status(200).json({
    success: true,
    message: 'Volunteer deleted successfully'
  })
}
