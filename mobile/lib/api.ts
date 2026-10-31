export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiRequest<T>(
  apiBase: string,
  path: string,
  options: { method?: string; token?: string | null; body?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  let response: Response
  try {
    response = await fetch(`${apiBase}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError(`Could not reach ${apiBase}. Check the server address and that TheoShift is running.`, 0)
  }

  const json = await response.json().catch(() => ({}))
  if (!response.ok || json?.success === false) {
    throw new ApiError(json?.error || json?.message || `Request failed (${response.status})`, response.status)
  }
  return json as T
}
