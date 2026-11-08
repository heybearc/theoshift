/** Reads a phone sign-in body as JSON or a form, including UTF-16 JSON from older app builds. */
export function parseMobileSignInBody(buffer: Buffer, contentType: string | undefined): Record<string, unknown> {
  const text = decodeBody(buffer).replace(/^\uFEFF/, '').trim()
  if (!text) return {}

  const type = (contentType || '').toLowerCase()
  if (type.includes('application/x-www-form-urlencoded') || (!text.startsWith('{') && text.includes('='))) {
    return Object.fromEntries(new URLSearchParams(text))
  }

  try {
    const parsed = JSON.parse(text) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    if (text.includes('=')) return Object.fromEntries(new URLSearchParams(text))
  }

  throw new Error('Unreadable sign-in body')
}

function decodeBody(buffer: Buffer): string {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString('utf16le')
  }
  if (buffer.length >= 4 && buffer[1] === 0 && buffer[3] === 0) {
    return buffer.toString('utf16le')
  }
  return buffer.toString('utf8')
}
