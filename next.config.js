/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure external packages for Next.js 14.2.33
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  
  // Configure for reverse proxy setup with FQDN
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Forwarded-Proto',
            value: 'https',
          },
        ],
      },
    ]
  },
  
  // Configure for proper FQDN handling
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ]
  },
  
  // Ensure proper URL handling behind reverse proxy
  trailingSlash: false,
  
  // Configure public runtime config for URL consistency
  publicRuntimeConfig: {
    // This will be available on both server and client
    publicUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://jw-staging.cloudigan.net'
  },
  
  // Environment variables for client-side
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL,
  }
}

module.exports = nextConfig
