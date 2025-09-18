// Past Events API Route - Next.js API
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET() {
  try {
    const events = await prisma.events.findMany({
      where: {
        startDate: {
          lt: new Date()
        },
        isActive: true
      },
      orderBy: { startDate: 'desc' }
    });
    return NextResponse.json(events);
  } catch (error) {
    console.error('Failed to fetch past events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch past events' },
      { status: 500 }
    );
  }
}
