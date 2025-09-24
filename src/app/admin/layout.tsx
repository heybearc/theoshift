'use client';

import { useSession } from '@/lib/auth-stub';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Redirect to sign-in if not authenticated
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    // Check if user has admin role
    if (status === 'authenticated' && session?.user) {
      const userRole = (session.user as { role?: string })?.role;
      if (userRole !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
    }
  }, [status, session, router]);

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div style={{ fontSize: '18px' }}>Loading...</div>
      </div>
    );
  }

  // Don't render anything if not authenticated or not admin
  if (status === 'unauthenticated' || (session?.user as { role?: string })?.role !== 'ADMIN') {
    return null;
  }

  // Simple wrapper - let the page handle its own navigation
  return (
    <div>
      {children}
    </div>
  );
}
