import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Mail, Save } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateUser, type AdminUser, type UpdateUserRequest } from '@/lib/api'

interface UserEditFormProps {
  user: AdminUser
}

export function UserEditForm({ user }: UserEditFormProps) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState(user.email)
  const [username, setUsername] = useState(user.usernameView ?? user.username)
  const [isVerified, setIsVerified] = useState(user.isVerified)

  const updateMutation = useMutation({
    mutationFn: (data: UpdateUserRequest) => updateUser(user.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', String(user.id)] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="size-5 text-muted-foreground" />
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
  )
}

