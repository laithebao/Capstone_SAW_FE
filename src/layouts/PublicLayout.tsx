import { Outlet } from 'react-router'

export default function PublicLayout() {
  return (
    <main className="p-6">
      <Outlet />
    </main>
  )
}
