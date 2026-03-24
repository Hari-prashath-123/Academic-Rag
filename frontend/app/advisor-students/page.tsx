'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { RoleGuard } from '@/components/role-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, AlertCircle, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/context/auth-context'

type StudentRow = {
  mapping_id: string
  student_id: string
  student_email: string
}

export default function AdvisorStudentsPage() {
  const { user } = useAuth()
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchMappedStudents = async () => {
      if (!user?.id) {
        return
      }

      setLoading(true)
      setError('')
      try {
        const res = await api.get(`/api/advisor-mappings/advisor/${user.id}/students`)
        setStudents(res.data.students || [])
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Failed to load mapped students.')
      } finally {
        setLoading(false)
      }
    }

    fetchMappedStudents()
  }, [user?.id])

  return (
    <RoleGuard allowedRoles={['faculty', 'advisor', 'admin']}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">My Mapped Students</h1>
              <p className="text-muted-foreground">
                Students currently assigned to you as advisor.
              </p>
            </div>

            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Mapped Students</p>
                    <p className="text-3xl font-bold text-foreground mt-2">{students.length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading students...
              </div>
            ) : null}

            {error ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            ) : null}

            {!loading && !error ? (
              <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
                <CardHeader className="bg-secondary/50 border-b border-border">
                  <CardTitle>Assigned Students</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-secondary/30 border-border/30">
                          <TableHead className="font-semibold">Student Email</TableHead>
                          <TableHead className="font-semibold">Student ID</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.length === 0 ? (
                          <TableRow className="border-border/30">
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                              No students mapped to this advisor.
                            </TableCell>
                          </TableRow>
                        ) : (
                          students.map((student) => (
                            <TableRow key={student.mapping_id} className="border-border/30 hover:bg-secondary/30">
                              <TableCell className="font-medium">{student.student_email}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{student.student_id}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-primary/10 text-primary">
                                  Active
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </main>
      </div>
    </RoleGuard>
  )
}
