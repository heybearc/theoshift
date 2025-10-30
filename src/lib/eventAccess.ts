import { prisma } from './prisma'

export type EventPermissionRole = 'OWNER' | 'MANAGER' | 'OVERSEER' | 'KEYMAN' | 'VIEWER'
export type EventScopeType = 'DEPARTMENT' | 'STATION_RANGE' | 'POSITION'

export interface EventPermission {
  role: EventPermissionRole
  scopeType?: EventScopeType | null
  scopeIds?: string[]
}

/**
 * Check if user has access to an event with at least the required role
 * Returns the permission object if access is granted, null otherwise
 * ADMIN users automatically have OWNER access to all events
 */
export async function checkEventAccess(
  userId: string,
  eventId: string,
  requiredRole: EventPermissionRole = 'VIEWER'
): Promise<EventPermission | null> {
  // Check if user is ADMIN - they have automatic OWNER access to all events
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  if (user?.role === 'ADMIN') {
    return {
      role: 'OWNER',
      scopeType: null,
      scopeIds: undefined
    }
  }

  const permission = await prisma.event_permissions.findUnique({
    where: { userId_eventId: { userId, eventId } }
  })

  if (!permission) return null

  const roleHierarchy: Record<EventPermissionRole, number> = {
    OWNER: 5,
    MANAGER: 4,
    OVERSEER: 3,
    KEYMAN: 2,
    VIEWER: 1
  }

  if (roleHierarchy[permission.role as EventPermissionRole] >= roleHierarchy[requiredRole]) {
    return {
      role: permission.role as EventPermissionRole,
      scopeType: permission.scopeType as EventScopeType | null,
      scopeIds: permission.scopeIds as string[] | undefined
    }
  }

  return null
}

/**
 * Check if user can manage attendants (add/remove/edit)
 * Only OWNER, MANAGER, and OVERSEER (no scope) can manage attendants
 */
export async function canManageAttendants(
  userId: string,
  eventId: string
): Promise<boolean> {
  const permission = await checkEventAccess(userId, eventId, 'OVERSEER')
  if (!permission) return false

  // OWNER, MANAGER, OVERSEER (no scope) can manage attendants
  return ['OWNER', 'MANAGER'].includes(permission.role) ||
    (permission.role === 'OVERSEER' && !permission.scopeType)
}

/**
 * Check if user can manage a specific position
 */
export async function canManagePosition(
  userId: string,
  eventId: string,
  positionId: string
): Promise<boolean> {
  const permission = await checkEventAccess(userId, eventId, 'OVERSEER')
  if (!permission) return false

  // OWNER and MANAGER can manage all positions
  if (['OWNER', 'MANAGER'].includes(permission.role)) return true

  // OVERSEER with no scope can manage all positions
  if (permission.role === 'OVERSEER' && !permission.scopeType) return true

  // OVERSEER with scope - check if position is in scope
  if (permission.role === 'OVERSEER' && permission.scopeType) {
    const position = await prisma.positions.findUnique({
      where: { id: positionId },
      select: { area: true, id: true }
    })

    if (!position) return false

    if (permission.scopeType === 'POSITION') {
      return permission.scopeIds?.includes(positionId) || false
    }

    if (permission.scopeType === 'DEPARTMENT') {
      return permission.scopeIds?.includes(position.area || '') || false
    }

    // STATION_RANGE logic would go here if needed
  }

  return false
}

/**
 * Check if user can edit a specific assignment
 */
export async function canEditAssignment(
  userId: string,
  eventId: string,
  assignmentId: string
): Promise<boolean> {
  const permission = await checkEventAccess(userId, eventId, 'KEYMAN')
  if (!permission) return false

  // OWNER, MANAGER, OVERSEER (no scope) can edit all assignments
  if (['OWNER', 'MANAGER'].includes(permission.role)) return true
  if (permission.role === 'OVERSEER' && !permission.scopeType) return true

  // Get assignment details
  const assignment = await prisma.position_assignments.findUnique({
    where: { id: assignmentId },
    include: { position: true }
  })

  if (!assignment) return false

  // KEYMAN can only edit their own assignments
  if (permission.role === 'KEYMAN') {
    const eventAttendant = await prisma.event_attendants.findFirst({
      where: {
        eventId,
        userId
      }
    })
    return assignment.attendantId === eventAttendant?.id
  }

  // OVERSEER with scope - check if position is in scope
  if (permission.role === 'OVERSEER' && permission.scopeType) {
    return canManagePosition(userId, eventId, assignment.positionId)
  }

  return false
}

