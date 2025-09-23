import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schemas
const updateUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Valid email is required').optional(),
  role: z.enum(['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'ATTENDANT']).optional(),
  isActive: z.boolean().optional()
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

// GET /api/admin/users/[id] - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await checkAdminAuth();
  if (authError) return authError;

  try {
    const { id } = await params;

    const user = await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        attendants: {
          select: {
            id: true,
            position: true,
            status: true,
            assignedDate: true,
            event: {
              select: {
                id: true,
                title: true,
                date: true,
                location: true
              }
            }
          },
          orderBy: { assignedDate: 'desc' }
        },
        _count: {
          select: {
            attendants: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await checkAdminAuth();
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if email is being changed and if it's already taken
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.users.findUnique({
        where: { email: validatedData.email }
      });

      if (emailExists) {
        return NextResponse.json(
          { success: false, error: 'Email already in use by another user' },
          { status: 400 }
        );
      }
    }

    // Update user
    const updatedUser = await prisma.users.update({
      where: { id },
      data: validatedData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      success: true,
      data: { user: updatedUser },
      message: 'User updated successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await checkAdminAuth();
  if (authError) return authError;

  try {
    const { id } = await params;

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            attendants: true
          }
        }
      }
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of users with active assignments
    if (existingUser._count.attendants > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete user with active attendant assignments. Please remove assignments first.' 
        },
        { status: 400 }
      );
    }

    // Soft delete by deactivating the user
    const deactivatedUser = await prisma.users.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true
      }
    });

    return NextResponse.json({
      success: true,
      data: { user: deactivatedUser },
      message: 'User deactivated successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
