'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, Bell, Lock, Database } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <Header />
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">Settings</h1>
              <p className="text-muted-foreground">Manage your account and platform preferences.</p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="general" className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-4 bg-secondary">
                <TabsTrigger value="general" className="gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">General</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="gap-2">
                  <Bell className="w-4 h-4" />
                  <span className="hidden sm:inline">Notifications</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-2">
                  <Lock className="w-4 h-4" />
                  <span className="hidden sm:inline">Security</span>
                </TabsTrigger>
                <TabsTrigger value="system" className="gap-2">
                  <Database className="w-4 h-4" />
                  <span className="hidden sm:inline">System</span>
                </TabsTrigger>
              </TabsList>

              {/* General Settings */}
              <TabsContent value="general" className="space-y-6">
                <Card className="border-border/50 bg-card/50 backdrop-blur">
                  <CardHeader className="bg-secondary/50 border-b border-border">
                    <CardTitle>General Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="institution">Institution Name</Label>
                      <Input
                        id="institution"
                        defaultValue="ABC College of Engineering"
                        className="bg-background border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="semester">Current Semester</Label>
                      <Input
                        id="semester"
                        defaultValue="5"
                        className="bg-background border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="academic">Academic Year</Label>
                      <Input
                        id="academic"
                        defaultValue="2024-2025"
                        className="bg-background border-border"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Enable AI Recommendations</Label>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Auto-index New Documents</Label>
                      <Switch defaultChecked />
                    </div>

                    <Button className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                      Save Changes
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notification Settings */}
              <TabsContent value="notifications" className="space-y-6">
                <Card className="border-border/50 bg-card/50 backdrop-blur">
                  <CardHeader className="bg-secondary/50 border-b border-border">
                    <CardTitle>Notification Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      {[
                        { label: 'Document Processing Complete', description: 'Notify when documents are indexed' },
                        { label: 'Assessment Reminders', description: 'Get alerts for upcoming assessments' },
                        { label: 'Performance Alerts', description: 'Notify on low student performance' },
                        { label: 'Report Generation', description: 'Notify when OBE reports are ready' },
                      ].map((notif, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{notif.label}</p>
                            <p className="text-sm text-muted-foreground">{notif.description}</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      ))}
                    </div>

                    <Button className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                      Save Preferences
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Settings */}
              <TabsContent value="security" className="space-y-6">
                <Card className="border-border/50 bg-card/50 backdrop-blur">
                  <CardHeader className="bg-secondary/50 border-b border-border">
                    <CardTitle>Security Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="password">Change Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Current password"
                        className="bg-background border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="New password"
                        className="bg-background border-border"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Two-Factor Authentication</Label>
                      <Switch />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Login Alerts</Label>
                      <Switch defaultChecked />
                    </div>

                    <Button className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                      Update Security
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* System Settings */}
              <TabsContent value="system" className="space-y-6">
                <Card className="border-border/50 bg-card/50 backdrop-blur">
                  <CardHeader className="bg-secondary/50 border-b border-border">
                    <CardTitle>System Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-foreground mb-2">Database Maintenance</h4>
                        <Button variant="outline" className="border-border hover:bg-secondary bg-transparent">
                          Optimize Database
                        </Button>
                      </div>

                      <div>
                        <h4 className="font-medium text-foreground mb-2">Data Export</h4>
                        <Button variant="outline" className="border-border hover:bg-secondary bg-transparent">
                          Export All Data
                        </Button>
                      </div>

                      <div>
                        <h4 className="font-medium text-foreground mb-2">Backup Status</h4>
                        <p className="text-sm text-muted-foreground">Last backup: 2 hours ago</p>
                      </div>

                      <div>
                        <h4 className="font-medium text-foreground mb-2">System Version</h4>
                        <p className="text-sm text-muted-foreground">v1.0.0</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}
