"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Briefcase, FileText, UserCheck } from "lucide-react"
import { companyDashboard } from "@/lib/mock-data"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts"
import { CompanyDashboardSkeleton } from "@/components/skeletons"

export default function CompanyDashboard() {
  const [loading, setLoading] = useState(true)
  const d = companyDashboard

  useEffect(() => { setLoading(false) }, [])

  if (loading) return <CompanyDashboardSkeleton />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome, {d.name}</h1>
        <p className="text-muted-foreground">Your hiring and talent overview.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Students</p>
              <p className="text-2xl font-bold text-foreground">{d.totalStudents.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <Briefcase className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Jobs</p>
              <p className="text-2xl font-bold text-foreground">{d.activeJobs}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Applications</p>
              <p className="text-2xl font-bold text-foreground">{d.totalApplications}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <UserCheck className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hired This Month</p>
              <p className="text-2xl font-bold text-foreground">{d.hiredThisMonth}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Skills Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Skills in Talent Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={d.skillsBreakdown} layout="vertical">
                <XAxis type="number" axisLine={false} tickLine={false} className="text-xs" />
                <YAxis type="category" dataKey="skill" axisLine={false} tickLine={false} className="text-xs" width={80} />
                <Tooltip
                  contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {d.skillsBreakdown.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--chart-4))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Application Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Application Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={d.applicationTrend}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} className="text-xs" />
                <YAxis axisLine={false} tickLine={false} className="text-xs" />
                <Tooltip
                  contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="applications" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Hires */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Hires</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {d.recentHires.map((h) => (
            <div key={h.name} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/10 text-sm font-medium text-success">
                  {h.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{h.name}</p>
                  <p className="text-xs text-muted-foreground">{h.role}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{h.date}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
