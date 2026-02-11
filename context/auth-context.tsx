"use client"

import React, { createContext, useState, useEffect, useContext } from 'react'
import { useRouter } from 'next/navigation'
import api from '../lib/api'

type User = {
  id?: string | number
  name?: string
  email?: string
  role?: string
  college_id?: string | null
  created_at?: string
}

type AuthContextValue = {
  user: User | null
  loading: boolean
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  logout: () => {},
  refresh: async () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchUser = async () => {
    setLoading(true)
    try {
      const res = await api.get('/auth/me')
      setUser(res.data)
    } catch (err) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  const logout = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        document.cookie = 'token=; path=/; Max-Age=0'
      }
    } finally {
      setUser(null)
      router.push('/auth/login')
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, refresh: fetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

export default AuthContext
