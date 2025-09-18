import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../utils/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('[AUTH_ME] Verifying token...');
    // Verify the token first
    const payload = AuthService.verifyToken(token);
    console.log('[AUTH_ME] Token verification result:', !!payload);
    
    if (!payload) {
      console.log('[AUTH_ME] Token verification failed - invalid JWT');
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    console.log('[AUTH_ME] Token payload:', { userId: payload.userId, email: payload.email, role: payload.role });
    
    // Get user data from database
    const user = await prisma.users.findUnique({
      where: { id: payload.userId }
    });
    console.log('[AUTH_ME] User lookup result:', !!user);
    
    if (!user) {
      console.log('[AUTH_ME] Token verification failed - invalid token');
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    console.log('[AUTH_ME] Authentication successful for user:', user.email);
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role
      }
    });
  } catch (error) {
    console.error('[AUTH_ME] Auth verification error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}
