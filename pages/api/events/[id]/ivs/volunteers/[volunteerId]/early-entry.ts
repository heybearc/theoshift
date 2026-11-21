import { NextApiRequest, NextApiResponse } from 'next'
import { ConventionDay } from '@/generated/prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { canManageIvsVolunteers } from '@/lib/eventAccess'
import {
  CONVENTION_DAYS,
  EarlyEntrySchedule,
  scheduleFromRecord,
  scheduleToPrismaUpdate,
} from '@/lib/ivsEarlyCheckin'

function parseScheduleBody(body: Record<string, unknown>): EarlyEntrySchedule | null {
  if (body.earlyEntry && typeof body.earlyEntry === 'object' && !Array.isArray(body.earlyEntry)) {
    const e = body.earlyEntry as Record<string, unknown>
    return {
      friday: e.friday === true,
      saturday: e.saturday === true,
      sunday: e.sunday === true,
    }
  }

  const hasDayField =
    body.earlyCheckinFriday !== undefined ||
    body.earlyCheckinSaturday !== undefined ||
    body.earlyCheckinSunday !== undefined

  if (hasDayField) {
    return {
      friday: body.earlyCheckinFriday === true,
      saturday: body.earlyCheckinSaturday === true,
      sunday: body.earlyCheckinSunday === true,
    }
  }

  if (body.earlyCheckinEligible !== undefined) {
    const all = body.earlyCheckinEligible === true
    return { friday: all, saturday: all, sunday: all }
  }

  return null
}

const DAY_FIELD: Record<ConventionDay, keyof EarlyEntrySchedule> = {
  FRIDAY: 'friday',
  SATURDAY: 'saturday',
  SUNDAY: 'sunday',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
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

    const volunteer = await prisma.event_volunteers.findUnique({
      where: { id: volunteerId as string },
      include: { earlyCheckins: true },
    })

    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Volunteer not found' })
    }

    const nextSchedule = parseScheduleBody(body)
    if (!nextSchedule) {
      return res.status(400).json({ success: false, message: 'Early entry schedule required' })
    }

    const current = scheduleFromRecord(volunteer)
    const clearCheckIns = body.clearCheckInsWhenRemovingEligibility !== false

    const removedDaysWithCheckIn: ConventionDay[] = []
    for (const day of CONVENTION_DAYS) {
      const field = DAY_FIELD[day]
      const wasEligible = current[field]
      const nowEligible = nextSchedule[field]
      if (wasEligible && !nowEligible) {
        const hasCheckIn = volunteer.earlyCheckins.some((c) => c.conventionDay === day)
        if (hasCheckIn) removedDaysWithCheckIn.push(day)
      }
    }

    await prisma.$transaction(async (tx) => {
      if (removedDaysWithCheckIn.length > 0 && clearCheckIns) {
        await tx.event_volunteer_early_checkins.deleteMany({
          where: {
            eventVolunteerId: volunteer.id,
            conventionDay: { in: removedDaysWithCheckIn },
          },
        })
      } else if (removedDaysWithCheckIn.length > 0) {
        throw new Error(
          `Cannot remove eligibility for ${removedDaysWithCheckIn.join(', ')} while check-in exists. Undo check-in first or allow clearing check-ins.`,
        )
      }

      await tx.event_volunteers.update({
        where: { id: volunteer.id },
        data: {
          ...scheduleToPrismaUpdate(nextSchedule),
          updatedAt: new Date(),
        },
      })
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ success: false, message })
  }
}
