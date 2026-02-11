'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, TrendingUp } from 'lucide-react'

const assessmentData = [
  { id: 1, subject: 'Data Structures', assessment: 'CIA 1', avg_score: 78, total_students: 45, status: 'Completed' },
  { id: 2, subject: 'Data Structures', assessment: 'CIA 2', avg_score: 82, total_students: 45, status: 'Completed' },
  { id: 3, subject: 'Algorithms', assessment: 'CIA 1', avg_score: 75, total_students: 48, status: 'Completed' },
  { id: 4, subject: 'Database', assessment: 'SAA 1', avg_score: 88, total_students: 42, status: 'In Progress' },
  { id: 5, subject: 'Web Development', assessment: 'Project 1', avg_score: 85, total_students: 40, status: 'Completed' },
  { id: 6, subject: 'Algorithms', assessment: 'CIA 2', avg_score: 79, total_students: 48, status: 'Pending' },
]

export default function AssessmentsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <Header />
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-foreground">Marks & Assessments</h1>
              <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                <Plus className="w-4 h-4" />
                Add Assessment
              </Button>
            </div>
            <p className="text-muted-foreground">Track and manage student assessments and marks across all subjects.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Assessments</p>
                    <p className="text-3xl font-bold text-foreground mt-2">18</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Class Average</p>
                    <p className="text-3xl font-bold text-foreground mt-2">81.2%</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                    <p className="text-3xl font-bold text-foreground mt-2">14</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
            <CardHeader className="bg-secondary/50 border-b border-border">
              <CardTitle>Assessment Records</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30 border-border/30">
                      <TableHead className="font-semibold">Subject</TableHead>
                      <TableHead className="font-semibold">Assessment</TableHead>
                      <TableHead className="font-semibold">Average Score</TableHead>
                      <TableHead className="font-semibold">Students</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessmentData.map((assessment) => (
                      <TableRow key={assessment.id} className="border-border/30 hover:bg-secondary/30">
                        <TableCell className="font-medium">{assessment.subject}</TableCell>
                        <TableCell>{assessment.assessment}</TableCell>
                        <TableCell>
                          <span className="font-semibold">{assessment.avg_score}%</span>
                        </TableCell>
                        <TableCell>{assessment.total_students}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              assessment.status === 'Completed'
                                ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                                : assessment.status === 'In Progress'
                                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                                  : 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
                            }
                          >
                            {assessment.status}
                          </Badge>
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
