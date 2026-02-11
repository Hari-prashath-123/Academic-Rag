'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, Briefcase, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export default function SignupPage() {
  const router = useRouter()
  const [role, setRole] = useState<'student' | 'faculty' | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    institutionId: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordStrength, setPasswordStrength] = useState<
    'weak' | 'fair' | 'good' | 'strong' | null
  >(null)

  const calculatePasswordStrength = (pwd: string) => {
    if (pwd.length < 6) return 'weak'
    if (pwd.length < 8) return 'fair'
    if (pwd.match(/[A-Z]/) && pwd.match(/[0-9]/)) return 'strong'
    return 'good'
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value
    setFormData({ ...formData, password: pwd })
    setPasswordStrength(calculatePasswordStrength(pwd))
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!role) {
      setError('Please select your role')
      return
    }

    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (role === 'faculty' && !formData.institutionId) {
      setError('Faculty ID is required for faculty accounts')
      return
    }

    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Mock registration
    localStorage.setItem('user_role', role)
    localStorage.setItem('user_email', formData.email)
    localStorage.setItem('user_name', formData.name)

    setIsLoading(false)
    router.push('/dashboard')
  }

  const strengthConfig = {
    weak: { color: 'bg-destructive', label: 'Weak', width: '25%' },
    fair: { color: 'bg-amber-500', label: 'Fair', width: '50%' },
    good: { color: 'bg-blue-500', label: 'Good', width: '75%' },
    strong: { color: 'bg-green-500', label: 'Strong', width: '100%' },
  }

  const roleOptions = [
    {
      id: 'student',
      title: 'Student',
      description: 'Access course materials and assessments',
      icon: User,
    },
    {
      id: 'faculty',
      title: 'Faculty',
      description: 'Create courses and manage assessments',
      icon: Briefcase,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Join our academic knowledge platform
          </p>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur p-6 space-y-5">
          <form onSubmit={handleSignup} className="space-y-5">
            {/* Role Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                {roleOptions.map((option) => {
                  const Icon = option.icon
                  return (
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
                      <Icon className="w-6 h-6 mb-2 mx-auto" />
                      <p className="font-semibold text-sm text-foreground">
                        {option.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-foreground">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="pl-10 bg-secondary/50 border-border/50"
                />
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
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="pl-10 bg-secondary/50 border-border/50"
                />
              </div>
            </div>

            {/* Faculty ID (conditional) */}
            {role === 'faculty' && (
              <div className="space-y-2">
                <label htmlFor="faculty-id" className="block text-sm font-medium text-foreground">
                  Faculty ID
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="faculty-id"
                    type="text"
                    placeholder="FAC123456"
                    value={formData.institutionId}
                    onChange={(e) =>
                      setFormData({ ...formData, institutionId: e.target.value })
                    }
                    className="pl-10 bg-secondary/50 border-border/50"
                  />
                </div>
              </div>
            )}

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
                  value={formData.password}
                  onChange={handlePasswordChange}
                  className="pl-10 bg-secondary/50 border-border/50"
                />
              </div>

              {/* Password Strength Indicator */}
              {formData.password && passwordStrength && (
                <div className="space-y-1">
                  <div className="h-1.5 bg-secondary/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strengthConfig[passwordStrength].color} transition-all`}
                      style={{ width: strengthConfig[passwordStrength].width }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Strength: {strengthConfig[passwordStrength].label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label htmlFor="confirm-password" className="block text-sm font-medium text-foreground">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
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
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="text-center text-sm">
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Sign in here
              </Link>
            </p>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-muted-foreground space-y-1">
          <p>RAG-Powered Academic Knowledge Assistant</p>
          <p>Secure registration • Privacy protected</p>
        </div>
      </div>
    </div>
  )
}
