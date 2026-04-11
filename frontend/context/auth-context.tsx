"use client"

import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import axios from 'axios'
import { getMe, loginWithCredentials } from '../lib/auth-service'
import { clearAuthTokens, getAccessToken } from '../lib/auth-storage'

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

  const isAuthPage = pathname?.startsWith('/auth/') ?? false

  const clearStoredToken = () => {
    clearAuthTokens()
  }

  const setRoleFromToken = (token: string) => {
    const payload = parseJwtPayload(token)
    const tokenRoles = Array.isArray(payload?.roles) ? payload.roles : []
    setRole(resolveRole(tokenRoles))
  }

  const refreshUser = useCallback(async () => {
    setLoading(true)
    try {
      const profile = await getMe()
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

  // Initialize auth state once and avoid refetching on every route change.
  useEffect(() => {
    const initializeAuth = async () => {
      if (typeof window === 'undefined') {
        setLoading(false)
        return
      }

      const token = getAccessToken()

      if (!token) {
        setUser(null)
        setRole(null)
        setLoading(false)
        return
      }

      const payload = parseJwtPayload(token)
      const tokenRoles = Array.isArray(payload?.roles) ? payload.roles : []
      setRole(resolveRole(tokenRoles))
      setUser({
        id: (payload?.sub as string) || '',
        email: (payload?.email as string) || '',
        profile: {},
        roles: tokenRoles,
        permissions: [],
      })

      if (!isAuthPage) {
        await refreshUser()
      } else {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [isAuthPage, refreshUser])

  const login = async ({ email, password }: LoginPayload): Promise<AuthRole | null> => {
    const tokenResponse = await loginWithCredentials(email, password)
    const token = tokenResponse?.access_token
    if (!token) {
      throw new Error('Login token not returned by API')
    }

    const tokenRole = resolveRole(
      Array.isArray(parseJwtPayload(token)?.roles) ? parseJwtPayload(token)?.roles : []
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
      const profile = await getMe()
      setUser(profile)
      setRole(resolveRole(profile.roles))
      setLoading(false)
    } catch {
      // refreshUser already handles auth-clear rules.
      await refreshUser()
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
