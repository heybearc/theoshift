import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../utils/auth';

export async function POST(request: NextRequest) {
  try {
    console.log('[LOGIN] Starting login process');
    const { email, password } = await request.json();
    console.log('[LOGIN] Received credentials for email:', email);

    if (!email || !password) {
      console.log('[LOGIN] Missing email or password');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    console.log('[LOGIN] Validating credentials...');
    const user = await AuthService.validateCredentials(email, password);
    
    if (!user) {
      console.log('[LOGIN] Invalid credentials for email:', email);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    console.log('[LOGIN] User validated successfully, ID:', user.id);
    const token = AuthService.generateToken(user);
    console.log('[LOGIN] JWT token generated, length:', token.length);
    
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role
      }
    });

    // Set HTTP-only cookie directly via headers to bypass Next.js secure override
    const cookieValue = `auth-token=${token}; Path=/; Max-Age=${60 * 60 * 24 * 7}; HttpOnly; SameSite=lax`;
    console.log('[LOGIN] Setting cookie with value length:', token.length);
    console.log('[LOGIN] Cookie string:', cookieValue);
    response.headers.set('Set-Cookie', cookieValue);

    console.log('[LOGIN] Login successful for user:', user.email);
    return response;
  } catch (error) {
    console.error('[LOGIN] Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
