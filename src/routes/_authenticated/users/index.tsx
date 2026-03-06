import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/users/')({
  component: lazyRouteComponent(() => import('./index.lazy')),
})

