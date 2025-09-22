import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth'

/**
 * Get authenticated session for API routes
 * Simplified approach using NextAuth built-in session handling
 */
export async function getAuthenticatedSession() {
  return await getServerSession(authOptions)
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole)
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = 'Authentication required') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  )
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(message = 'Insufficient permissions') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  )
}

/**
 * Simplified authentication wrapper for API routes
 */
export async function withSimpleAuth(
  handler: (session: any) => Promise<NextResponse>,
  options: { requireRole?: string[] } = {}
) {
  const session = await getAuthenticatedSession()

  if (!session) {
    return unauthorizedResponse()
  }

  // Check role requirements
  if (options.requireRole && !hasRole(session.user.role, options.requireRole)) {
    return forbiddenResponse()
  }

  return handler(session)
}

/**
 * Admin-only wrapper
 */
export async function withAdminAuth(handler: (session: any) => Promise<NextResponse>) {
  return withSimpleAuth(handler, { requireRole: ['ADMIN'] })
}

/**
 * Overseer+ wrapper (ADMIN, OVERSEER, ASSISTANT_OVERSEER)
 */
export async function withOverseerAuth(handler: (session: any) => Promise<NextResponse>) {
  return withSimpleAuth(handler, { 
    requireRole: ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER'] 
  })
}
