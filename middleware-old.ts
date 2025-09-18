import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'staging-jwt-secret-2024';

interface CustomJWTPayload {
  userId: string;
  email: string;
  role: string;
}

// Simple base64 decode for Edge Runtime
function base64Decode(str: string): string {
  // Add padding if needed
  while (str.length % 4) {
    str += '=';
  }
  // Use Buffer for Node.js compatibility
  return Buffer.from(str, 'base64').toString();
}

// Simple JWT verification for Edge Runtime (basic validation only)
function verifyJWTBasic(token: string): CustomJWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(base64Decode(parts[1]));
    
    // Basic expiration check
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }
    
    return payload as CustomJWTPayload;
  } catch (error) {
    return null;
  }
}

export { default } from 'next-auth/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  if (pathname === '/' || 
      pathname.startsWith('/auth/') || 
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/api/setup') ||
      pathname === '/unauthorized' ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/favicon.ico') ||
      pathname.endsWith('.html') ||
      pathname.startsWith('/test-')) {
    return NextResponse.next()
  }

  // Get auth token from cookies
  const token = request.cookies.get('auth-token')?.value

  console.log('[MIDDLEWARE] Token exists:', !!token);
  console.log('[MIDDLEWARE] JWT_SECRET exists:', !!JWT_SECRET);
  
  if (!token) {
    console.log('[MIDDLEWARE] No token found, redirecting to signin');
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  try {
    console.log('[MIDDLEWARE] Verifying JWT token with basic verification, length:', token.length);
    const jwtPayload = verifyJWTBasic(token);
    
    if (!jwtPayload) {
      console.log('[MIDDLEWARE] JWT verification failed: invalid token structure or expired');
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
    
    console.log('[MIDDLEWARE] JWT verification successful, payload:', { userId: jwtPayload.userId, email: jwtPayload.email, role: jwtPayload.role });
    
    // Role-based access control
    if (pathname.startsWith('/admin') && jwtPayload.role !== 'ADMIN') {
      console.log('[MIDDLEWARE] Access denied: insufficient role for admin area');
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    
    if (pathname.startsWith('/oversight') && !['ADMIN', 'OVERSIGHT'].includes(jwtPayload.role)) {
      console.log('[MIDDLEWARE] Access denied: insufficient role for oversight area');
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    
    console.log('[MIDDLEWARE] Access granted for path:', pathname);
    return NextResponse.next();
  } catch (error) {
    console.error('[MIDDLEWARE] Token verification failed:', error);
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!api/auth|api/setup|_next/static|_next/image|favicon.ico).*)'
  ]
}
