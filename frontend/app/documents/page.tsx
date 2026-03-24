'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { DocumentLibrary } from '@/components/document-library'
import { RoleGuard } from '@/components/role-guard'

export default function DocumentsPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'faculty']}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 overflow-auto">
            <DocumentLibrary />
          </div>
        </main>
      </div>
    </RoleGuard>
  )
}
