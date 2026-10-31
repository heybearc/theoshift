import { NextApiRequest, NextApiResponse } from 'next'
import { getApiSession } from '@/lib/apiSession'
import { prisma } from '@/lib/prisma'
import {
  conventionDayLabel,
  earlyCheckinInclude,
  earlyEligibilityWhere,
  getCurrentConventionDay,
  isCheckedInForDay,
  isEligibleForDay,
  mapVolunteerEarlyCheckinPayload,
  parseConventionDayParam,
  resolveViewDay,
} from '@/lib/ivsEarlyCheckin'
import { verifyVolunteerIvsEarlyCheckinAccess } from '@/lib/ivsVolunteerEarlyCheckinAccess'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const session = await getApiSession(req, res)
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const { eventId, day: dayParam } = req.query
    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ success: false, message: 'Event ID required' })
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

    const parsedDay = parseConventionDayParam(dayParam)
    const viewDay = resolveViewDay(parsedDay)
    const today = getCurrentConventionDay()

    const eventVolunteers = await prisma.event_volunteers.findMany({
      where: {
        eventId,
        ...earlyEligibilityWhere(),
      },
      include: earlyCheckinInclude,
      orderBy: [{ volunteer: { lastName: 'asc' } }],
    })

    const allVolunteers = eventVolunteers.map(mapVolunteerEarlyCheckinPayload)

    const volunteers = viewDay
      ? allVolunteers.filter((v) => {
          const schedule = v.earlyEntry
          return (
            isEligibleForDay(schedule, viewDay) || isCheckedInForDay(v.checkIns, viewDay)
          )
        })
      : allVolunteers

    return res.status(200).json({
      success: true,
      volunteers,
      viewDay,
      today,
      dayLabel: viewDay ? conventionDayLabel(viewDay) : null,
    })
  } catch (error) {
    console.error('Error fetching volunteers:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
