import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PowerOff } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deactivateUser, type AdminUser } from '@/lib/api'

interface UserDeactivateDialogProps {
  user: AdminUser
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserDeactivateDialog({ user, open, onOpenChange }: UserDeactivateDialogProps) {
  const queryClient = useQueryClient()

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateUser(user.id),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['admin-user', String(user.id)], updatedUser)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
  )
}

