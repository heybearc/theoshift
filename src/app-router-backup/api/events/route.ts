import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-stub';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (type) {
      where.type = type;
    }

    // Get events with pagination
    const [events, total] = await Promise.all([
      prisma.events.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          startDate: true,
          endDate: true,
          location: true,
          type: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.events.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        events,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.title || !data.startDate) {
      return NextResponse.json(
        { success: false, error: 'Title and start date are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(data.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : startDate;

    const event = await prisma.events.create({
      data: {
        title: data.title,
        description: data.description || '',
        startDate,
        endDate,
        location: data.location || '',
        type: data.type || 'MEETING',
        isActive: data.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: event
    });

  } catch (error) {
    console.error('Create event error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
