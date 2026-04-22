"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Users, Briefcase } from "lucide-react"
import { getCompanyJobs, type JobOut } from "@/lib/api"
import { CompanyJobsSkeleton } from "@/components/skeletons"

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success",
  draft: "bg-muted text-muted-foreground",
  paused: "bg-warning/10 text-warning",
  closed: "bg-muted text-muted-foreground",
  filled: "bg-primary/10 text-primary",
}

const typeLabels: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
}

const remoteLabels: Record<string, string> = {
  remote: "Remote",
  on_site: "On-site",
  hybrid: "Hybrid",
}

export default function JobManagement() {
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<JobOut[]>([])

  useEffect(() => {
    getCompanyJobs()
      .then(setJobs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <CompanyJobsSkeleton />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Job Management</h1>
          <p className="text-muted-foreground">Create, edit, and manage your job postings.</p>
        </div>
        <Link href="/company/jobs/create">
          <Button className="gap-2 self-start">
            <Plus className="h-4 w-4" /> Post New Job
          </Button>
        </Link>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Briefcase className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">No job postings yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first job posting to start receiving applications.
              </p>
            </div>
            <Link href="/company/jobs/create">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Post Your First Job
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Applications</TableHead>
                  <TableHead className="hidden md:table-cell">Posted</TableHead>
                  <TableHead className="hidden lg:table-cell">Skills</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.job_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{job.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {job.location || "—"} · {typeLabels[job.employment_type] || job.employment_type} · {remoteLabels[job.remote_type] || job.remote_type}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[job.status] || ""}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" />{job.applications_count}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {job.posted_at
                        ? new Date(job.posted_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {job.skills.slice(0, 3).map((s) => (
                          <Badge key={s.name} variant="outline" className="text-xs">
                            {s.name}
                          </Badge>
                        ))}
                        {job.skills.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{job.skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline">Edit</Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                        >
                          {job.status === "active" ? "Pause" : "Close"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
