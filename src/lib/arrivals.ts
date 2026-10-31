import { ConventionDay } from '@prisma/client'
import { prisma } from './prisma'
import { getCurrentConventionDay } from './ivsEarlyCheckin'

export type ArrivalPerson = {
  id: string
  firstName: string
  lastName: string
  congregation: string
  checkedIn: boolean
  checkedInAt: string | null
  lanyardBadge: string | null
}

function personNameKey(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function viewerCanSeeArrivals(eventId: string, volunteerId: string): Promise<boolean> {
  const [viewer, linked, oversight] = await Promise.all([
    prisma.event_volunteers.findFirst({
      where: { eventId, volunteerId, isActive: true },
      select: { isOverseer: true, isKeyman: true },
    }),
    prisma.event_volunteers.count({
      where: {
        eventId,
        isActive: true,
        OR: [{ keymanId: volunteerId }, { overseerId: volunteerId }],
      },
    }),
    prisma.position_oversight_assignments.count({
      where: {
        eventId,
        OR: [{ keymanId: volunteerId }, { overseerId: volunteerId }],
      },
    }),
  ])

  return Boolean(viewer?.isOverseer || viewer?.isKeyman || linked > 0 || oversight > 0)
}

export async function listArrivals(eventId: string, viewerVolunteerId: string): Promise<{
  scope: 'event' | 'mine'
  today: ConventionDay | null
  people: ArrivalPerson[]
} | null> {
  const allowed = await viewerCanSeeArrivals(eventId, viewerVolunteerId)
  if (!allowed) return null

  const viewer = await prisma.event_volunteers.findFirst({
    where: { eventId, volunteerId: viewerVolunteerId, isActive: true },
    select: { isOverseer: true },
  })
  const scope = viewer?.isOverseer ? 'event' : 'mine'
  const today = getCurrentConventionDay()

  let volunteerIds: string[] | null = null
  if (scope === 'mine') {
    const [linked, oversight, assignmentLinks] = await Promise.all([
      prisma.event_volunteers.findMany({
        where: {
          eventId,
          isActive: true,
          onVolunteerRoster: true,
          OR: [{ keymanId: viewerVolunteerId }, { overseerId: viewerVolunteerId }],
        },
        select: { volunteerId: true },
      }),
      prisma.position_oversight_assignments.findMany({
        where: {
          eventId,
          OR: [{ keymanId: viewerVolunteerId }, { overseerId: viewerVolunteerId }],
        },
        select: { positionId: true },
      }),
      prisma.position_assignments.findMany({
        where: {
          positions: { eventId },
          OR: [{ keymanId: viewerVolunteerId }, { overseerId: viewerVolunteerId }],
        },
        select: { volunteerId: true },
      }),
    ])

    const positionIds = oversight.map((row) => row.positionId)
    const onPositions =
      positionIds.length === 0
        ? []
        : await prisma.position_assignments.findMany({
            where: { positionId: { in: positionIds } },
            select: { volunteerId: true },
          })

    volunteerIds = [
      ...new Set(
        [...linked, ...assignmentLinks, ...onPositions]
          .map((row) => row.volunteerId)
          .filter((id): id is string => !!id)
      ),
    ]
  }

  const rows = await prisma.event_volunteers.findMany({
    where: {
      eventId,
      isActive: true,
      onVolunteerRoster: true,
      volunteerId: volunteerIds ? { in: volunteerIds } : { not: null },
      volunteer: { isActive: true },
    },
    select: {
      checkedInAt: true,
      earlyCheckins: { select: { conventionDay: true, checkedInAt: true } },
      volunteer: {
        select: { id: true, firstName: true, lastName: true, congregation: true },
      },
    },
  })

  const settings = await prisma.lanyard_settings.findUnique({
    where: { eventId },
    select: {
      lanyards: {
        where: { isCheckedOut: true },
        select: { badgeNumber: true, checkedOutTo: true },
      },
    },
  })

  const badgeByName = new Map<string, string>()
  for (const lanyard of settings?.lanyards || []) {
    const key = (lanyard.checkedOutTo || '').trim().toLowerCase().replace(/\s+/g, ' ')
    if (key && !badgeByName.has(key)) badgeByName.set(key, lanyard.badgeNumber)
  }

  const people = rows
    .filter((row) => row.volunteer)
    .map((row) => {
      const volunteer = row.volunteer!
      const dayCheckIn = today
        ? row.earlyCheckins.find((checkIn) => checkIn.conventionDay === today)
        : undefined
      const checkedInAt = dayCheckIn?.checkedInAt || (!today ? row.checkedInAt : null)
      return {
        id: volunteer.id,
        firstName: volunteer.firstName,
        lastName: volunteer.lastName,
        congregation: volunteer.congregation,
        checkedIn: Boolean(checkedInAt),
        checkedInAt: checkedInAt ? checkedInAt.toISOString() : null,
        lanyardBadge: badgeByName.get(personNameKey(volunteer.firstName, volunteer.lastName)) || null,
      }
    })
    .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`))

  return { scope, today, people }
}
