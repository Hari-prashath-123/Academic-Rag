'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { DocumentLibrary } from '@/components/document-library'

export default function DocumentsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <Header />
        <div className="flex-1 overflow-auto">
          <DocumentLibrary />
        </div>
      </main>
    </div>
  )
}
