import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Shield } from 'lucide-react'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRoles, assignRole, removeRole, type Role } from '@/lib/api'

interface UserRolesListProps {
  userId: number
  initialRoles: string[]
}

export function UserRolesList({ userId, initialRoles }: UserRolesListProps) {
  const queryClient = useQueryClient()
  const [userRoles, setUserRoles] = useState<string[]>(initialRoles)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [togglingRole, setTogglingRole] = useState<string | null>(null)

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  })

  const roles = rolesQuery.data?.data ?? []

  async function handleToggleRole(roleName: string, checked: boolean) {
    setRoleError(null)
    setTogglingRole(roleName)
    try {
      if (checked) {
        await assignRole(userId, roleName)
        setUserRoles((prev) => [...prev, roleName])
      } else {
        await removeRole(userId, roleName)
        setUserRoles((prev) => prev.filter((r) => r !== roleName))
      }
      queryClient.invalidateQueries({ queryKey: ['admin-user', String(userId)] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'Erreur lors du changement de rôle')
    } finally {
      setTogglingRole(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-muted-foreground" />
          <div>
            <CardTitle>Rôles</CardTitle>
            <CardDescription>Gérer les rôles attribués à l'utilisateur</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rolesQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : roles.length > 0 ? (
          <div className="space-y-3">
            {roles.map((role: Role) => {
              const hasRole = userRoles.includes(role.name)
              const isToggling = togglingRole === role.name
              return (
                <div
                  key={role.id}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${hasRole ? 'border-primary/30 bg-primary/5' : ''}`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{role.name}</span>
                      {hasRole && (
                        <Badge variant="default" className="text-xs px-1.5 py-0">
                          Actif
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.map((perm) => (
                        <Badge key={perm} variant="outline" className="text-xs font-normal">
                          {perm}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Switch
                    checked={hasRole}
                    disabled={isToggling}
                    onCheckedChange={(checked) => handleToggleRole(role.name, checked)}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun rôle disponible dans le système</p>
        )}
        {roleError && (
          <p className="mt-3 text-sm text-destructive">{roleError}</p>
        )}
      </CardContent>
    </Card>
  )
}

