import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/users/$userId')({
  component: lazyRouteComponent(() => import('./$userId.lazy')),
})

