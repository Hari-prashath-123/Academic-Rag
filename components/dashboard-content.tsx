'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, FileText, Zap, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

const queriesData = [
  { month: 'Jan', queries: 120, documents: 89 },
  { month: 'Feb', queries: 190, documents: 142 },
  { month: 'Mar', queries: 280, documents: 198 },
  { month: 'Apr', queries: 240, documents: 176 },
  { month: 'May', queries: 320, documents: 245 },
  { month: 'Jun', queries: 380, documents: 298 },
]

const subjectData = [
  { name: 'Data Structures', value: 28, fill: 'hsl(240 100% 50%)' },
  { name: 'Algorithms', value: 22, fill: 'hsl(270 100% 50%)' },
  { name: 'Database', value: 18, fill: 'hsl(280 100% 50%)' },
  { name: 'Web Dev', value: 16, fill: 'hsl(220 100% 50%)' },
  { name: 'Others', value: 16, fill: 'hsl(250 100% 45%)' },
]

export function DashboardContent() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">
          Welcome Back, Administrator
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your academic knowledge base today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Documents */}
        <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Documents Indexed
                </p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  2,847
                </p>
                <p className="text-xs text-accent mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +12% from last month
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent/80 flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Queries */}
        <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-primary/5" />
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Queries Asked
                </p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  15,892
                </p>
                <p className="text-xs text-accent mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +24% from last month
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent to-primary/80 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Courses Covered */}
        <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Courses Covered
                </p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  24
                </p>
                <p className="text-xs text-accent mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +2 this semester
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/60 to-accent flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OBE Reports */}
        <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-primary/5" />
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  OBE Reports Generated
                </p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  312
                </p>
                <p className="text-xs text-accent mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +45 this month
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent/60 to-primary flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queries Trend */}
        <Card className="lg:col-span-2 border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Queries per Month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={queriesData}>
                <defs>
                  <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(240 100% 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(240 100% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="queries"
                  stroke="hsl(240 100% 50%)"
                  fillOpacity={1}
                  fill="url(#colorQueries)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* CO Coverage */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">CO Coverage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                />
                <Pie
                  data={subjectData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {subjectData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Documents by Subject */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Documents by Subject</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={queriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Bar dataKey="queries" fill="hsl(240 100% 50%)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="documents" fill="hsl(280 100% 50%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-4">
        <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
          Upload Document
        </Button>
        <Button variant="outline">
          View All Reports
        </Button>
        <Button variant="outline">
          Manage Users
        </Button>
      </div>
    </div>
  )
}
