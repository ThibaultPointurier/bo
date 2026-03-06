import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CheckCircle, XCircle, Power, PowerOff } from 'lucide-react'
import type { AdminUser } from '@/lib/api'

interface UserSummaryCardProps {
  user: AdminUser
  userRoles: string[]
}

export function UserSummaryCard({ user, userRoles }: UserSummaryCardProps) {
  return (
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
  )
}

