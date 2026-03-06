import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import {
  getUser,
  updateUser,
  deactivateUser,
  activateUser,
  getRoles,
  assignRole,
  removeRole,
  getUserPermissions,
  addUserPermission,
  removeUserPermission,
  getPermissions,
  type AdminUser,
  type UpdateUserRequest,
  type Role,
} from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowLeft, Save, Shield, UserCog, Mail, CheckCircle, XCircle, KeyRound, PowerOff, Power } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/users/$userId')({
  component: EditUserPage,
})

function EditUserPage() {
  const { userId } = Route.useParams()
  const queryClient = useQueryClient()

  const userQuery = useQuery({
    queryKey: ['admin-user', userId],
    queryFn: () => getUser(Number(userId)),
  })

  if (userQuery.isLoading) {
    return <EditUserSkeleton />
  }

  if (userQuery.isError) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/users">
            <ArrowLeft className="mr-2 size-4" />
            Retour
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">{userQuery.error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <EditUserForm
      user={userQuery.data!}
      queryClient={queryClient}
    />
  )
}

// ─── Skeleton ────────────────────────────────────────────

function EditUserSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── Form ────────────────────────────────────────────────

function EditUserForm({
  user,
  queryClient,
}: {
  user: AdminUser
  queryClient: ReturnType<typeof useQueryClient>
}) {
  const [email, setEmail] = useState(user.email)
  const [username, setUsername] = useState(user.usernameView ?? user.username)
  const [isVerified, setIsVerified] = useState(user.isVerified)
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)

  const [userRoles, setUserRoles] = useState<string[]>(user.roles)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [togglingRole, setTogglingRole] = useState<string | null>(null)

  const [individualPermissions, setIndividualPermissions] = useState<string[]>([])
  const [denyPermissions, setDenyPermissions] = useState<string[]>([])
  const [permError, setPermError] = useState<string | null>(null)
  const [togglingPerm, setTogglingPerm] = useState<string | null>(null)

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  })

  const allPermissionsQuery = useQuery({
    queryKey: ['permissions'],
    queryFn: getPermissions,
    staleTime: Infinity,
  })


  const permissionsQuery = useQuery({
    queryKey: ['user-permissions', user.id],
    queryFn: () => getUserPermissions(user.id),
  })

  useEffect(() => {
    if (permissionsQuery.data) {
      setIndividualPermissions(permissionsQuery.data.individualPermissions)
      setDenyPermissions(permissionsQuery.data.denyPermissions)
    }
  }, [permissionsQuery.data])

  useEffect(() => {
    setEmail(user.email)
    setUsername(user.usernameView ?? user.username)
    setIsVerified(user.isVerified)
    setUserRoles(user.roles)
  }, [user])

  const updateMutation = useMutation({
    mutationFn: (data: UpdateUserRequest) => updateUser(user.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', String(user.id)] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateUser(user.id),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['admin-user', String(user.id)], updatedUser)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowDeactivateDialog(false)
    },
  })

  const activateMutation = useMutation({
    mutationFn: () => activateUser(user.id),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['admin-user', String(user.id)], updatedUser)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  async function handleToggleRole(roleName: string, checked: boolean) {
    setRoleError(null)
    setTogglingRole(roleName)
    try {
      if (checked) {
        await assignRole(user.id, roleName)
        setUserRoles((prev) => [...prev, roleName])
      } else {
        await removeRole(user.id, roleName)
        setUserRoles((prev) => prev.filter((r) => r !== roleName))
      }
      queryClient.invalidateQueries({ queryKey: ['admin-user', String(user.id)] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'Erreur lors du changement de rôle')
    } finally {
      setTogglingRole(null)
    }
  }

  async function handleTogglePermission(permission: string, checked: boolean) {
    setPermError(null)
    setTogglingPerm(permission)
    try {
      if (checked) {
        await addUserPermission(user.id, permission, 'grant')
        setIndividualPermissions((prev) => [...prev, permission])
        setDenyPermissions((prev) => prev.filter((p) => p !== permission))
      } else {
        await removeUserPermission(user.id, permission)
        setIndividualPermissions((prev) => prev.filter((p) => p !== permission))
      }
      queryClient.invalidateQueries({ queryKey: ['user-permissions', user.id] })
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
        await addUserPermission(user.id, permission, 'deny')
        setDenyPermissions((prev) => [...prev, permission])
        setIndividualPermissions((prev) => prev.filter((p) => p !== permission))
      } else {
        await removeUserPermission(user.id, permission)
        setDenyPermissions((prev) => prev.filter((p) => p !== permission))
      }
      queryClient.invalidateQueries({ queryKey: ['user-permissions', user.id] })
    } catch (err) {
      setPermError(err instanceof Error ? err.message : 'Erreur lors du changement de permission')
    } finally {
      setTogglingPerm(null)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const changes: UpdateUserRequest = {}
    if (email !== user.email) changes.email = email
    if (username !== (user.usernameView ?? user.username)) changes.username = username
    if (isVerified !== user.isVerified) changes.isVerified = isVerified

    if (Object.keys(changes).length === 0) return
    updateMutation.mutate(changes)
  }

  const hasChanges =
    email !== user.email ||
    username !== (user.usernameView ?? user.username) ||
    isVerified !== user.isVerified

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/users">
              <ArrowLeft className="mr-2 size-4" />
              Retour
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold">{user.usernameView}</h1>
              <p className="text-sm text-muted-foreground">ID: {user.id}</p>
            </div>
          </div>
        </div>
        {user.isActive ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeactivateDialog(true)}
          >
            <PowerOff className="mr-2 size-4" />
            Désactiver
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950"
            onClick={() => activateMutation.mutate()}
            disabled={activateMutation.isPending}
          >
            <Power className="mr-2 size-4" />
            {activateMutation.isPending ? 'Activation...' : 'Réactiver'}
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column - Edit form */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserCog className="size-5 text-muted-foreground" />
                <div>
                  <CardTitle>Informations</CardTitle>
                  <CardDescription>Modifier les informations du compte</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="edit-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-username">Nom d'utilisateur</Label>
                    <Input
                      id="edit-username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      minLength={3}
                      maxLength={30}
                      pattern="^[a-zA-Z0-9_]+$"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md border px-4 py-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="edit-verified">Email vérifié</Label>
                    <p className="text-xs text-muted-foreground">
                      Définir manuellement le statut de vérification
                    </p>
                  </div>
                  <Switch
                    id="edit-verified"
                    checked={isVerified}
                    onCheckedChange={setIsVerified}
                  />
                </div>

                {updateMutation.isError && (
                  <p className="text-sm text-destructive">{updateMutation.error.message}</p>
                )}

                {updateMutation.isSuccess && (
                  <p className="text-sm text-green-600">Modifications enregistrées ✓</p>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateMutation.isPending || !hasChanges}>
                    <Save className="mr-2 size-4" />
                    {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Roles */}
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
              ) : rolesQuery.data && rolesQuery.data.length > 0 ? (
                <div className="space-y-3">
                  {rolesQuery.data.map((role: Role) => {
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

          {/* Individual Permissions (Overrides) */}
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
                  {Object.entries(
                    (allPermissionsQuery.data ?? []).reduce(
                      (acc, p) => {
                        if (!acc[p.category]) acc[p.category] = []
                        acc[p.category]!.push(p)
                        return acc
                      },
                      {} as Record<string, typeof allPermissionsQuery.data>
                    )
                  ).map(([category, perms]) => (
                    <div key={category}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {category}
                      </p>
                      <div className="space-y-2">
                        {(perms ?? []).map((perm) => {
                          const hasGrant = individualPermissions.includes(perm.value)
                          const hasDeny = denyPermissions.includes(perm.value)
                          const isToggling = togglingPerm === perm.value
                          const coveredByRole = rolesQuery.data?.some(
                            (role) =>
                              userRoles.includes(role.name) &&
                              role.permissions.includes(perm.value)
                          ) ?? false
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
                                {/* Toggle grant (actif si pas de rôle) */}
                                {!coveredByRole && (
                                  <Switch
                                    checked={hasGrant}
                                    disabled={isToggling || hasDeny}
                                    onCheckedChange={(checked) =>
                                      handleTogglePermission(perm.value, checked)
                                    }
                                  />
                                )}
                                {/* Toggle deny — visible si permission active (rôle ou grant) */}
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
                                {/* Toggle grant si pas de rôle et état normal */}
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
                  ))}
                </div>
              )}
              {permError && (
                <p className="mt-3 text-sm text-destructive">{permError}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column - Info sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Résumé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="text-center">
                <p className="font-semibold">{user.usernameView}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>

              <Separator />

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email vérifié</span>
                  <div className="flex items-center gap-1.5">
                    {user.isVerified ? (
                      <>
                        <CheckCircle className="size-4 text-green-600" />
                        <span className="text-green-600 font-medium">Vérifié</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="size-4 text-orange-500" />
                        <span className="text-orange-500 font-medium">Non vérifié</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Compte</span>
                  <div className="flex items-center gap-1.5">
                    {user.isActive ? (
                      <>
                        <Power className="size-4 text-green-600" />
                        <span className="text-green-600 font-medium">Actif</span>
                      </>
                    ) : (
                      <>
                        <PowerOff className="size-4 text-destructive" />
                        <span className="text-destructive font-medium">Désactivé</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Discord</span>
                  <span className="font-medium">
                    {user.discordId ? 'Lié' : 'Non lié'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rôles</span>
                  <div className="flex gap-1">
                    {userRoles.length > 0 ? (
                      userRoles.map((r) => (
                        <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Aucun</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Permissions</span>
                  <Badge variant="outline">{user.permissions.length}</Badge>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Inscrit le</span>
                  <span className="font-medium">
                    {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {user.updatedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Modifié le</span>
                    <span className="font-medium">
                      {new Date(user.updatedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">ID</span>
                  <span className="font-mono text-xs">{user.id}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Deactivate confirmation dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Désactiver le compte</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir désactiver le compte de <strong>{user.usernameView}</strong> ({user.email}) ?
              L'utilisateur ne pourra plus se connecter tant que son compte sera désactivé.
            </DialogDescription>
          </DialogHeader>
          {deactivateMutation.isError && (
            <p className="text-sm text-destructive">{deactivateMutation.error.message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deactivateMutation.mutate()}
              disabled={deactivateMutation.isPending}
            >
              <PowerOff className="mr-2 size-4" />
              {deactivateMutation.isPending ? 'Désactivation...' : 'Désactiver le compte'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
