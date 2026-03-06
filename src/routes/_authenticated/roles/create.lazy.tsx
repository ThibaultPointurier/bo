import { createLazyFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { createRole, getPermissions } from '@/lib/api'
import type { Permission } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Save, Search } from 'lucide-react'

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

export const Route = createLazyFileRoute('/_authenticated/roles/create')({
  component: CreateRolePage,
})

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function CreateRolePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [search, setSearch] = useState('')

  const permissionsQuery = useQuery({
    queryKey: ['permissions'],
    queryFn: getPermissions,
    staleTime: Infinity,
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; permissions: string[] }) => createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      navigate({ to: '/roles' })
    },
  })

  const allPermissions = permissionsQuery.data ?? []

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
    createMutation.mutate({ name: name.trim(), permissions: selectedPermissions })
  }

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
            <h1 className="text-xl font-bold">Créer un rôle</h1>
            <p className="text-sm text-muted-foreground">
              Définissez le nom et les permissions du nouveau rôle
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left — Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Role name */}
            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
                <CardDescription>Nom unique du rôle (en minuscules, sans espaces)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="role-name">Nom du rôle</Label>
                  <Input
                    id="role-name"
                    placeholder="ex: editor, support, content-manager..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    pattern="^[a-z][a-z0-9_-]*$"
                    minLength={2}
                    maxLength={50}
                    disabled={createMutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lettres minuscules, chiffres, tirets et underscores uniquement.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Permissions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Permissions</CardTitle>
                    <CardDescription>
                      Sélectionnez les permissions à attribuer à ce rôle
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
                      const someInCategorySelected = perms.some((p) =>
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
                              disabled={createMutation.isPending}
                            >
                              {allInCategorySelected
                                ? 'Tout décocher'
                                : someInCategorySelected
                                  ? 'Tout cocher'
                                  : 'Tout cocher'}
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {perms.map((perm) => (
                              <div
                                key={perm.value}
                                className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                                  selectedPermissions.includes(perm.value)
                                    ? 'border-primary/30 bg-primary/5'
                                    : ''
                                }`}
                              >
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-sm font-medium">{perm.label}</span>
                                  <span className="text-xs font-mono text-muted-foreground">
                                    {perm.value}
                                  </span>
                                </div>
                                <Switch
                                  checked={selectedPermissions.includes(perm.value)}
                                  onCheckedChange={() => togglePermission(perm.value)}
                                  disabled={createMutation.isPending}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right — Summary + Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Résumé</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Nom</span>
                    <span className="font-medium font-mono">
                      {name.trim() || '—'}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Permissions</span>
                    <Badge variant="outline">{selectedPermissions.length}</Badge>
                  </div>
                </div>

                {selectedPermissions.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex flex-wrap gap-1">
                      {selectedPermissions.map((perm) => (
                        <Badge key={perm} variant="secondary" className="text-xs">
                          {allPermissions.find((p) => p.value === perm)?.label ?? perm}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {createMutation.isError && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <p className="text-sm text-destructive">{createMutation.error.message}</p>
                </CardContent>
              </Card>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={createMutation.isPending || !name.trim()}
            >
              <Save className="mr-2 size-4" />
              {createMutation.isPending ? 'Création...' : 'Créer le rôle'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

