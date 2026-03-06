import {createFileRoute} from '@tanstack/react-router'
import {useQuery} from '@tanstack/react-query'
import {getStoredUser} from '@/lib/auth'
import {getRoles, getUsers, getStoredCdnVersion, getUserRegistrationStats} from '@/lib/api'
import {Permission, hasPermission} from '@/lib/permissions'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Skeleton} from '@/components/ui/skeleton'
import {Shield, Users, Wifi, AlertTriangle} from 'lucide-react'
import {
    Area,
    AreaChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

/** Formate un numéro de mois (1-12) en abréviation localisée (ex: "jan.", "Feb.") */
const formatMonth = (month: number) =>
    new Intl.DateTimeFormat(navigator.language, {month: 'short'}).format(new Date(2000, month - 1, 1))

// ─── Mock data (builds) ──────────────────────────────────

const buildsCreatedData = [
    {month: 'Jan', publics: 3, prives: 2},
    {month: 'Fév', publics: 9, prives: 5},
    {month: 'Mar', publics: 6, prives: 3},
    {month: 'Avr', publics: 14, prives: 7},
    {month: 'Mai', publics: 22, prives: 11},
    {month: 'Jun', publics: 18, prives: 10},
    {month: 'Jul', publics: 30, prives: 15},
    {month: 'Aoû', publics: 26, prives: 13},
    {month: 'Sep', publics: 35, prives: 17},
    {month: 'Oct', publics: 29, prives: 15},
    {month: 'Nov', publics: 44, prives: 23},
    {month: 'Déc', publics: 52, prives: 26},
]

export const Route = createFileRoute('/_authenticated/')({
    component: DashboardPage,
})

function DashboardPage() {
    const user = getStoredUser()!

    // Vérifier les permissions de l'utilisateur
    const canViewRoles = hasPermission(user.permissions, Permission.ADMIN_ROLE_MANAGE)
    const canViewUsers = hasPermission(user.permissions, Permission.ADMIN_USER_MANAGE)

    const rolesQuery = useQuery({
        queryKey: ['roles'],
        queryFn: () => getRoles(),
        enabled: canViewRoles,
        retry: false,
    })

    const usersQuery = useQuery({
        queryKey: ['users-count'],
        queryFn: () => getUsers({limit: 1}),
        enabled: canViewUsers,
        retry: false,
    })

    const versionQuery = useQuery({
        queryKey: ['wakfu-version'],
        queryFn: () => getStoredCdnVersion(),
    })

    const userStatsQuery = useQuery({
        queryKey: ['user-registrations'],
        queryFn: () => getUserRegistrationStats(),
        enabled: canViewUsers,
        retry: false,
    })

    const totalRoles = rolesQuery.data?.length ?? 0
    const totalUsers = usersQuery.data?.meta.total ?? 0

    return (
        <div className="space-y-6">
            {/* Welcome */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    Bienvenue, <span className="font-medium text-foreground">{user.usernameView}</span> 👋
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatsCard
                    title="Utilisateurs"
                    value={!canViewUsers ? 'N/A' : (usersQuery.isLoading ? undefined : String(totalUsers))}
                    description="Comptes enregistrés"
                    icon={<Users className="size-4 text-muted-foreground"/>}
                />
                <StatsCard
                    title="Rôles"
                    value={!canViewRoles ? 'N/A' : (rolesQuery.isLoading ? undefined : String(totalRoles))}
                    description="Rôles configurés"
                    icon={<Shield className="size-4 text-muted-foreground"/>}
                />
                <CdnVersionCard
                    cdnVersion={versionQuery.data?.cdnVersion ?? null}
                    storedVersion={versionQuery.data?.storedVersion ?? null}
                    isLoading={versionQuery.isLoading}
                />
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Users className="size-4 text-muted-foreground"/>
                            Inscriptions utilisateurs
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">Nouveaux comptes par mois (année en cours)</p>
                    </CardHeader>
                    <CardContent>
                        {userStatsQuery.isLoading ? (
                            <Skeleton className="h-[280px] w-full"/>
                        ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={userStatsQuery.data?.data ?? []} margin={{top: 8, right: 16, left: -10, bottom: 0}}>
                                <defs>
                                    <linearGradient id="colorInscriptions" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorActifs" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border"/>
                                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{fontSize: 11}} className="fill-muted-foreground"/>
                                <YAxis tick={{fontSize: 11}} className="fill-muted-foreground"/>
                                <Tooltip
                                    labelFormatter={(v) => formatMonth(v as number)}
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--popover))',
                                        borderColor: 'hsl(var(--border))',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        color: 'hsl(var(--popover-foreground))',
                                    }}
                                    labelStyle={{fontWeight: 600}}
                                />
                                <Legend wrapperStyle={{fontSize: '12px', paddingTop: '12px'}}/>
                                <Area
                                    type="monotone"
                                    dataKey="inscriptions"
                                    name="Inscriptions"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={2}
                                    fill="url(#colorInscriptions)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="actifs"
                                    name="Utilisateurs actifs"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    fill="url(#colorActifs)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Shield className="size-4 text-muted-foreground"/>
                            Builds créés
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">Builds publics et privés par mois — données simulées</p>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={buildsCreatedData} margin={{top: 8, right: 16, left: -10, bottom: 0}}>
                                <defs>
                                    <linearGradient id="colorPublics" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorPrives" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border"/>
                                <XAxis dataKey="month" tick={{fontSize: 11}} className="fill-muted-foreground"/>
                                <YAxis tick={{fontSize: 11}} className="fill-muted-foreground"/>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--popover))',
                                        borderColor: 'hsl(var(--border))',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        color: 'hsl(var(--popover-foreground))',
                                    }}
                                    labelStyle={{fontWeight: 600}}
                                />
                                <Legend wrapperStyle={{fontSize: '12px', paddingTop: '12px'}}/>
                                <Area
                                    type="monotone"
                                    dataKey="publics"
                                    name="Publics"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={2}
                                    fill="url(#colorPublics)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="prives"
                                    name="Privés"
                                    stroke="#a78bfa"
                                    strokeWidth={2}
                                    fill="url(#colorPrives)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

// ─── Sub-components ──────────────────────────────────────

function StatsCard({
                       title,
                       value,
                       description,
                       icon,
                   }: {
    title: string
    value: string | undefined
    description: string
    icon: React.ReactNode
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                {value === undefined ? (
                    <Skeleton className="h-7 w-20"/>
                ) : (
                    <div className="text-2xl font-bold">{value}</div>
                )}
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    )
}

function CdnVersionCard({
                            cdnVersion,
                            storedVersion,
                            isLoading,
                        }: {
    cdnVersion: string | null
    storedVersion: string | null
    isLoading: boolean
}) {
    const needsUpdate =
        !isLoading && cdnVersion !== null && storedVersion !== null && cdnVersion !== storedVersion

    return (
        <Card className={needsUpdate ? 'border-orange-400 dark:border-orange-500' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Version builder</CardTitle>
                <Wifi className="size-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-7 w-20"/>
                ) : (
                    <div className="text-2xl font-bold">{storedVersion ?? 'N/A'}</div>
                )}
                <p className="text-xs text-muted-foreground">Version actuellement synchronisée</p>
                {needsUpdate && (
                    <div
                        className="mt-2 flex items-center gap-1.5 rounded-md bg-orange-50 dark:bg-orange-950/40 px-2 py-1.5 text-orange-600 dark:text-orange-400">
                        <AlertTriangle className="size-3.5 shrink-0"/>
                        <span className="text-xs font-medium">
              Mise à jour disponible : {cdnVersion}
            </span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

