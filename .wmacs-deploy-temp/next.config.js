/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client']
  },
  // Configure for reverse proxy setup
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
        ],
      },
    ]
  },
  // Ensure proper URL handling behind reverse proxy
  trailingSlash: false,
  // Configure public runtime config for URL consistency
  publicRuntimeConfig: {
    // This will be available on both server and client
    publicUrl: process.env.NEXT_PUBLIC_URL || 'https://jw-staging.cloudigan.net'
  }
}

module.exports = nextConfig
