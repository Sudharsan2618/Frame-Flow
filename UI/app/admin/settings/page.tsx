"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ShieldCheck, Plus, Settings, Bell, Database, Lock } from "lucide-react"

const adminRoles = [
  { id: 1, name: "Sarah Admin", email: "sarah.admin@skillbridge.io", role: "Super Admin", lastLogin: "2026-02-07", status: "Active" },
  { id: 2, name: "John Manager", email: "john.mgr@skillbridge.io", role: "Course Manager", lastLogin: "2026-02-06", status: "Active" },
  { id: 3, name: "Lisa Reviewer", email: "lisa.rev@skillbridge.io", role: "Job Reviewer", lastLogin: "2026-02-05", status: "Active" },
  { id: 4, name: "Tom Support", email: "tom.sup@skillbridge.io", role: "Support", lastLogin: "2026-01-30", status: "Inactive" },
]

const rolePermissions: Record<string, string[]> = {
  "Super Admin": ["Full Access"],
  "Course Manager": ["Manage Courses", "Manage Materials", "Schedule Webinars"],
  "Job Reviewer": ["Review Applications", "Forward Candidates", "View Analytics"],
  Support: ["View Users", "View Courses", "Basic Support"],
}

const roleColors: Record<string, string> = {
  "Super Admin": "bg-foreground/10 text-foreground",
  "Course Manager": "bg-primary/10 text-primary",
  "Job Reviewer": "bg-accent/10 text-accent-foreground",
  Support: "bg-muted text-muted-foreground",
}

export default function SystemControls() {
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [autoMatch, setAutoMatch] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System & Access Controls</h1>
        <p className="text-muted-foreground">Manage admin roles, permissions, and platform settings.</p>
      </div>

      {/* Admin Roles Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base">Admin Users</CardTitle>
            <CardDescription>Manage administrative access and roles.</CardDescription>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Admin</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Admin User</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 pt-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Full Name</Label>
                  <Input placeholder="Enter name" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Email</Label>
                  <Input type="email" placeholder="Enter email" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Role</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super-admin">Super Admin</SelectItem>
                      <SelectItem value="course-manager">Course Manager</SelectItem>
                      <SelectItem value="job-reviewer">Job Reviewer</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button onClick={() => setAddOpen(false)}>Add Admin</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Permissions</TableHead>
                <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminRoles.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {admin.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{admin.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleColors[admin.role] || ""}>{admin.role}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(rolePermissions[admin.role] || []).map((p) => (
                        <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{admin.lastLogin}</TableCell>
                  <TableCell>
                    <Badge className={admin.status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>
                      {admin.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline">Edit</Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">Revoke</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Platform Settings */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Send email alerts for new applications and system events.</p>
              </div>
              <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Auto-Match Suggestions</p>
                <p className="text-xs text-muted-foreground">Automatically suggest job matches for new applications.</p>
              </div>
              <Switch checked={autoMatch} onCheckedChange={setAutoMatch} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Platform Controls</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Maintenance Mode</p>
                <p className="text-xs text-muted-foreground">Temporarily disable public access for updates.</p>
              </div>
              <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
            </div>
            <Separator />
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Default User Role</Label>
              <Select defaultValue="student">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Security</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Session Timeout (minutes)</Label>
              <Input type="number" defaultValue="30" className="max-w-32" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Max Login Attempts</Label>
              <Input type="number" defaultValue="5" className="max-w-32" />
            </div>
            <Button variant="outline" className="self-start bg-transparent">Update Security Settings</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Data Management</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Database Status</span>
                <Badge className="bg-success/10 text-success">Healthy</Badge>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Last Backup</span>
                <span className="text-foreground">2026-02-07 03:00 AM</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Storage Used</span>
                <span className="text-foreground">4.2 GB / 50 GB</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Export Data</Button>
              <Button variant="outline" size="sm">Run Backup</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
