import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]"
import { prisma } from "../../../src/lib/prisma"
import { canDeleteEvent } from "../../../src/lib/eventAccess"
import { handleApiError, apiSuccess } from "../../../src/lib/apiError"
import { normalizePhoneOrNull, normalizePhoneForStorage } from "@/lib/formatPhone"
import { addDaysToDateKey, daysBetweenDateKeys, toDateKey } from "../../../lib/eventDates"
import { parseDateKey } from "../../../lib/shiftConflict"

function normalizeContactList(value: unknown): unknown {
  if (!Array.isArray(value)) return value
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item
    const row = item as Record<string, unknown>
    if (row.phone == null || row.phone === '') return item
    return { ...row, phone: normalizePhoneForStorage(String(row.phone)) }
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { id } = req.query

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Event ID is required" })
  }

  try {
    if (req.method === "GET") {
      const event = await prisma.events.findUnique({
        where: { id },
        include: {
          event_volunteers: true,
          assignments: true,
          positions: true
        }
      })

      if (!event) {
        return res.status(404).json({ error: "Event not found" })
      }

      // Transform event data for frontend compatibility
      const transformedEvent = {
        ...event,
        _count: {
          event_volunteers: event.event_volunteers.length,
          assignments: event.assignments.length,
          positions: event.positions.length
        }
      }

      return res.status(200).json({ success: true, data: transformedEvent })
    }

    if (req.method === "PUT") {
      try {
        // Extract locationId separately to handle as a relation
        const { locationId, ...bodyData } = req.body
        
        const { 
          name, description, eventType, startDate, endDate, startTime, endTime, location, status, capacity, attendantsNeeded, volunteersNeeded,
          settings, // Event settings (modules and terminology)
          // APEX GUARDIAN: Oversight Management Fields
          departmentOverseerName, departmentOverseerPhone, departmentOverseerEmail, departmentOverseerUserId,
          departmentOverseerAssistants,
          keyman
        } = bodyData

        // APEX GUARDIAN: Build update data dynamically to avoid Prisma type issues
        const updateData: any = {
          name,
          description,
          eventType,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          startTime,
          endTime,
          location,
          status,
          capacity: capacity ? parseInt(capacity) : null,
          volunteersNeeded: (volunteersNeeded || attendantsNeeded) ? parseInt(volunteersNeeded || attendantsNeeded) : null,
          updatedAt: new Date()
        }

        // Handle location relation properly using Prisma's connect/disconnect pattern
        if (locationId !== undefined) {
          if (locationId) {
            // Connect to the location
            updateData.locationRef = {
              connect: { id: locationId }
            }
          } else {
            // Disconnect from location (set to null)
            updateData.locationRef = {
              disconnect: true
            }
          }
        }

        // Add settings field if provided (modules and terminology)
        if (settings !== undefined) updateData.settings = settings

        // Add oversight fields if provided
        if (departmentOverseerName !== undefined) updateData.departmentOverseerName = departmentOverseerName || null
        if (departmentOverseerPhone !== undefined) {
          updateData.departmentOverseerPhone = normalizePhoneOrNull(departmentOverseerPhone)
        }
        if (departmentOverseerEmail !== undefined) updateData.departmentOverseerEmail = departmentOverseerEmail || null
        if (departmentOverseerUserId !== undefined) updateData.departmentOverseerUserId = departmentOverseerUserId || null
        if (departmentOverseerAssistants !== undefined) {
          updateData.departmentOverseerAssistants = normalizeContactList(departmentOverseerAssistants) || []
        }
        if (keyman !== undefined) {
          updateData.keyman = normalizeContactList(keyman) || []
        }

        const previous = await prisma.events.findUnique({
          where: { id },
          select: { startDate: true }
        })

        // Update the event using Prisma relations, and keep dated shifts on the new days.
        const event = await prisma.$transaction(async (tx) => {
          const updated = await tx.events.update({
            where: { id },
            data: updateData
          })

          const oldKey = toDateKey(previous?.startDate)
          const newKey = toDateKey(updated.startDate)
          if (oldKey && newKey && oldKey !== newKey) {
            const delta = daysBetweenDateKeys(oldKey, newKey)
            const shifts = await tx.position_shifts.findMany({
              where: { shiftDate: { not: null }, positions: { eventId: id } },
              select: { id: true, shiftDate: true }
            })
            for (const shift of shifts) {
              const key = toDateKey(shift.shiftDate)
              if (!key) continue
              await tx.position_shifts.update({
                where: { id: shift.id },
                data: { shiftDate: parseDateKey(addDaysToDateKey(key, delta)) }
              })
            }
          }

          return updated
        })

        return res.status(200).json({ success: true, data: event })

      } catch (error) {
        console.error('Error updating event:', error)
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to update event', 
          details: error.message 
        })
      }
    }

    if (req.method === "DELETE") {
      // Get current user
      const user = await prisma.users.findUnique({
        where: { email: session.user.email }
      })

      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" })
      }

      // Check if user has permission to delete this event
      const canDelete = await canDeleteEvent(user.id, id)
      
      if (!canDelete) {
        return res.status(403).json({ 
          success: false,
          error: "Only event owners can delete events" 
        })
      }

      // Delete the event
      // Database has ON DELETE CASCADE configured for:
      // - positions (and their position_assignments, position_counts, position_oversight_assignments)
      // - event_volunteers
      // - count_sessions (and their position_counts)
      // - event_permissions
      // - announcements
      // - and other related records
      await prisma.events.delete({
        where: { id }
      })

      return res.status(200).json({ 
        success: true, 
        message: "Event deleted successfully" 
      })
    }

    return res.status(405).json({ error: "Method not allowed" })
  } catch (error) {
    handleApiError(res, error, "Event API error")
  }
}
