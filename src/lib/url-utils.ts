/**
 * URL Utilities for handling reverse proxy and domain consistency
 */

/**
 * Get the base URL for the application
 * This ensures consistent URL generation across the app
 */
export function getBaseUrl(): string {
  // In browser, use relative URLs to maintain domain consistency
  if (typeof window !== 'undefined') {
    return '';
  }
  
  // On server, use the configured public URL
  if (process.env.NEXT_PUBLIC_URL) {
    return process.env.NEXT_PUBLIC_URL;
  }
  
  // Fallback for development
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  return 'http://localhost:3000';
}

/**
 * Create an absolute URL for API calls or redirects
 */
export function createAbsoluteUrl(path: string): string {
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Ensure a path is relative for client-side navigation
 * This prevents switching from FQDN to IP addresses
 */
export function ensureRelativePath(path: string): string {
  // If it's already relative, return as-is
  if (!path.startsWith('http')) {
    return path.startsWith('/') ? path : `/${path}`;
  }
  
  // Extract path from absolute URL
  try {
    const url = new URL(path);
    return url.pathname + url.search + url.hash;
  } catch {
    return path;
  }
}

/**
 * Get the current domain from the request headers
 * Useful for server-side URL generation
 */
export function getDomainFromHeaders(headers: Headers): string {
  const host = headers.get('host');
  const protocol = headers.get('x-forwarded-proto') || 'https';
  
  if (host) {
    return `${protocol}://${host}`;
  }
  
  return getBaseUrl();
}
