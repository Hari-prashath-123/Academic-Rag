'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  HelpCircle,
  BarChart3,
  Grid3x3,
  BookOpen,
  Users,
  Settings,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'AI Chat Assistant',
    href: '/chat',
    icon: MessageSquare,
  },
  {
    label: 'Document Library',
    href: '/documents',
    icon: FileText,
  },
  {
    label: 'Question Papers',
    href: '/questions',
    icon: HelpCircle,
  },
  {
    label: 'Marks & Assessments',
    href: '/assessments',
    icon: BarChart3,
  },
  {
    label: 'CO & Bloom\'s Mapping',
    href: '/mapping',
    icon: Grid3x3,
  },
  {
    label: 'OBE Report Generator',
    href: '/reports',
    icon: BookOpen,
  },
  {
    label: 'Study Material Suggestions',
    href: '/materials',
    icon: BookOpen,
  },
  {
    label: 'User Management',
    href: '/users',
    icon: Users,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true)
  const pathname = usePathname()

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 z-40',
          isOpen ? 'w-64' : 'w-20'
        )}
      >
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">OBE</span>
            </div>
            {isOpen && (
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-bold text-sidebar-foreground truncate">
                  OBE Assistant
                </h1>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  Academic AI
                </p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isOpen && (
                  <>
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                    {isActive && (
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <span className="text-white text-xs font-bold">U</span>
            </div>
            {isOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">
                  User Name
                </p>
                <p className="text-xs text-sidebar-foreground/50 truncate">
                  Student
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Content Offset */}
      <div className={cn('transition-all duration-300', isOpen ? 'lg:ml-64' : 'lg:ml-20')} />
    </>
  )
}
