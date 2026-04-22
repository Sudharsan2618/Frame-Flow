"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Search, ArrowLeft, ArrowRight, CheckCircle2, Clock, Briefcase,
  MapPin, Building2, Users, Loader2, Send, GitMerge, ExternalLink,
  Target, Award, TrendingUp, Heart, CheckCircle, XCircle,
} from "lucide-react"
import {
  getAdminJobs, getJobApplicants, bulkApproveApplications, updateApplicationStatus,
  type AdminJob, type JobApplicant, type MatchBreakdown,
} from "@/lib/api"
import { DashboardSkeleton } from "@/components/skeletons"
import { TablePagination } from "@/components/table-pagination"

const appStatusLabels: Record<string, string> = {
  pending_admin_review: "Pending Review",
  admin_shortlisted: "Shortlisted",
  rejected_by_admin: "Rejected",
  forwarded_to_company: "Forwarded",
  under_company_review: "Company Review",
  interview_scheduled: "Interview",
  hired: "Hired",
  withdrawn: "Withdrawn",
}

const appStatusColors: Record<string, string> = {
  pending_admin_review: "bg-amber-100 text-amber-800",
  admin_shortlisted: "bg-blue-100 text-blue-800",
  rejected_by_admin: "bg-destructive/10 text-destructive",
  forwarded_to_company: "bg-success/10 text-success",
  under_company_review: "bg-primary/10 text-primary",
  interview_scheduled: "bg-purple-100 text-purple-800",
  hired: "bg-emerald-100 text-emerald-800",
  withdrawn: "bg-muted text-muted-foreground",
}

function getMatchColor(score: number) {
  if (score >= 80) return "bg-emerald-100 text-emerald-800"
  if (score >= 60) return "bg-amber-100 text-amber-800"
  if (score >= 40) return "bg-orange-100 text-orange-800"
  return "bg-muted text-muted-foreground"
}

function MiniSignalBar({ label, score, icon, color }: { label: string; score: number | null; icon: React.ReactNode; color: string }) {
  if (score === null || score === undefined) return null
  const pct = Math.round(score * 100)
  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      {icon}
      <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-muted-foreground w-6 text-right">{pct}%</span>
    </div>
  )
}

