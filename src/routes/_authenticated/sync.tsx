import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect, useCallback } from 'react'
import { triggerSyncItems, triggerSyncJobs } from '@/lib/api'
import { createTransmit } from '@/lib/transmit'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  Briefcase,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Terminal,
  Trash2,
} from 'lucide-react'

export const Route = createFileRoute('/_authenticated/sync')({
  component: SyncPage,
})

interface LogEntry {
  message: string
  level: 'info' | 'success' | 'warning' | 'error'
  timestamp: string
  source: string
}

type SyncType = 'items' | 'jobs'
type SyncStatus = 'idle' | 'running' | 'success' | 'error'

const levelColors: Record<string, string> = {
  info: 'text-blue-400',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  error: 'text-red-400',
}

const sourceColors: Record<string, string> = {
  items: 'text-violet-400',
  jobs: 'text-orange-400',
  system: 'text-zinc-500',
}

function SyncPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [statuses, setStatuses] = useState<Record<SyncType, SyncStatus>>({
    items: 'idle',
    jobs: 'idle',
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const transmitRefs = useRef<Map<string, { transmit: ReturnType<typeof createTransmit>; subscription: { delete: () => void } }>>(new Map())

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      transmitRefs.current.forEach((ref) => {
        ref.subscription.delete()
        ref.transmit.close()
      })
      transmitRefs.current.clear()
    }
  }, [])

  const addLog = useCallback((source: string, message: string, level: LogEntry['level'] = 'info') => {
    setLogs((prev) => [...prev, { message, level, source, timestamp: new Date().toISOString() }])
  }, [])

  const triggerSync = useCallback(async (type: SyncType) => {
    // Cleanup previous connection for this type
    const existing = transmitRefs.current.get(type)
    if (existing) {
      existing.subscription.delete()
      existing.transmit.close()
      transmitRefs.current.delete(type)
    }

    setStatuses((prev) => ({ ...prev, [type]: 'running' }))
    const label = type === 'items' ? 'Items' : 'Métiers'
    addLog(type, `▶ Lancement de la synchronisation des ${label}...`)

    try {
      const triggerFn = type === 'items' ? triggerSyncItems : triggerSyncJobs
      const { channel } = await triggerFn()

      const transmit = createTransmit()
      const subscription = transmit.subscription(channel)

      subscription.onMessage((data: { message: string; level: string; timestamp: string; success?: boolean }) => {
        if (data.level === 'done') {
          const finalStatus = data.success ? 'success' : 'error'
          setStatuses((prev) => ({ ...prev, [type]: finalStatus }))

          if (data.success) {
            addLog(type, `✅ Synchronisation des ${label} terminée avec succès.`, 'success')
          } else {
            addLog(type, `❌ Synchronisation des ${label} échouée : ${data.message}`, 'error')
          }

          // Cleanup
          setTimeout(() => {
            const ref = transmitRefs.current.get(type)
            if (ref) {
              ref.subscription.delete()
              ref.transmit.close()
              transmitRefs.current.delete(type)
            }
          }, 1000)
          return
        }

        addLog(type, data.message, data.level as LogEntry['level'])
      })

      transmitRefs.current.set(type, { transmit, subscription })
      await subscription.create()
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur inconnue'
      addLog(type, `❌ ${msg}`, 'error')
      setStatuses((prev) => ({ ...prev, [type]: 'error' }))
    }
  }, [addLog])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  const isAnySyncRunning = Object.values(statuses).some((s) => s === 'running')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Synchronisation</h1>
        <p className="text-muted-foreground">
          Lancez la synchronisation des données depuis le CDN Wakfu et suivez la progression en
          temps réel.
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => triggerSync('items')}
          disabled={statuses.items === 'running'}
          size="sm"
        >
          {statuses.items === 'running' ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Package className="mr-2 size-4" />
          )}
          Sync Items
          <StatusDot status={statuses.items} />
        </Button>

        <Button
          onClick={() => triggerSync('jobs')}
          disabled={statuses.jobs === 'running'}
          size="sm"
          variant="secondary"
        >
          {statuses.jobs === 'running' ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Briefcase className="mr-2 size-4" />
          )}
          Sync Métiers
          <StatusDot status={statuses.jobs} />
        </Button>

        <div className="flex-1" />

        <Button
          onClick={() => {
            triggerSync('items')
            setTimeout(() => triggerSync('jobs'), 500)
          }}
          disabled={isAnySyncRunning}
          size="sm"
          variant="outline"
        >
          <RefreshCw className="mr-2 size-4" />
          Tout synchroniser
        </Button>

        <Button onClick={clearLogs} size="sm" variant="ghost" disabled={logs.length === 0}>
          <Trash2 className="mr-2 size-4" />
          Vider les logs
        </Button>
      </div>

      {/* Console */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Console</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {statuses.items !== 'idle' && (
              <StatusBadge label="Items" status={statuses.items} />
            )}
            {statuses.jobs !== 'idle' && (
              <StatusBadge label="Métiers" status={statuses.jobs} />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={containerRef}
            className="bg-zinc-950 rounded-lg border border-zinc-800 p-4 font-mono text-sm h-[500px] overflow-y-auto"
          >
            {logs.length === 0 && (
              <p className="text-zinc-600 italic">
                Aucun log. Lancez une synchronisation pour commencer.
              </p>
            )}
            {logs.map((entry, i) => (
              <div key={i} className="flex gap-2 leading-relaxed">
                <span className="text-zinc-600 shrink-0 text-xs mt-0.5">
                  {new Date(entry.timestamp).toLocaleTimeString('fr-FR')}
                </span>
                <span
                  className={`shrink-0 text-xs font-semibold mt-0.5 uppercase w-14 ${sourceColors[entry.source] ?? 'text-zinc-500'}`}
                >
                  [{entry.source}]
                </span>
                <span className={levelColors[entry.level] ?? 'text-zinc-300'}>
                  {entry.message}
                </span>
              </div>
            ))}
            {isAnySyncRunning && logs.length > 0 && (
              <div className="flex items-center gap-2 text-zinc-400 mt-1">
                <Loader2 className="size-3 animate-spin" />
                <span className="text-xs">En cours...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusDot({ status }: { status: SyncStatus }) {
  if (status === 'idle') return null

  const colors: Record<SyncStatus, string> = {
    idle: '',
    running: 'bg-blue-500 animate-pulse',
    success: 'bg-green-500',
    error: 'bg-red-500',
  }

  return <span className={`ml-2 inline-block size-2 rounded-full ${colors[status]}`} />
}

function StatusBadge({ label, status }: { label: string; status: SyncStatus }) {
  switch (status) {
    case 'idle':
      return null
    case 'running':
      return (
        <Badge variant="secondary" className="text-blue-600 text-xs">
          <Loader2 className="mr-1 size-3 animate-spin" />
          {label}
        </Badge>
      )
    case 'success':
      return (
        <Badge variant="default" className="bg-green-600 text-xs">
          <CheckCircle2 className="mr-1 size-3" />
          {label}
        </Badge>
      )
    case 'error':
      return (
        <Badge variant="destructive" className="text-xs">
          <XCircle className="mr-1 size-3" />
          {label}
        </Badge>
      )
  }
}

