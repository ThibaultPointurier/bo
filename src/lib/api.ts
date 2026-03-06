import { apiFetch, API_BASE_URL } from '@/lib/client'
import { getStoredToken } from '@/lib/auth'
export { ApiError } from './api-error'
export type { ApiErrorEntry, ApiErrorBody } from './api-error'

// ─── Types ────────────────────────────────────────────────

interface LoginRequest {
  email: string
  password: string
}

interface User {
  id: number
  email: string
  username: string
  usernameView: string
  isVerified: boolean
  createdAt: string
  updatedAt: string | null
  initials: string
  roles: string[]
  permissions: string[]
}

interface LoginResponse {
  user: User
  token: string
}

interface Role {
  id: number
  name: string
  permissions: string[]
  createdAt: string
  updatedAt: string | null
}

interface AdminUser {
  id: number
  email: string
  username: string
  usernameView: string
  isVerified: boolean
  isActive: boolean
  discordId: string | null
  initials: string
  roles: string[]
  permissions: string[]
  createdAt: string
  updatedAt: string | null
}

interface PaginatedUsers {
  users: AdminUser[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

interface UpdateUserRequest {
  email?: string
  username?: string
  isVerified?: boolean
}

export interface Permission {
  value: string
  label: string
  category: string
}

export interface UserPermissions {
  /** Toutes les permissions effectives (rôles + grants individuels, minus denies) */
  permissions: string[]
  /** Permissions de type "grant" assignées individuellement à l'utilisateur (overrides) */
  individualPermissions: string[]
  /** Permissions de type "deny" assignées individuellement à l'utilisateur (blocks) */
  denyPermissions: string[]
}

export interface UserRegistrationStat {
  /** Numéro du mois (1 = janvier … 12 = décembre) */
  month: number
  inscriptions: number
  actifs: number
}

export interface UserRegistrationStats {
  year: number
  data: UserRegistrationStat[]
}

interface TriggerSyncResponse {
  syncId: string
  channel: string
}

export type { User, LoginRequest, LoginResponse, Role, AdminUser, PaginatedUsers, UpdateUserRequest }

// ─── Auth ────────────────────────────────────────────────

/**
 * Login does not use apiFetch because the token is not yet available.
 * It uses a raw fetch with only Content-Type.
 */
export async function loginApi(data: LoginRequest): Promise<LoginResponse> {
  const { parseApiError } = await import('./api-error')
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3333/api/v1'
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw await parseApiError(response)
  const result = await response.json()
  // API wraps response in { data: ... }
  return result.data
}

export async function logoutApi(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' })
}

export async function getProfile(): Promise<User> {
  return apiFetch<User>('/account/profile')
}

// ─── Permissions ─────────────────────────────────────────

export async function getPermissions(): Promise<Permission[]> {
  // L'endpoint /permissions retourne directement un tableau sans { data: ... }
  // On doit faire la requête raw
  const token = getStoredToken()
  if (!token) {
    throw new Error('No authentication token found')
  }

  const response = await fetch(`${API_BASE_URL}/permissions`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch permissions')
  }

  const result = await response.json()
  // Si l'API retourne { data: [...] }, on prend data, sinon on prend result directement
  return (result.data || result) ?? []
}

// ─── Roles ───────────────────────────────────────────────

export async function getRoles(params: { page?: number; limit?: number; search?: string } = {}): Promise<Role[]> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.search) query.set('search', params.search)

  const queryString = query.toString()
  const url = queryString ? `/roles?${queryString}` : '/roles'

  const result = await apiFetch<{ roles: Role[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(url)

  // Retourner seulement le tableau de rôles
  return result?.roles ?? []
}

export async function createRole(data: { name: string; permissions: string[] }): Promise<Role> {
  return apiFetch<Role>('/roles', { method: 'POST', body: data })
}

export async function deleteRole(roleId: number): Promise<void> {
  return apiFetch(`/roles/${roleId}`, { method: 'DELETE' })
}

export async function updateRole(roleId: number, data: { permissions: string[] }): Promise<Role> {
  return apiFetch<Role>(`/roles/${roleId}`, { method: 'PUT', body: data })
}

export async function assignRole(userId: number, roleName: string): Promise<void> {
  return apiFetch('/roles/assign', { method: 'POST', body: { userId, roleName } })
}

export async function removeRole(userId: number, roleName: string): Promise<void> {
  return apiFetch('/roles/remove', { method: 'POST', body: { userId, roleName } })
}

export async function getUserPermissions(userId: number): Promise<UserPermissions> {
  return apiFetch<UserPermissions>(`/roles/users/${userId}/permissions`)
}

export async function addUserPermission(
  userId: number,
  permission: string,
  type: 'grant' | 'deny' = 'grant'
): Promise<void> {
  return apiFetch('/roles/permissions/add', { method: 'POST', body: { userId, permission, type } })
}

export async function removeUserPermission(userId: number, permission: string): Promise<void> {
  return apiFetch('/roles/permissions/remove', { method: 'POST', body: { userId, permission } })
}

// ─── Admin Users ─────────────────────────────────────────

export async function getUser(userId: number): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/admin/users/${userId}`)
}

export async function getUsers(
  params: { page?: number; limit?: number; search?: string } = {}
): Promise<PaginatedUsers> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.search) query.set('search', params.search)
  return apiFetch<PaginatedUsers>(`/admin/users?${query}`)
}

export async function updateUser(userId: number, data: UpdateUserRequest): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/admin/users/${userId}`, { method: 'PUT', body: data })
}

export async function deactivateUser(userId: number): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/admin/users/${userId}/deactivate`, { method: 'PATCH' })
}

export async function activateUser(userId: number): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/admin/users/${userId}/activate`, { method: 'PATCH' })
}

// ─── User Stats ──────────────────────────────────────────

export async function getUserRegistrationStats(): Promise<UserRegistrationStats> {
  return apiFetch<UserRegistrationStats>('/admin/users/stats')
}

// ─── Sync ────────────────────────────────────────────────

export async function triggerSyncItems(): Promise<TriggerSyncResponse> {
  return apiFetch<TriggerSyncResponse>('/admin/sync/items', { method: 'POST' })
}

export async function triggerSyncJobs(): Promise<TriggerSyncResponse> {
  return apiFetch<TriggerSyncResponse>('/admin/sync/jobs', { method: 'POST' })
}

// ─── Wakfu CDN ───────────────────────────────────────────

export async function getStoredCdnVersion(): Promise<{
  storedVersion: string | null
  cdnVersion: string | null
  updatedAt: string | null
}> {
  return apiFetch('/admin/sync/version')
}

