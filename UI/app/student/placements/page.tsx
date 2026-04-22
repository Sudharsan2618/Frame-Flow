"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  CheckCircle2,
  Shield,
  Star,
  ArrowRight,
  Clock,
  FileText,
  Users,
  Briefcase,
  Calendar,
  TrendingUp,
} from "lucide-react"
import { placementPackages, studentPlacementStatus } from "@/lib/mock-data"
import { PlacementsSkeleton } from "@/components/skeletons"

export default function PlacementPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(t)
  }, [])

  if (loading) return <PlacementsSkeleton />

  const status = studentPlacementStatus

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Placement Support</h1>
        <p className="text-muted-foreground">
          Get dedicated career support with our placement packages and accelerate your job search.
        </p>
      </div>

      {/* Current Package Status */}
      {status.currentPackage && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Your Active Package: {status.currentPackage}</CardTitle>
              <Badge className="bg-success/10 text-success">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Enrolled: {status.enrolledDate}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Expires: {status.expiresDate}
              </span>
            </div>

            {/* Progress Items */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Resume Review</span>
                  {status.resumeReviewed ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <Progress value={status.resumeReviewed ? 100 : 0} className="h-2" />
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Mock Interviews</span>
                  <span className="text-xs text-muted-foreground">
                    {status.mockInterviewsDone}/{status.mockInterviewsTotal}
                  </span>
                </div>
                <Progress
                  value={(status.mockInterviewsDone / status.mockInterviewsTotal) * 100}
                  className="h-2"
                />
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Mentor Sessions</span>
                  <span className="text-xs text-muted-foreground">
                    {status.mentorSessionsDone}/{status.mentorSessionsTotal}
                  </span>
                </div>
                <Progress
                  value={(status.mentorSessionsDone / status.mentorSessionsTotal) * 100}
                  className="h-2"
                />
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">LinkedIn Review</span>
                  {status.linkedinReviewed ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <Progress value={status.linkedinReviewed ? 100 : 0} className="h-2" />
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Applications Sent</span>
                  <span className="text-xs font-semibold text-foreground">{status.applicationsSent}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span>{status.interviewsScheduled} interviews scheduled</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Placement Packages */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Available Packages</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {placementPackages.map((pkg) => (
            <Card
              key={pkg.id}
              className={`relative overflow-hidden transition-shadow hover:shadow-lg ${
                pkg.popular ? "border-primary shadow-md" : ""
              }`}
            >
              {pkg.popular && (
                <div className="absolute top-0 right-0 rounded-bl-lg bg-primary px-3 py-1">
                  <span className="text-xs font-semibold text-primary-foreground">Most Popular</span>
                </div>
              )}
              <CardContent className="flex flex-col gap-5 p-6">
                {/* Package Name */}
                <div>
                  <h3 className="text-xl font-bold text-foreground">{pkg.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{pkg.description}</p>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">
                    ₹{pkg.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {pkg.validityDays} days
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {pkg.enrolledStudents} enrolled
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-success" />
                    {pkg.successRate}% success
                  </span>
                </div>

                {/* Features */}
                <ul className="flex flex-col gap-2">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Guarantee Badge */}
                {pkg.jobGuarantee && (
                  <div className="flex items-center gap-2 rounded-lg bg-success/10 p-2.5">
                    <Shield className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-success">Job Guarantee Included</span>
                  </div>
                )}

                {/* CTA */}
                <Button
                  className={`w-full gap-2 ${pkg.popular ? "" : "bg-transparent"}`}
                  variant={pkg.popular ? "default" : "outline"}
                >
                  {status.currentPackage === pkg.name ? "Current Plan" : "Get Started"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
