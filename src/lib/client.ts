/**
 * Centralised HTTP client for the Wakfuli API.
 *
 * - Automatically injects the Bearer token from sessionStorage.
 * - Sets Content-Type: application/json on every request.
 * - Parses error responses uniformly via ApiError.
 *
 * Usage:
 *   import { apiFetch } from '@/lib/client'
 *   const data = await apiFetch<User>('/account/profile')
 *   const result = await apiFetch<Role>('/roles', { method: 'POST', body: { name: 'editor', permissions: [] } })
 */

import { getStoredToken } from '@/lib/auth'
import { parseApiError } from '@/lib/api-error'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3333/api/v1'

type RequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  /** Request body — plain objects are automatically serialised to JSON. */
  body?: unknown
  /** Extra headers merged on top of the defaults. */
  headers?: Record<string, string>
  /** When true, return the raw JSON response instead of unwrapping `result.data`. */
  raw?: boolean
}

/**
 * Perform an authenticated fetch against the API.
 * Returns the parsed JSON body, or `undefined` for 204 No Content responses.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers: extraHeaders, raw, ...rest } = options

  const token = getStoredToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }

  // 204 No Content — nothing to parse
  if (response.status === 204) {
    return undefined as T
  }

  const result = await response.json()
  // When raw is true, return the full JSON response as-is.
  // Otherwise, unwrap the standard { data: ... } envelope.
  return (raw ? result : result.data) as T
}

