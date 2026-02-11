'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Plus, Copy, ThumbsUp, ThumbsDown, FileUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

const initialMessages = [
  {
    type: 'user',
    content: 'Which CO covers Unit 3 of Data Structures?',
    timestamp: '2:15 PM',
  },
  {
    type: 'assistant',
    content:
      'Based on the course curriculum, Unit 3 (Advanced Trees and Graphs) is primarily covered by CO3 (Design and implement efficient graph algorithms) and CO4 (Apply tree structures in complex scenarios).\n\nThese course outcomes focus on:\n• Tree traversal techniques\n• Graph representation and algorithms\n• Complexity analysis for tree/graph operations\n• Real-world applications in networking and data processing',
    sources: [
      { type: 'Syllabus', name: 'DS_Syllabus_2024.pdf', page: 12 },
      { type: 'CO Mapping', name: 'CO_Matrix.xlsx' },
    ],
    timestamp: '2:16 PM',
  },
  {
    type: 'user',
    content: 'What Bloom\'s level should questions for CO3 reach?',
    timestamp: '2:17 PM',
  },
  {
    type: 'assistant',
    content:
      'For CO3 (Design and implement efficient graph algorithms), questions should target multiple Bloom\'s levels:\n\n• Level 4 (Analyze): Analyze algorithm complexity\n• Level 5 (Evaluate): Compare different algorithms\n• Level 6 (Create): Design new solutions for graph problems\n\nRecommended question distribution:\n- 20% Understand & Apply (Levels 2-3)\n- 50% Analyze & Evaluate (Levels 4-5)\n- 30% Create (Level 6)',
    sources: [
      { type: 'Bloom\'s Mapping', name: 'Blooms_Framework.pdf', page: 8 },
      { type: 'Assessment Guidelines', name: 'Assessment_2024.docx', page: 5 },
    ],
    timestamp: '2:18 PM',
  },
]

const chatHistoryItems = [
  { id: 1, title: 'Data Structures CO Coverage', date: 'Today' },
  { id: 2, title: 'Assessment Question Guidelines', date: 'Yesterday' },
  { id: 3, title: 'OBE Implementation Strategy', date: '2 days ago' },
  { id: 4, title: 'Bloom\'s Level Mapping for CO2', date: 'Last week' },
  { id: 5, title: 'Student Performance Analysis', date: 'Last week' },
]

const sampleMessages = initialMessages; // Declare sampleMessages variable

// Typing animation component
function TypingAnimation() {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse delay-100" />
      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse delay-200" />
    </div>
  )
}

export function ChatInterface() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState(initialMessages)
  const [isStreaming, setIsStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // API client
  // relative import to lib
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const api = require('../lib/api').default

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight
      }
    }
  }, [messages])

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await api.get('/rag/history')
        const queries = res.data?.queries || []
        const loadedMessages: any[] = []
        for (const q of queries) {
          // user message
          loadedMessages.push({
            type: 'user',
            content: q.query,
            timestamp: q.timestamp ? new Date(q.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
          })
          // assistant message
          loadedMessages.push({
            type: 'assistant',
            content: q.response,
            timestamp: q.timestamp ? new Date(q.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            sources: q.sources || []
          })
        }
        if (loadedMessages.length) setMessages(loadedMessages)
        // set session id from first query if present
        if (queries.length && queries[0].session_id) setSessionId(queries[0].session_id)
      } catch (e) {
        console.error('Failed to load chat history', e)
      }
    }
    loadHistory()
  }, [])

  const callRagApi = async (userMessage: string, subject?: string) => {
    setIsStreaming(true)
    try {
      const payload: any = { user_query: userMessage }
      if (subject) payload.subject = subject
      if (sessionId) payload.session_id = sessionId

      const res = await api.post('/rag/query', payload)
      const data = res.data

      // Append assistant response
      const assistantMessage: any = {
        type: 'assistant',
        content: data.answer || '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources || []
      }

      setMessages((prev) => [...prev, assistantMessage])

      // update session id if returned
      if (data.session_id) setSessionId(data.session_id)

    } catch (e) {
      console.error('RAG query failed', e)
      const errMsg = {
        type: 'assistant',
        content: 'Error: failed to get answer from server.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setIsStreaming(false)
    }
  }

  const handleSend = async () => {
    if (input.trim() && !isStreaming) {
      const userMessage = {
        type: 'user' as const,
        content: input,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, userMessage])
      setInput('')

      // Call backend RAG API
      await callRagApi(input)
    }
  }

  return (
    <div className="flex h-full gap-6">
      {/* Sidebar - Chat History */}
      <div className="w-64 border-r border-border hidden lg:flex flex-col bg-card/30">
        <div className="p-4 border-b border-border">
          <Button className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {chatHistoryItems.map((item) => (
              <button
                key={item.id}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-sm truncate"
              >
                <p className="text-foreground font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.date}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1">
          <div className="p-6 space-y-6 max-w-4xl">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs font-bold">AI</span>
                  </div>
                )}

                <div
                  className={`max-w-2xl ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm'
                      : 'bg-secondary text-secondary-foreground rounded-2xl rounded-tl-sm'
                  } px-4 py-3`}
                >
                  {message.isStreaming && !message.content ? (
                    <TypingAnimation />
                  ) : (
                    <>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>

                      {/* Source Citations */}
                      {message.sources && message.content && (
                        <div className="mt-4 pt-3 border-t border-border/20 space-y-2">
                          <p className="text-xs font-semibold opacity-70">Sources:</p>
                          <div className="flex flex-wrap gap-2">
                            {message.sources.map((source, sidx) => (
                              <Badge
                                key={sidx}
                                variant="outline"
                                className="text-xs cursor-pointer hover:bg-accent/10"
                              >
                                {source.type}
                                <span className="ml-1">→</span>
                                {source.name}
                                {source.page && ` (p.${source.page})`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Message Actions */}
                      {message.type === 'assistant' && !message.isStreaming && (
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title="Copy"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title="Helpful"
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title="Not helpful"
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {message.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs font-bold">U</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border p-6 bg-background/50 backdrop-blur">
          <div className="max-w-4xl space-y-3">
            {/* Quick Actions */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="cursor-pointer hover:bg-accent/10">
                Which CO covers...
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-accent/10">
                What Bloom's level...
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-accent/10">
                Generate assessment...
              </Badge>
            </div>

            {/* Input Box */}
            <div className="flex gap-3">
              <Button
                size="icon"
                variant="outline"
                className="flex-shrink-0 bg-transparent"
                title="Upload document"
              >
                <FileUp className="w-5 h-5" />
              </Button>

              <Textarea
                placeholder="Ask about course outcomes, assessment guidelines, or upload documents..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleSend()
                  }
                }}
                disabled={isStreaming}
                className="min-h-12 max-h-32 resize-none rounded-lg bg-card border border-border disabled:opacity-50"
              />

              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className="flex-shrink-0 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Press Ctrl+Enter to send. Attach documents for RAG-based answers.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
