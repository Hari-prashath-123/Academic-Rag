'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Users, Mail, Trash2 } from 'lucide-react'

const userData = [
  { id: 1, name: 'Dr. Raj Kumar', email: 'raj.kumar@college.edu', role: 'Faculty', subject: 'Data Structures', status: 'Active' },
  { id: 2, name: 'Prof. Neha Sharma', email: 'neha.sharma@college.edu', role: 'Faculty', subject: 'Algorithms', status: 'Active' },
  { id: 3, name: 'Ms. Priya Patel', email: 'priya.patel@college.edu', role: 'Admin', subject: '-', status: 'Active' },
  { id: 4, name: 'Arun Kumar', email: 'arun.kumar@student.college.edu', role: 'Student', subject: 'CS Branch', status: 'Active' },
  { id: 5, name: 'Mohit Singh', email: 'mohit.singh@student.college.edu', role: 'Student', subject: 'CS Branch', status: 'Active' },
  { id: 6, name: 'Rajesh Verma', email: 'rajesh.verma@student.college.edu', role: 'Student', subject: 'CS Branch', status: 'Inactive' },
]

export default function UsersPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <Header />
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-foreground">User Management</h1>
              <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                <Plus className="w-4 h-4" />
                Add User
              </Button>
            </div>
            <p className="text-muted-foreground">Manage faculty and student accounts with role-based access control.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Users, label: 'Total Users', count: 6, color: 'primary' },
              { icon: Users, label: 'Faculty', count: 3, color: 'accent' },
              { icon: Users, label: 'Students', count: 3, color: 'primary' },
            ].map((stat, idx) => {
              const Icon = stat.icon
              return (
                <Card key={idx} className="border-border/50 bg-card/50 backdrop-blur">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                        <p className="text-3xl font-bold text-foreground mt-2">{stat.count}</p>
                      </div>
                      <div
                        className={`w-10 h-10 rounded-lg ${
                          stat.color === 'primary' ? 'bg-primary/10' : 'bg-accent/10'
                        } flex items-center justify-center`}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            stat.color === 'primary' ? 'text-primary' : 'text-accent'
                          }`}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
            <CardHeader className="bg-secondary/50 border-b border-border">
              <CardTitle>Users Directory</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30 border-border/30">
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Role</TableHead>
                      <TableHead className="font-semibold">Subject / Branch</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userData.map((user) => (
                      <TableRow key={user.id} className="border-border/30 hover:bg-secondary/30">
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            {user.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              user.role === 'Admin'
                                ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                                : user.role === 'Faculty'
                                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                                  : 'bg-green-500/10 text-green-700 dark:text-green-400'
                            }
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.subject}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              user.status === 'Active'
                                ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                                : 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
                            }
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="ghost">
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
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
