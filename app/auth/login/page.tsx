'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function LoginPage() {
  const router = useRouter()
  const [role, setRole] = useState<'student' | 'faculty' | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!role) {
      setError('Please select your role')
      return
    }

    if (!email || !password) {
      setError('Please enter your email and password')
      return
    }

    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Mock authentication
    localStorage.setItem('user_role', role)
    localStorage.setItem('user_email', email)

    setIsLoading(false)
    router.push('/dashboard')
  }

  const roleOptions = [
    {
      id: 'student',
      title: 'Student',
      description: 'Access course materials and assessments',
      icon: '👤',
    },
    {
      id: 'faculty',
      title: 'Faculty',
      description: 'Manage courses and create assessments',
      icon: '👨‍🏫',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to your academic assistant account
          </p>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur p-6 space-y-6">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Role Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                {roleOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setRole(option.id as 'student' | 'faculty')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      role === option.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border/30 bg-card/30 hover:border-border/60'
                    }`}
                  >
                    <div className="text-2xl mb-2">{option.icon}</div>
                    <p className="font-semibold text-sm text-foreground">
                      {option.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/50"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/50"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            {/* Forgot Password Link */}
            <div className="text-center">
              <Link
                href="#"
                className="text-sm text-primary hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/30" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">New to our platform?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-primary hover:underline font-medium">
                Sign up here
              </Link>
            </p>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>RAG-Powered Academic Knowledge Assistant</p>
        </div>
      </div>
    </div>
  )
}
