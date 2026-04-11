'use client'

import { useEffect, useMemo, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { RoleGuard } from '@/components/role-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Users, Mail, Trash2, Link2 } from 'lucide-react'
import api from '@/lib/api'

type ApiUser = {
  id: string
  email: string
  roles: string[]
  permissions: string[]
  created_at?: string
}

type DisplayUser = {
  id: string
  email: string
  role: string
  roles: string[]
  created_at?: string
}

type AdvisorMapping = {
  id: string
  advisor: { id: string; email: string }
  student: { id: string; email: string }
  assigned_at: string
}

type TokenLimitRow = {
  user_id: string
  email: string
  roles: string[]
  daily_token_limit: number
  today_used_tokens: number
  today_remaining_tokens: number
}

function resolveDisplayRole(roles: string[]): string {
  if (roles.includes('admin')) return 'admin'
  if (roles.includes('faculty')) return 'faculty'
  if (roles.includes('advisor')) return 'advisor'
  if (roles.includes('student')) return 'student'
  return 'user'
}

export default function UsersPage() {
  const [users, setUsers] = useState<DisplayUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Advisor mapping states
  const [faculty, setFaculty] = useState<DisplayUser[]>([])
  const [students, setStudents] = useState<DisplayUser[]>([])
  const [mappings, setMappings] = useState<AdvisorMapping[]>([])
  const [selectedAdvisor, setSelectedAdvisor] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [mappingLoading, setMappingLoading] = useState(false)
  const [mappingError, setMappingError] = useState('')
  const [tokenLimits, setTokenLimits] = useState<TokenLimitRow[]>([])
  const [tokenDrafts, setTokenDrafts] = useState<Record<string, string>>({})
  const [tokenSaving, setTokenSaving] = useState<Record<string, boolean>>({})
  const [bulkTokenLimit, setBulkTokenLimit] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [usersRes, facultyRes, studentsRes, mappingsRes, tokenLimitsRes] = await Promise.all([
          api.get('/api/users/'),
          api.get('/api/users/faculty'),
          api.get('/api/users/students'),
          api.get('/api/advisor-mappings/'),
          api.get('/api/users/token-limits'),
        ])

        const apiUsers: ApiUser[] = usersRes.data.users || []
        const displayUsers = apiUsers.map((u) => ({
          id: u.id,
          email: u.email,
          roles: u.roles,
          role: resolveDisplayRole(u.roles),
          created_at: u.created_at,
        }))
        setUsers(displayUsers)

        // Prefer explicit faculty/students endpoints, but fall back to deriving from users
        const facultyList = (facultyRes.data && Array.isArray(facultyRes.data.faculty) && facultyRes.data.faculty.length)
          ? facultyRes.data.faculty
          : displayUsers.filter((u) => u.roles.includes('faculty') || u.roles.includes('advisor'))
        setFaculty(facultyList)

        const studentsList = (studentsRes.data && Array.isArray(studentsRes.data.students) && studentsRes.data.students.length)
          ? studentsRes.data.students
          : displayUsers.filter((u) => u.roles.includes('student'))
        setStudents(studentsList)

        setMappings(mappingsRes.data.mappings || [])

        const tokenRows: TokenLimitRow[] = tokenLimitsRes.data?.users || []
        setTokenLimits(tokenRows)
        setTokenDrafts(
          tokenRows.reduce((acc, row) => {
            acc[row.user_id] = String(row.daily_token_limit)
            return acc
          }, {} as Record<string, string>)
        )
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [])

  const stats = useMemo(() => {
    const total = users.length
    const faculty = users.filter((u) => u.roles.includes('faculty') || u.roles.includes('advisor')).length
    const students = users.filter((u) => u.roles.includes('student')).length
    return { total, faculty, students }
  }, [users])

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    )
  }

  const assignStudents = async () => {
    if (!selectedAdvisor || selectedStudentIds.length === 0) {
      setMappingError('Select one advisor and at least one student.')
      return
    }

    setMappingLoading(true)
    setMappingError('')
    try {
      await api.post('/api/advisor-mappings/assign', {
        advisor_id: selectedAdvisor,
        student_ids: selectedStudentIds,
      })
      setSelectedStudentIds([])
      setSelectedAdvisor('')
      // Refresh mappings
      const res = await api.get('/api/advisor-mappings/')
      setMappings(res.data.mappings || [])
    } catch (err: any) {
      setMappingError(err?.response?.data?.detail || 'Assignment failed.')
    } finally {
      setMappingLoading(false)
    }
  }

  const removeMapping = async (mappingId: string) => {
    try {
      await api.delete(`/api/advisor-mappings/${mappingId}`)
      // Refresh mappings
      const res = await api.get('/api/advisor-mappings/')
      setMappings(res.data.mappings || [])
    } catch {
      setMappingError('Failed to remove mapping.')
    }
  }

  const saveTokenLimit = async (userId: string) => {
    const raw = tokenDrafts[userId]
    const nextLimit = Number(raw)
    if (!Number.isFinite(nextLimit) || nextLimit < 1) {
      setError('Token limit must be a positive number.')
      return
    }

    setTokenSaving((prev) => ({ ...prev, [userId]: true }))
    try {
      await api.put(`/api/users/${userId}/token-limit`, {
        daily_token_limit: Math.floor(nextLimit),
      })

      const refreshed = await api.get('/api/users/token-limits')
      const rows: TokenLimitRow[] = refreshed.data?.users || []
      setTokenLimits(rows)
      setTokenDrafts(
        rows.reduce((acc, row) => {
          acc[row.user_id] = String(row.daily_token_limit)
          return acc
        }, {} as Record<string, string>)
      )
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update token limit')
    } finally {
      setTokenSaving((prev) => ({ ...prev, [userId]: false }))
    }
  }

  const applyBulkTokenLimit = async () => {
    const nextLimit = Number(bulkTokenLimit)
    if (!Number.isFinite(nextLimit) || nextLimit < 1) {
      setError('Bulk token limit must be a positive number.')
      return
    }

    setBulkSaving(true)
    try {
      await api.put('/api/users/token-limits/bulk', {
        daily_token_limit: Math.floor(nextLimit),
      })

      const refreshed = await api.get('/api/users/token-limits')
      const rows: TokenLimitRow[] = refreshed.data?.users || []
      setTokenLimits(rows)
      setTokenDrafts(
        rows.reduce((acc, row) => {
          acc[row.user_id] = String(row.daily_token_limit)
          return acc
        }, {} as Record<string, string>)
      )
      setBulkTokenLimit('')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to bulk update token limits')
    } finally {
      setBulkSaving(false)
    }
  }

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-foreground">User Management</h1>
              <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                <Plus className="w-4 h-4" />
                Add User
              </Button>
            </div>
            <p className="text-muted-foreground">Manage faculty and student accounts with role-based access control.</p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Users, label: 'Total Users', count: stats.total, color: 'primary' },
              { icon: Users, label: 'Faculty', count: stats.faculty, color: 'accent' },
              { icon: Users, label: 'Students', count: stats.students, color: 'primary' },
            ].map((stat, idx) => {
              const Icon = stat.icon
              return (
                <Card key={idx} className="border-border/50 bg-card/50 backdrop-blur">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                        <p className="text-3xl font-bold text-foreground mt-2">{stat.count}</p>
                      </div>
                      <div
                        className={`w-10 h-10 rounded-lg ${
                          stat.color === 'primary' ? 'bg-primary/10' : 'bg-accent/10'
                        } flex items-center justify-center`}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            stat.color === 'primary' ? 'text-primary' : 'text-accent'
                          }`}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
            <CardHeader className="bg-secondary/50 border-b border-border">
              <CardTitle>Users Directory</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30 border-border/30">
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Roles</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Loading users...
                        </TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id} className="border-border/30 hover:bg-secondary/30">
                          <TableCell>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="w-4 h-4" />
                              {user.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {user.roles.map((role) => (
                                <Badge
                                  key={role}
                                  variant="outline"
                                  className={
                                    role === 'admin'
                                      ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                                      : role === 'faculty'
                                        ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                                        : 'bg-green-500/10 text-green-700 dark:text-green-400'
                                  }
                                >
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="ghost">
                                Edit
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
            <CardHeader className="bg-secondary/50 border-b border-border">
              <CardTitle>Daily Token Limits</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row md:items-center gap-3 p-4 border-b border-border/40 bg-secondary/20">
                <p className="text-sm text-muted-foreground md:mr-auto">
                  Bulk Manage: update daily token limit for all users at once.
                </p>
                <input
                  type="number"
                  min={1}
                  placeholder="All users limit"
                  className="w-full md:w-40 rounded-md border border-border bg-background px-2 py-1 text-sm"
                  value={bulkTokenLimit}
                  onChange={(e) => setBulkTokenLimit(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={applyBulkTokenLimit}
                  disabled={bulkSaving}
                >
                  {bulkSaving ? 'Updating...' : 'Update All Users'}
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30 border-border/30">
                      <TableHead className="font-semibold">User</TableHead>
                      <TableHead className="font-semibold">Roles</TableHead>
                      <TableHead className="font-semibold">Used Today</TableHead>
                      <TableHead className="font-semibold">Remaining</TableHead>
                      <TableHead className="font-semibold">Daily Limit</TableHead>
                      <TableHead className="text-right font-semibold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokenLimits.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No token limit records available
                        </TableCell>
                      </TableRow>
                    ) : (
                      tokenLimits.map((row) => (
                        <TableRow key={row.user_id} className="border-border/30 hover:bg-secondary/30">
                          <TableCell className="font-medium">{row.email}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {row.roles.map((role) => (
                                <Badge key={`${row.user_id}-${role}`} variant="outline">{role}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{row.today_used_tokens}</TableCell>
                          <TableCell>{row.today_remaining_tokens}</TableCell>
                          <TableCell>
                            <input
                              type="number"
                              min={1}
                              className="w-28 rounded-md border border-border bg-background px-2 py-1 text-sm"
                              value={tokenDrafts[row.user_id] || ''}
                              onChange={(e) =>
                                setTokenDrafts((prev) => ({ ...prev, [row.user_id]: e.target.value }))
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => saveTokenLimit(row.user_id)}
                              disabled={Boolean(tokenSaving[row.user_id])}
                            >
                              {tokenSaving[row.user_id] ? 'Saving...' : 'Update'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="bg-secondary/50 border-b border-border">
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Advisor-Student Mapping
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {mappingError ? <p className="text-sm text-destructive">{mappingError}</p> : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Faculty Advisor</label>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={selectedAdvisor}
                    onChange={(e) => setSelectedAdvisor(e.target.value)}
                  >
                    <option value="">Choose an advisor...</option>
                    {faculty.map((fac) => (
                      <option key={fac.id} value={fac.id}>
                        {fac.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Button
                    className="w-full mt-6 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                    onClick={assignStudents}
                    disabled={mappingLoading || !selectedAdvisor || selectedStudentIds.length === 0}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {mappingLoading ? 'Assigning...' : 'Assign Selected Students'}
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Select Students to Assign</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-3 border border-border rounded-md bg-secondary/20">
                  {students.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No students found</p>
                  ) : (
                    students.map((student) => (
                      <label key={student.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => toggleStudent(student.id)}
                          className="rounded border-border"
                        />
                        <span>{student.email}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
            <CardHeader className="bg-secondary/50 border-b border-border">
              <CardTitle>Current Advisor Assignments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30 border-border/30">
                      <TableHead className="font-semibold">Advisor</TableHead>
                      <TableHead className="font-semibold">Student</TableHead>
                      <TableHead className="font-semibold">Assigned At</TableHead>
                      <TableHead className="text-right font-semibold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No advisor mappings yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      mappings.map((mapping) => (
                        <TableRow key={mapping.id} className="border-border/30 hover:bg-secondary/30">
                          <TableCell className="font-medium">{mapping.advisor.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-primary/10 text-primary dark:text-primary/80">
                              {mapping.student.email}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(mapping.assigned_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeMapping(mapping.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          </div>
        </main>
      </div>
    </RoleGuard>
  )
}
