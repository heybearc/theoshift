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
        where: { id },
        include: {
          event_attendant_associations: true,
          assignments: true,
          event_positions: true
        }
      })

      if (!event) {
        return res.status(404).json({ error: "Event not found" })
      }

      // Transform event data for frontend compatibility
      const transformedEvent = {
        ...event,
        _count: {
          event_attendant_associations: event.event_attendant_associations.length,
          assignments: event.assignments.length,
          event_positions: event.event_positions.length
        }
      }

      return res.status(200).json({ success: true, data: transformedEvent })
    }

    if (req.method === "PUT") {
      const { name, description, eventType, startDate, endDate, startTime, endTime, location, status, capacity, attendantsNeeded } = req.body

      const event = await prisma.events.update({
        where: { id },
        data: {
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
          attendantsNeeded: attendantsNeeded ? parseInt(attendantsNeeded) : null,
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
