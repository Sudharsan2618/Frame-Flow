"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Building2, BookOpen, Briefcase, Clock, CheckCircle2, ArrowRight, GraduationCap } from "lucide-react"
import { getAdminDashboard, getAdminDashboardCharts, type AdminDashboardData, type DashboardChartData } from "@/lib/api"
import { DashboardSkeleton } from "@/components/skeletons"
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"

const STATUS_LABELS: Record<string, string> = {
  pending_admin_review: "Pending",
  admin_shortlisted: "Shortlisted",
  forwarded_to_company: "Forwarded",
  under_company_review: "Company Review",
  interview_scheduled: "Interview",
  hired: "Hired",
  rejected_by_admin: "Rejected (Admin)",
  rejected_by_company: "Rejected (Co.)",
  withdrawn: "Withdrawn",
}

const PIE_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#06b6d4", "#ef4444", "#ec4899", "#6366f1", "#84cc16"]

export default function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [charts, setCharts] = useState<DashboardChartData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getAdminDashboard(),
      getAdminDashboardCharts(),
    ])
      .then(([d, c]) => { setData(d); setCharts(c) })
      .catch((err) => console.error("Dashboard load failed:", err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardSkeleton />

  const d = data

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and key performance indicators.</p>
      </div>

      {/* Top metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardContent className="flex flex-col p-5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Students</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{d?.total_students ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col p-5">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground">Companies</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{d?.total_companies ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col p-5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Active Courses</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{d?.active_courses ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col p-5">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground">Active Jobs</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{d?.active_jobs ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col p-5">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Enrollments</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{d?.total_enrollments ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Application pipeline */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Pending Review</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{d?.pending_review ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Applications awaiting admin action</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRight className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Forwarded</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{d?.forwarded ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Sent to companies</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-400">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Hired</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{d?.hired ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Successful placements</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-violet-400">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-4 w-4 text-violet-500" />
              <span className="text-sm text-muted-foreground">Total Applications</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{d?.total_applications ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: User Growth + Application Trend */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">User Growth</CardTitle>
            <p className="text-xs text-muted-foreground">New registrations per month (last 6 months)</p>
          </CardHeader>
          <CardContent>
            {charts?.user_growth && charts.user_growth.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={charts.user_growth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} className="text-xs" />
                  <YAxis axisLine={false} tickLine={false} className="text-xs" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line type="monotone" dataKey="students" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: "#3b82f6" }} name="Students" />
                  <Line type="monotone" dataKey="companies" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4, fill: "#8b5cf6" }} name="Companies" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
                No user registration data available yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Application Trend</CardTitle>
            <p className="text-xs text-muted-foreground">Applications, forwarded, and hired per month</p>
          </CardHeader>
          <CardContent>
            {charts?.application_trend && charts.application_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={charts.application_trend}>
                  <defs>
                    <linearGradient id="gradApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradFwd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradHired" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} className="text-xs" />
                  <YAxis axisLine={false} tickLine={false} className="text-xs" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Area type="monotone" dataKey="applications" stroke="#3b82f6" fill="url(#gradApps)" strokeWidth={2} name="Applied" />
                  <Area type="monotone" dataKey="forwarded" stroke="#f59e0b" fill="url(#gradFwd)" strokeWidth={2} name="Forwarded" />
                  <Area type="monotone" dataKey="hired" stroke="#10b981" fill="url(#gradHired)" strokeWidth={2} name="Hired" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
                No application data available yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Status Distribution + Top Jobs */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Application Status</CardTitle>
            <p className="text-xs text-muted-foreground">Distribution across all statuses</p>
          </CardHeader>
          <CardContent>
            {charts?.status_distribution && charts.status_distribution.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={charts.status_distribution.map((s) => ({
                        name: STATUS_LABELS[s.status] || s.status,
                        value: s.count,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {charts.status_distribution.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }}
                      formatter={(value: number, name: string) => [value, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
                  {charts.status_distribution.map((s, i) => (
                    <div key={s.status} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground">{STATUS_LABELS[s.status] || s.status}</span>
                      <span className="font-medium">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                No applications yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Top Jobs by Applications</CardTitle>
            <p className="text-xs text-muted-foreground">Most applied active positions</p>
          </CardHeader>
          <CardContent>
            {charts?.top_jobs && charts.top_jobs.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={charts.top_jobs} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} className="text-xs" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="title"
                    axisLine={false}
                    tickLine={false}
                    className="text-xs"
                    width={120}
                    tick={({ x, y, payload }: any) => (
                      <text x={x} y={y} dy={4} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize={11}>
                        {payload.value.length > 18 ? payload.value.slice(0, 18) + "…" : payload.value}
                      </text>
                    )}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Total" barSize={16} />
                  <Bar dataKey="pending" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Pending" barSize={16} />
                  <Bar dataKey="forwarded" fill="#10b981" radius={[0, 4, 4, 0]} name="Forwarded" barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
                No active jobs yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3: Jobs Posted + Enrollments */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Jobs Posted</CardTitle>
            <p className="text-xs text-muted-foreground">New job listings per month</p>
          </CardHeader>
          <CardContent>
            {charts?.jobs_trend && charts.jobs_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={charts.jobs_trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} className="text-xs" />
                  <YAxis axisLine={false} tickLine={false} className="text-xs" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                  />
                  <Bar dataKey="jobs_posted" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Jobs Posted" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">
                No job posting data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Course Enrollments</CardTitle>
            <p className="text-xs text-muted-foreground">Enrollments per month</p>
          </CardHeader>
          <CardContent>
            {charts?.enrollment_trend && charts.enrollment_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={charts.enrollment_trend}>
                  <defs>
                    <linearGradient id="gradEnroll" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} className="text-xs" />
                  <YAxis axisLine={false} tickLine={false} className="text-xs" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="enrollments" stroke="#06b6d4" fill="url(#gradEnroll)" strokeWidth={2.5} name="Enrollments" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">
                No enrollment data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New users card */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">New Users (Last 30 Days)</p>
            <p className="text-3xl font-bold text-foreground mt-1">{d?.new_users_30d ?? 0}</p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Users className="h-7 w-7 text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
