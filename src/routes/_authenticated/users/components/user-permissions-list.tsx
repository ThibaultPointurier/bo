import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { KeyRound } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getRoles,
  getUserPermissions,
  getPermissions,
  addUserPermission,
  removeUserPermission,
  type Role,
} from '@/lib/api'

interface UserPermissionsListProps {
  userId: number
  userRoles: string[]
}

export function UserPermissionsList({ userId, userRoles }: UserPermissionsListProps) {
  const queryClient = useQueryClient()
  const [individualPermissions, setIndividualPermissions] = useState<string[]>([])
  const [denyPermissions, setDenyPermissions] = useState<string[]>([])
  const [permError, setPermError] = useState<string | null>(null)
  const [togglingPerm, setTogglingPerm] = useState<string | null>(null)

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  })

  const roles = rolesQuery.data?.data ?? []

  const allPermissionsQuery = useQuery({
    queryKey: ['permissions'],
    queryFn: getPermissions,
    staleTime: Infinity,
  })

  const permissionsQuery = useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: () => getUserPermissions(userId),
  })

  useEffect(() => {
    if (permissionsQuery.data) {
      setIndividualPermissions(permissionsQuery.data.individualPermissions)
      setDenyPermissions(permissionsQuery.data.denyPermissions)
    }
  }, [permissionsQuery.data])

  async function handleTogglePermission(permission: string, checked: boolean) {
    setPermError(null)
    setTogglingPerm(permission)
    try {
      if (checked) {
        await addUserPermission(userId, permission, 'grant')
        setIndividualPermissions((prev) => [...prev, permission])
        setDenyPermissions((prev) => prev.filter((p) => p !== permission))
      } else {
        await removeUserPermission(userId, permission)
        setIndividualPermissions((prev) => prev.filter((p) => p !== permission))
      }
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] })
    } catch (err) {
      setPermError(err instanceof Error ? err.message : 'Erreur lors du changement de permission')
    } finally {
      setTogglingPerm(null)
    }
  }

  async function handleToggleDeny(permission: string, checked: boolean) {
    setPermError(null)
    setTogglingPerm(permission)
    try {
      if (checked) {
        await addUserPermission(userId, permission, 'deny')
        setDenyPermissions((prev) => [...prev, permission])
        setIndividualPermissions((prev) => prev.filter((p) => p !== permission))
      } else {
        await removeUserPermission(userId, permission)
        setDenyPermissions((prev) => prev.filter((p) => p !== permission))
      }
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] })
    } catch (err) {
      setPermError(err instanceof Error ? err.message : 'Erreur lors du changement de permission')
    } finally {
      setTogglingPerm(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="size-5 text-muted-foreground" />
          <div>
            <CardTitle>Permissions individuelles</CardTitle>
            <CardDescription>
              Overrides appliqués directement sur l'utilisateur, indépendamment de ses rôles
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {permissionsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {(() => {
              const grouped = (allPermissionsQuery.data ?? []).reduce(
                (acc, p) => {
                  if (!acc[p.category]) acc[p.category] = []
                  acc[p.category]!.push(p)
                  return acc
                },
                {} as Record<string, typeof allPermissionsQuery.data>
              )

              return Object.entries(grouped).map(([category, perms]) => (
              <div key={category}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {category}
                </p>
                <div className="space-y-2">
                  {(perms ?? []).map((perm) => {
                    const hasGrant = individualPermissions.includes(perm.value)
                    const hasDeny = denyPermissions.includes(perm.value)
                    const isToggling = togglingPerm === perm.value
                    const coveredByRole = roles.some(
                      (role: Role) =>
                        userRoles.includes(role.name) &&
                        role.permissions.includes(perm.value)
                    )
                    const isActive = hasDeny ? false : hasGrant || coveredByRole

                    return (
                      <div
                        key={perm.value}
                        className={`flex items-center justify-between rounded-lg border px-4 py-2.5 transition-colors ${
                          hasDeny
                            ? 'border-red-400/40 bg-red-50 dark:bg-red-950/20'
                            : hasGrant
                              ? 'border-orange-400/40 bg-orange-50 dark:bg-orange-950/20'
                              : coveredByRole
                                ? 'border-primary/20 bg-primary/5'
                                : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{perm.value}</span>
                          {hasDeny ? (
                            <Badge variant="destructive" className="text-xs px-1.5 py-0">
                              Bloqué
                            </Badge>
                          ) : hasGrant ? (
                            <Badge
                              variant="outline"
                              className="border-orange-400 text-orange-600 dark:text-orange-400 text-xs px-1.5 py-0"
                            >
                              Grant
                            </Badge>
                          ) : coveredByRole ? (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              Via rôle
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3">
                          {!coveredByRole && (
                            <Switch
                              checked={hasGrant}
                              disabled={isToggling || hasDeny}
                              onCheckedChange={(checked) =>
                                handleTogglePermission(perm.value, checked)
                              }
                            />
                          )}
                          {(coveredByRole || hasGrant || hasDeny) && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">Bloquer</span>
                              <Switch
                                checked={hasDeny}
                                disabled={isToggling}
                                className="data-[state=checked]:bg-destructive"
                                onCheckedChange={(checked) =>
                                  handleToggleDeny(perm.value, checked)
                                }
                              />
                            </div>
                          )}
                          {coveredByRole && !hasDeny && (
                            <Switch
                              checked={isActive}
                              disabled={true}
                              className="opacity-40"
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
            })()}
          </div>
        )}
        {permError && (
          <p className="mt-3 text-sm text-destructive">{permError}</p>
        )}
      </CardContent>
    </Card>
  )
}

