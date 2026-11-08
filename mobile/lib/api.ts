type UnauthorizedHandler = (failedToken: string) => void

let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function formBody(body: unknown): string {
  const params = new URLSearchParams()
  if (body && typeof body === 'object') {
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (value === undefined || value === null) continue
      params.append(key, String(value))
    }
  }
  return params.toString()
}

export async function apiRequest<T>(
  apiBase: string,
  path: string,
  options: {
    method?: string
    token?: string | null
    body?: unknown
    form?: boolean
    skipUnauthorized?: boolean
  } = {}
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  let body: string | undefined
  if (options.body !== undefined) {
    if (options.form) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=utf-8'
      body = formBody(options.body)
    } else {
      headers['Content-Type'] = 'application/json; charset=utf-8'
      body = JSON.stringify(options.body)
    }
  }
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  let response: Response
  try {
    response = await fetch(`${apiBase}${path}`, {
      method: options.method || 'GET',
      headers,
      body,
      credentials: 'omit',
    })
  } catch {
    throw new ApiError(`Could not reach ${apiBase}. Check the server address and that TheoShift is running.`, 0)
  }

  const raw = await response.text()
  let json: { success?: boolean; error?: unknown; message?: unknown } = {}
  if (raw) {
    try {
      json = JSON.parse(raw) as typeof json
    } catch {
      json = { error: raw.replace(/\s+/g, ' ').trim().slice(0, 300) }
    }
  }
  if (!response.ok || json?.success === false) {
    if (options.token && response.status === 401 && !options.skipUnauthorized) unauthorizedHandler?.(options.token)
    const message =
      (typeof json?.error === 'string' && json.error) ||
      (typeof json?.message === 'string' && json.message) ||
      `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }
  return json as T
}
