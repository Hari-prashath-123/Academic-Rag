'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { AuthRole, useAuth } from '@/context/auth-context'

interface RoleGuardProps {
  allowedRoles: AuthRole[]
  children: ReactNode
  redirectTo?: string
}

export function RoleGuard({ allowedRoles, children, redirectTo = '/dashboard' }: RoleGuardProps) {
  const router = useRouter()
  const { loading, role } = useAuth()

  useEffect(() => {
    if (!loading && (!role || !allowedRoles.includes(role))) {
      router.replace(redirectTo)
    }
  }, [allowedRoles, loading, redirectTo, role, router])

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Checking access...</div>
  }

  if (!role || !allowedRoles.includes(role)) {
    return <div className="p-8 text-sm text-destructive">You are not allowed to access this page.</div>
  }

  return <>{children}</>
}
