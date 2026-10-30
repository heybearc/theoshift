import type { GetServerSidePropsContext, GetServerSidePropsResult } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../pages/api/auth/[...nextauth]'
import { toDateKey } from './shiftConflict'
import { volunteerRosterWhere } from '@/lib/volunteerRoster'

export type PositionsPageVolunteer = {
  id: string
  firstName: string
  lastName: string
  formsOfService: unknown
  congregation: string | null
  isActive: boolean
  user: { role: string } | null
  overseerId: string | null
  keymanId: string | null
  overseer: { id: string; firstName: string; lastName: string } | null
  keyman: { id: string; firstName: string; lastName: string } | null
  isOverseer: boolean
  isKeyman: boolean
}

export type PositionsPageProps = {
  eventId: string
  event: {
    id: string
    name: string
    eventType: string
    startDate: string | null
    endDate: string | null
    status: string
  }
  positions: any[]
  attendants: PositionsPageVolunteer[]
  stats: { total: number; active: number; assigned: number }
  canManageContent: boolean
  canEdit: boolean
  canDelete: boolean
  canManagePermissions: boolean
  moduleConfig: Record<string, boolean> | null
  terminology: unknown
}

/**
 * Shared SSR loader for classic Positions and positions-next redesign.
 */
export async function loadPositionsPageProps(
  context: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<PositionsPageProps>> {
  try {
    const session = await getServerSession(context.req, context.res, authOptions)

    if (!session) {
      return { redirect: { destination: '/auth/signin', permanent: false } }
    }

    if (session.user?.role === 'VOLUNTEER') {
      return {
        redirect: { destination: '/volunteer/dashboard', permanent: false },
      }
    }

    if (
      !['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'SUPPORT'].includes(
        session.user?.role || ''
      )
    ) {
      return { redirect: { destination: '/auth/signin', permanent: false } }
    }

    const {
      canManageEvent,
      canDeleteEvent,
      canManagePermissions,
      canManageAttendants,
    } = await import('../src/lib/eventAccess')
    const sessionUserId = session.user?.id || ''
    const eventId = context.params!.id as string
    const canEdit = await canManageEvent(sessionUserId, eventId)
    const canDelete = await canDeleteEvent(sessionUserId, eventId)
    const canManagePerms = await canManagePermissions(sessionUserId, eventId)

    const { prisma } = await import('../src/lib/prisma')

    const eventData = await prisma.events.findUnique({
      where: { id: eventId },
      include: {
        positions: {
          include: {
            assignments: {
              include: {
                volunteer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    user: { select: { role: true } },
                  },
                },
                overseer: {
                  select: { id: true, firstName: true, lastName: true },
                },
                keyman: {
                  select: { id: true, firstName: true, lastName: true },
                },
                shift: {
                  select: {
                    id: true,
                    name: true,
                    startTime: true,
                    endTime: true,
                    isAllDay: true,
                    shiftDate: true,
                  },
                },
              },
            },
            shifts: { orderBy: { sequence: 'asc' } },
          },
          orderBy: [{ positionNumber: 'asc' }],
        },
      },
    })

    if (!eventData) {
      return { notFound: true }
    }

    const eventSettings = await prisma.events.findUnique({
      where: { id: eventId },
      select: { settings: true },
    })

    const oversightData = await (prisma as any).position_oversight_assignments.findMany(
      {
        where: { eventId },
        include: {
          overseer: {
            select: { id: true, firstName: true, lastName: true },
          },
          keyman: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }
    )

    const positionsWithOversight = (eventData as any).positions.map((position: any) => {
      const positionOversight = oversightData
        .filter((o: any) => o.positionId === position.id)
        .map((o: any) => ({
          id: o.id,
          overseer: o.overseer,
          keyman: o.keyman,
        }))

      return {
        ...position,
        oversight: positionOversight,
        shifts: (position.shifts || []).map((shift: any) => ({
          ...shift,
          shiftDate: shift.shiftDate ? toDateKey(shift.shiftDate) : null,
          createdAt:
            shift.createdAt instanceof Date
              ? shift.createdAt.toISOString()
              : shift.createdAt,
        })),
        assignments: (position.assignments || []).map((assignment: any) => ({
          ...assignment,
          assignedAt:
            assignment.assignedAt instanceof Date
              ? assignment.assignedAt.toISOString()
              : assignment.assignedAt,
          shift: assignment.shift
            ? {
                ...assignment.shift,
                shiftDate: assignment.shift.shiftDate
                  ? toDateKey(assignment.shift.shiftDate)
                  : null,
              }
            : assignment.shift,
        })),
      }
    })

    const eventAssociations = await prisma.event_volunteers.findMany({
      where: {
        eventId,
        ...volunteerRosterWhere,
      },
      include: {
        volunteer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            formsOfService: true,
            congregation: true,
            isActive: true,
            user: { select: { role: true } },
          },
        },
        overseer: {
          select: { id: true, firstName: true, lastName: true },
        },
        keyman: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    })

    const attendantsData = eventAssociations
      .filter((assoc) => assoc.volunteer && assoc.volunteer.isActive)
      .map((assoc) => ({
        id: assoc.volunteer!.id,
        firstName: assoc.volunteer!.firstName,
        lastName: assoc.volunteer!.lastName,
        formsOfService: assoc.volunteer!.formsOfService,
        congregation: assoc.volunteer!.congregation,
        isActive: assoc.volunteer!.isActive,
        user: assoc.volunteer!.user,
        overseerId: assoc.overseerId || null,
        keymanId: assoc.keymanId || null,
        overseer: assoc.overseer || null,
        keyman: assoc.keyman || null,
        isOverseer: assoc.isOverseer ?? false,
        isKeyman: assoc.isKeyman ?? false,
      }))
      .sort((a, b) =>
        `${a.firstName} ${a.lastName}`
          .toLowerCase()
          .localeCompare(`${b.firstName} ${b.lastName}`.toLowerCase())
      )

    const canManageContent = await canManageAttendants(sessionUserId, eventId)

    return {
      props: {
        eventId,
        event: {
          id: eventData.id,
          name: eventData.name,
          eventType: eventData.eventType,
          startDate: eventData.startDate?.toISOString() || null,
          endDate: eventData.endDate?.toISOString() || null,
          status: eventData.status,
        },
        positions: positionsWithOversight,
        attendants: attendantsData,
        stats: {
          total: positionsWithOversight.length,
          active: positionsWithOversight.filter((p: any) => p.isActive).length,
          assigned: positionsWithOversight.filter(
            (p: any) => p.assignments && p.assignments.length > 0
          ).length,
        },
        canManageContent,
        canEdit,
        canDelete,
        canManagePermissions: canManagePerms,
        moduleConfig: (eventSettings?.settings as any)?.modules
          ? {
              countTimes:
                (eventSettings!.settings as any).modules.countTimes ?? true,
              lanyards:
                (eventSettings!.settings as any).modules.lanyards ?? true,
              ivsModule:
                (eventSettings!.settings as any).modules.ivsModule ?? false,
              positions:
                (eventSettings!.settings as any).modules.positions ?? true,
              documents:
                (eventSettings!.settings as any).modules.documents ?? true,
              announcements:
                (eventSettings!.settings as any).modules.announcements ?? true,
            }
          : null,
        terminology: (eventSettings?.settings as any)?.terminology || null,
      },
    }
  } catch (error) {
    console.error('Error loading positions page data:', error)
    return { notFound: true }
  }
}
