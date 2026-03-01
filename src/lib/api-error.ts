/**
 * Represents a single entry in the standard API error response.
 */
export interface ApiErrorEntry {
  message: string
  code?: string
  field?: string
  rule?: string
  meta?: Record<string, unknown>
}

/**
 * Shape of every error response returned by the API.
 *
 * ```json
 * { "errors": [{ "message": "errors.some_key", "code": "E_SOME_CODE" }] }
 * ```
 */
export interface ApiErrorBody {
  errors: ApiErrorEntry[]
}

/**
 * Custom Error thrown when an API call fails.
 *
 * It exposes:
 * - `status`  – HTTP status code
 * - `errors`  – the array of error entries returned by the backend
 * - `message` – the first error message (convenient for simple display)
 * - `code`    – the first error code (convenient for programmatic checks)
 */
export class ApiError extends Error {
  readonly status: number
  readonly errors: ApiErrorEntry[]
  readonly code: string | undefined

  constructor(status: number, body: ApiErrorBody) {
    const first = body.errors?.[0]
    super(first?.message ?? 'errors.unknown')
    this.name = 'ApiError'
    this.status = status
    this.errors = body.errors ?? []
    this.code = first?.code
  }

  /**
   * Check whether any error entry has the given code.
   */
  hasCode(code: string): boolean {
    return this.errors.some((e) => e.code === code)
  }

  /**
   * Get all validation field errors (useful for form display).
   * Returns a map of `{ fieldName: message }`.
   */
  get fieldErrors(): Record<string, string> {
    const map: Record<string, string> = {}
    for (const entry of this.errors) {
      if (entry.field) {
        map[entry.field] = entry.message
      }
    }
    return map
  }
}

/**
 * Return a safe i18n-ish message key for a backend-provided message.
 * Avoid returning raw server stacks or non-string values to the UI.
 */
function sanitizeMessage(msg: unknown): string {
  if (typeof msg !== 'string') return 'errors.unknown'
  const trimmed = msg.trim()
  if (!trimmed) return 'errors.unknown'

  // If message already looks like an i18n key (errors.something) or a short code (E_SOMETHING), keep it
  if (/^errors?\.[a-z0-9_.-]+$/i.test(trimmed) || /^[A-Z0-9_]+$/.test(trimmed)) {
    return trimmed
  }

  // Avoid leaking raw HTML, stacks or long messages to the client; map them to a generic server error
  if (trimmed.length > 200 || /\n/.test(trimmed) || /<\/?[a-z][\s\S]*>/i.test(trimmed)) {
    return 'errors.server'
  }

  // For short human messages, optionally keep them but normalize to a safe key prefix.
  // If you prefer always using keys, map to 'errors.server' instead.
  return trimmed
}

function defaultCodeForStatus(status: number): string {
  if (status === 401) return 'E_UNAUTHORIZED'
  if (status === 403) return 'E_FORBIDDEN'
  if (status === 404) return 'E_NOT_FOUND'
  if (status === 422) return 'E_VALIDATION'
  if (status >= 500) return 'E_SERVER'
  return 'E_UNKNOWN'
}

/**
 * Parse a failed `Response` into an `ApiError`.
 *
 * Falls back gracefully if the body isn't valid JSON or doesn't
 * match the expected `{ errors: [...] }` shape. Messages are sanitized
 * and codes are normalized using the HTTP status when possible.
 */
export async function parseApiError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody

  try {
    const json = await response.json()

    // Standard format
    if (Array.isArray(json?.errors)) {
      const mapped: ApiErrorEntry[] = (json.errors as unknown[]).map((e: unknown) => {
        const entry = e as { [k: string]: unknown }
        return {
          message: sanitizeMessage(entry?.message),
          code: typeof entry?.code === 'string' ? (entry.code as string) : undefined,
          field: typeof entry?.field === 'string' ? (entry.field as string) : undefined,
          rule: typeof entry?.rule === 'string' ? (entry.rule as string) : undefined,
          meta: typeof entry?.meta === 'object' && entry?.meta ? (entry.meta as Record<string, unknown>) : undefined,
        }
      })

      // If no codes present, fill first entry with a default code based on status
      if (!mapped.some((m) => m.code)) {
        mapped[0].code = defaultCodeForStatus(response.status)
      }

      body = { errors: mapped }
    }
    // Legacy format: { message: "..." }
    else if (typeof json?.message === 'string') {
      body = { errors: [{ message: sanitizeMessage(json.message), code: json.code ?? defaultCodeForStatus(response.status) }] }
    }
    // Legacy format: { error: "..." }
    else if (typeof json?.error === 'string') {
      body = { errors: [{ message: sanitizeMessage(json.error), code: defaultCodeForStatus(response.status) }] }
    }
    // Unknown JSON shape
    else {
      body = { errors: [{ message: 'errors.unknown', code: 'E_UNKNOWN' }] }
    }
  } catch {
    // If parsing JSON fails, try to read plain text for a hint (but don't leak long content)
    try {
      const text = await response.text()
      if (text) {
        const safe = sanitizeMessage(text)
        body = { errors: [{ message: safe, code: defaultCodeForStatus(response.status) }] }
      } else {
        body = { errors: [{ message: 'errors.network', code: 'E_NETWORK' }] }
      }
    } catch {
      body = { errors: [{ message: 'errors.network', code: 'E_NETWORK' }] }
    }
  }

  // Map certain HTTP statuses to clearer i18n keys when none of the backend messages were specific
  if (response.status === 401 && !body.errors.some((e) => e.code === 'E_UNAUTHORIZED')) {
    body.errors.unshift({ message: 'errors.unauthorized', code: 'E_UNAUTHORIZED' })
  } else if (response.status === 403 && !body.errors.some((e) => e.code === 'E_FORBIDDEN')) {
    body.errors.unshift({ message: 'errors.forbidden', code: 'E_FORBIDDEN' })
  } else if (response.status === 404 && !body.errors.some((e) => e.code === 'E_NOT_FOUND')) {
    body.errors.unshift({ message: 'errors.not_found', code: 'E_NOT_FOUND' })
  } else if (response.status >= 500 && !body.errors.some((e) => e.code === 'E_SERVER')) {
    body.errors.unshift({ message: 'errors.server', code: 'E_SERVER' })
  }

  return new ApiError(response.status, body)
}
