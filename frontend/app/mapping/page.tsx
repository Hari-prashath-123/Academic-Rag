'use client'

import { useEffect, useMemo, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { RoleGuard } from '@/components/role-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Grid3x3 } from 'lucide-react'
import api from '@/lib/api'

type SimpleUser = {
  id: string
  email: string
  roles: string[]
}

type AdvisorMapping = {
  id: string
  advisor: { id: string; email: string }
  student: { id: string; email: string }
  assigned_at: string
}

export default function MappingPage() {
  const [faculty, setFaculty] = useState<SimpleUser[]>([])
  const [students, setStudents] = useState<SimpleUser[]>([])
  const [mappings, setMappings] = useState<AdvisorMapping[]>([])
  const [advisorId, setAdvisorId] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refreshData = async () => {
    const [facultyRes, studentsRes, mappingsRes] = await Promise.all([
      api.get('/api/users/faculty'),
      api.get('/api/users/students'),
      api.get('/api/advisor-mappings/'),
    ])

    setFaculty(facultyRes.data.faculty || [])
    setStudents(studentsRes.data.students || [])
    setMappings(mappingsRes.data.mappings || [])
  }

  useEffect(() => {
    refreshData().catch(() => setError('Failed to load advisor mapping data.'))
  }, [])

  const advisorOptions = useMemo(
    () => faculty.map((item) => ({ label: item.email, value: item.id })),
    [faculty]
  )

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    )
  }

  const assignStudents = async () => {
    if (!advisorId || selectedStudentIds.length === 0) {
      setError('Select one advisor and at least one student.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await api.post('/api/advisor-mappings/assign', {
        advisor_id: advisorId,
        student_ids: selectedStudentIds,
      })
      setSelectedStudentIds([])
      await refreshData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Assignment failed.')
    } finally {
      setLoading(false)
    }
  }

  const removeMapping = async (mappingId: string) => {
    try {
      await api.delete(`/api/advisor-mappings/${mappingId}`)
      await refreshData()
    } catch {
      setError('Failed to remove mapping.')
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
                <h1 className="text-3xl font-bold text-foreground">Advisor-Student Mapping</h1>
                <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90" onClick={assignStudents} disabled={loading}>
                  <Plus className="w-4 h-4" />
                  {loading ? 'Assigning...' : 'Assign Students'}
                </Button>
              </div>
              <p className="text-muted-foreground">Map faculty advisors to multiple students.</p>
              {error ? <p className="text-sm text-destructive mt-2">{error}</p> : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Faculty Advisors</p>
                  <p className="text-2xl font-semibold mt-2">{faculty.length}</p>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Students</p>
                  <p className="text-2xl font-semibold mt-2">{students.length}</p>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Active Mappings</p>
                  <p className="text-2xl font-semibold mt-2">{mappings.length}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Select Advisor and Students</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Advisor (Faculty)</label>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2"
                    value={advisorId}
                    onChange={(e) => setAdvisorId(e.target.value)}
                  >
                    <option value="">Select advisor</option>
                    {advisorOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-sm mb-2">Students</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-auto">
                    {students.map((student) => (
                      <label key={student.id} className="flex items-center gap-2 text-sm rounded border border-border px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => toggleStudent(student.id)}
                        />
                        <span>{student.email}</span>
                      </label>
                    ))}
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
                      {mappings.map((mapping) => (
                        <TableRow key={mapping.id} className="border-border/30 hover:bg-secondary/30">
                          <TableCell>{mapping.advisor.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-primary/10 text-primary dark:text-primary/80">
                              {mapping.student.email}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(mapping.assigned_at).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => removeMapping(mapping.id)}>
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
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
