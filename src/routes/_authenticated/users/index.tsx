import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'
import { z } from 'zod'

const usersSearchSchema = z.object({
  page: z.number().int().positive().optional().catch(1),
  search: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/users/')({
  component: lazyRouteComponent(() => import('./index.lazy')),
  validateSearch: usersSearchSchema,
})

