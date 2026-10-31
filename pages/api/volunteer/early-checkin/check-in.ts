import { NextApiRequest, NextApiResponse } from 'next'
import { ConventionDay } from '@prisma/client'
import { getApiSession } from '@/lib/apiSession'
import { prisma } from '@/lib/prisma'
import {
  conventionDayLabel,
  getCurrentConventionDay,
  isEligibleForDay,
  scheduleFromRecord,
  upsertDayCheckIn,
} from '@/lib/ivsEarlyCheckin'
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
        message: 'Early check-in is only available on Friday, Saturday, or Sunday (event local time).',
      })
    }

    const volunteer = await prisma.event_volunteers.findUnique({
      where: { id: volunteerId },
      include: { earlyCheckins: true },
    })

    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Volunteer not found' })
    }

    const schedule = scheduleFromRecord(volunteer)
    if (!isEligibleForDay(schedule, day)) {
      return res.status(400).json({
        success: false,
        message: `Volunteer is not marked for early entry on ${conventionDayLabel(day)}`,
      })
    }

    const existing = volunteer.earlyCheckins.find((c) => c.conventionDay === day)
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Already checked in for ${conventionDayLabel(day)}`,
      })
    }

    const checkedInBy = `${session.user.name || session.user.email || session.user.id}`

    await prisma.$transaction(async (tx) => {
      await upsertDayCheckIn(tx, volunteer.id, day, checkedInBy)
    })

    return res.status(200).json({ success: true, conventionDay: day })
  } catch (error) {
    console.error('Error checking in volunteer:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
