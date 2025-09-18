// Count Sessions Search API Route - Next.js API
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const countSessions = await prisma.users.findMany({
      where: {
        OR: [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { email: { contains: query } }
        ],
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(countSessions);
  } catch (error) {
    console.error('Failed to search count users:', error);
    return NextResponse.json(
      { error: 'Failed to search count users' },
      { status: 500 }
    );
  }
}
