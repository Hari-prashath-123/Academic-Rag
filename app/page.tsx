'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { DashboardContent } from '@/components/dashboard-content'

export default function Home() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <DashboardContent />
        </div>
      </main>
    </div>
  )
}
