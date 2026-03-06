import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getRoles, deleteRole, getPermissions } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { formatDate } from '@/lib/utils'

const PROTECTED_ROLES = ['user', 'moderator', 'admin']

// ---------------------------------------------------------------------------
// Delete dialog (kept as modal — small and appropriate)
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
// Page — Liste des rôles
// ---------------------------------------------------------------------------

export const Route = createLazyFileRoute('/_authenticated/roles/')({
  component: RolesIndexPage,
})

function RolesIndexPage() {
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

  /** Map permission value → label for display */
  const permLabelMap = new Map(allPermissions.map((p) => [p.value, p.label]))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rôles</h1>
          <p className="text-muted-foreground">Gestion des rôles et permissions du système</p>
        </div>
        <Button asChild>
          <Link to="/roles/create">
            <Plus className="mr-2 size-4" />
            Créer un rôle
          </Link>
        </Button>
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
                          role.permissions.slice(0, 4).map((perm) => (
                            <Tooltip key={perm}>
                              <TooltipTrigger asChild>
                                <Badge variant="secondary" className="text-xs cursor-default">
                                  {permLabelMap.get(perm) ?? perm}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <span className="font-mono text-xs">{perm}</span>
                              </TooltipContent>
                            </Tooltip>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">Aucune</span>
                        )}
                        {role.permissions.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{role.permissions.length - 4}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(role.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="size-8" asChild>
                          <Link to="/roles/$roleId" params={{ roleId: String(role.id) }}>
                            <Pencil className="size-4" />
                          </Link>
                        </Button>
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

