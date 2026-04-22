"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Users, TrendingUp, BookOpen, Award } from "lucide-react"
import { talentPoolAnalytics } from "@/lib/mock-data"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { CompanyTalentSkeleton } from "@/components/skeletons"

export default function TalentAnalytics() {
  const [loading, setLoading] = useState(true)
  const d = talentPoolAnalytics

  useEffect(() => { setLoading(false) }, [])

  if (loading) return <CompanyTalentSkeleton />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Student Talent Pool Analytics</h1>
        <p className="text-muted-foreground">Explore aggregated, anonymized data about the student population.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <Award className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg. Completion Rate</p>
              <p className="text-2xl font-bold text-foreground">{d.avgCompletionRate}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <BookOpen className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Categories</p>
              <p className="text-2xl font-bold text-foreground">{d.completionByCategory.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Skills with Growth</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {d.topSkills.map(s => (
              <div key={s.skill} className="flex items-center gap-4">
                <span className="w-20 text-sm font-medium text-foreground">{s.skill}</span>
                <div className="flex-1">
                  <Progress value={(s.students / d.totalStudents) * 100} className="h-2" />
                </div>
                <span className="text-sm text-muted-foreground">{s.students.toLocaleString()}</span>
                <Badge variant="secondary" className="bg-success/10 text-success text-xs gap-1">
                  <TrendingUp className="h-3 w-3" />{s.growth}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Student Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student Growth Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={d.studentGrowth}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} className="text-xs" />
                <YAxis axisLine={false} tickLine={false} className="text-xs" />
                <Tooltip
                  contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line type="monotone" dataKey="students" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Completion by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Completion Rate by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={d.completionByCategory}>
              <XAxis dataKey="category" axisLine={false} tickLine={false} className="text-xs" />
              <YAxis axisLine={false} tickLine={false} className="text-xs" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number) => [`${value}%`, "Completion Rate"]}
              />
              <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