/**
 * Check if user can manage event settings (edit/delete event)
 */
export async function canManageEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  const permission = await checkEventAccess(userId, eventId, 'MANAGER')
  if (!permission) return false

  return ['OWNER', 'MANAGER'].includes(permission.role)
}

/**
 * Check if user can delete an event
 */
export async function canDeleteEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  const permission = await checkEventAccess(userId, eventId, 'OWNER')
  if (!permission) return false

  return permission.role === 'OWNER'
}

/**
 * Check if user can manage event permissions (invite/remove users)
 * ADMIN users automatically have permission
 */
export async function canManagePermissions(
  userId: string,
  eventId: string
): Promise<boolean> {
  const permission = await checkEventAccess(userId, eventId, 'OWNER')
  if (!permission) {
    console.log('❌ canManagePermissions: No permission found for user', userId, 'event', eventId)
    return false
  }

  console.log('✅ canManagePermissions: User has role', permission.role)
  return permission.role === 'OWNER'
}

/**
 * Check if user can upload/manage documents
 */
export async function canManageDocuments(
  userId: string,
  eventId: string
): Promise<boolean> {
  const permission = await checkEventAccess(userId, eventId, 'OVERSEER')
  if (!permission) return false

  // OWNER, MANAGER, OVERSEER (no scope) can manage documents
  return ['OWNER', 'MANAGER'].includes(permission.role) ||
    (permission.role === 'OVERSEER' && !permission.scopeType)
}

/**
 * Get all events a user has access to
 * ADMIN users get access to all events automatically
 */
export async function getUserEvents(userId: string) {
  try {
    // Check if user is ADMIN - they get all events
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (user?.role === 'ADMIN') {
      const allEvents = await prisma.events.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          startDate: true,
          endDate: true,
          eventType: true,
          location: true,
          venue: true
        },
        orderBy: {
          startDate: 'desc'
        }
      })

      return allEvents.map((event: any) => ({
        ...event,
        userRole: 'OWNER',
        scopeType: null,
        scopeIds: null
      }))
    }

    const permissions = await (prisma as any).event_permissions.findMany({
      where: { userId },
      include: {
        events: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            startDate: true,
            endDate: true,
            eventType: true,
            location: true,
            venue: true
          }
        }
      },
      orderBy: {
        events: {
          startDate: 'desc'
        }
      }
    })

    return permissions.map((p: any) => ({
      ...p.events,
      userRole: p.role,
      scopeType: p.scopeType,
      scopeIds: p.scopeIds
    }))
  } catch (error) {
    console.error('getUserEvents error:', error)
    // If event_permissions table doesn't exist yet, return empty array
    return []
  }
}

/**
 * Grant permission to a user for an event
 */
export async function grantEventPermission(
  eventId: string,
  userId: string,
  role: EventPermissionRole,
  scopeType?: EventScopeType,
  scopeIds?: string[]
) {
  return await prisma.event_permissions.upsert({
    where: { userId_eventId: { userId, eventId } },
    create: {
      id: crypto.randomUUID(),
      userId,
      eventId,
      role,
      scopeType: scopeType || null,
      scopeIds: scopeIds || null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    update: {
      role,
      scopeType: scopeType || null,
      scopeIds: scopeIds || null,
      updatedAt: new Date()
    }
  })
}

/**
 * Revoke permission from a user for an event
 */
export async function revokeEventPermission(
  eventId: string,
  userId: string
) {
  return await prisma.event_permissions.delete({
    where: { userId_eventId: { userId, eventId } }
  })
}
