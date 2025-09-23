'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // Don't render anything if not authenticated or not admin
  if (status === 'unauthenticated' || (session?.user as { role?: string })?.role !== 'ADMIN') {
    return null;
  }

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: '🏠' },
    { name: 'User Management', href: '/admin/users', icon: '👥' },
    { name: 'Email Configuration', href: '/admin/email-config', icon: '📧' },
    { name: 'Health Monitor', href: '/admin/health-monitor', icon: '🏥' },
    { name: 'API Status', href: '/admin/api-status', icon: '🔌' },
    { name: 'Security Audit', href: '/admin/security', icon: '🔒' },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Navigation */}
      <nav className="bg-red-600 text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/admin" className="text-xl font-bold">
                🛡️ Admin Panel
              </Link>
              <div className="hidden md:flex space-x-6">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-red-700 text-white'
                        : 'text-red-100 hover:bg-red-500 hover:text-white'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-red-100 hover:text-white transition-colors"
              >
                ← Back to App
              </Link>
              <div className="text-sm">
                <div className="font-medium">{session?.user?.name}</div>
                <div className="text-red-200 text-xs">Administrator</div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-red-700 text-white">
        <div className="container mx-auto px-4 py-2">
          <div className="grid grid-cols-3 gap-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center space-y-1 p-2 rounded text-xs transition-colors ${
                  isActive(item.href)
                    ? 'bg-red-800 text-white'
                    : 'text-red-100 hover:bg-red-600'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
