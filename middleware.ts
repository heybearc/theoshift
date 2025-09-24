import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// WMACS AUTH MIDDLEWARE - Compatible with auth-stub
// This middleware allows all admin routes since we're using development auth stub
export function middleware(request: NextRequest) {
  // For development with auth-stub: allow all admin routes
  // In production: this would check real authentication
  
  const { pathname } = request.nextUrl
  
  // Allow all admin routes during development
  if (pathname.startsWith('/admin')) {
    return NextResponse.next()
  }
  
  // Allow all other protected routes during development
  if (pathname.startsWith('/dashboard') || 
      pathname.startsWith('/attendants') || 
      pathname.startsWith('/events') || 
      pathname.startsWith('/counts')) {
    return NextResponse.next()
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/attendants/:path*', '/events/:path*', '/counts/:path*']
};