function MatchBreakdownTooltip({ breakdown }: { breakdown: MatchBreakdown }) {
  return (
    <div className="flex flex-col gap-1.5 p-1">
      <p className="text-xs font-semibold mb-1">Score Breakdown</p>
      <MiniSignalBar label="Semantic" score={breakdown.vector_score} icon={<Target className="h-2.5 w-2.5 text-violet-500" />} color="bg-violet-400" />
      <MiniSignalBar label="Skills" score={breakdown.skill_score} icon={<Award className="h-2.5 w-2.5 text-blue-500" />} color="bg-blue-400" />
      <MiniSignalBar label="Experience" score={breakdown.experience_score} icon={<TrendingUp className="h-2.5 w-2.5 text-amber-500" />} color="bg-amber-400" />
      <MiniSignalBar label="Preferences" score={breakdown.preference_score} icon={<Heart className="h-2.5 w-2.5 text-rose-500" />} color="bg-rose-400" />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// JOBS LIST VIEW
// ══════════════════════════════════════════════════════════════════════════

function JobsListView({ onSelectJob }: { onSelectJob: (job: AdminJob) => void }) {
  const [jobs, setJobs] = useState<AdminJob[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchDebounced, setSearchDebounced] = useState("")
  const [statusFilter, setStatusFilter] = useState("active")
  const [sortBy, setSortBy] = useState("posted_at")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [summary, setSummary] = useState({ total_jobs: 0, total_pending: 0, total_forwarded: 0, total_applications: 0 })

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [searchDebounced, statusFilter, sortBy])

  const loadJobs = useCallback(() => {
    setLoading(true)
    getAdminJobs({
      search: searchDebounced,
      status: statusFilter,
      sort_by: sortBy,
      sort_order: "desc",
      limit: pageSize,
      offset: (page - 1) * pageSize,
    })
      .then((res) => { setJobs(res.jobs); setTotal(res.total); setSummary(res.summary) })
      .catch((err) => console.error("Failed to load jobs:", err))
      .finally(() => setLoading(false))
  }, [searchDebounced, statusFilter, sortBy, page, pageSize])

  useEffect(() => { loadJobs() }, [loadJobs])

  const { total_jobs: totalJobs, total_pending: totalPending, total_forwarded: totalForwarded, total_applications: totalApps } = summary

  if (loading && jobs.length === 0) return <DashboardSkeleton />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Job Matching Hub</h1>
        <p className="text-muted-foreground">Review applications, match candidates, and forward qualified profiles to companies.</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalJobs}</p>
              <p className="text-xs text-muted-foreground">Total Jobs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Clock className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalPending}</p>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <Send className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalForwarded}</p>
              <p className="text-xs text-muted-foreground">Forwarded</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <GitMerge className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalApps}</p>
              <p className="text-xs text-muted-foreground">Total Applications</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search jobs or companies..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="posted_at">Newest First</SelectItem>
            <SelectItem value="applications">Most Applications</SelectItem>
            <SelectItem value="pending">Most Pending</SelectItem>
            <SelectItem value="title">Title A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Jobs table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="text-center">Applied</TableHead>
                  <TableHead className="text-center">Pending</TableHead>
                  <TableHead className="text-center">Forwarded</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.job_id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelectJob(job)}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{job.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {job.location && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{job.location}</span>}
                          {job.department && <span>· {job.department}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
                          {job.company_name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm">{job.company_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-xs">{job.employment_type}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-muted text-foreground">{job.applications_count}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {job.pending_count > 0 ? (
                        <Badge className="bg-amber-100 text-amber-800">{job.pending_count}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {job.forwarded_count > 0 ? (
                        <Badge className="bg-success/10 text-success">{job.forwarded_count}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="gap-1" onClick={(e) => { e.stopPropagation(); onSelectJob(job) }}>
                        View <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {jobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No jobs found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {!loading && total > 0 && (
            <TablePagination
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════════════
// APPLICANTS VIEW (for a specific job)
// ══════════════════════════════════════════════════════════════════════════

function ApplicantsView({ job, onBack }: { job: AdminJob; onBack: () => void }) {
  const [applicants, setApplicants] = useState<JobApplicant[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const [search, setSearch] = useState("")
  const [searchDebounced, setSearchDebounced] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("match_score")
  const [minMatch, setMinMatch] = useState(0)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [searchDebounced, statusFilter, sortBy, minMatch])

  const loadApplicants = useCallback(() => {
    setLoading(true)
    getJobApplicants(job.job_id, {
      search: searchDebounced,
      status: statusFilter === "all" ? undefined : statusFilter,
      min_match: minMatch || undefined,
      sort_by: sortBy,
      sort_order: "desc",
      limit: pageSize,
      offset: (page - 1) * pageSize,
    })
      .then((res) => { setApplicants(res.applicants); setTotal(res.total) })
      .catch((err) => console.error("Failed to load applicants:", err))
      .finally(() => setLoading(false))
  }, [job.job_id, searchDebounced, statusFilter, sortBy, minMatch, page, pageSize])

  useEffect(() => { loadApplicants() }, [loadApplicants])

  const pendingApplicants = applicants.filter((a) => a.application_status === "pending_admin_review")
  const selectableIds = pendingApplicants.map((a) => a.application_id)

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === selectableIds.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(selectableIds))
    }
  }

  async function handleBulkApprove() {
    if (selected.size === 0) return
    if (!confirm(`Forward ${selected.size} selected profile(s) to ${job.company_name}?`)) return
    setActionLoading(true)
    try {
      await bulkApproveApplications(Array.from(selected))
      setSelected(new Set())
      loadApplicants()
    } catch (err) {
      console.error("Bulk approve failed:", err)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSingleAction(appId: number, status: string) {
    setActionLoading(true)
    try {
      await updateApplicationStatus(appId, status)
      loadApplicants()
    } catch (err) {
      console.error("Status update failed:", err)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{job.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{job.company_name}</span>
            {job.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
            <Badge variant="outline">{job.employment_type}</Badge>
            <Badge variant="outline">{job.remote_type}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{total}</p>
            <p className="text-xs text-muted-foreground">applicants</p>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pending</span>
            <span className="text-xl font-bold">{applicants.filter((a) => a.application_status === "pending_admin_review").length}</span>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Shortlisted</span>
            <span className="text-xl font-bold">{applicants.filter((a) => a.application_status === "admin_shortlisted").length}</span>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-400">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Forwarded</span>
            <span className="text-xl font-bold">{applicants.filter((a) => a.application_status === "forwarded_to_company").length}</span>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-400">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Rejected</span>
            <span className="text-xl font-bold">{applicants.filter((a) => a.application_status === "rejected_by_admin").length}</span>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Bulk action bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search applicants..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending_admin_review">Pending Review</SelectItem>
              <SelectItem value="admin_shortlisted">Shortlisted</SelectItem>
              <SelectItem value="forwarded_to_company">Forwarded</SelectItem>
              <SelectItem value="rejected_by_admin">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="match_score">Best Match</SelectItem>
              <SelectItem value="applied_at">Newest First</SelectItem>
              <SelectItem value="name">Name A–Z</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(minMatch)} onValueChange={(v) => setMinMatch(Number(v))}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any Composite</SelectItem>
              <SelectItem value="40">≥ 40% Composite</SelectItem>
              <SelectItem value="60">≥ 60% Composite</SelectItem>
              <SelectItem value="65">≥ 65% (Threshold)</SelectItem>
              <SelectItem value="80">≥ 80% Composite</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <span className="text-sm font-medium">{selected.size} applicant(s) selected</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Clear</Button>
              <Button size="sm" className="gap-1.5" onClick={handleBulkApprove} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Forward to Company
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Applicants table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Loading applicants...</span>
            </div>
          ) : (
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    {selectableIds.length > 0 && (
                      <Checkbox
                        checked={selected.size === selectableIds.length && selectableIds.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    )}
                  </TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Skills</TableHead>
                  <TableHead className="hidden lg:table-cell">Experience</TableHead>
                  <TableHead className="hidden lg:table-cell">Applied</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applicants.map((app) => {
                  const isPending = app.application_status === "pending_admin_review"
                  return (
                    <TableRow key={app.application_id}>
                      <TableCell>
                        {isPending && (
                          <Checkbox
                            checked={selected.has(app.application_id)}
                            onCheckedChange={() => toggleSelect(app.application_id)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {app.name ? app.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{app.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{app.headline || app.email}</p>
                            <div className="flex gap-2 mt-0.5">
                              {app.linkedin_url && (
                                <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                  LinkedIn <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                              {app.github_url && (
                                <a href={app.github_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                  GitHub <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className={`cursor-help ${getMatchColor(app.match_score)}`}>
                                {app.match_score.toFixed(1)}%
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="bg-popover border shadow-md">
                              {app.match_breakdown ? (
                                <MatchBreakdownTooltip breakdown={app.match_breakdown} />
                              ) : (
                                <p className="text-xs">Composite match score</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {/* Mini breakdown bars under badge */}
                        {app.match_breakdown && (
                          <div className="mt-1.5 flex flex-col gap-0.5">
                            <MiniSignalBar label="S" score={app.match_breakdown.vector_score} icon={<Target className="h-2 w-2 text-violet-500" />} color="bg-violet-400" />
                            <MiniSignalBar label="K" score={app.match_breakdown.skill_score} icon={<Award className="h-2 w-2 text-blue-500" />} color="bg-blue-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={appStatusColors[app.application_status] || "bg-muted text-muted-foreground"}>
                          {appStatusLabels[app.application_status] || app.application_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col gap-1.5">
                          {/* Matched skills in green */}
                          {app.matched_skills && app.matched_skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {app.matched_skills.slice(0, 3).map((s) => (
                                <Badge key={s.skill_name} variant="outline" className="text-[10px] px-1.5 py-0 border-green-300 bg-green-50 text-green-700">
                                  <CheckCircle className="h-2 w-2 mr-0.5" />{s.skill_name}
                                </Badge>
                              ))}
                              {app.matched_skills.length > 3 && (
                                <span className="text-[10px] text-green-600">+{app.matched_skills.length - 3}</span>
                              )}
                            </div>
                          )}
                          {/* Missing skills in red */}
                          {app.missing_skills && app.missing_skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {app.missing_skills.slice(0, 2).map((s) => (
                                <Badge key={s.skill_name} variant="outline" className="text-[10px] px-1.5 py-0 border-red-200 bg-red-50 text-red-600">
                                  <XCircle className="h-2 w-2 mr-0.5" />{s.skill_name}
                                </Badge>
                              ))}
                              {app.missing_skills.length > 2 && (
                                <span className="text-[10px] text-red-500">+{app.missing_skills.length - 2} gaps</span>
                              )}
                            </div>
                          )}
                          {/* Fallback: all student skills */}
                          {(!app.matched_skills || app.matched_skills.length === 0) && (!app.missing_skills || app.missing_skills.length === 0) && (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {app.skills.slice(0, 4).map((s) => (
                                <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">{s}</Badge>
                              ))}
                              {app.skills.length > 4 && (
                                <span className="text-[10px] text-muted-foreground">+{app.skills.length - 4}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {app.total_experience_months
                          ? `${Math.floor(app.total_experience_months / 12)}y ${app.total_experience_months % 12}m`
                          : "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {actionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                        ) : isPending ? (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" className="text-xs gap-1 text-success" onClick={() => handleSingleAction(app.application_id, "forwarded_to_company")}>
                              <Send className="h-3 w-3" /> Forward
                            </Button>
                            <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => handleSingleAction(app.application_id, "rejected_by_admin")}>
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {applicants.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      {statusFilter !== "all" || search
                        ? "No applicants match your filters."
                        : "No one has applied to this job yet."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {!loading && total > 0 && (
            <TablePagination
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════════════
// MAIN PAGE (orchestrator)
// ══════════════════════════════════════════════════════════════════════════

export default function JobMatchingHub() {
  const [selectedJob, setSelectedJob] = useState<AdminJob | null>(null)

  if (selectedJob) {
    return <ApplicantsView job={selectedJob} onBack={() => setSelectedJob(null)} />
  }

  return <JobsListView onSelectJob={setSelectedJob} />
}
