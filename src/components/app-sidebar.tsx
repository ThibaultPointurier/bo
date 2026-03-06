import { Link, useRouterState } from '@tanstack/react-router'
import { LayoutDashboard, Shield, Users, LogOut, RefreshCw } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { logoutApi, type User } from '@/lib/api'
import { clearAuth } from '@/lib/auth'
import { Permission, hasPermission } from '@/lib/permissions'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const generalItems = [
  { title: 'Dashboard', to: '/' as const, icon: LayoutDashboard },
]

const builderItems = [
  {
    title: 'Synchronisation',
    to: '/sync' as const,
    icon: RefreshCw,
    requiredPermission: Permission.ADMIN_SYNC
  },
]

const adminItems = [
  {
    title: 'Utilisateurs',
    to: '/users' as const,
    icon: Users,
    requiredPermission: Permission.ADMIN_USER_MANAGE
  },
  {
    title: 'Rôles',
    to: '/roles' as const,
    icon: Shield,
    requiredPermission: Permission.ADMIN_ROLE_MANAGE
  },
]

interface AppSidebarProps {
  user: User
}

export function AppSidebar({ user }: AppSidebarProps) {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  // Filtrer les éléments en fonction des permissions de l'utilisateur
  const visibleBuilderItems = builderItems.filter(item =>
    !item.requiredPermission || hasPermission(user.permissions, item.requiredPermission)
  )

  const visibleAdminItems = adminItems.filter(item =>
    !item.requiredPermission || hasPermission(user.permissions, item.requiredPermission)
  )

  const logoutMutation = useMutation({
    mutationFn: () => logoutApi(),
    onSettled: () => {
      clearAuth()
      window.location.href = '/login'
    },
  })

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
            W
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Wakfuli</span>
            <span className="text-xs text-muted-foreground">Back Office</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Général */}
        <SidebarGroup>
          <SidebarGroupLabel>Général</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {generalItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={currentPath === item.to}>
                    <Link to={item.to}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Builder */}
        {visibleBuilderItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Builder</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleBuilderItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={currentPath === item.to}>
                      <Link to={item.to}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Administration */}
        {visibleAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdminItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={currentPath === item.to}>
                      <Link to={item.to}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate font-medium">{user.usernameView}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.usernameView}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 size-4" />
              {logoutMutation.isPending ? 'Déconnexion...' : 'Se déconnecter'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

