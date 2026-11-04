import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]"
import { prisma } from "../../../../src/lib/prisma"
import { v4 as uuidv4 } from 'uuid'
import { addDaysToDateKey, daysBetweenDateKeys, toDateKey } from "../../../../lib/eventDates"
import { parseDateKey } from "../../../../lib/shiftConflict"
import { readStationDiagramId } from "../../../../src/lib/stationDiagram"

function settingsForClone(settings: unknown, cloneDocuments: boolean): unknown {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return undefined
  const copy = { ...(settings as Record<string, unknown>) }
  if (!cloneDocuments) delete copy.stationDiagram
  return copy
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const session = await getServerSession(req, res, authOptions)
  
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { id } = req.query
  let { 
    name,
    clonePositions = true,
    cloneVolunteers = false,
    cloneAssignments = false,
    cloneLanyards = true,
    clonePermissions = true,
    cloneSettings = true,
    cloneOversight = true,
    cloneDocuments = true,
    startDate: requestedStart,
    endDate: requestedEnd
  } = req.body

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Event ID is required" })
  }

  try {
    // Fetch the original event with all related data
    const originalEvent = await prisma.events.findUnique({
      where: { id },
      include: {
        event_volunteers: {
          include: {
            volunteer: true
          }
        },
        positions: {
          include: {
            shifts: true,
            assignments: true,
            oversight: true
          }
        },
        lanyard_settings: {
          include: {
            lanyards: true
          }
        },
        count_sessions: {
          include: {
            position_counts: true
          }
        }
      }
    })

    if (!originalEvent) {
      return res.status(404).json({ error: "Event not found" })
    }

    // Get current user
    const user = await prisma.users.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // Auto-generate name if not provided
    if (!name || typeof name !== "string") {
      name = `${originalEvent.name} (Copy)`
    }

    const requestedStartKey = typeof requestedStart === 'string' ? toDateKey(requestedStart) : null
    const requestedEndKey = typeof requestedEnd === 'string' ? toDateKey(requestedEnd) : null
    const sourceStartKey = toDateKey(originalEvent.startDate)
    const newStartKey = requestedStartKey || sourceStartKey
    const newEndKey = requestedEndKey || toDateKey(originalEvent.endDate) || newStartKey
    if (newStartKey && newEndKey && newEndKey < newStartKey) {
      return res.status(400).json({
        success: false,
        error: "End date must be on or after the start date.",
      })
    }
    const shiftDayDelta =
      sourceStartKey && newStartKey ? daysBetweenDateKeys(sourceStartKey, newStartKey) : 0

    const movedShiftDate = (value: Date | null) => {
      const key = toDateKey(value)
      if (!key || shiftDayDelta === 0) return value
      return parseDateKey(addDaysToDateKey(key, shiftDayDelta))
    }

    // Create the cloned event
    const newEventId = uuidv4()
    const clonedEvent = await prisma.events.create({
      data: {
        id: newEventId,
        name: name,
        description: originalEvent.description,
        eventType: originalEvent.eventType,
        startDate: newStartKey ? parseDateKey(newStartKey) : originalEvent.startDate,
        endDate: newEndKey ? parseDateKey(newEndKey) : originalEvent.endDate,
        startTime: originalEvent.startTime,
        endTime: originalEvent.endTime,
        location: originalEvent.location,
        locationId: originalEvent.locationId,
        venue: originalEvent.venue,
        capacity: originalEvent.capacity,
        volunteersNeeded: originalEvent.volunteersNeeded,
        status: 'UPCOMING',
        createdBy: user.id,
        updatedAt: new Date(),
        // Module / terminology settings (JSON). The diagram id is remapped after documents copy.
        ...(cloneSettings && {
          settings: settingsForClone(originalEvent.settings, cloneDocuments),
          notificationSettings: originalEvent.notificationSettings ?? undefined
        }),
        // Event-level oversight contacts (columns — not settings JSON)
        ...(cloneOversight && {
          departmentOverseerName: originalEvent.departmentOverseerName,
          departmentOverseerPhone: originalEvent.departmentOverseerPhone,
          departmentOverseerEmail: originalEvent.departmentOverseerEmail,
          departmentOverseerUserId: originalEvent.departmentOverseerUserId,
          departmentOverseerAssistants: originalEvent.departmentOverseerAssistants ?? undefined,
          keyman: originalEvent.keyman ?? undefined
        })
      }
    })

    // Clone event_volunteers (if enabled)
    const volunteerMapping = new Map<string, string>()
    let clonedVolunteerCount = 0
    if (cloneVolunteers) {
      for (const eventVolunteer of originalEvent.event_volunteers) {
      const newVolunteerId = uuidv4()
      volunteerMapping.set(eventVolunteer.id, newVolunteerId)
      
      await prisma.event_volunteers.create({
        data: {
          id: newVolunteerId,
          eventId: newEventId,
          userId: eventVolunteer.userId,
          volunteerId: eventVolunteer.volunteerId,
          role: eventVolunteer.role,
          isActive: eventVolunteer.isActive,
          // Required for Volunteers / Positions roster visibility (default false = IVS-only)
          onVolunteerRoster: eventVolunteer.onVolunteerRoster,
          isKeyman: eventVolunteer.isKeyman,
          isOverseer: eventVolunteer.isOverseer,
          isElder: eventVolunteer.isElder,
          assignedDepartments: eventVolunteer.assignedDepartments ?? undefined,
          assignedStationRanges: eventVolunteer.assignedStationRanges ?? undefined,
          keymanId: eventVolunteer.keymanId,
          overseerId: eventVolunteer.overseerId,
          updatedAt: new Date()
        }
      })
      clonedVolunteerCount++
      }
    }

    // Clone positions (if enabled)
    const positionMapping = new Map<string, string>()
    if (clonePositions && originalEvent.positions.length > 0) {
      for (const position of originalEvent.positions) {
      const newPositionId = uuidv4()
      positionMapping.set(position.id, newPositionId)
      
      await prisma.positions.create({
        data: {
          id: newPositionId,
          eventId: newEventId,
          positionNumber: position.positionNumber,
          name: position.name,
          description: position.description,
          area: position.area,
          sequence: position.sequence,
          isActive: position.isActive,
          updatedAt: new Date()
        }
      })

      // Clone shifts for this position
      const shiftMapping = new Map<string, string>()
      for (const shift of position.shifts) {
        const newShiftId = uuidv4()
        shiftMapping.set(shift.id, newShiftId)
        
        await prisma.position_shifts.create({
          data: {
            id: newShiftId,
            positionId: newPositionId,
            name: shift.name,
            sequence: shift.sequence,
            isAllDay: shift.isAllDay,
            startTime: shift.startTime,
            endTime: shift.endTime,
            shiftDate: movedShiftDate(shift.shiftDate),
            volunteersNeeded: shift.volunteersNeeded
          }
        })
      }

      // Clone assignments for this position (if enabled and volunteers are cloned)
      if (cloneAssignments && cloneVolunteers) {
        for (const assignment of position.assignments) {
        const newShiftId = assignment.shiftId ? shiftMapping.get(assignment.shiftId) : null
        
        // Only clone if there's a volunteerId
        if (assignment.volunteerId) {
          await prisma.position_assignments.create({
            data: {
              id: uuidv4(),
              positionId: newPositionId,
              volunteerId: assignment.volunteerId,
              shiftId: newShiftId || undefined,
              role: assignment.role || 'VOLUNTEER',
              overseerId: assignment.overseerId,
              keymanId: assignment.keymanId,
              assignedBy: user.id
            }
          })
        }
        }
      }

      // Clone position-level oversight (overseer/keyman per position)
      if (cloneOversight) {
        for (const oversight of position.oversight) {
          await prisma.position_oversight_assignments.create({
            data: {
              id: uuidv4(),
              positionId: newPositionId,
              eventId: newEventId,
              overseerId: oversight.overseerId,
              keymanId: oversight.keymanId,
              assignedBy: user.id
            }
          })
        }
      }
    }
    }

    // Clone lanyards (if enabled and lanyard settings exist)
    if (cloneLanyards && originalEvent.lanyard_settings) {
      const totalLanyards = originalEvent.lanyard_settings.totalLanyards
      // Fresh event: all badges available (do not inherit checkout state)
      const newLanyardSettingsId = uuidv4()
      await prisma.lanyard_settings.create({
        data: {
          id: newLanyardSettingsId,
          eventId: newEventId,
          totalLanyards,
          availableLanyards: totalLanyards,
          isActive: originalEvent.lanyard_settings.isActive,
          updatedAt: new Date()
        }
      })

      for (const lanyard of originalEvent.lanyard_settings.lanyards) {
        await prisma.lanyards.create({
          data: {
            id: uuidv4(),
            lanyardSettingId: newLanyardSettingsId,
            badgeNumber: lanyard.badgeNumber,
            status: 'AVAILABLE',
            isCheckedOut: false,
            checkedOutTo: null,
            checkedOutAt: null,
            checkedInAt: null,
            notes: lanyard.notes,
            updatedAt: new Date()
          }
        })
      }
    }

    // Documents share the uploaded file. The new event gets its own rows.
    if (cloneDocuments) {
      const originalDocuments = await prisma.event_documents.findMany({
        where: { eventId: id, isActive: true },
        include: { document_publications: true }
      })
      const documentMapping = new Map<string, string>()
      for (const document of originalDocuments) {
        const newDocumentId = uuidv4()
        documentMapping.set(document.id, newDocumentId)
        await prisma.event_documents.create({
          data: {
            id: newDocumentId,
            eventId: newEventId,
            title: document.title,
            description: document.description,
            fileName: document.fileName,
            fileUrl: document.fileUrl,
            fileType: document.fileType,
            fileSize: document.fileSize,
            uploadedBy: document.uploadedBy,
            uploadedAt: new Date(),
            publishedTo: document.publishedTo,
            publishedCount: document.publishedCount,
            publishedAt: document.publishedAt,
            isActive: document.isActive,
            updatedAt: new Date()
          }
        })
        for (const publication of document.document_publications) {
          await prisma.document_publications.create({
            data: {
              id: uuidv4(),
              documentId: newDocumentId,
              volunteerId: publication.volunteerId,
              publishedAt: publication.publishedAt,
              viewedAt: null,
              downloadedAt: null
            }
          })
        }
      }

      const previousDiagramId = readStationDiagramId(originalEvent.settings)
      const nextDiagramId = previousDiagramId ? documentMapping.get(previousDiagramId) : undefined
      if (cloneSettings && nextDiagramId) {
        const current = await prisma.events.findUnique({
          where: { id: newEventId },
          select: { settings: true }
        })
        const settings =
          current?.settings && typeof current.settings === 'object' && !Array.isArray(current.settings)
            ? { ...(current.settings as Record<string, unknown>) }
            : {}
        settings.stationDiagram = { documentId: nextDiagramId }
        await prisma.events.update({
          where: { id: newEventId },
          data: { settings: settings as any, updatedAt: new Date() }
        })
      }
    }

    // Count times stay on the original event. A new event starts with none.

    // Clone event permissions (if enabled)
    const originalPermissions = clonePermissions ? await prisma.event_permissions.findMany({
      where: { eventId: id }
    }) : []

    const remapScopeIds = (
      scopeType: string | null | undefined,
      scopeIds: unknown
    ): unknown => {
      if (!scopeIds) return undefined
      const ids = Array.isArray(scopeIds)
        ? scopeIds
        : typeof scopeIds === 'string'
          ? (() => {
              try {
                const parsed = JSON.parse(scopeIds)
                return Array.isArray(parsed) ? parsed : []
              } catch {
                return []
              }
            })()
          : []

      // Position scopes are event-specific — remap to cloned position IDs
      if (scopeType === 'POSITION') {
        if (!clonePositions || positionMapping.size === 0) {
          return []
        }
        return ids
          .map((oldId: unknown) =>
            typeof oldId === 'string' ? positionMapping.get(oldId) : undefined
          )
          .filter((id: string | undefined): id is string => Boolean(id))
      }

      // DEPARTMENT / STATION_RANGE use shared catalog IDs — copy as-is
      return ids
    }

    for (const permission of originalPermissions) {
      console.log(`[CLONE] Cloning permission for user ${permission.userId} with role ${permission.role}`)
      await prisma.event_permissions.create({
        data: {
          id: uuidv4(),
          eventId: newEventId,
          userId: permission.userId,
          role: permission.role,
          scopeType: permission.scopeType,
          scopeIds: remapScopeIds(permission.scopeType, permission.scopeIds) as any,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    }

    const positionCount = clonePositions ? originalEvent.positions.length : 0
    const lanyardCount = cloneLanyards ? (originalEvent.lanyard_settings?.lanyards.length || 0) : 0
    
    return res.status(200).json({ 
      success: true, 
      data: { 
        id: newEventId,
        name: clonedEvent.name,
        message: `Event cloned successfully with ${positionCount} positions, ${clonedVolunteerCount} volunteers, ${lanyardCount} lanyards, and ${originalPermissions.length} permissions`
      }
    })

  } catch (error) {
    // Error logged by handleApiError
    return res.status(500).json({ 
      error: "Failed to clone event",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
