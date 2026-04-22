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
import {
  Users,
  TrendingUp,
  UserCheck,
  Gift,
  ArrowUpRight,
} from "lucide-react"
import { adminReferralStats, adminPlacementStats, referralContacts } from "@/lib/mock-data"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  contacted: "bg-accent/10 text-accent",
  interested: "bg-primary/10 text-primary",
  converted: "bg-success/10 text-success",
  not_interested: "bg-destructive/10 text-destructive",
}

export default function AdminReferralsPage() {
  const rs = adminReferralStats
  const ps = adminPlacementStats

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Referrals & Placements</h1>
        <p className="text-muted-foreground">Track referral performance and placement package analytics.</p>
      </div>

      {/* Referral Stats */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Referral Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold text-foreground">{rs.totalReferrals}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <UserCheck className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Converted This Month</p>
                <p className="text-2xl font-bold text-foreground">{rs.convertedThisMonth}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold text-foreground">{rs.conversionRate}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Gift className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Placements</p>
                <p className="text-2xl font-bold text-foreground">{ps.totalPlacements}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Referral Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Referral Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rs.referralTrend}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} className="text-xs" />
                <YAxis axisLine={false} tickLine={false} className="text-xs" />
                <Tooltip
                  contentStyle={{
                    borderRadius: "0.5rem",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend />
                <Bar dataKey="referrals" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Referrals" />
                <Bar dataKey="conversions" fill="hsl(var(--chart-2, 142 71% 45%))" radius={[4, 4, 0, 0]} name="Conversions" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Referrers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Referrers</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-center">Referrals</TableHead>
                  <TableHead className="text-center">Conversions</TableHead>
                  <TableHead className="text-center">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rs.topReferrers.map((ref, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {idx + 1}
                        </div>
                        {ref.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{ref.referrals}</TableCell>
                    <TableCell className="text-center">{ref.conversions}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {((ref.conversions / ref.referrals) * 100).toFixed(0)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Placement Package Stats */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Placement Package Performance</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div>
                <p className="text-sm text-muted-foreground">Total Enrollments</p>
                <p className="text-2xl font-bold text-foreground">{ps.totalEnrollments}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div>
                <p className="text-sm text-muted-foreground">Active Students</p>
                <p className="text-2xl font-bold text-foreground">{ps.activeStudents}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-foreground">{ps.successRate}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">₹{(ps.totalRevenue / 100000).toFixed(1)}L</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead className="text-center">Enrolled</TableHead>
                  <TableHead className="text-center">Placed</TableHead>
                  <TableHead className="text-center">Success Rate</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ps.packageBreakdown.map((pkg) => (
                  <TableRow key={pkg.package}>
                    <TableCell className="font-medium">{pkg.package} Placement</TableCell>
                    <TableCell className="text-center">{pkg.enrolled}</TableCell>
                    <TableCell className="text-center">{pkg.placed}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {((pkg.placed / pkg.enrolled) * 100).toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">₹{(pkg.revenue / 100000).toFixed(1)}L</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Recent Referrals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Referrals</CardTitle>
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            View All <ArrowUpRight className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Referred By</TableHead>
                <TableHead>Referred Person</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referralContacts.map((ref) => (
                <TableRow key={ref.id}>
                  <TableCell className="font-medium">{ref.referrerName}</TableCell>
                  <TableCell>
                    <div>
                      <p>{ref.referredName}</p>
                      <p className="text-xs text-muted-foreground">{ref.relationship}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground">
                      <p>{ref.referredEmail}</p>
                      <p>{ref.referredPhone}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={statusColors[ref.status]}>
                      {ref.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{ref.referredAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
