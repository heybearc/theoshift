import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Create or update admin user
    const adminUser = await prisma.users.upsert({
      where: { email: 'admin@jwscheduler.local' },
      update: {
        role: 'ADMIN',
        isActive: true,
        passwordHash: 'staging-admin-hash',
        updatedAt: new Date()
      },
      create: {
        id: randomUUID(),
        email: 'admin@jwscheduler.local',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'ADMIN',
        isActive: true,
        passwordHash: 'staging-admin-hash',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Admin user created/updated successfully',
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        isActive: adminUser.isActive
      }
    });

  } catch (error) {
    console.error('Admin setup error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if admin user exists
    const adminUser = await prisma.users.findUnique({
      where: { email: 'admin@jwscheduler.local' }
    });

    // Get total user count
    const userCount = await prisma.users.count();

    // Test database connectivity
    const dbTest = await prisma.$queryRaw`SELECT 1 as test`;

    return NextResponse.json({
      success: true,
      adminUserExists: !!adminUser,
      adminUser: adminUser ? {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        isActive: adminUser.isActive,
        lastLogin: adminUser.lastLogin
      } : null,
      totalUsers: userCount,
      databaseConnected: true,
      dbTest
    });

  } catch (error) {
    console.error('Admin setup check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      databaseConnected: false
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
