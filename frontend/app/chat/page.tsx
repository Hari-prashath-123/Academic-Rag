'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { ChatInterface } from '@/components/chat-interface'

export default function ChatPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Header />
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatInterface />
        </div>
      </main>
    </div>
  )
}
