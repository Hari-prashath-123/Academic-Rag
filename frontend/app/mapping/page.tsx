'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Grid3x3 } from 'lucide-react'

const mappingData = [
  { id: 1, subject: 'Data Structures', co: 'CO1', bloom: 'Level 3', unit: 'Unit 1-2', questions: 8 },
  { id: 2, subject: 'Data Structures', co: 'CO2', bloom: 'Level 4', unit: 'Unit 2-3', questions: 6 },
  { id: 3, subject: 'Data Structures', co: 'CO3', bloom: 'Level 5', unit: 'Unit 3-4', questions: 7 },
  { id: 4, subject: 'Algorithms', co: 'CO1', bloom: 'Level 2', unit: 'Unit 1', questions: 5 },
  { id: 5, subject: 'Algorithms', co: 'CO2', bloom: 'Level 4', unit: 'Unit 2-3', questions: 9 },
  { id: 6, subject: 'Database', co: 'CO1', bloom: 'Level 3', unit: 'Unit 1-2', questions: 7 },
]

export default function MappingPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <Header />
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-foreground">CO & Bloom's Mapping</h1>
              <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                <Plus className="w-4 h-4" />
                Create Mapping
              </Button>
            </div>
            <p className="text-muted-foreground">Map course outcomes to Bloom's taxonomy levels and assessment questions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['Level 1', 'Level 2', 'Level 3', 'Level 4'].map((level, idx) => (
              <Card key={idx} className="border-border/50 bg-card/50 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{level}</p>
                      <p className="text-2xl font-bold text-foreground mt-2">{(idx + 1) * 5}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Grid3x3 className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
            <CardHeader className="bg-secondary/50 border-b border-border">
              <CardTitle>CO-Bloom's Mapping Matrix</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30 border-border/30">
                      <TableHead className="font-semibold">Subject</TableHead>
                      <TableHead className="font-semibold">Course Outcome</TableHead>
                      <TableHead className="font-semibold">Bloom's Level</TableHead>
                      <TableHead className="font-semibold">Units Covered</TableHead>
                      <TableHead className="font-semibold">Questions</TableHead>
                      <TableHead className="text-right font-semibold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappingData.map((mapping) => (
                      <TableRow key={mapping.id} className="border-border/30 hover:bg-secondary/30">
                        <TableCell className="font-medium">{mapping.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-primary/10 text-primary dark:text-primary/80">
                            {mapping.co}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-accent/10 text-accent dark:text-accent/80">
                            {mapping.bloom}
                          </Badge>
                        </TableCell>
                        <TableCell>{mapping.unit}</TableCell>
                        <TableCell>{mapping.questions}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost">
                            Edit
                          </Button>
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
