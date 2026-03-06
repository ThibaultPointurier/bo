import { createLazyFileRoute } from '@tanstack/react-router'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { getUsers } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronLeft, ChevronRight, Search, Pencil, Users } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const Route = createLazyFileRoute('/_authenticated/users/')({
  component: UsersPage,
})

function UsersPage() {
  const navigate = useNavigate({ from: '/users' })
  const searchParams = useSearch({ from: '/_authenticated/users/' })

  // Lire les paramètres depuis l'URL avec typage correct
  const page = (searchParams as { page?: number; search?: string }).page ?? 1
  const search = (searchParams as { page?: number; search?: string }).search ?? ''
  const limit = 20

  // State local uniquement pour l'input (pour ne pas déclencher de query à chaque frappe)
  const [searchInput, setSearchInput] = useState(search)

  // Synchroniser l'input avec l'URL quand on navigue (bouton retour, etc.)
  useEffect(() => {
    setSearchInput(search)
  }, [search])

  const usersQuery = useQuery({
    queryKey: ['admin-users', { page, limit, search }],
    queryFn: () => getUsers({ page, limit, search: search || undefined }),
    placeholderData: (prev) => prev,
  })

  const meta = usersQuery.data?.meta
  const users = usersQuery.data?.data ?? []

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    // Mettre à jour l'URL au lieu du state
    navigate({
      search: { page: 1, search: searchInput || undefined }
    })
  }

  function handlePageChange(newPage: number) {
    // Mettre à jour l'URL avec la nouvelle page
    navigate({
      search: { page: newPage, search: search || undefined }
    })
  }

  function handleClearSearch() {
    setSearchInput('')
    navigate({ search: { page: 1, search: undefined } })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Utilisateurs</h1>
        <p className="text-muted-foreground">
          Gestion des comptes utilisateurs
          {meta && <span className="ml-1">— {meta.total} utilisateurs au total</span>}
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-lg">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Rechercher
        </Button>
        {search && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearSearch}
          >
            Effacer
          </Button>
        )}
      </form>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">
              {search ? `Résultats pour "${search}"` : 'Tous les utilisateurs'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Aucun utilisateur trouvé</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">ID</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-28">Vérifié</TableHead>
                    <TableHead className="w-28">Compte</TableHead>
                    <TableHead>Rôles</TableHead>
                    <TableHead className="w-36">Inscrit le</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {user.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                            {user.initials}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{user.usernameView}</p>
                            {user.discordId && (
                              <p className="text-xs text-muted-foreground">Discord</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.isVerified ? 'default' : 'outline'}>
                          {user.isVerified ? 'Vérifié' : 'Non vérifié'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'destructive'} className={user.isActive ? 'bg-green-600 hover:bg-green-700' : ''}>
                          {user.isActive ? 'Actif' : 'Désactivé'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <Badge key={role} variant="secondary" className="text-xs">
                                {role}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">Aucun</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                        >
                          <Link to="/users/$userId" params={{ userId: String(user.id) }}>
                            <Pencil className="size-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {meta && meta.lastPage > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {meta.currentPage} sur {meta.lastPage}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.max(1, page - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="size-4" />
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= meta.lastPage}
                    >
                      Suivant
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

