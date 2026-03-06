import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/roles')({
  component: RolesLayout,
})

function RolesLayout() {
  return <Outlet />
}

