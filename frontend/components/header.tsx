'use client'

import { Search, Moon, Sun, Bell } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect } from 'react'
import api from '@/lib/api'

type TokenUsage = {
  daily_limit: number
  daily_used: number
  remaining_tokens: number
}

export function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [usage, setUsage] = useState<TokenUsage | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const loadUsage = async () => {
      try {
        const response = await api.get('/rag/chat/token-usage')
        if (response.data) {
          setUsage({
            daily_limit: Number(response.data.daily_limit || 0),
            daily_used: Number(response.data.daily_used || 0),
            remaining_tokens: Number(response.data.remaining_tokens || 0),
          })
        }
      } catch {
        setUsage(null)
      }
    }

    if (mounted) {
      loadUsage()
    }
  }, [mounted])

  if (!mounted) return null

  return (
    <header className="sticky top-0 z-30 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16 gap-4">
        {/* Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search documents, questions..."
              className="w-full pl-10 h-10 rounded-lg bg-secondary text-secondary-foreground border-0 focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {usage && (
            <Badge
              variant="outline"
              className={usage.remaining_tokens <= 0 ? 'text-destructive border-destructive/40' : ''}
              title={`Used ${usage.daily_used} of ${usage.daily_limit} today`}
            >
              Tokens: {usage.remaining_tokens}
            </Badge>
          )}

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full" />
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          {/* User Avatar */}
          <Button
            variant="ghost"
            className="h-10 px-3 rounded-lg bg-secondary hover:bg-secondary/80"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
          </Button>
        </div>
      </div>
    </header>
  )
}
