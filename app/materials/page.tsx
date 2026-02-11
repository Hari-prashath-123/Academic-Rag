'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, FileText, Video, Plus } from 'lucide-react'

const materialSuggestions = [
  { id: 1, title: 'Advanced Tree Algorithms', subject: 'Data Structures', type: 'Article', difficulty: 'Hard', co: 'CO3', recommended: true },
  { id: 2, title: 'Graph Traversal Video Lecture', subject: 'Algorithms', type: 'Video', difficulty: 'Medium', co: 'CO2', recommended: true },
  { id: 3, title: 'Database Normalization Guide', subject: 'Database', type: 'Article', difficulty: 'Medium', co: 'CO1', recommended: false },
  { id: 4, title: 'React Hooks Deep Dive', subject: 'Web Development', type: 'Video', difficulty: 'Hard', co: 'CO4', recommended: true },
  { id: 5, title: 'Sorting Algorithms Comparison', subject: 'Algorithms', type: 'Article', difficulty: 'Easy', co: 'CO1', recommended: false },
  { id: 6, title: 'API Design Best Practices', subject: 'Web Development', type: 'Article', difficulty: 'Medium', co: 'CO2', recommended: true },
]

export default function MaterialsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <Header />
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-foreground">Study Material Suggestions</h1>
              <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                <Plus className="w-4 h-4" />
                Add Material
              </Button>
            </div>
            <p className="text-muted-foreground">AI-powered suggestions for supplementary study materials aligned with course outcomes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: FileText, label: 'Articles', count: 32 },
              { icon: Video, label: 'Videos', count: 18 },
              { icon: BookOpen, label: 'Resources', count: 24 },
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
            {materialSuggestions.map((material) => (
              <Card
                key={material.id}
                className="border-border/50 bg-card/50 backdrop-blur hover:border-primary/50 transition-colors"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {material.type === 'Video' ? (
                        <Video className="w-6 h-6 text-primary" />
                      ) : (
                        <FileText className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-foreground leading-tight">{material.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{material.subject}</p>
                        </div>
                        {material.recommended && (
                          <Badge variant="outline" className="bg-accent/10 text-accent dark:text-accent/80 flex-shrink-0">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Badge variant="outline">{material.type}</Badge>
                        <Badge
                          variant="outline"
                          className={
                            material.difficulty === 'Easy'
                              ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                              : material.difficulty === 'Medium'
                                ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                                : 'bg-red-500/10 text-red-700 dark:text-red-400'
                          }
                        >
                          {material.difficulty}
                        </Badge>
                        <Badge variant="outline" className="bg-primary/10 text-primary dark:text-primary/80">
                          {material.co}
                        </Badge>
                      </div>
                      <div className="mt-4">
                        <Button size="sm" className="w-full">
                          View Material
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
