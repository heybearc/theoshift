import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]"
import { prisma } from "../../../src/lib/prisma"

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
        where: { id }
      })

      if (!event) {
        return res.status(404).json({ error: "Event not found" })
      }

      // Fetch positions with assignment counts
      const positions = await prisma.positions.findMany({
        where: { eventId: id, isActive: true },
        include: {
          shifts: true,
          _count: {
            select: { assignments: true }
          }
        }
      })

      // Fetch attendants for this event
      const attendants = await prisma.event_attendant_associations.findMany({
        where: { eventId: id },
        include: {
          attendants: true
        }
      })

      // Fetch all assignments for this event
      const assignments = await prisma.assignments.findMany({
        where: { eventId: id }
      })

      // Calculate statistics
      const totalPositions = positions.length
      const positionsWithAssignments = positions.filter(p => p._count.assignments > 0).length
      const totalShifts = positions.reduce((sum, p) => sum + p.shifts.length, 0)
      const filledShifts = assignments.length
      const unfilledShifts = totalShifts - filledShifts

      const totalAttendants = attendants.length
      const assignedAttendantIds = new Set(assignments.map(a => a.userId))
      const assignedAttendants = assignedAttendantIds.size
      const availableAttendants = totalAttendants - assignedAttendants

      // Transform event data with comprehensive statistics
      const transformedEvent = {
        ...event,
        statistics: {
          positions: {
            total: totalPositions,
            filled: positionsWithAssignments,
            unfilled: totalPositions - positionsWithAssignments,
            fillRate: totalPositions > 0 ? Math.round((positionsWithAssignments / totalPositions) * 100) : 0
          },
          shifts: {
            total: totalShifts,
            filled: filledShifts,
            unfilled: unfilledShifts,
            fillRate: totalShifts > 0 ? Math.round((filledShifts / totalShifts) * 100) : 0
          },
          attendants: {
            total: totalAttendants,
            assigned: assignedAttendants,
            available: availableAttendants,
            utilizationRate: totalAttendants > 0 ? Math.round((assignedAttendants / totalAttendants) * 100) : 0
          },
          assignments: {
            total: assignments.length,
            averagePerAttendant: assignedAttendants > 0 ? (assignments.length / assignedAttendants).toFixed(1) : 0
          }
        },
        _count: {
          positions: totalPositions,
          attendants: totalAttendants,
          assignments: assignments.length
        }
      }

      return res.status(200).json({ success: true, data: transformedEvent })
    }

    if (req.method === "PUT") {
      const { name, description, eventType, startDate, endDate, location, status } = req.body

      const event = await prisma.events.update({
        where: { id },
        data: {
          name,
          description,
          eventType,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          location,
          status,
          updatedAt: new Date()
        }
      })

      return res.status(200).json(event)
    }

    if (req.method === "DELETE") {
      // Check if event has positions or other dependencies
      const positionsCount = await prisma.event_positions.count({
        where: { eventId: id }
      })

      if (positionsCount > 0) {
        return res.status(400).json({ 
          error: `Cannot delete event with ${positionsCount} position(s). Remove positions first.` 
        })
      }

      await prisma.events.delete({
        where: { id }
      })

      return res.status(200).json({ message: "Event deleted successfully" })
    }

    return res.status(405).json({ error: "Method not allowed" })
  } catch (error) {
    console.error("Event API error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
