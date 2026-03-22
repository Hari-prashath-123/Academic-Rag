"use client"

import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import api from '../lib/api'

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
  loading: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  refreshUser: async () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
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

  const refreshUser = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/auth/me')
      setUser(res.data)
    } catch {
      clearStoredToken()
      setUser(null)
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
  }, [])

  const login = async ({ email, password }: LoginPayload) => {
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

    await refreshUser()
  }

  const logout = () => {
    try {
      clearStoredToken()
    } finally {
      setUser(null)
      router.push('/auth/login')
    }
  }

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading, login, logout, refreshUser]
  )

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

export default AuthContext
