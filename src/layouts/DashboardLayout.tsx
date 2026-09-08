import { Outlet } from 'react-router'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="md:flex">
        <Sidebar />
        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
