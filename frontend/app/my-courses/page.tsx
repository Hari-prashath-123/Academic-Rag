'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { RoleGuard } from '@/components/role-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BookOpen, FileText, HelpCircle, Loader2, AlertCircle, ChevronRight, Eye, Download } from 'lucide-react'
import api from '@/lib/api'

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
  file_name?: string | null
  media_type?: string | null
  uploaded_at: string
  course: {
    id: string
    code: string
    name: string
  }
}

type CourseWithMaterials = Course & {
  materials: Material[]
  materialCounts: {
    pdf: number
    notes: number
    question_paper: number
    total: number
  }
}

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<CourseWithMaterials[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [busyMaterialId, setBusyMaterialId] = useState<string | null>(null)

  useEffect(() => {
    const fetchCoursesAndMaterials = async () => {
      try {
        setLoading(true)
        const [coursesRes, materialsRes] = await Promise.all([
          api.get('/api/course-materials/courses'),
          api.get('/api/course-materials/'),
        ])

        const allCourses = coursesRes.data.courses || []
        const allMaterials = materialsRes.data.materials || []

        // Group materials by course
        const coursesWithMaterials = allCourses.map((course: Course) => {
          const courseMaterials = allMaterials.filter(
            (m: Material) => m.course.id === course.id
          )
          return {
            ...course,
            materials: courseMaterials,
            materialCounts: {
              pdf: courseMaterials.filter((m: Material) => m.material_type === 'pdf').length,
              notes: courseMaterials.filter((m: Material) => m.material_type === 'notes').length,
              question_paper: courseMaterials.filter(
                (m: Material) => m.material_type === 'question_paper'
              ).length,
              total: courseMaterials.length,
            },
          }
        })

        setCourses(coursesWithMaterials)
        setError('')
      } catch (err) {
        setError('Failed to load your courses. Please try again.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchCoursesAndMaterials()
  }, [])

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />
      case 'notes':
        return <BookOpen className="w-4 h-4 text-blue-500" />
      case 'question_paper':
        return <HelpCircle className="w-4 h-4 text-purple-500" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getMaterialTypeName = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'PDF'
      case 'notes':
        return 'Notes'
      case 'question_paper':
        return 'Question Paper'
      default:
        return type
    }
  }

  const getFileNameFromDisposition = (disposition?: string, fallback = 'download') => {
    if (!disposition) {
      return fallback
    }

    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1])
    }

    const normalMatch = disposition.match(/filename="?([^";]+)"?/i)
    if (normalMatch?.[1]) {
      return normalMatch[1]
    }

    return fallback
  }

  const isViewableMimeType = (mimeType: string) => {
    const normalized = mimeType.toLowerCase()
    return (
      normalized === 'application/pdf' ||
      normalized.startsWith('image/') ||
      normalized.startsWith('text/') ||
      normalized.startsWith('audio/') ||
      normalized.startsWith('video/')
    )
  }

  const handleViewMaterial = async (material: Material) => {
    try {
      setBusyMaterialId(material.id)
      const res = await api.get(`/api/course-materials/${material.id}/download`, {
        params: { inline: true },
        responseType: 'blob',
      })

      const contentType = (res.headers?.['content-type'] as string) || material.media_type || 'application/octet-stream'
      const disposition = res.headers?.['content-disposition'] as string | undefined
      const fallbackName = material.file_name || material.title || 'material'
      const resolvedName = getFileNameFromDisposition(disposition, fallbackName)
      const fileBlob = new Blob([res.data], { type: contentType })

      if (!isViewableMimeType(contentType)) {
        const downloadUrl = window.URL.createObjectURL(fileBlob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = resolvedName
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(downloadUrl)
        return
      }

      const fileUrl = window.URL.createObjectURL(fileBlob)
      window.open(fileUrl, '_blank', 'noopener,noreferrer')
      setTimeout(() => window.URL.revokeObjectURL(fileUrl), 60_000)
    } catch {
      setError('Unable to open this material.')
    } finally {
      setBusyMaterialId(null)
    }
  }

  const handleDownloadMaterial = async (material: Material) => {
    try {
      setBusyMaterialId(material.id)
      const res = await api.get(`/api/course-materials/${material.id}/download`, {
        responseType: 'blob',
      })

      const contentType = (res.headers?.['content-type'] as string) || material.media_type || 'application/octet-stream'
      const disposition = res.headers?.['content-disposition'] as string | undefined
      const fallbackName = material.file_name || material.title || 'material'
      const resolvedName = getFileNameFromDisposition(disposition, fallbackName)
      const fileUrl = window.URL.createObjectURL(new Blob([res.data], { type: contentType }))
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = resolvedName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(fileUrl)
    } catch {
      setError('Unable to download this material.')
    } finally {
      setBusyMaterialId(null)
    }
  }

  return (
    <RoleGuard allowedRoles={['student']}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-7xl mx-auto">
              {/* Page Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">My Courses</h1>
                <p className="text-muted-foreground mt-2">
                  View your enrolled courses and their materials
                </p>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}

              {/* Error State */}
              {error && !loading && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-red-700">{error}</p>
                  </CardContent>
                </Card>
              )}

              {/* Empty State */}
              {!loading && courses.length === 0 && !error && (
                <Card>
                  <CardContent className="pt-12 pb-12 text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground text-lg">No courses found</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      You don't have any enrolled courses yet.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Courses Grid */}
              {!loading && courses.length > 0 && (
                <div className="space-y-4">
                  {courses.map((course) => (
                    <Card
                      key={course.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() =>
                        setSelectedCourse(selectedCourse === course.id ? null : course.id)
                      }
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CardTitle className="text-lg">{course.name}</CardTitle>
                              {course.semester && (
                                <Badge variant="secondary" className="ml-auto">
                                  Semester {course.semester}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Course Code: {course.code}
                            </p>
                          </div>
                          <ChevronRight
                            className={`w-5 h-5 text-muted-foreground transition-transform ${
                              selectedCourse === course.id ? 'rotate-90' : ''
                            }`}
                          />
                        </div>
                      </CardHeader>

                      {/* Material Stats */}
                      <CardContent className="pb-4">
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="flex items-center gap-2 p-2 bg-muted rounded">
                            <FileText className="w-4 h-4 text-red-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">PDFs</p>
                              <p className="font-semibold text-sm">{course.materialCounts.pdf}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-muted rounded">
                            <BookOpen className="w-4 h-4 text-blue-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Notes</p>
                              <p className="font-semibold text-sm">{course.materialCounts.notes}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-muted rounded">
                            <HelpCircle className="w-4 h-4 text-purple-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Question Papers</p>
                              <p className="font-semibold text-sm">
                                {course.materialCounts.question_paper}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Expand to show materials */}
                        {selectedCourse === course.id && course.materials.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <h4 className="font-semibold text-sm mb-3">Materials</h4>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {course.materials.map((material) => (
                                <div
                                  key={material.id}
                                  className="flex items-center justify-between p-3 bg-muted rounded hover:bg-muted/80 transition-colors"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {getMaterialIcon(material.material_type)}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {material.title}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {getMaterialTypeName(material.material_type)} •{' '}
                                        {new Date(material.uploaded_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-1"
                                      disabled={busyMaterialId === material.id}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleViewMaterial(material)
                                      }}
                                    >
                                      <Eye className="w-4 h-4" />
                                      View
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="gap-1"
                                      disabled={busyMaterialId === material.id}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDownloadMaterial(material)
                                      }}
                                    >
                                      <Download className="w-4 h-4" />
                                      Download
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedCourse === course.id && course.materials.length === 0 && (
                          <div className="mt-4 p-3 bg-muted rounded text-center">
                            <p className="text-sm text-muted-foreground">
                              No materials available for this course yet.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Quick Links */}
              {!loading && courses.length > 0 && (
                <div className="mt-8 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-3">Quick Links</p>
                  <div className="flex gap-3">
                    <Link href="/chat">
                      <Button variant="outline" size="sm" className="gap-2">
                        <FileText className="w-4 h-4" />
                        AI Chat Assistant
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </RoleGuard>
  )
}
