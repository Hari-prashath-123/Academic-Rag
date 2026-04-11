'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Send,
  Plus,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  FileUp,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Code2,
  Map as MapIcon,
  Table2,
  MessageSquare,
  RotateCcw,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import hljs from 'highlight.js/lib/common'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

type MessageRole = 'user' | 'assistant'

type UiMessage = {
  id: string
  type: MessageRole
  content: string
  timestamp: string
  reasoningDetails?: unknown
  sources?: Array<{ type: string; name: string; page?: number; url?: string }>
}

type ChatSession = {
  session_id: string
  title: string
  last_message_time?: string | null
  message_count: number
}

type TokenUsage = {
  daily_limit: number
  daily_used: number
  remaining_tokens: number
}

type PromptMode = 'general' | 'coding' | 'maps' | 'analysis'
type ContentKind = 'code' | 'map' | 'table' | 'text'

const DOCUMENT_TYPE_FILTERS = [
  { value: 'all', label: 'All Types' },
  { value: 'syllabus', label: 'Syllabus' },
  { value: 'question_paper', label: 'Question Paper' },
  { value: 'marksheet', label: 'Marksheet' },
  { value: 'co_mapping', label: 'CO Mapping' },
  { value: 'lecture_notes', label: 'Lecture Notes' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'lab_manual', label: 'Lab Manual' },
  { value: 'pdf', label: 'Course Material PDF' },
  { value: 'notes', label: 'Course Material Notes' },
  { value: 'other', label: 'Other' },
] as const

const OPENROUTER_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'nvidia/llama-nemotron-embed-vl-1b-v2:free',
  'minimax/minimax-m2.5:free',
  'liquid/lfm-2.5-1.2b-thinking:free',
  'liquid/lfm-2.5-1.2b-instruct:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'openai/gpt-oss-120b:free',
  'openai/gpt-oss-20b:free',
  'z-ai/glm-4.5-air:free',
  'qwen/qwen3-coder:free',
  'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
] as const

type OpenRouterModel = (typeof OPENROUTER_MODELS)[number]

const PROMPT_MODE_HINTS: Record<PromptMode, string> = {
  general: '',
  coding:
    'You are in coding mode. Prefer implementation details, robust examples, and executable snippets.',
  maps:
    'You are in map mode. When useful, respond with Mermaid diagrams and relationship maps.',
  analysis:
    'You are in analysis mode. Provide concise summaries, key points, and recommendations.',
}

