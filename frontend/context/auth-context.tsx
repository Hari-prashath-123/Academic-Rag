"use client"

import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import axios from 'axios'
import api from '../lib/api'

export type AuthRole = 'admin' | 'faculty' | 'student' | 'advisor'

type UserProfile = {
  first_name?: string | null
  last_name?: string | null
  avatar_url?: string | null
  phone?: string | null
}

type AuthUser = {
  id: string
  email: string
  profile: UserProfile
  roles: string[]
  permissions: string[]
}

type LoginPayload = {
  email: string
  password: string
}

type AuthContextValue = {
  user: AuthUser | null
  role: AuthRole | null
  loading: boolean
  login: (payload: LoginPayload) => Promise<AuthRole | null>
  logout: () => void
  refreshUser: () => Promise<void>
  hasRole: (allowedRoles: AuthRole | AuthRole[]) => boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  loading: true,
  login: async () => null,
  logout: () => {},
  refreshUser: async () => {},
  hasRole: () => false,
})

function parseJwtPayload(token: string): any | null {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) {
      return null
    }

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const jsonPayload = atob(padded)
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

function resolveRole(roles: string[] | undefined): AuthRole | null {
  if (!roles || roles.length === 0) {
    return null
  }

  const normalizedRoles = roles
    .filter((roleName): roleName is string => typeof roleName === 'string')
    .map((roleName) => roleName.trim().toLowerCase())

  if (normalizedRoles.some((roleName) => roleName === 'admin' || roleName.includes('admin'))) {
    return 'admin'
  }
  if (normalizedRoles.some((roleName) => roleName === 'faculty' || roleName.includes('faculty'))) {
    return 'faculty'
  }
  if (normalizedRoles.some((roleName) => roleName === 'advisor' || roleName.includes('advisor'))) {
    return 'advisor'
  }
  if (normalizedRoles.some((roleName) => roleName === 'student' || roleName.includes('student'))) {
    return 'student'
  }
  return null
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [role, setRole] = useState<AuthRole | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Check if we're on an auth page (login, signup, etc.)
  const isAuthPage = (pathname) => {
    const authPaths = ['/auth/login', '/auth/signup']
    return authPaths.some(path => pathname?.startsWith(path))
  }

  const clearStoredToken = () => {
    if (typeof window === 'undefined') {
      return
    }

    localStorage.removeItem('token')
    document.cookie = 'token=; Path=/; Max-Age=0; SameSite=Strict'
  }

  const setRoleFromToken = (token: string) => {
    const payload = parseJwtPayload(token)
    const tokenRoles = Array.isArray(payload?.roles) ? payload.roles : []
    setRole(resolveRole(tokenRoles))
  }

  const refreshUser = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/auth/me')
      const profile = res.data as AuthUser
      setUser(profile)
      setRole(resolveRole(profile.roles))
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined
      const shouldClearAuth = status === 401 || status === 403

      if (shouldClearAuth) {
        clearStoredToken()
        setUser(null)
        setRole(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Only refresh user on mount, and skip if on auth pages
  useEffect(() => {
    if (!isAuthPage(pathname)) {
      refreshUser()
    } else {
      setLoading(false)
    }
  }, [pathname, refreshUser])

  const login = async ({ email, password }: LoginPayload): Promise<AuthRole | null> => {
    const response = await api.post('/api/auth/login', { email, password })
    const token = response?.data?.access_token
    if (!token) {
      throw new Error('Login token not returned by API')
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token)
      const secureFlag = window.location.protocol === 'https:' ? '; Secure' : ''
      document.cookie = `token=${token}; Path=/; SameSite=Strict${secureFlag}`
    }

    const tokenRole = resolveRole(
      Array.isArray(response?.data?.roles) ? response.data.roles : parseJwtPayload(token)?.roles
    )
    const payload = parseJwtPayload(token)

    // Immediately set auth state from token so UI doesn't flash as Guest.
    setRoleFromToken(token)
    setUser((prev) => ({
      id: (payload?.sub as string) || prev?.id || '',
      email: (payload?.email as string) || email.trim(),
      profile: prev?.profile || {},
      roles: Array.isArray(payload?.roles) ? payload.roles : tokenRole ? [tokenRole] : [],
      permissions: prev?.permissions || [],
    }))

    // Best-effort profile hydration from backend.
    try {
      await refreshUser()
    } catch {
      // refreshUser already handles auth-clear rules.
    }

    return tokenRole
  }

  const logout = () => {
    try {
      clearStoredToken()
    } finally {
      setUser(null)
      setRole(null)
      router.push('/auth/login')
    }
  }

  const hasRole = useCallback(
    (allowedRoles: AuthRole | AuthRole[]) => {
      if (!role) {
        return false
      }
      const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
      return allowed.includes(role)
    },
    [role]
  )

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({ user, role, loading, login, logout, refreshUser, hasRole }),
    [user, role, loading, login, logout, refreshUser, hasRole]
  )

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

export default AuthContext
