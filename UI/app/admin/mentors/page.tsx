"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Users,
  Star,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Search,
  UserPlus,
  MessageSquare,
  TrendingUp,
} from "lucide-react"
import { adminMentors } from "@/lib/mock-data"
import { useState } from "react"

export default function AdminMentorsPage() {
  const [search, setSearch] = useState("")

  const filtered = adminMentors.filter((m) => {
    if (
      search &&
      !m.name.toLowerCase().includes(search.toLowerCase()) &&
      !m.company.toLowerCase().includes(search.toLowerCase())
    )
      return false
    return true
  })

  const totalSessions = adminMentors.reduce((acc, m) => acc + m.totalSessions, 0)
  const totalRevenue = adminMentors.reduce((acc, m) => acc + m.revenue, 0)
  const verifiedCount = adminMentors.filter((m) => m.verified).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mentor Management</h1>
          <p className="text-muted-foreground">Manage platform mentors and track session performance.</p>
        </div>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Mentor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Mentors</p>
              <p className="text-2xl font-bold text-foreground">{adminMentors.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Verified</p>
              <p className="text-2xl font-bold text-foreground">{verifiedCount}/{adminMentors.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <MessageSquare className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Sessions</p>
              <p className="text-2xl font-bold text-foreground">{totalSessions}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <IndianRupee className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revenue Generated</p>
              <p className="text-2xl font-bold text-foreground">₹{(totalRevenue / 1000).toFixed(0)}K</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">All Mentors</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search mentors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Mentor</TableHead>
                <TableHead>Company & Role</TableHead>
                <TableHead>Expertise</TableHead>
                <TableHead className="text-center">Sessions</TableHead>
                <TableHead className="text-center">Rating</TableHead>
                <TableHead className="text-center">Verified</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((mentor) => (
                <TableRow key={mentor.id}>
                  <TableCell className="font-medium">{mentor.name}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{mentor.company}</p>
                      <p className="text-xs text-muted-foreground">{mentor.roleTitle}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {mentor.expertise.map((e) => (
                        <Badge key={e} variant="secondary" className="text-xs">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{mentor.totalSessions}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{mentor.rating}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {mentor.verified ? (
                      <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {mentor.revenue > 0 ? `₹${(mentor.revenue / 1000).toFixed(0)}K` : "Free"}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm">View</Button>
                      {!mentor.verified && (
                        <Button variant="outline" size="sm" className="bg-transparent text-xs">
                          Verify
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
