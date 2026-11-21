import { NextApiRequest, NextApiResponse } from 'next'
import { ConventionDay } from '@/generated/prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { canManageIvsVolunteers } from '@/lib/eventAccess'
import {
  conventionDayLabel,
  getCurrentConventionDay,
  isEligibleForDay,
  resolveViewDay,
  scheduleFromRecord,
  upsertDayCheckIn,
} from '@/lib/ivsEarlyCheckin'

function parseDay(body: Record<string, unknown>): ConventionDay | null {
  const raw = body.conventionDay
  if (typeof raw !== 'string') return getCurrentConventionDay()
  const upper = raw.toUpperCase()
  if (Object.values(ConventionDay).includes(upper as ConventionDay)) {
    return upper as ConventionDay
  }
  return getCurrentConventionDay()
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const { id: eventId, volunteerId } = req.query
    const body =
      req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? (req.body as Record<string, unknown>)
        : {}

    if (!(await canManageIvsVolunteers(session.user.id, eventId as string))) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden — you need permission to manage IVS volunteers for this event',
      })
    }

    const day = parseDay(body)
    if (!day) {
      return res.status(400).json({
        success: false,
        message: 'Early check-in is only available on Friday, Saturday, or Sunday (event local time).',
      })
    }

    const volunteer = await prisma.event_volunteers.findUnique({
      where: { id: volunteerId as string },
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

    return res.status(200).json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ success: false, message })
  }
}