function detectMessageKinds(content: string): ContentKind[] {
  const kinds = new Set<ContentKind>()

  if (/```[\s\S]*?```/.test(content)) {
    if (/```mermaid[\s\S]*?```/i.test(content) || /flowchart|graph\s+(TD|LR|RL|BT)|mindmap/i.test(content)) {
      kinds.add('map')
    }
    if (/```(?!mermaid)/i.test(content)) {
      kinds.add('code')
    }
  }

  if (/\|.+\|\n\|[-: ]+\|/m.test(content)) {
    kinds.add('table')
  }

  if (kinds.size === 0) {
    kinds.add('text')
  }

  return [...kinds]
}

function TypingAnimation() {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse delay-100" />
      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse delay-200" />
    </div>
  )
}

function MermaidDiagram({ chart, blockKey }: { chart: string; blockKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const renderChart = async () => {
      try {
        setError(null)
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' })

        const id = `mermaid-${blockKey.replace(/[^a-zA-Z0-9_-]/g, '-')}-${Date.now()}`
        const { svg } = await mermaid.render(id, chart)

        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      } catch {
        if (isMounted) {
          setError('Unable to render Mermaid diagram.')
        }
      }
    }

    renderChart()

    return () => {
      isMounted = false
    }
  }, [chart, blockKey])

  if (error) {
    return <p className="text-xs text-destructive">{error}</p>
  }

  return <div ref={containerRef} className="mermaid-diagram overflow-x-auto" />
}

function MarkdownMessage({
  content,
  messageKey,
  onCopy,
  copiedKey,
}: {
  content: string
  messageKey: string
  onCopy: (text: string, key: string) => void
  copiedKey: string | null
}) {
  return (
    <div className="space-y-3 text-sm leading-relaxed markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-lg font-semibold mt-1 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold mt-1 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mt-1 mb-2">{children}</h3>,
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-md border border-border/40">
              <table className="w-full text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-background/60">{children}</thead>,
          th: ({ children }) => <th className="px-3 py-2 text-left border-b border-border/40">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 border-b border-border/20">{children}</td>,
          code: ({ className, children, ...rest }: any) => {
            const inline = Boolean(rest?.inline)
            const raw = String(children).replace(/\n$/, '')
            const languageMatch = /language-([a-zA-Z0-9_-]+)/.exec(className || '')
            const language = (languageMatch?.[1] || '').toLowerCase()

            if (inline) {
              return <code className="px-1 py-0.5 rounded bg-background/70 text-xs">{raw}</code>
            }

            if (language === 'mermaid') {
              return (
                <div className="rounded-lg border border-border/40 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 text-xs bg-background/60">
                    <span className="font-medium uppercase tracking-wide">mermaid</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => onCopy(raw, `code-${messageKey}-mermaid`)}
                    >
                      {copiedKey === `code-${messageKey}-mermaid` ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="p-3 bg-background/80">
                    <MermaidDiagram chart={raw} blockKey={`${messageKey}-mermaid`} />
                  </div>
                </div>
              )
            }

            const highlighted = language && hljs.getLanguage(language)
              ? hljs.highlight(raw, { language }).value
              : hljs.highlightAuto(raw).value

            const copyKey = `code-${messageKey}-${language || 'plain'}-${raw.length}`

            return (
              <div className="rounded-lg border border-border/40 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 text-xs bg-background/60">
                  <span className="font-medium uppercase tracking-wide">{language || 'code'}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => onCopy(raw, copyKey)}
                  >
                    {copiedKey === copyKey ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <pre className="text-xs sm:text-sm leading-relaxed p-3 overflow-x-auto bg-background/80">
                  <code className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />
                </pre>
              </div>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export function ChatInterface() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [promptMode, setPromptMode] = useState<PromptMode>('general')
  const [isStreaming, setIsStreaming] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)
  const [selectedModel, setSelectedModel] = useState<OpenRouterModel>(OPENROUTER_MODELS[0])
  const [isSessionSidebarOpen, setIsSessionSidebarOpen] = useState(true)
  const [subjectOptions, setSubjectOptions] = useState<string[]>([])
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [selectedDocumentType, setSelectedDocumentType] = useState('all')
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null)
  const [dailyLimitReached, setDailyLimitReached] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (scrollRef.current) {
      const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight
      }
    }
  }, [messages])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedModel = window.localStorage.getItem('chat_selected_model')
    if (storedModel && OPENROUTER_MODELS.includes(storedModel as OpenRouterModel)) {
      setSelectedModel(storedModel as OpenRouterModel)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('chat_selected_model', selectedModel)
  }, [selectedModel])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedSubject = window.localStorage.getItem('chat_selected_subject')
    const storedDocType = window.localStorage.getItem('chat_selected_document_type')

    if (storedSubject) {
      setSelectedSubject(storedSubject)
    }
    if (storedDocType) {
      const isKnownType = DOCUMENT_TYPE_FILTERS.some((item) => item.value === storedDocType)
      if (isKnownType) {
        setSelectedDocumentType(storedDocType)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('chat_selected_subject', selectedSubject)
  }, [selectedSubject])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('chat_selected_document_type', selectedDocumentType)
  }, [selectedDocumentType])

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const [documentSubjectsRes, courseListRes] = await Promise.allSettled([
          api.get('/documents/subjects/list'),
          api.get('/api/course-materials/courses'),
        ])

        const documentSubjects =
          documentSubjectsRes.status === 'fulfilled' && Array.isArray(documentSubjectsRes.value.data)
            ? documentSubjectsRes.value.data
            : []

        const courseSubjects =
          courseListRes.status === 'fulfilled' && Array.isArray(courseListRes.value.data?.courses)
            ? courseListRes.value.data.courses.map((course: any) => course.code || course.name)
            : []

        const cleaned = [...documentSubjects, ...courseSubjects]
          .map((item) => String(item || '').trim())
          .filter((item) => item.length > 0)

        const uniqueSorted = Array.from(new Set(cleaned)).sort((a, b) => a.localeCompare(b))
        setSubjectOptions(uniqueSorted)
      } catch {
        setSubjectOptions([])
      }
    }
    loadSubjects()
  }, [])

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey(null), 1400)
    } catch {
      // Ignore clipboard errors.
    }
  }

  const speakMessage = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    window.speechSynthesis.speak(utterance)
  }

  const toggleVoiceInput = () => {
    if (typeof window === 'undefined') {
      return
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognitionCtor) {
      const errMsg: UiMessage = {
        id: `voice-err-${Date.now()}`,
        type: 'assistant',
        content: 'Voice input is not supported in this browser.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errMsg])
      return
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript || '')
        .join(' ')
      setInput((prev) => (prev ? `${prev} ${transcript}`.trim() : transcript.trim()))
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const handleSelectFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setPendingFiles((prev) => [...prev, ...Array.from(fileList)])
  }

  const removePendingFile = (name: string, lastModified: number) => {
    setPendingFiles((prev) => prev.filter((file) => !(file.name === name && file.lastModified === lastModified)))
  }

  const loadSessions = async () => {
    try {
      const response = await api.get('/rag/chat/sessions')
      const loadedSessions: ChatSession[] = response.data?.sessions || []
      setSessions(loadedSessions)
      return loadedSessions
    } catch (error) {
      console.error('Failed to load chat sessions', error)
      return [] as ChatSession[]
    }
  }

  const loadMessages = async (targetSessionId: string) => {
    try {
      const response = await api.get('/rag/chat/history', {
        params: { session_id: targetSessionId, limit: 500 },
      })
      const loadedMessages: UiMessage[] = (response.data?.messages || []).map((item: any) => ({
        id: item.id || `msg-${Math.random()}`,
        type: item.role,
        content: item.content,
        reasoningDetails: item.reasoning_details,
        timestamp: item.timestamp
          ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '',
      }))
      setMessages(loadedMessages)
    } catch (error) {
      console.error('Failed to load chat messages', error)
      setMessages([])
    }
  }

  useEffect(() => {
    const initChat = async () => {
      const loadedSessions = await loadSessions()
      if (loadedSessions.length > 0) {
        const latestSessionId = loadedSessions[0].session_id
        setSessionId(latestSessionId)
        await loadMessages(latestSessionId)
      }

      try {
        const usageResponse = await api.get('/rag/chat/token-usage')
        const usagePayload = usageResponse.data
        if (usagePayload) {
          const usage: TokenUsage = {
            daily_limit: Number(usagePayload.daily_limit || 0),
            daily_used: Number(usagePayload.daily_used || 0),
            remaining_tokens: Number(usagePayload.remaining_tokens || 0),
          }
          setTokenUsage(usage)
          setDailyLimitReached(usage.remaining_tokens <= 0)
        }
      } catch {
        setTokenUsage(null)
      }
    }
    initChat()
  }, [])

  const uploadPendingFiles = async (): Promise<string[]> => {
    if (pendingFiles.length === 0) return []

    setIsUploadingFiles(true)
    const uploadedNames: string[] = []

    try {
      for (const file of pendingFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', file.name)
        formData.append('subject', 'chat-upload')

        let inferredType = 'other'
        const lower = file.name.toLowerCase()
        if (lower.includes('question') || lower.includes('qp')) inferredType = 'question_paper'
        else if (lower.includes('syllabus')) inferredType = 'syllabus'
        else if (lower.includes('marks') || lower.includes('mark')) inferredType = 'marksheet'

        formData.append('document_type', inferredType)

        await api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })

        uploadedNames.push(file.name)
      }

      setPendingFiles([])
      return uploadedNames
    } catch {
      const errMsg: UiMessage = {
        id: `upload-err-${Date.now()}`,
        type: 'assistant',
        content: 'Some file uploads failed. Continuing with text-only context.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errMsg])
      return uploadedNames
    } finally {
      setIsUploadingFiles(false)
    }
  }

  const animateAssistantMessage = async (
    messageId: string,
    fullText: string,
    reasoningDetails?: unknown,
  ) => {
    const tokens = fullText.match(/\S+\s*/g) || [fullText]
    const chunkSize = tokens.length > 220 ? 6 : tokens.length > 120 ? 4 : 2

    let current = ''
    for (let i = 0; i < tokens.length; i += chunkSize) {
      current += tokens.slice(i, i + chunkSize).join('')
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, content: current, reasoningDetails } : msg,
        ),
      )
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
  }

  const callChatApi = async (userMessage: string) => {
    setIsStreaming(true)
    try {
      const payload: Record<string, string> = { message: userMessage, model: selectedModel }
      if (sessionId) {
        payload.session_id = sessionId
      }
      if (selectedSubject !== 'all') {
        payload.subject = selectedSubject
      }
      if (selectedDocumentType !== 'all') {
        payload.document_type = selectedDocumentType
      }

      const response = await api.post('/rag/chat', payload)

      const nextSessionId = response.data?.session_id as string
      const assistantContent = response.data?.message?.content || ''
      const reasoningDetails = response.data?.message?.reasoning_details
      const sources = (response.data?.sources || []) as Array<{ type: string; name: string; page?: number; url?: string }>
      const usagePayload = response.data?.usage
      if (usagePayload) {
        const usage: TokenUsage = {
          daily_limit: Number(usagePayload.daily_limit || 0),
          daily_used: Number(usagePayload.daily_used || 0),
          remaining_tokens: Number(usagePayload.remaining_tokens || 0),
        }
        setTokenUsage(usage)
        setDailyLimitReached(usage.remaining_tokens <= 0)
      }

      if (!sessionId && nextSessionId) {
        setSessionId(nextSessionId)
      }

      const assistantMessageId = `assistant-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const assistantUiMessage: UiMessage = {
        id: assistantMessageId,
        type: 'assistant',
        content: '',
        reasoningDetails,
        sources,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, assistantUiMessage])
      await animateAssistantMessage(assistantMessageId, assistantContent, reasoningDetails)
      await loadSessions()
    } catch (e) {
      console.error('Chat query failed', e)
      const isLimitError = Number((e as any)?.response?.status) === 429
      const errorMessage = isLimitError
        ? 'You have reached your daily token limit. Please try again tomorrow or contact admin.'
        : (e as any)?.response?.data?.detail || 'Error: failed to get answer from server.'

      if (isLimitError) {
        setDailyLimitReached(true)
      }

      const errMsg: UiMessage = {
        id: `err-${Date.now()}`,
        type: 'assistant',
        content: String(errorMessage),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setIsStreaming(false)
    }
  }

  const handleSend = async () => {
    if ((!input.trim() && pendingFiles.length === 0) || isStreaming || isUploadingFiles || dailyLimitReached) {
      return
    }

    const userInput = input.trim()
    const uploadedFileNames = await uploadPendingFiles()
    const modeHint = PROMPT_MODE_HINTS[promptMode]
    const filesHint =
      uploadedFileNames.length > 0
        ? `Uploaded files for this prompt: ${uploadedFileNames.join(', ')}.`
        : ''

    const combinedInput = [modeHint, filesHint, userInput].filter(Boolean).join('\n\n').trim()

    const userMessage: UiMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: 'user',
      content:
        uploadedFileNames.length > 0
          ? `${userInput || 'Analyze the uploaded files.'}\n\nAttached: ${uploadedFileNames.join(', ')}`
          : userInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')

    await callChatApi(combinedInput)
  }

  const handleNewChat = () => {
    setSessionId(null)
    setMessages([])
    setInput('')
    setPendingFiles([])
  }

  const handleSessionSelect = async (targetSessionId: string) => {
    if (isStreaming) return
    setSessionId(targetSessionId)
    await loadMessages(targetSessionId)
  }

  const handleRegenerate = async () => {
    if (isStreaming) return
    const lastUser = [...messages].reverse().find((message) => message.type === 'user')
    if (!lastUser) return
    await callChatApi(lastUser.content)
  }

  const modeButtonClass = (mode: PromptMode) =>
    promptMode === mode
      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
      : 'bg-secondary/40 text-secondary-foreground hover:bg-secondary/70'

  return (
    <div className="flex h-full min-h-0 gap-0 sm:gap-4 overflow-hidden">
      {isSessionSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-black/25 md:hidden"
          aria-label="Close chat sessions"
          onClick={() => setIsSessionSidebarOpen(false)}
        />
      )}

      <div
        className={cn(
          'z-30 border-r border-border bg-card/30 flex flex-col overflow-hidden transition-all duration-300',
          'fixed md:relative inset-y-0 left-0',
          isSessionSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0',
        )}
      >
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Button
            className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            onClick={handleNewChat}
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setIsSessionSidebarOpen(false)}
            title="Close chat sessions"
          >
            <PanelLeftClose className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {sessions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No saved chats yet.</p>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.session_id}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm truncate ${
                    sessionId === session.session_id ? 'bg-secondary' : 'hover:bg-secondary/60'
                  }`}
                  onClick={() => handleSessionSelect(session.session_id)}
                >
                  <p className="text-foreground font-medium truncate">{session.title || 'Untitled Chat'}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.last_message_time
                      ? new Date(session.last_message_time).toLocaleString()
                      : `${session.message_count} messages`}
                  </p>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <div className="border-b border-border px-4 py-3 bg-background/60 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            {!isSessionSidebarOpen && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setIsSessionSidebarOpen(true)}
                title="Open chat sessions"
              >
                <PanelLeftOpen className="w-3.5 h-3.5" />
                Sessions
              </Button>
            )}
            <Badge variant="outline" className="gap-1">
              <Sparkles className="w-3 h-3" />
              AI Assistant
            </Badge>
            <div className="flex items-center gap-2 rounded-md border border-border bg-card/60 px-2 py-1 min-w-[220px] max-w-full">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Model</span>
              <Select
                value={selectedModel}
                onValueChange={(value) => setSelectedModel(value as OpenRouterModel)}
                disabled={isStreaming}
              >
                <SelectTrigger className="h-7 border-0 bg-transparent px-1 text-xs focus:ring-0 min-w-[210px] max-w-[320px]">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {OPENROUTER_MODELS.map((model) => (
                    <SelectItem key={model} value={model} className="text-xs">
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-border bg-card/60 px-2 py-1 min-w-[180px] max-w-full">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Subject</span>
              <Select
                value={selectedSubject}
                onValueChange={setSelectedSubject}
                disabled={isStreaming}
              >
                <SelectTrigger className="h-7 border-0 bg-transparent px-1 text-xs focus:ring-0 min-w-[150px] max-w-[260px]">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Subjects</SelectItem>
                  {subjectOptions.map((subject) => (
                    <SelectItem key={subject} value={subject} className="text-xs">
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-border bg-card/60 px-2 py-1 min-w-[190px] max-w-full">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Doc Type</span>
              <Select
                value={selectedDocumentType}
                onValueChange={setSelectedDocumentType}
                disabled={isStreaming}
              >
                <SelectTrigger className="h-7 border-0 bg-transparent px-1 text-xs focus:ring-0 min-w-[160px] max-w-[260px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPE_FILTERS.map((item) => (
                    <SelectItem key={item.value} value={item.value} className="text-xs">
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" variant="secondary" className={modeButtonClass('general')} onClick={() => setPromptMode('general')}>
              <MessageSquare className="w-3.5 h-3.5 mr-1" />
              General
            </Button>
            <Button size="sm" variant="secondary" className={modeButtonClass('coding')} onClick={() => setPromptMode('coding')}>
              <Code2 className="w-3.5 h-3.5 mr-1" />
              Coding
            </Button>
            <Button size="sm" variant="secondary" className={modeButtonClass('maps')} onClick={() => setPromptMode('maps')}>
              <MapIcon className="w-3.5 h-3.5 mr-1" />
              Maps
            </Button>
            <Button size="sm" variant="secondary" className={modeButtonClass('analysis')} onClick={() => setPromptMode('analysis')}>
              <Table2 className="w-3.5 h-3.5 mr-1" />
              Analysis
            </Button>
          </div>
        </div>

        <ScrollArea ref={scrollRef} className="flex-1 min-h-0">
          <div className="p-6 space-y-6 max-w-4xl">
            {messages.map((message, idx) => (
              <div
                key={message.id || idx}
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
                  {message.type === 'assistant' && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {detectMessageKinds(message.content).map((kind) => (
                        <Badge key={`${message.id}-${kind}`} variant="outline" className="text-[10px] uppercase tracking-wide">
                          {kind}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <MarkdownMessage
                    content={message.content}
                    messageKey={message.id || String(idx)}
                    onCopy={copyText}
                    copiedKey={copiedKey}
                  />

                  {message.sources && message.content && (
                    <div className="mt-4 pt-3 border-t border-border/20 space-y-2">
                      <p className="text-xs font-semibold opacity-70">Sources:</p>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.map((source, sidx) => (
                          source.url ? (
                            <a
                              key={sidx}
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex"
                            >
                              <Badge
                                variant="outline"
                                className="text-xs cursor-pointer hover:bg-accent/10"
                              >
                                {source.type}
                                <span className="ml-1">→</span>
                                {source.name}
                              </Badge>
                            </a>
                          ) : (
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
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {message.type === 'assistant' && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        title="Copy"
                        onClick={() => copyText(message.content, `message-${message.id}`)}
                      >
                        {copiedKey === `message-${message.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Helpful">
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Not helpful">
                        <ThumbsDown className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        title="Read aloud"
                        onClick={() => speakMessage(message.content)}
                      >
                        <Volume2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {message.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs font-bold">U</span>
                  </div>
                )}
              </div>
            ))}

            {isStreaming && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-xs font-bold">AI</span>
                </div>
                <div className="max-w-2xl bg-secondary text-secondary-foreground rounded-2xl rounded-tl-sm px-4 py-3">
                  <TypingAnimation />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border p-6 bg-background/50 backdrop-blur">
          <div className="max-w-4xl space-y-3">
            {dailyLimitReached && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                You have reached your daily token limit. Please try again tomorrow or contact admin.
              </div>
            )}

            {tokenUsage && (
              <p className="text-xs text-muted-foreground">
                Daily tokens: {tokenUsage.daily_used}/{tokenUsage.daily_limit} used, {tokenUsage.remaining_tokens} remaining.
              </p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={(e) => handleSelectFiles(e.target.files)}
            />

            {pendingFiles.length > 0 && (
              <div className="rounded-lg border border-border/50 bg-card/50 p-3">
                <p className="text-xs text-muted-foreground mb-2">Attached files</p>
                <div className="flex flex-wrap gap-2">
                  {pendingFiles.map((file) => (
                    <Badge
                      key={`${file.name}-${file.lastModified}`}
                      variant="outline"
                      className="gap-2 pr-1"
                    >
                      {file.name}
                      <button
                        type="button"
                        className="text-xs opacity-70 hover:opacity-100"
                        onClick={() => removePendingFile(file.name, file.lastModified)}
                      >
                        x
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                size="icon"
                variant="outline"
                className="flex-shrink-0 bg-transparent"
                title="Upload document"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="w-5 h-5" />
              </Button>

              <Button
                size="icon"
                variant="outline"
                className={`flex-shrink-0 bg-transparent ${isListening ? 'border-primary text-primary' : ''}`}
                title="Voice input"
                onClick={toggleVoiceInput}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>

              <Textarea
                placeholder={
                  dailyLimitReached
                    ? 'Daily token limit reached. You can continue tomorrow.'
                    : 'Ask anything, request code, maps, or summaries...'
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleSend()
                  }
                }}
                disabled={isStreaming || isUploadingFiles || dailyLimitReached}
                className="min-h-12 max-h-32 resize-none rounded-lg bg-card border border-border disabled:opacity-50"
              />

              <Button
                size="icon"
                onClick={handleSend}
                disabled={(!input.trim() && pendingFiles.length === 0) || isStreaming || isUploadingFiles || dailyLimitReached}
                className="flex-shrink-0 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground text-center">
                Press Ctrl+Enter to send. Markdown, code blocks, tables, and Mermaid maps are supported.
              </p>
              <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={isStreaming}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Regenerate
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
