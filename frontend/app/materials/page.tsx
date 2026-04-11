'use client'

import { useEffect, useMemo, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { RoleGuard } from '@/components/role-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, FileText, Video, Plus } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/context/auth-context'

type Course = {
  id: string
  code: string
  name: string
  semester?: string | null
}

type Material = {
  id: string
  title: string
  material_type: 'pdf' | 'notes' | 'question_paper'
  uploaded_at: string
  course: {
    id: string
    code: string
    name: string
  }
}

export default function MaterialsPage() {
  const { role } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedType, setSelectedType] = useState<'pdf' | 'notes' | 'question_paper'>('pdf')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const canUpload = role === 'admin' || role === 'faculty' || role === 'advisor'

  const refreshData = async () => {
    const [coursesRes, materialsRes] = await Promise.all([
      api.get('/api/course-materials/courses'),
      api.get('/api/course-materials/'),
    ])
    setCourses(coursesRes.data.courses || [])
    setMaterials(materialsRes.data.materials || [])
  }

  useEffect(() => {
    refreshData().catch(() => setError('Unable to load course materials.'))
  }, [])

  const stats = useMemo(() => {
    const pdf = materials.filter((item) => item.material_type === 'pdf').length
    const notes = materials.filter((item) => item.material_type === 'notes').length
    const qp = materials.filter((item) => item.material_type === 'question_paper').length
    return { pdf, notes, qp }
  }, [materials])

  const uploadMaterial = async () => {
    if (!canUpload) {
      setError('Only faculty/admin can upload materials.')
      return
    }
    if (!selectedCourseId || !title.trim() || !file) {
      setError('Choose course, title, and file.')
      return
    }

    const formData = new FormData()
    formData.append('course_id', selectedCourseId)
    formData.append('title', title.trim())
    formData.append('material_type', selectedType)
    formData.append('file', file)

    setLoading(true)
    setError('')
    try {
      await api.post('/api/course-materials/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setTitle('')
      setFile(null)
      await refreshData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Upload failed')
    } finally {
      setLoading(false)
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
                <h1 className="text-3xl font-bold text-foreground">Course Materials</h1>
                <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90" onClick={uploadMaterial} disabled={!canUpload || loading}>
                  <Plus className="w-4 h-4" />
                  {loading ? 'Uploading...' : 'Upload Material'}
                </Button>
              </div>
              <p className="text-muted-foreground">Upload and browse course-wise PDFs, notes, and question papers.</p>
              {error ? <p className="text-sm text-destructive mt-2">{error}</p> : null}
            </div>

            {canUpload ? (
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle>Upload Course Material</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    className="rounded-md border border-border bg-background px-3 py-2"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                  >
                    <option value="">Select course</option>
                    {courses.map((course) => (
                      <option value={course.id} key={course.id}>
                        {course.code} - {course.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-md border border-border bg-background px-3 py-2"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as 'pdf' | 'notes' | 'question_paper')}
                  >
                    <option value="pdf">PDF</option>
                    <option value="notes">Notes</option>
                    <option value="question_paper">Question Paper</option>
                  </select>
                  <input
                    className="rounded-md border border-border bg-background px-3 py-2"
                    placeholder="Material title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.xl,.csv,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.zip,.rar,.7z,.mp4,.mp3,.wav"
                    className="rounded-md border border-border bg-background px-3 py-2"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <p className="md:col-span-2 text-xs text-muted-foreground">
                    Supported formats: pdf, doc/docx, xls/xlsx/xl/csv, ppt/pptx, txt, png, jpg/jpeg, gif, webp, zip/rar/7z, mp4/mp3/wav.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: FileText, label: 'PDFs', count: stats.pdf },
                { icon: Video, label: 'Notes', count: stats.notes },
                { icon: BookOpen, label: 'Question Papers', count: stats.qp },
              ].map((item, idx) => {
                const Icon = item.icon
                return (
                  <Card key={idx} className="border-border/50 bg-card/50 backdrop-blur">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                          <p className="text-3xl font-bold text-foreground mt-2">{item.count}</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {materials.map((material) => (
                <Card
                  key={material.id}
                  className="border-border/50 bg-card/50 backdrop-blur hover:border-primary/50 transition-colors"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {material.material_type === 'question_paper' ? (
                          <BookOpen className="w-6 h-6 text-primary" />
                        ) : (
                          <FileText className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-foreground leading-tight">{material.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {material.course.code} - {material.course.name}
                            </p>
                          </div>
                          <Badge variant="outline" className="bg-accent/10 text-accent dark:text-accent/80 flex-shrink-0">
                            {material.material_type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                          Uploaded: {new Date(material.uploaded_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </RoleGuard>
  )
}
