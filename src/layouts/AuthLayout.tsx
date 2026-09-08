import { Outlet } from 'react-router'

export default function AuthLayout() {
  return (
    <main className="p-6">
      <Outlet />
    </main>
  )
}
