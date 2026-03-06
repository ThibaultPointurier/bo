import { createLazyFileRoute } from '@tanstack/react-router'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { getUser } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { UserHeader } from './components/user-header'
import { UserEditForm } from './components/user-edit-form'
import { UserRolesList } from './components/user-roles-list'
import { UserPermissionsList } from './components/user-permissions-list'
import { UserSummaryCard } from './components/user-summary-card'
import { UserDeactivateDialog } from './components/user-deactivate-dialog'
import { UserEditSkeleton } from './components/user-edit-skeleton'

export const Route = createLazyFileRoute('/_authenticated/users/$userId')({
  component: EditUserPage,
})

function EditUserPage() {
  const { userId } = useParams({ from: '/_authenticated/users/$userId' })
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)
  const [userRoles, setUserRoles] = useState<string[]>([])

  const userQuery = useQuery({
    queryKey: ['admin-user', userId],
    queryFn: () => getUser(Number(userId)),
  })

  // Synchroniser les rôles avec les données chargées
  useEffect(() => {
    if (userQuery.data) {
      setUserRoles(userQuery.data.roles)
    }
  }, [userQuery.data])

  if (userQuery.isLoading) {
    return <UserEditSkeleton />
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

  const user = userQuery.data!

  return (
    <div className="space-y-6">
      <UserHeader user={user} onDeactivate={() => setShowDeactivateDialog(true)} />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <UserEditForm user={user} />
          <UserRolesList
            userId={user.id}
            initialRoles={user.roles}
          />
          <UserPermissionsList
            userId={user.id}
            userRoles={userRoles}
          />
        </div>

        <div className="space-y-6">
          <UserSummaryCard user={user} userRoles={userRoles} />
        </div>
      </div>

      <UserDeactivateDialog
        user={user}
        open={showDeactivateDialog}
        onOpenChange={setShowDeactivateDialog}
      />
    </div>
  )
}

