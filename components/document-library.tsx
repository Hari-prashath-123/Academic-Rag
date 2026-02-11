'use client'

import { useState, useRef } from 'react'
import {
  Search,
  Upload,
  FileText,
  File,
  Calendar,
  HardDrive,
  CheckCircle,
  Clock,
  Download,
  Trash2,
  Eye,
  MoreVertical,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const documents = [
  {
    id: 1,
    name: 'DS_Syllabus_2024.pdf',
    type: 'Syllabus',
    uploadDate: '2024-01-15',
    size: '2.4 MB',
    status: 'Indexed',
    subject: 'Data Structures',
  },
  {
    id: 2,
    name: 'CO_Matrix.xlsx',
    type: 'CO Mapping',
    uploadDate: '2024-01-20',
    size: '892 KB',
    status: 'Indexed',
    subject: 'All Subjects',
  },
  {
    id: 3,
    name: 'Algorithm_QP_Mid_2024.pdf',
    type: 'Question Paper',
    uploadDate: '2024-02-01',
    size: '1.8 MB',
    status: 'Processing',
    subject: 'Algorithms',
  },
  {
    id: 4,
    name: 'Marks_Register_Semester5.xlsx',
    type: 'Marks',
    uploadDate: '2024-02-05',
    size: '645 KB',
    status: 'Indexed',
    subject: 'All Subjects',
  },
  {
    id: 5,
    name: 'Database_Lecture_Notes.pdf',
    type: 'Study Material',
    uploadDate: '2024-02-10',
    size: '3.2 MB',
    status: 'Indexed',
    subject: 'Database',
  },
  {
    id: 6,
    name: 'WebDev_Assessment.docx',
    type: 'Assessment',
    uploadDate: '2024-02-12',
    size: '1.1 MB',
    status: 'Processing',
    subject: 'Web Development',
  },
  {
    id: 7,
    name: 'Blooms_Framework.pdf',
    type: 'CO Mapping',
    uploadDate: '2024-02-14',
    size: '956 KB',
    status: 'Indexed',
    subject: 'All Subjects',
  },
  {
    id: 8,
    name: 'Final_Exam_Questions.pdf',
    type: 'Question Paper',
    uploadDate: '2024-02-18',
    size: '2.1 MB',
    status: 'Indexed',
    subject: 'Multiple',
  },
]

const typeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'syllabus', label: 'Syllabus' },
  { value: 'qp', label: 'Question Papers' },
  { value: 'marks', label: 'Marks' },
  { value: 'co', label: 'CO Mapping' },
  { value: 'material', label: 'Study Material' },
]

const subjectOptions = [
  { value: 'all', label: 'All Subjects' },
  { value: 'ds', label: 'Data Structures' },
  { value: 'algo', label: 'Algorithms' },
  { value: 'db', label: 'Database' },
  { value: 'web', label: 'Web Development' },
]

// Upload progress component
function UploadProgressItem({
  filename,
  progress,
  status,
  onCancel,
}: {
  filename: string
  progress: number
  status: 'uploading' | 'indexing' | 'complete'
  onCancel: () => void
}) {
  const statusConfig = {
    uploading: { label: 'Uploading...', color: 'bg-blue-500', icon: Upload },
    indexing: { label: 'Indexing...', color: 'bg-amber-500', icon: Zap },
    complete: { label: 'Complete', color: 'bg-green-500', icon: CheckCircle },
  }

  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-3 p-3 bg-card/50 rounded-lg border border-border/30">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-sm font-medium truncate text-foreground">{filename}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{progress}%</span>
            {status !== 'complete' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0"
                onClick={onCancel}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
        <div className="w-full bg-secondary/50 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full ${config.color} transition-all duration-300`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{config.label}</p>
      </div>
    </div>
  )
}

