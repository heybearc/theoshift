import { ConventionDay } from '@prisma/client'
import { prisma } from './prisma'
import { toDateOnlyStringUTC } from './calendarDate'
import { DEFAULT_CONVENTION_TIMEZONE, getCurrentConventionDay } from './ivsEarlyCheckin'

export type ArrivalAssignment = {
  positionId: string
  positionName: string
  when: string
}

export type ArrivalCount = {
  label: string
  when: string
}

export type ArrivalPosition = {
  id: string
  name: string
}

export type ArrivalPerson = {
  id: string
  firstName: string
  lastName: string
  congregation: string
  checkedIn: boolean
  checkedInAt: string | null
  lanyardBadge: string | null
  positionIds: string[]
  assignments: ArrivalAssignment[]
  countTimes: ArrivalCount[]
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

function formatCountWhen(at: Date | null): string {
  if (!at) return ''
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DEFAULT_CONVENTION_TIMEZONE,
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(at)
}

function formatShiftWhen(shift: {
  name: string
  startTime: string | null
  endTime: string | null
  isAllDay: boolean
  shiftDate: Date | null
} | null): string {
  if (!shift) return ''
  const day = shift.shiftDate ? toDateOnlyStringUTC(shift.shiftDate) : ''
  if (shift.isAllDay) return [day, shift.name, 'All day'].filter(Boolean).join(' · ')
  const times = [shift.startTime, shift.endTime].filter(Boolean).join('–')
  return [day, shift.name, times].filter(Boolean).join(' · ')
}

export async function listArrivals(eventId: string, viewerVolunteerId: string): Promise<{
  scope: 'event' | 'mine'
  today: ConventionDay | null
  myPositions: ArrivalPosition[]
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

  const peopleBase = rows
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

  const volunteerIdsOnList = peopleBase.map((person) => person.id)
  const [myPositionRows, assignmentRows, countGroups, stationCounts] =
    volunteerIdsOnList.length === 0
      ? [[], [], [], []]
      : await Promise.all([
          prisma.position_oversight_assignments.findMany({
            where: {
              eventId,
              OR: [{ keymanId: viewerVolunteerId }, { overseerId: viewerVolunteerId }],
            },
            select: { positionId: true, positions: { select: { name: true, positionNumber: true } } },
          }),
          prisma.position_assignments.findMany({
            where: { volunteerId: { in: volunteerIdsOnList }, positions: { eventId } },
            select: {
              volunteerId: true,
              positionId: true,
              keymanId: true,
              overseerId: true,
              positions: { select: { name: true, positionNumber: true } },
              shift: {
                select: { name: true, startTime: true, endTime: true, isAllDay: true, shiftDate: true },
              },
            },
          }),
          prisma.count_session_groups.findMany({
            where: {
              countSession: { eventId, isActive: true, status: 'ACTIVE' },
              OR: [
                { primaryVolunteerId: { in: volunteerIdsOnList } },
                { secondaryVolunteerId: { in: volunteerIdsOnList } },
              ],
            },
            select: {
              name: true,
              primaryVolunteerId: true,
              secondaryVolunteerId: true,
              countSession: { select: { id: true, sessionName: true, countTime: true } },
            },
          }),
          prisma.count_session_position_assignees.findMany({
            where: {
              volunteerId: { in: volunteerIdsOnList },
              isSuggested: false,
              countSession: { eventId, isActive: true, status: 'ACTIVE' },
            },
            select: {
              volunteerId: true,
              countSession: { select: { id: true, sessionName: true, countTime: true } },
              position: { select: { name: true } },
            },
          }),
        ])

  const myPositionIds = new Set<string>()
  const myPositions: ArrivalPosition[] = []
  for (const row of myPositionRows) {
    if (myPositionIds.has(row.positionId)) continue
    myPositionIds.add(row.positionId)
    myPositions.push({
      id: row.positionId,
      name: row.positions?.name || `Position ${row.positions?.positionNumber ?? ''}`.trim(),
    })
  }
  for (const row of assignmentRows) {
    if (row.keymanId !== viewerVolunteerId && row.overseerId !== viewerVolunteerId) continue
    if (myPositionIds.has(row.positionId)) continue
    myPositionIds.add(row.positionId)
    myPositions.push({
      id: row.positionId,
      name: row.positions?.name || 'Position',
    })
  }
  myPositions.sort((a, b) => a.name.localeCompare(b.name))

  const assignmentsByVolunteer = new Map<string, ArrivalAssignment[]>()
  for (const row of assignmentRows) {
    const list = assignmentsByVolunteer.get(row.volunteerId) || []
    list.push({
      positionId: row.positionId,
      positionName: row.positions?.name || 'Position',
      when: formatShiftWhen(row.shift),
    })
    assignmentsByVolunteer.set(row.volunteerId, list)
  }

  const countsByVolunteer = new Map<string, ArrivalCount[]>()
  const countedSessions = new Map<string, Set<string>>()
  const addCount = (volunteerId: string | null | undefined, sessionId: string, count: ArrivalCount) => {
    if (!volunteerId) return
    const seen = countedSessions.get(volunteerId) || new Set<string>()
    if (seen.has(sessionId)) return
    seen.add(sessionId)
    countedSessions.set(volunteerId, seen)
    const list = countsByVolunteer.get(volunteerId) || []
    list.push(count)
    countsByVolunteer.set(volunteerId, list)
  }
  for (const group of countGroups) {
    const when = formatCountWhen(group.countSession.countTime)
    const label = group.name || group.countSession.sessionName
    addCount(group.primaryVolunteerId, group.countSession.id, { label: `${label} · Primary`, when })
    addCount(group.secondaryVolunteerId, group.countSession.id, { label: `${label} · Partner`, when })
  }
  for (const row of stationCounts) {
    addCount(row.volunteerId, row.countSession.id, {
      label: row.position?.name || row.countSession.sessionName,
      when: formatCountWhen(row.countSession.countTime),
    })
  }

  const people = peopleBase
    .map((person) => {
      const assignments = assignmentsByVolunteer.get(person.id) || []
      return {
        ...person,
        positionIds: [...new Set(assignments.map((assignment) => assignment.positionId))],
        assignments,
        countTimes: countsByVolunteer.get(person.id) || [],
      }
    })
    .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`))

  return { scope, today, myPositions, people }
}
