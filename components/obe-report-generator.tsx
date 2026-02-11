'use client'

import { useState } from 'react'
import {
  Download,
  FileDown,
  BarChart3,
  ChevronDown,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

const studentReportData = [
  {
    id: 1,
    name: 'Arun Kumar',
    enrollment: 'CSE-001',
    co1: '85%',
    co2: '90%',
    co3: '78%',
    co4: '88%',
    co5: '92%',
    average: '86.6%',
    bloomLevel: 'Level 5',
    status: 'Pass',
  },
  {
    id: 2,
    name: 'Priya Sharma',
    enrollment: 'CSE-002',
    co1: '92%',
    co2: '88%',
    co3: '95%',
    co4: '90%',
    co5: '94%',
    average: '91.8%',
    bloomLevel: 'Level 6',
    status: 'Pass',
  },
  {
    id: 3,
    name: 'Rajesh Patel',
    enrollment: 'CSE-003',
    co1: '72%',
    co2: '68%',
    co3: '65%',
    co4: '70%',
    co5: '74%',
    average: '69.8%',
    bloomLevel: 'Level 3',
    status: 'Pass',
  },
  {
    id: 4,
    name: 'Neha Singh',
    enrollment: 'CSE-004',
    co1: '88%',
    co2: '85%',
    co3: '82%',
    co4: '86%',
    co5: '89%',
    average: '86%',
    bloomLevel: 'Level 5',
    status: 'Pass',
  },
  {
    id: 5,
    name: 'Mohit Verma',
    enrollment: 'CSE-005',
    co1: '65%',
    co2: '62%',
    co3: '58%',
    co4: '61%',
    co5: '64%',
    average: '62%',
    bloomLevel: 'Level 2',
    status: 'Needs Review',
  },
]

const subjects = [
  { value: 'ds', label: 'Data Structures' },
  { value: 'algo', label: 'Algorithms' },
  { value: 'db', label: 'Database' },
  { value: 'web', label: 'Web Development' },
]

const batches = [
  { value: 'batch-2024-1', label: 'Batch 2024-1' },
  { value: 'batch-2024-2', label: 'Batch 2024-2' },
  { value: 'batch-2023-1', label: 'Batch 2023-1' },
]

const assessmentTypes = [
  { value: 'cia', label: 'CIA (Continuous Internal Assessments)' },
  { value: 'saa', label: 'SAA (Summative Assessment Activities)' },
  { value: 'all', label: 'All Assessments' },
]

export function OBEReportGenerator() {
  const [subject, setSubject] = useState('ds')
  const [batch, setBatch] = useState('batch-2024-1')
  const [assessmentType, setAssessmentType] = useState('all')
  const [reportGenerated, setReportGenerated] = useState(true)

  const handleGenerateReport = () => {
    setReportGenerated(true)
  }

  const getStatusColor = (status: string) => {
    return status === 'Pass'
      ? 'bg-green-500/10 text-green-700 dark:text-green-400'
      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
  }

  const getBloomColor = (level: string) => {
    const colors: Record<string, string> = {
      'Level 1': 'bg-red-500/10 text-red-700 dark:text-red-400',
      'Level 2': 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
      'Level 3': 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
      'Level 4': 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
      'Level 5': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
      'Level 6': 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
    }
    return colors[level] || 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">
          OBE Report Generator
        </h1>
        <p className="text-muted-foreground">
          Generate detailed reports on student CO attainment and Bloom's level distribution.
        </p>
      </div>

      {/* Filter Section */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Report Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Subject Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Subject
              </label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subj) => (
                    <SelectItem key={subj.value} value={subj.value}>
                      {subj.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Batch Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Batch</label>
              <Select value={batch} onValueChange={setBatch}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assessment Type Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Assessment Type
              </label>
              <Select value={assessmentType} onValueChange={setAssessmentType}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assessmentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <Button
                onClick={handleGenerateReport}
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Summary */}
      {reportGenerated && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Students */}
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Students
                    </p>
                    <p className="text-3xl font-bold text-foreground mt-2">
                      {studentReportData.length}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Average CO Attainment */}
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Avg CO Attainment
                    </p>
                    <p className="text-3xl font-bold text-foreground mt-2">
                      82.4%
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pass Rate */}
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Pass Rate
                    </p>
                    <p className="text-3xl font-bold text-foreground mt-2">
                      96%
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Report Table */}
          <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
            <CardHeader className="bg-secondary/50 border-b border-border">
              <CardTitle>Student CO Attainment Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/30">
                    <TableRow className="border-border/30 hover:bg-secondary/50">
                      <TableHead className="font-semibold">Student Name</TableHead>
                      <TableHead className="font-semibold">Enrollment</TableHead>
                      <TableHead className="text-center font-semibold">CO1</TableHead>
                      <TableHead className="text-center font-semibold">CO2</TableHead>
                      <TableHead className="text-center font-semibold">CO3</TableHead>
                      <TableHead className="text-center font-semibold">CO4</TableHead>
                      <TableHead className="text-center font-semibold">CO5</TableHead>
                      <TableHead className="text-center font-semibold">Average</TableHead>
                      <TableHead className="font-semibold">Bloom's Level</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentReportData.map((student) => (
                      <TableRow
                        key={student.id}
                        className="border-border/30 hover:bg-secondary/30 transition-colors"
                      >
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {student.enrollment}
                        </TableCell>
                        <TableCell className="text-center text-sm">{student.co1}</TableCell>
                        <TableCell className="text-center text-sm">{student.co2}</TableCell>
                        <TableCell className="text-center text-sm">{student.co3}</TableCell>
                        <TableCell className="text-center text-sm">{student.co4}</TableCell>
                        <TableCell className="text-center text-sm">{student.co5}</TableCell>
                        <TableCell className="text-center font-semibold">
                          {student.average}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getBloomColor(student.bloomLevel)}
                          >
                            {student.bloomLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusColor(student.status)}
                          >
                            {student.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Export Report</h3>
                  <p className="text-sm text-muted-foreground">
                    Download detailed OBE attainment analysis in your preferred format
                  </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="gap-2 flex-1 sm:flex-none border-border hover:bg-secondary bg-transparent"
                  >
                    <FileDown className="w-4 h-4" />
                    Export PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 flex-1 sm:flex-none border-border hover:bg-secondary bg-transparent"
                  >
                    <Download className="w-4 h-4" />
                    Export Excel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          <Card className="border-border/50 bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Key Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 font-medium text-foreground hover:text-primary transition-colors">
                  <ChevronDown className="w-4 h-4" />
                  CO Attainment Analysis
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-2 text-sm text-muted-foreground">
                  <p>
                    • CO1 (Knowledge) shows strong performance with 87.4% average attainment
                  </p>
                  <p>
                    • CO3 (Analysis) requires improvement at 75.6% - consider additional problem-solving activities
                  </p>
                  <p>
                    • CO5 (Creation) demonstrates excellent achievement at 92.6% across the batch
                  </p>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 font-medium text-foreground hover:text-primary transition-colors">
                  <ChevronDown className="w-4 h-4" />
                  Bloom's Level Distribution
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-2 text-sm text-muted-foreground">
                  <p>• 18% of students are achieving Level 6 (Create)</p>
                  <p>• 38% of students are at Level 4-5 (Analyze/Evaluate)</p>
                  <p>• 4% need additional support to reach higher cognitive levels</p>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 font-medium text-foreground hover:text-primary transition-colors">
                  <ChevronDown className="w-4 h-4" />
                  Recommendations
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-2 text-sm text-muted-foreground">
                  <p>
                    • Focus on scaffolding for CO3 to improve analytical thinking
                  </p>
                  <p>
                    • Maintain current pedagogical strategies for CO5 success
                  </p>
                  <p>
                    • Implement peer learning for students below 70% in any CO
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
