"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BookOpen, Clock, Trophy, Flame, Briefcase, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { DashboardSkeleton } from "@/components/skeletons"
import { getStudentDashboard, type StudentDashboardData } from "@/lib/api"

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<StudentDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getStudentDashboard()
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardSkeleton />

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Unable to load dashboard data.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  const { stats, enrolled_courses, recent_activity, learning_hours_by_month } = data

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {data.first_name}</h1>
        <p className="text-muted-foreground">Here is your learning overview.</p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Enrolled Courses</p>
              <p className="text-2xl font-bold text-foreground">{stats.enrolled_courses}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <Trophy className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-foreground">{stats.completed_courses}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <Clock className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Hours</p>
              <p className="text-2xl font-bold text-foreground">{Math.round(stats.total_learning_hours)}h</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <Flame className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Day Streak</p>
              <p className="text-2xl font-bold text-foreground">{stats.streak_days}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enrolled Courses + Learning Hours */}
      {/* <div className="grid gap-4 sm:gap-6 lg:grid-cols-3"> */}
        {/* <Card className="lg:col-span-2">
          <div className="flex items-center justify-between p-3 pb-2 sm:p-6 sm:pb-4">
            <h3 className="text-base font-semibold leading-none tracking-tight">My Courses</h3>
            <Link href="/student/courses" className="shrink-0 whitespace-nowrap text-xs text-primary hover:underline">Browse all</Link>
          </div>
          <div className="flex flex-col gap-2 px-3 pb-3 sm:gap-3 sm:px-6 sm:pb-6">
            {enrolled_courses.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">You haven&apos;t enrolled in any courses yet.</p>
                <Button asChild size="sm">
                  <Link href="/student/courses">Explore Courses</Link>
                </Button>
              </div>
            ) : (
              enrolled_courses.slice(0, 4).map((c) => (
                <Link
                  key={c.course_id}
                  href={`/student/courses/${c.slug}`}
                  className="flex items-center gap-3 rounded-lg border border-border p-2.5 sm:p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="truncate text-sm font-medium text-foreground">{c.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={c.progress_percentage} className="h-1.5 flex-1 min-w-0" />
                      <span className="text-xs text-muted-foreground shrink-0">{Math.round(c.progress_percentage)}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.completed_lessons}/{c.total_lessons} lessons
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card> */}

        {/* Learning Hours Chart */}
        {/* <Card>
          <div className="p-3 sm:p-6 sm:pb-4">
            <h3 className="text-base font-semibold leading-none tracking-tight">Learning Hours</h3>
          </div>
          <div className="px-3 pb-3 sm:px-6 sm:pb-6">
            {learning_hours_by_month.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={learning_hours_by_month}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={12} />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} width={30} />
                  <Tooltip
                    contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                Start learning to see your progress chart!
              </p>
            )}
          </div>
        </Card> */}
      {/* </div> */}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recent_activity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent activity yet. Start a course!</p>
            ) : (
              recent_activity.slice(0, 6).map((a, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.description}</p>
                    {a.course_name && <p className="text-xs text-muted-foreground">{a.course_name}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(a.timestamp)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button variant="outline" asChild className="justify-between bg-transparent">
              <Link href="/student/courses">
                <span className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Browse Courses</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-between bg-transparent">
              <Link href="/student/jobs">
                <span className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Browse Jobs</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-between bg-transparent">
              <Link href="/student/materials">
                <span className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Materials Library</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-between bg-transparent">
              <Link href="/student/profile">
                <span className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> My Profile</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

