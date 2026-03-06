/**
 * Permission constants matching backend Permission enum
 */
export const Permission = {
  // User permissions
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',

  // Admin permissions
  ADMIN_ACCESS: 'admin:access',
  ADMIN_USER_MANAGE: 'admin:user:manage',
  ADMIN_ROLE_MANAGE: 'admin:role:manage',
  ADMIN_SYNC: 'admin:sync',

  // Moderation permissions
  MOD_ACCESS: 'mod:access',
  MOD_USER_BAN: 'mod:user:ban',
  MOD_USER_WARN: 'mod:user:warn',
} as const

export type Permission = typeof Permission[keyof typeof Permission]

/**
 * Check if a user has a specific permission
 */
export function hasPermission(userPermissions: string[], permission: Permission | string): boolean {
  return userPermissions.includes(permission)
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(userPermissions: string[], permissions: (Permission | string)[]): boolean {
  return permissions.some(permission => userPermissions.includes(permission))
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(userPermissions: string[], permissions: (Permission | string)[]): boolean {
  return permissions.every(permission => userPermissions.includes(permission))
}

