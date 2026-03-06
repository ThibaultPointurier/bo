import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ArrowLeft, PowerOff, Power } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { activateUser, type AdminUser } from '@/lib/api'

interface UserHeaderProps {
  user: AdminUser
  onDeactivate: () => void
}

export function UserHeader({ user, onDeactivate }: UserHeaderProps) {
  const queryClient = useQueryClient()

  const activateMutation = useMutation({
    mutationFn: () => activateUser(user.id),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['admin-user', String(user.id)], updatedUser)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  return (
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
        <Button variant="destructive" size="sm" onClick={onDeactivate}>
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
  )
}

