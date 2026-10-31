export function defaultApiBase() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim()
  return (fromEnv || 'http://localhost:3001').replace(/\/$/, '')
}

export function normalizeApiBase(value: string) {
  return value.trim().replace(/\/$/, '')
}

export function parseSignInLink(url: string): { token: string; email: string } | null {
  const token = readQuery(url, 'token')
  const email = readQuery(url, 'email')
  if (!token || !email) return null
  return { token, email }
}

function readQuery(url: string, key: string): string | null {
  const match = url.match(new RegExp(`[?&]${key}=([^&#]+)`))
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}
