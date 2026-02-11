'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { OBEReportGenerator } from '@/components/obe-report-generator'

export default function ReportsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <Header />
        <div className="flex-1 overflow-auto">
          <OBEReportGenerator />
        </div>
      </main>
    </div>
  )
}
