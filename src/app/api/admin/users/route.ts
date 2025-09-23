import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { sendInvitationEmail, isEmailConfigured } from '@/lib/email';

// Validation schemas
const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  role: z.enum(['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'ATTENDANT']),
  sendInvitation: z.boolean().optional().default(true)
});

// Admin middleware check
async function checkAdminAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 }
    );
  }

  return null;
}

// GET /api/admin/users - List all users with pagination
export async function GET(request: NextRequest) {
  const authError = await checkAdminAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role) {
      where.role = role;
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              attendants: true
            }
          }
        }
      }),
      prisma.users.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  const authError = await checkAdminAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Generate temporary password for new user
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Create user
    const user = await prisma.users.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        role: validatedData.role,
        password: hashedPassword,
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    // Send invitation email if requested and email is configured
    if (validatedData.sendInvitation && isEmailConfigured()) {
      try {
        const loginUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/signin`;
        
        await sendInvitationEmail({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          tempPassword,
          loginUrl
        });
        
        console.log(`Invitation email sent to ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Don't fail user creation if email fails, just log the error
      }
    } else if (validatedData.sendInvitation && !isEmailConfigured()) {
      console.log(`Email not configured. Temp password for ${user.email}: ${tempPassword}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        user,
        tempPassword: validatedData.sendInvitation ? undefined : tempPassword
      },
      message: 'User created successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
