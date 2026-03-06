import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getRoles, createRole, deleteRole, updateRole, getPermissions } from '@/lib/api'
import type { Permission } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Shield, Plus, Trash2, Pencil } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

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
    {} as Record<string, Permission[]>
  )
}

// ---------------------------------------------------------------------------
// Create dialog
// ---------------------------------------------------------------------------

function CreateRoleDialog({ allPermissions }: { allPermissions: Permission[] }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  const createMutation = useMutation({
    mutationFn: (data: { name: string; permissions: string[] }) => createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setOpen(false)
      resetForm()
    },
  })

  function resetForm() {
    setName('')
    setSelectedPermissions([])
  }

  function togglePermission(permission: string) {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    createMutation.mutate({ name, permissions: selectedPermissions })
  }

  const permissionsByCategory = groupByCategory(allPermissions)

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm() }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          Créer un rôle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Créer un nouveau rôle</DialogTitle>
            <DialogDescription>
              Définissez le nom du rôle et ses permissions associées.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Nom du rôle</Label>
              <Input
                id="role-name"
                placeholder="ex: editor, support..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={createMutation.isPending}
              />
            </div>

            <div className="space-y-3">
              <Label>Permissions</Label>
              {Object.entries(permissionsByCategory).map(([category, perms]) => (
                <div key={category} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {category}
                  </p>
                  <div className="space-y-1.5">
                    {perms.map((perm) => (
                      <div
                        key={perm.value}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm">{perm.label}</span>
                          <span className="text-xs font-mono text-muted-foreground">
                            {perm.value}
                          </span>
                        </div>
                        <Switch
                          checked={selectedPermissions.includes(perm.value)}
                          onCheckedChange={() => togglePermission(perm.value)}
                          disabled={createMutation.isPending}
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {createMutation.isError && (
              <p className="text-sm text-destructive">{createMutation.error.message}</p>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createMutation.isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
              {createMutation.isPending ? 'Création...' : 'Créer le rôle'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Edit dialog
// ---------------------------------------------------------------------------

const PROTECTED_ROLES = ['user', 'moderator', 'admin']

function EditRoleDialog({
  roleId,
  roleName,
  currentPermissions,
  allPermissions,
}: {
  roleId: number
  roleName: string
  currentPermissions: string[]
  allPermissions: Permission[]
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(currentPermissions)

  const updateMutation = useMutation({
    mutationFn: (data: { permissions: string[] }) => updateRole(roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setOpen(false)
    },
  })

  function togglePermission(permission: string) {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateMutation.mutate({ permissions: selectedPermissions })
  }

  const permissionsByCategory = groupByCategory(allPermissions)

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        if (value) setSelectedPermissions(currentPermissions)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Modifier le rôle « {roleName} »</DialogTitle>
            <DialogDescription>Modifiez les permissions associées à ce rôle.</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            {Object.entries(permissionsByCategory).map(([category, perms]) => (
              <div key={category} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {category}
                </p>
                <div className="space-y-1.5">
                  {perms.map((perm) => (
                    <div
                      key={perm.value}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm">{perm.label}</span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {perm.value}
                        </span>
                      </div>
                      <Switch
                        checked={selectedPermissions.includes(perm.value)}
                        onCheckedChange={() => togglePermission(perm.value)}
                        disabled={updateMutation.isPending}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {updateMutation.isError && (
              <p className="text-sm text-destructive">{updateMutation.error.message}</p>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={updateMutation.isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Delete dialog
// ---------------------------------------------------------------------------

function DeleteRoleDialog({ roleId, roleName }: { roleId: number; roleName: string }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setOpen(false)
    },
  })

  const isProtected = PROTECTED_ROLES.includes(roleName)

  if (isProtected) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button variant="ghost" size="icon" disabled className="size-8">
              <Trash2 className="size-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Rôle système non supprimable</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Supprimer le rôle</DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer le rôle <strong>{roleName}</strong> ? Cette action
            est irréversible.
          </DialogDescription>
        </DialogHeader>

        {deleteMutation.isError && (
          <p className="text-sm text-destructive">{deleteMutation.error.message}</p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={deleteMutation.isPending}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RolesPage() {
  const permissionsQuery = useQuery({
    queryKey: ['permissions'],
    queryFn: getPermissions,
    staleTime: Infinity,
  })

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  })

  const allPermissions = permissionsQuery.data ?? []
  const roles = rolesQuery.data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rôles</h1>
          <p className="text-muted-foreground">Gestion des rôles et permissions du système</p>
        </div>
        <CreateRoleDialog allPermissions={allPermissions} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Rôles disponibles</CardTitle>
              <CardDescription>
                {roles.length > 0
                  ? `${roles.length} rôle${roles.length > 1 ? 's' : ''} configuré${roles.length > 1 ? 's' : ''}`
                  : 'Chargement...'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rolesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rolesQuery.isError ? (
            <p className="py-8 text-center text-destructive">
              Erreur : {rolesQuery.error.message}
            </p>
          ) : roles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="w-40">Créé le</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {role.id}
                    </TableCell>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.length > 0 ? (
                          role.permissions.map((perm) => (
                            <Badge key={perm} variant="secondary" className="text-xs">
                              {perm}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">Aucune</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(role.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <EditRoleDialog
                          roleId={role.id}
                          roleName={role.name}
                          currentPermissions={role.permissions}
                          allPermissions={allPermissions}
                        />
                        <DeleteRoleDialog roleId={role.id} roleName={role.name} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-muted-foreground">Aucun rôle trouvé</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
