import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    role: string
  }
}

/**
 * Authentication middleware for API routes
 * Validates JWT token and adds user info to request
 */
export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  options: { requireRole?: string[] } = {}
) {
  return async (req: NextRequest) => {
    try {
      // Get JWT token from request
      const token = await getToken({ 
        req, 
        secret: process.env.NEXTAUTH_SECRET 
      })

      if (!token) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Check role requirements
      if (options.requireRole && !options.requireRole.includes(token.role as string)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      // Add user info to request
      const authenticatedReq = req as AuthenticatedRequest
      authenticatedReq.user = {
        id: token.sub!,
        email: token.email!,
        role: token.role as string
      }

      return handler(authenticatedReq)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }
  }
}

/**
 * Admin-only authentication wrapper
 */
export function withAdminAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(handler, { requireRole: ['ADMIN'] })
}

/**
 * Overseer+ authentication wrapper (ADMIN, OVERSEER, ASSISTANT_OVERSEER)
 */
export function withOverseerAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(handler, { 
    requireRole: ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER'] 
  })
}
