'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { ChatInterface } from '@/components/chat-interface'

export default function ChatPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <Header />
        <div className="flex-1 overflow-hidden">
          <ChatInterface />
        </div>
      </main>
    </div>
  )
}
