import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Bulk operations on users
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userIds, data } = body

    if (!action || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Action and user IDs required' }, { status: 400 })
    }

    const results = []
    const errors = []

    switch (action) {
      case 'activate':
        for (const userId of userIds) {
          try {
            const user = await prisma.users.update({
              where: { id: userId },
              data: { isActive: true, updatedAt: new Date() },
              select: { id: true, email: true, firstName: true, lastName: true, isActive: true }
            })
            results.push(user)
          } catch (error) {
            errors.push({ userId, error: error instanceof Error ? error.message : 'Unknown error' })
          }
        }
        break

      case 'deactivate':
        for (const userId of userIds) {
          try {
            const user = await prisma.users.update({
              where: { id: userId },
              data: { isActive: false, updatedAt: new Date() },
              select: { id: true, email: true, firstName: true, lastName: true, isActive: true }
            })
            results.push(user)
          } catch (error) {
            errors.push({ userId, error: error instanceof Error ? error.message : 'Unknown error' })
          }
        }
        break

      case 'change_role':
        if (!data?.role) {
          return NextResponse.json({ error: 'Role required for role change action' }, { status: 400 })
        }

        const validRoles = ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'ATTENDANT']
        if (!validRoles.includes(data.role)) {
          return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }

        for (const userId of userIds) {
          try {
            const user = await prisma.users.update({
              where: { id: userId },
              data: { role: data.role, updatedAt: new Date() },
              select: { id: true, email: true, firstName: true, lastName: true, role: true }
            })
            results.push(user)
          } catch (error) {
            errors.push({ userId, error: error instanceof Error ? error.message : 'Unknown error' })
          }
        }
        break

      case 'delete':
        for (const userId of userIds) {
          try {
            // Soft delete by deactivating
            const user = await prisma.users.update({
              where: { id: userId },
              data: { isActive: false, updatedAt: new Date() },
              select: { id: true, email: true, firstName: true, lastName: true, isActive: true }
            })
            results.push(user)
          } catch (error) {
            errors.push({ userId, error: error instanceof Error ? error.message : 'Unknown error' })
          }
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({
      message: `Bulk ${action} completed. ${results.length} successful, ${errors.length} failed.`,
      successful: results,
      failed: errors
    })
  } catch (error) {
    console.error('Failed to perform bulk operation:', error)
    return NextResponse.json({ error: 'Failed to perform bulk operation' }, { status: 500 })
  }
}