export function DocumentLibrary() {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [uploads, setUploads] = useState<
    Array<{ id: string; filename: string; progress: number; status: 'uploading' | 'indexing' | 'complete' }>
  >([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getStatusColor = (status: string) => {
    return status === 'Indexed'
      ? 'bg-green-500/10 text-green-700 dark:text-green-400'
      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
  }

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return

    for (const file of Array.from(files)) {
      const uploadId = Date.now() + Math.random()
      const uploadItem = {
        id: uploadId.toString(),
        filename: file.name,
        progress: 0,
        status: 'uploading' as const,
      }

      setUploads((prev) => [...prev, uploadItem])

      // Simulate file upload (0-60%)
      for (let i = 0; i <= 60; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200))
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? { ...u, progress: i + Math.random() * 10 }
              : u
          )
        )
      }

      // Transition to indexing
      setUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId
            ? { ...u, status: 'indexing', progress: 65 }
            : u
        )
      )

      // Simulate indexing (60-100%)
      for (let i = 65; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 300))
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? { ...u, progress: i + Math.random() * 10 }
              : u
          )
        )
      }

      // Mark as complete
      setUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId
            ? { ...u, status: 'complete', progress: 100 }
            : u
        )
      )
    }
  }

  const handleCancelUpload = (uploadId: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== uploadId))
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      Syllabus: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
      'Question Paper': 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
      Marks: 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
      'CO Mapping': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
      'Study Material': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
      Assessment: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
    }
    return colors[type] || 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
  }

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || doc.type.toLowerCase().includes(typeFilter)
    const matchesSubject =
      subjectFilter === 'all' || doc.subject.toLowerCase().includes(subjectFilter)

    return matchesSearch && matchesType && matchesSubject
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Document Library</h1>
        <p className="text-muted-foreground">
          Manage all academic documents, question papers, and assessment materials.
        </p>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Upload Progress</h3>
          {uploads.map((upload) => (
            <UploadProgressItem
              key={upload.id}
              filename={upload.filename}
              progress={Math.round(upload.progress)}
              status={upload.status}
              onCancel={() => handleCancelUpload(upload.id)}
            />
          ))}
        </Card>
      )}

      {/* Upload Card */}
      <Card
        className="border-2 border-dashed border-primary/30 bg-primary/5 p-8 cursor-pointer hover:bg-primary/10 transition-colors"
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleFileSelect(e.dataTransfer.files)
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.xlsx,.docx"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        <div
          className="flex flex-col items-center gap-4 text-center"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Upload className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">
              Drag and drop documents here
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse. Supports PDF, XLSX, DOCX files
            </p>
            <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1 relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by document name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {subjectOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Documents Table */}
      <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow className="border-border/30 hover:bg-secondary/75">
                <TableHead className="font-semibold">Document Name</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Subject</TableHead>
                <TableHead className="font-semibold">Upload Date</TableHead>
                <TableHead className="font-semibold">Size</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length > 0 ? (
                filteredDocuments.map((doc) => (
                  <TableRow
                    key={doc.id}
                    className="border-border/30 hover:bg-secondary/30 transition-colors"
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium truncate">{doc.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTypeColor(doc.type)}>
                        {doc.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{doc.subject}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {new Date(doc.uploadDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <HardDrive className="w-4 h-4" />
                        {doc.size}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          doc.status === 'Indexed'
                            ? getStatusColor('Indexed')
                            : getStatusColor('Processing')
                        }
                      >
                        {doc.status === 'Indexed' ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {doc.status}
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 mr-1" />
                            {doc.status}
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2">
                            <Eye className="w-4 h-4" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Download className="w-4 h-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-destructive">
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">
                      No documents found matching your filters
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
              <p className="text-2xl font-bold text-foreground mt-2">{documents.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Indexed</p>
              <p className="text-2xl font-bold text-foreground mt-2">
                {documents.filter((d) => d.status === 'Indexed').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Processing</p>
              <p className="text-2xl font-bold text-foreground mt-2">
                {documents.filter((d) => d.status === 'Processing').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
