export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/attendants/:path*', '/events/:path*', '/counts/:path*']
};
