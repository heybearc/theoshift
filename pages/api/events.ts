import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth/[...nextauth]"
import { prisma } from "../../src/lib/prisma"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    if (req.method === "GET") {
      const { 
        page = "1", 
        limit = "10", 
        search = "", 
        eventType = "", 
        status = "", 
        sortBy = "startDate", 
        sortOrder = "desc" 
      } = req.query

      const pageNum = parseInt(page as string)
      const limitNum = parseInt(limit as string)
      const skip = (pageNum - 1) * limitNum

      // Build where clause
      const where: any = {}
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } }
        ]
      }
      
      if (eventType) {
        where.eventType = eventType
      }
      
      if (status) {
        where.status = status
      }

      // Build orderBy
      const orderBy: any = {}
      orderBy[sortBy as string] = sortOrder

      // Get events with counts
      const [events, total] = await Promise.all([
        prisma.events.findMany({
          where,
          orderBy,
          skip,
          take: limitNum,
          include: {
            positions: {
              select: { id: true }
            },
            event_attendant_associations: {
              select: { id: true }
            },
            assignments: {
              select: { id: true }
            }
          }
        }),
        prisma.events.count({ where })
      ])

      // Transform events to match expected format
      const transformedEvents = events.map(event => ({
        ...event,
        _count: {
          event_positions: event.positions.length,
          event_attendant_associations: event.event_attendant_associations.length,
          assignments: event.assignments.length
        }
      }))

      const pages = Math.ceil(total / limitNum)

      return res.status(200).json({
        success: true,
        data: {
          events: transformedEvents,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages,
            hasNext: pageNum < pages,
            hasPrev: pageNum > 1
          }
        }
      })
    }

    if (req.method === "POST") {
      const { name, description, eventType, startDate, endDate, location } = req.body

      const event = await prisma.events.create({
        data: {
          id: require("crypto").randomUUID(),
          name,
          description,
          eventType: eventType || "CIRCUIT_ASSEMBLY",
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          location,
          status: "UPCOMING",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      return res.status(201).json({ success: true, data: event })
    }

    return res.status(405).json({ success: false, error: "Method not allowed" })
  } catch (error) {
    console.error("Events API error:", error)
    return res.status(500).json({ success: false, error: "Internal server error" })
  }
}
