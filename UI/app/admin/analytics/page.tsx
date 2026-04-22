"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { adminAnalytics, adminDashboard } from "@/lib/mock-data"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from "recharts"
import { BookOpen, Briefcase, TrendingUp, Target } from "lucide-react"

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

const tooltipStyle = {
  borderRadius: "0.5rem",
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
}

export default function AnalyticsCenter() {
  const analytics = adminAnalytics
  const dashboard = adminDashboard

  const avgCompletion = Math.round(
    analytics.courseEffectiveness.reduce((acc, c) => acc + c.completionRate, 0) /
      analytics.courseEffectiveness.length
  )
  const avgSatisfaction = (
    analytics.courseEffectiveness.reduce((acc, c) => acc + c.satisfaction, 0) /
    analytics.courseEffectiveness.length
  ).toFixed(1)
  const totalHires = analytics.jobSuccessRates.reduce((acc, m) => acc + m.hires, 0)
  const totalForwards = analytics.jobSuccessRates.reduce((acc, m) => acc + m.forwards, 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics Center</h1>
        <p className="text-muted-foreground">Detailed reports on course effectiveness, engagement, job success, and revenue.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{avgCompletion}%</p>
              <p className="text-xs text-muted-foreground">Avg Completion Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <Target className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{avgSatisfaction}</p>
              <p className="text-xs text-muted-foreground">Avg Satisfaction</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <Briefcase className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalHires}</p>
              <p className="text-xs text-muted-foreground">Total Hires (6mo)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalForwards}</p>
              <p className="text-xs text-muted-foreground">Candidates Forwarded</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses">Course Effectiveness</TabsTrigger>
          <TabsTrigger value="jobs">Job Success</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        {/* Course Effectiveness */}
        <TabsContent value="courses" className="mt-4 flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Completion Rate by Course</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={analytics.courseEffectiveness} layout="vertical">
                    <XAxis type="number" axisLine={false} tickLine={false} className="text-xs" tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="course" axisLine={false} tickLine={false} className="text-xs" width={120} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}%`, "Completion"]} />
                    <Bar dataKey="completionRate" radius={[0, 4, 4, 0]}>
                      {analytics.courseEffectiveness.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Course Details</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[500px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Completion</TableHead>
                      <TableHead>Avg Score</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.courseEffectiveness.map((c) => (
                      <TableRow key={c.course}>
                        <TableCell className="text-sm font-medium text-foreground">{c.course}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${c.completionRate}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{c.completionRate}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.avgScore}%</TableCell>
                        <TableCell>
                          <Badge className="bg-accent/10 text-accent-foreground">{c.satisfaction}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Job Success */}
        <TabsContent value="jobs" className="mt-4 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Application Funnel Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={analytics.jobSuccessRates}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} className="text-xs" />
                  <YAxis axisLine={false} tickLine={false} className="text-xs" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="applications" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={{ r: 3 }} name="Applications" />
                  <Line type="monotone" dataKey="forwards" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Forwarded" />
                  <Line type="monotone" dataKey="hires" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} name="Hires" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            {analytics.jobSuccessRates.slice(-3).map((m) => {
              const conversionRate = ((m.hires / m.applications) * 100).toFixed(1)
              return (
                <Card key={m.month}>
                  <CardContent className="p-5">
                    <p className="text-sm font-semibold text-foreground">{m.month} 2026</p>
                    <div className="mt-3 flex flex-col gap-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Applications</span>
                        <span className="font-medium text-foreground">{m.applications}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Forwarded</span>
                        <span className="font-medium text-foreground">{m.forwards}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Hires</span>
                        <span className="font-medium text-success">{m.hires}</span>
                      </div>
                      <div className="mt-1 flex justify-between border-t border-border pt-2 text-sm">
                        <span className="text-muted-foreground">Conversion Rate</span>
                        <Badge className="bg-primary/10 text-primary">{conversionRate}%</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Revenue */}
        <TabsContent value="revenue" className="mt-4 flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dashboard.revenueTrend}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} className="text-xs" />
                    <YAxis axisLine={false} tickLine={false} className="text-xs" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />
                    <Bar dataKey="revenue" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue Summary</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">Total Revenue (All Time)</p>
                  <p className="mt-1 text-3xl font-bold text-foreground">${dashboard.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">Current Month</p>
                  <p className="mt-1 text-3xl font-bold text-foreground">${dashboard.monthlyRevenue.toLocaleString()}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-success">
                    <TrendingUp className="h-3 w-3" />+15.1% from last month
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">Avg Revenue Per Month</p>
                  <p className="mt-1 text-3xl font-bold text-foreground">
                    ${Math.round(dashboard.revenueTrend.reduce((a, b) => a + b.revenue, 0) / dashboard.revenueTrend.length).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
