// Count Analytics API Route - Next.js API
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET() {
  try {
    const totalSessions = await prisma.users.count({ where: { isActive: true } });
    const activeSessions = await prisma.users.count({ 
      where: { 
        isActive: true,
        lastLogin: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      } 
    });
    const analytics = {
      totalSessions,
      activeSessions,
      averageSessionsPerMonth: Math.round(totalSessions / 12),
      lastUpdated: new Date().toISOString()
    };
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Failed to fetch count analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch count analytics' },
      { status: 500 }
    );
  }
}
