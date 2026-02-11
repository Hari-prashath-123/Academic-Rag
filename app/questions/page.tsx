'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Download, Eye } from 'lucide-react'

const questionPapers = [
  { id: 1, subject: 'Data Structures', exam: 'Mid Exam', date: '2024-02-15', difficulty: 'Medium', questions: 12, co_count: 5 },
  { id: 2, subject: 'Algorithms', exam: 'End Exam', date: '2024-05-10', difficulty: 'Hard', questions: 15, co_count: 5 },
  { id: 3, subject: 'Database', exam: 'Mid Exam', date: '2024-02-20', difficulty: 'Medium', questions: 14, co_count: 4 },
  { id: 4, subject: 'Web Development', exam: 'Quiz 1', date: '2024-03-05', difficulty: 'Easy', questions: 10, co_count: 3 },
]

export default function QuestionsPage() {
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
            <p className="text-muted-foreground">Manage and analyze question papers across all subjects and exams.</p>
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
                      <TableHead className="font-semibold">Subject</TableHead>
                      <TableHead className="font-semibold">Exam Type</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Difficulty</TableHead>
                      <TableHead className="font-semibold">Questions</TableHead>
                      <TableHead className="font-semibold">COs Covered</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questionPapers.map((qp) => (
                      <TableRow key={qp.id} className="border-border/30 hover:bg-secondary/30">
                        <TableCell className="font-medium">{qp.subject}</TableCell>
                        <TableCell>{qp.exam}</TableCell>
                        <TableCell>{new Date(qp.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              qp.difficulty === 'Easy'
                                ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                                : qp.difficulty === 'Medium'
                                  ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                                  : 'bg-red-500/10 text-red-700 dark:text-red-400'
                            }
                          >
                            {qp.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell>{qp.questions}</TableCell>
                        <TableCell>{qp.co_count}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
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
