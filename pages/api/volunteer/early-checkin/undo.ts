import { NextApiRequest, NextApiResponse } from 'next'
import { ConventionDay } from '@prisma/client'
import { getApiSession } from '@/lib/apiSession'
import { prisma } from '@/lib/prisma'
import { deleteDayCheckIn, getCurrentConventionDay } from '@/lib/ivsEarlyCheckin'
import { verifyVolunteerIvsEarlyCheckinAccess } from '@/lib/ivsVolunteerEarlyCheckinAccess'

function parseDay(body: Record<string, unknown>): ConventionDay | null {
  const raw = body.conventionDay
  if (typeof raw === 'string') {
    const upper = raw.toUpperCase()
    if (Object.values(ConventionDay).includes(upper as ConventionDay)) {
      return upper as ConventionDay
    }
  }
  return getCurrentConventionDay()
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const session = await getApiSession(req, res)
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const body =
      req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? (req.body as Record<string, unknown>)
        : {}
    const { eventId, volunteerId } = body

    if (!eventId || !volunteerId || typeof eventId !== 'string' || typeof volunteerId !== 'string') {
      return res.status(400).json({ success: false, message: 'Event ID and Volunteer ID required' })
    }

    const access = await verifyVolunteerIvsEarlyCheckinAccess(
      req,
      session.user.id,
      session.user.role,
      eventId,
    )
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message })
    }

    const day = parseDay(body)
    if (!day) {
      return res.status(400).json({
        success: false,
        message: 'Specify convention day (Friday, Saturday, or Sunday).',
      })
    }

    await prisma.$transaction(async (tx) => {
      await deleteDayCheckIn(tx, volunteerId, day)
    })

    return res.status(200).json({ success: true, conventionDay: day })
  } catch (error) {
    console.error('Error undoing check-in:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
