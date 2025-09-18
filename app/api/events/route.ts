import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../utils/auth'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const user = await AuthService.getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const events = await prisma.events.findMany({
      where: { isActive: true },
      orderBy: { startDate: 'desc' }
    })
    
    return NextResponse.json(events)
  } catch (error) {
    console.error('Failed to fetch events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser()
    
    if (!user || !['ADMIN', 'OVERSEER'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, eventDate, location } = body

    if (!name || !eventDate) {
      return NextResponse.json({ error: 'Name and event date are required' }, { status: 400 })
    }

    const event = await prisma.events.create({
      data: {
        id: crypto.randomUUID(),
        name,
        description,
        startDate: new Date(eventDate),
        endDate: new Date(eventDate), // Default to same as startDate
        location,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Failed to create event:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
