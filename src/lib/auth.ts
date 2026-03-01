import type { User } from '@/lib/api'

// sessionStorage is preferred over localStorage to reduce XSS attack surface:
// data is scoped to the current tab and cleared when the tab is closed.
const TOKEN_KEY = 'wakfuli_token'
const USER_KEY = 'wakfuli_user'

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): User | null {
  const raw = sessionStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setAuth(token: string, user: User): void {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export function isAuthenticated(): boolean {
  return !!getStoredToken()
}

