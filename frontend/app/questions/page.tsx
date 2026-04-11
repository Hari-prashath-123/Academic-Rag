'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Download, Eye } from 'lucide-react'
import api from '@/lib/api'

type QuestionPaperDoc = {
  id: string
  title: string
  subject: string | null
  uploaded_at: string | null
  indexing_status: string | null
  chunk_count: number
  file_path?: string | null
  source_kind?: 'document' | 'course_material'
}

type CourseMaterialItem = {
  id: string
  title: string
  material_type: string
  uploaded_at?: string | null
  course?: {
    code?: string
    name?: string
  }
}

export default function QuestionsPage() {
  const [questionPapers, setQuestionPapers] = useState<QuestionPaperDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQuestionPapers = async () => {
      try {
        setLoading(true)
        try {
          const response = await api.get('/documents/', {
            params: { document_type: 'question_paper' },
          })
          const docs = Array.isArray(response.data?.documents) ? response.data.documents : []
          setQuestionPapers(
            docs.map((item: any) => ({
              ...item,
              source_kind: 'document' as const,
            }))
          )
        } catch {
          const fallback = await api.get('/api/course-materials/')
          const materials: CourseMaterialItem[] = Array.isArray(fallback.data?.materials) ? fallback.data.materials : []
          const questionPaperMaterials = materials.filter((item) => item.material_type === 'question_paper')

          setQuestionPapers(
            questionPaperMaterials.map((item) => ({
              id: item.id,
              title: item.title,
              subject: item.course?.code || item.course?.name || 'Unspecified',
              uploaded_at: item.uploaded_at || null,
              indexing_status: 'completed',
              chunk_count: 0,
              source_kind: 'course_material',
            }))
          )
        }
      } catch (error) {
        console.error('Failed to fetch question papers', error)
        setQuestionPapers([])
      } finally {
        setLoading(false)
      }
    }

    fetchQuestionPapers()
  }, [])

  const readFilenameFromHeaders = (headers: Record<string, any>) => {
    const disposition = headers?.['content-disposition'] || headers?.['Content-Disposition']
    if (!disposition || typeof disposition !== 'string') return null
    const match = /filename="?([^\";]+)"?/i.exec(disposition)
    return match?.[1] || null
  }

  const fetchFileBlob = async (qp: QuestionPaperDoc, inline: boolean) => {
    const url = qp.source_kind === 'course_material'
      ? `/api/course-materials/${qp.id}/download`
      : `/documents/${qp.id}/download`

    const response = await api.get(url, {
      params: { inline },
      responseType: 'blob',
    })

    const filename = readFilenameFromHeaders(response.headers) || `${qp.title || 'question-paper'}.pdf`
    return { blob: response.data as Blob, filename }
  }

  const handleView = async (qp: QuestionPaperDoc) => {
    try {
      const { blob } = await fetchFileBlob(qp, true)
      const blobUrl = window.URL.createObjectURL(blob)
      window.open(blobUrl, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000)
    } catch (error) {
      console.error('Failed to open question paper', error)
    }
  }

  const handleDownload = async (qp: QuestionPaperDoc) => {
    try {
      const { blob, filename } = await fetchFileBlob(qp, false)
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Failed to download question paper', error)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <Header />
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-foreground">Question Papers</h1>
              <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                <Plus className="w-4 h-4" />
                Create Question Paper
              </Button>
            </div>
            <p className="text-muted-foreground">Manage and analyze uploaded question papers from your real document corpus.</p>
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
            <CardHeader className="bg-secondary/50 border-b border-border">
              <CardTitle>Question Papers Collection</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30 border-border/30">
                      <TableHead className="font-semibold">Title</TableHead>
                      <TableHead className="font-semibold">Subject</TableHead>
                      <TableHead className="font-semibold">Uploaded</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Chunks</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          Loading question papers...
                        </TableCell>
                      </TableRow>
                    ) : questionPapers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          No question papers uploaded yet.
                        </TableCell>
                      </TableRow>
                    ) : questionPapers.map((qp) => (
                      <TableRow key={qp.id} className="border-border/30 hover:bg-secondary/30">
                        <TableCell className="font-medium">{qp.title || 'Untitled'}</TableCell>
                        <TableCell>{qp.subject || 'Unspecified'}</TableCell>
                        <TableCell>{qp.uploaded_at ? new Date(qp.uploaded_at).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              qp.indexing_status === 'completed'
                                ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                                : qp.indexing_status === 'failed'
                                  ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                                  : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                            }
                          >
                            {qp.indexing_status || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>{qp.chunk_count ?? 0}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleView(qp)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleDownload(qp)}>
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
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
  )
}
