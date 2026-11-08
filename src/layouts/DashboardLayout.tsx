import { useState } from 'react'
import { Outlet } from 'react-router'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-900">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-h-screen lg:pl-64">
        <Header onOpenMenu={() => setSidebarOpen(true)} />
        <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
