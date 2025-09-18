// Count Sessions API Route - Next.js API
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET() {
  try {
    const countSessions = await prisma.users.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(countSessions);
  } catch (error) {
    console.error('Failed to fetch count users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch count users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, userName, countTime, notes } = body;

    if (!eventId || !userName || !countTime) {
      return NextResponse.json(
        { error: 'Event ID, user name, and count time are required' },
        { status: 400 }
      );
    }

    const countSession = await prisma.users.create({
      data: {
        id: crypto.randomUUID(),
        email: `${userName}@count.local`,
        firstName: userName.split(' ')[0] || userName,
        lastName: userName.split(' ')[1] || '',
        role: UserRole.ATTENDANT,
        isActive: true,
        passwordHash: 'temp-hash',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return NextResponse.json(countSession, { status: 201 });
  } catch (error) {
    console.error('Failed to create count user:', error);
    
    // Handle unique constraint error
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create count user' },
      { status: 500 }
    );
  }
}
