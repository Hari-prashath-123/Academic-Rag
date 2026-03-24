'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { RoleGuard } from '@/components/role-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChatInterface } from '@/components/chat-interface'
import { BookOpen, Loader2, AlertCircle } from 'lucide-react'
import api from '@/lib/api'

type Course = {
  id: string
  code: string
  name: string
  semester?: string | null
}

export default function StudentAssistantPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true)
        const res = await api.get('/api/course-materials/courses')
        setCourses(res.data.courses || [])
        if (res.data.courses && res.data.courses.length > 0) {
          setSelectedCourseId(res.data.courses[0].id)
        }
        setError('')
      } catch (err) {
        setError('Failed to load courses.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [])

  return (
    <RoleGuard allowedRoles={['student']}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-7xl mx-auto">
              {/* Page Header */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-foreground">
                  Study Assistant
                </h1>
                <p className="text-muted-foreground mt-2">
                  Ask questions about your course materials and get AI-powered answers
                </p>
              </div>

              {/* Course Selector */}
              <div className="mb-6">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">
                      Select Course (Optional)
                    </label>
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Loading courses...</span>
                      </div>
                    ) : error ? (
                      <p className="text-sm text-red-600">{error}</p>
                    ) : (
                      <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">All Courses</option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.code} - {course.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {selectedCourseId && (
                    <div className="mt-auto">
                      <Badge className="gap-2">
                        <BookOpen className="w-3 h-3" />
                        {courses.find((c) => c.id === selectedCourseId)?.code}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Info Box */}
              <Card className="mb-6 bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <p className="text-sm text-blue-900">
                    💡 <strong>Tip:</strong> Ask questions about concepts, clarify doubts, or get help
                    with course materials. The AI assistant can reference your uploaded documents.
                  </p>
                </CardContent>
              </Card>

              {/* Chat Interface */}
              <Card className="flex-1">
                <div className="h-[600px] flex flex-col">
                  <ChatInterface />
                </div>
              </Card>

              {/* Quick Help Section */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Example Questions</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• "Explain the key concepts of this topic"</li>
                      <li>• "What are the main points from the lecture?"</li>
                      <li>• "Help me understand this difficult concept"</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Document Reference</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="text-muted-foreground">
                      The AI uses your course materials to provide accurate answers with references
                      to specific documents and pages.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Best Practice</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="text-muted-foreground">
                      Be specific in your questions for better answers. Include course topics or
                      specific concepts for more targeted responses.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </RoleGuard>
  )
}
