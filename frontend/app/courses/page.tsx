'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { RoleGuard } from '@/components/role-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, BookOpen, Trash2 } from 'lucide-react'
import api from '@/lib/api'

type Course = {
  id: string
  code: string
  name: string
  semester?: string | null
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [semester, setSemester] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchCourses = async () => {
    try {
      const res = await api.get('/api/course-materials/courses')
      setCourses(res.data.courses || [])
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  const createCourse = async () => {
    if (!code.trim() || !name.trim()) {
      setError('Course code and name are required.')
      return
    }

    setCreating(true)
    setError('')
    try {
      await api.post('/api/course-materials/courses', {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        semester: semester.trim() || null,
      })
      setCode('')
      setName('')
      setSemester('')
      await fetchCourses()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create course')
    } finally {
      setCreating(false)
    }
  }

  return (
    <RoleGuard allowedRoles={['admin', 'faculty', 'advisor']}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-bold text-foreground">Course Management</h1>
              </div>
              <p className="text-muted-foreground">Create and manage courses for material uploads.</p>
              {error ? <p className="text-sm text-destructive mt-2">{error}</p> : null}
            </div>

            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Create New Course</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Course Code (e.g., CS101)"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                  <input
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Course Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <input
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Semester (optional)"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                  />
                </div>
                <Button
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                  onClick={createCourse}
                  disabled={creating}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {creating ? 'Creating...' : 'Create Course'}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
              <CardHeader className="bg-secondary/50 border-b border-border">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  All Courses ({courses.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/30 border-border/30">
                        <TableHead className="font-semibold">Code</TableHead>
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="font-semibold">Semester</TableHead>
                        <TableHead className="text-right font-semibold">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Loading courses...
                          </TableCell>
                        </TableRow>
                      ) : courses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No courses yet. Create one to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        courses.map((course) => (
                          <TableRow key={course.id} className="border-border/30 hover:bg-secondary/30">
                            <TableCell>
                              <Badge variant="outline" className="bg-primary/10 text-primary dark:text-primary/80 font-mono">
                                {course.code}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{course.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {course.semester || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {/* Future: Add edit/delete actions */}
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
