import { createLazyFileRoute, Link, useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getRoles, updateRole, getPermissions } from '@/lib/api'
import type { Permission, Role } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Save, Search } from 'lucide-react'
import { formatDate } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByCategory(permissions: Permission[]): Record<string, Permission[]> {
  return permissions.reduce(
    (acc, perm) => {
      if (!acc[perm.category]) acc[perm.category] = []
      acc[perm.category].push(perm)
      return acc
    },
    {} as Record<string, Permission[]>,
  )
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const Route = createLazyFileRoute('/_authenticated/roles/$roleId')({
  component: EditRolePage,
})

// ---------------------------------------------------------------------------
// Loader wrapper — handles loading / not found states
// ---------------------------------------------------------------------------

function EditRolePage() {
  const { roleId } = useParams({ from: '/_authenticated/roles/$roleId' })

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  })

  const permissionsQuery = useQuery({
    queryKey: ['permissions'],
    queryFn: getPermissions,
    staleTime: Infinity,
  })

  // Loading
  if (rolesQuery.isLoading || permissionsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const role = rolesQuery.data?.data.find((r) => r.id === Number(roleId))

  // Not found
  if (!role) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/roles">
            <ArrowLeft className="mr-2 size-4" />
            Retour
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Rôle introuvable (ID: {roleId})</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // key={role.id} ensures the form remounts (and reinitializes state) if navigating between roles
  return (
    <EditRoleForm
      key={role.id}
      role={role}
      allPermissions={permissionsQuery.data ?? []}
    />
  )
}

// ---------------------------------------------------------------------------
// Form — mounted only when role data is available, so useState can use initial value
// ---------------------------------------------------------------------------

function EditRoleForm({ role, allPermissions }: { role: Role; allPermissions: Permission[] }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role.permissions)
  const [search, setSearch] = useState('')

  const updateMutation = useMutation({
    mutationFn: (data: { permissions: string[] }) => updateRole(role.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      navigate({ to: '/roles' })
    },
  })

  // Filter permissions by search
  const filteredPermissions = search.trim()
    ? allPermissions.filter(
        (p) =>
          p.label.toLowerCase().includes(search.toLowerCase()) ||
          p.value.toLowerCase().includes(search.toLowerCase()) ||
          p.category.toLowerCase().includes(search.toLowerCase()),
      )
    : allPermissions

  const permissionsByCategory = groupByCategory(filteredPermissions)

  function togglePermission(permission: string) {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission],
    )
  }

  function toggleCategory(perms: Permission[]) {
    const allSelected = perms.every((p) => selectedPermissions.includes(p.value))
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((p) => !perms.some((perm) => perm.value === p)))
    } else {
      const newPerms = perms.map((p) => p.value).filter((v) => !selectedPermissions.includes(v))
      setSelectedPermissions((prev) => [...prev, ...newPerms])
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateMutation.mutate({ permissions: selectedPermissions })
  }

  const hasChanges =
    JSON.stringify([...selectedPermissions].sort()) !==
    JSON.stringify([...role.permissions].sort())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/roles">
              <ArrowLeft className="mr-2 size-4" />
              Retour
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-xl font-bold">
              Modifier le rôle <span className="font-mono text-primary">{role.name}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              ID: {role.id} — Créé le {formatDate(role.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left — Permissions */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Permissions</CardTitle>
                    <CardDescription>
                      Gérez les permissions attribuées au rôle « {role.name} »
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {selectedPermissions.length} / {allPermissions.length}
                  </Badge>
                </div>
                <div className="relative pt-2">
                  <Search className="absolute left-2.5 top-4.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Filtrer les permissions..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {Object.keys(permissionsByCategory).length === 0 && search ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Aucune permission ne correspond à « {search} »
                  </p>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(permissionsByCategory).map(([category, perms]) => {
                      const allInCategorySelected = perms.every((p) =>
                        selectedPermissions.includes(p.value),
                      )

                      return (
                        <div key={category}>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {category}
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => toggleCategory(perms)}
                              disabled={updateMutation.isPending}
                            >
                              {allInCategorySelected ? 'Tout décocher' : 'Tout cocher'}
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {perms.map((perm) => {
                              const isSelected = selectedPermissions.includes(perm.value)
                              const wasOriginal = role.permissions.includes(perm.value)
                              const isAdded = isSelected && !wasOriginal
                              const isRemoved = !isSelected && wasOriginal

                              return (
                                <div
                                  key={perm.value}
                                  className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                                    isAdded
                                      ? 'border-green-400/40 bg-green-50 dark:bg-green-950/20'
                                      : isRemoved
                                        ? 'border-red-400/40 bg-red-50 dark:bg-red-950/20'
                                        : isSelected
                                          ? 'border-primary/30 bg-primary/5'
                                          : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-sm font-medium">{perm.label}</span>
                                      <span className="text-xs font-mono text-muted-foreground">
                                        {perm.value}
                                      </span>
                                    </div>
                                    {isAdded && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs border-green-500 text-green-600 dark:text-green-400"
                                      >
                                        Ajouté
                                      </Badge>
                                    )}
                                    {isRemoved && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs border-red-500 text-red-600 dark:text-red-400"
                                      >
                                        Retiré
                                      </Badge>
                                    )}
                                  </div>
                                  <Switch
                                    checked={isSelected}
                                    onCheckedChange={() => togglePermission(perm.value)}
                                    disabled={updateMutation.isPending}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right — Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Résumé</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Nom</span>
                    <span className="font-medium font-mono">{role.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">ID</span>
                    <span className="font-mono text-xs">{role.id}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Permissions</span>
                    <Badge variant="outline">{selectedPermissions.length}</Badge>
                  </div>
                  {hasChanges && (
                    <>
                      <Separator />
                      <div className="space-y-1">
                        {selectedPermissions
                          .filter((p) => !role.permissions.includes(p))
                          .map((p) => (
                            <div key={p} className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                              <span>+</span>
                              <span className="font-mono">{p}</span>
                            </div>
                          ))}
                        {role.permissions
                          .filter((p) => !selectedPermissions.includes(p))
                          .map((p) => (
                            <div key={p} className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                              <span>−</span>
                              <span className="font-mono">{p}</span>
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {updateMutation.isError && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <p className="text-sm text-destructive">{updateMutation.error.message}</p>
                </CardContent>
              </Card>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={updateMutation.isPending || !hasChanges}
            >
              <Save className="mr-2 size-4" />
              {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
