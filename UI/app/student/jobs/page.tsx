"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import {
  Search, MapPin, DollarSign, Briefcase, Clock, Sparkles, Building2,
  ChevronRight, Send, CheckCircle2, XCircle, Loader2, Star, Calendar,
  Users, Globe, Zap, BookOpen, Target, TrendingUp, Award, GraduationCap,
} from "lucide-react"
import {
  getRecommendedJobs, getStudentJobs, getJobDetail, applyToJob, getMyApplications,
  type JobListItem, type JobDetailFull, type ApplicationOut, type ApplyPayload,
  type MatchBreakdown, type MatchedSkill, type MissingSkill, type GapCourse,
} from "@/lib/api"
import { JobBoardSkeleton } from "@/components/skeletons"

const typeLabels: Record<string, string> = {
  full_time: "Full-time", part_time: "Part-time", contract: "Contract",
  internship: "Internship", freelance: "Freelance",
}
const remoteLabels: Record<string, string> = {
  remote: "Remote", on_site: "On-site", hybrid: "Hybrid",
}
const statusLabels: Record<string, { label: string; color: string }> = {
  pending_admin_review: { label: "Under Review", color: "bg-yellow-100 text-yellow-800" },
  admin_shortlisted: { label: "Shortlisted", color: "bg-blue-100 text-blue-800" },
  rejected_by_admin: { label: "Not Selected", color: "bg-red-100 text-red-800" },
  forwarded_to_company: { label: "Sent to Company", color: "bg-purple-100 text-purple-800" },
  under_company_review: { label: "Company Reviewing", color: "bg-indigo-100 text-indigo-800" },
  interview_scheduled: { label: "Interview Scheduled", color: "bg-cyan-100 text-cyan-800" },
  interview_completed: { label: "Interview Done", color: "bg-teal-100 text-teal-800" },
  offer_extended: { label: "Offer Received", color: "bg-green-100 text-green-800" },
  offer_accepted: { label: "Accepted", color: "bg-green-200 text-green-900" },
  offer_rejected: { label: "Offer Declined", color: "bg-orange-100 text-orange-800" },
  hired: { label: "Hired!", color: "bg-emerald-200 text-emerald-900" },
  rejected_by_company: { label: "Rejected", color: "bg-red-100 text-red-800" },
  withdrawn: { label: "Withdrawn", color: "bg-gray-100 text-gray-600" },
}

function formatSalary(min: number | null, max: number | null, currency: string) {
  if (!min && !max) return null
  const fmt = (v: number) => {
    if (currency === "INR") return `₹${(v / 100000).toFixed(1)}L`
    return `${currency} ${v.toLocaleString()}`
  }
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `From ${fmt(min)}`
  return `Up to ${fmt(max!)}`
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return ""
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

// ── Composite Match Badge ───────────────────────────────────────────────
function MatchBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null
  const pct = Math.round(score * 100)
  const color = pct >= 80 ? "bg-emerald-100 text-emerald-800 border-emerald-200"
    : pct >= 65 ? "bg-blue-100 text-blue-800 border-blue-200"
    : "bg-gray-100 text-gray-600 border-gray-200"
  return (
    <Badge className={`${color} gap-1 font-semibold border`}>
      <Zap className="h-3 w-3" />{pct}% match
    </Badge>
  )
}

// ── Mini score bar for breakdown ────────────────────────────────────────
function ScoreBar({ label, score, icon, color }: { label: string; score: number | null; icon: React.ReactNode; color: string }) {
  if (score === null || score === undefined) return null
  const pct = Math.round(score * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 w-28 shrink-0">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium w-8 text-right">{pct}%</span>
    </div>
  )
}

// ── Match breakdown component (compact, for cards) ──────────────────────
function MatchBreakdownMini({ breakdown }: { breakdown: MatchBreakdown | null }) {
  if (!breakdown) return null
  return (
    <div className="flex flex-col gap-1 mt-2 pt-2 border-t">
      <ScoreBar label="Semantic" score={breakdown.vector_score} icon={<Target className="h-3 w-3 text-violet-500" />} color="bg-violet-400" />
      <ScoreBar label="Skills" score={breakdown.skill_score} icon={<Award className="h-3 w-3 text-blue-500" />} color="bg-blue-400" />
      <ScoreBar label="Experience" score={breakdown.experience_score} icon={<TrendingUp className="h-3 w-3 text-amber-500" />} color="bg-amber-400" />
      <ScoreBar label="Preferences" score={breakdown.preference_score} icon={<Sparkles className="h-3 w-3 text-emerald-500" />} color="bg-emerald-400" />
    </div>
  )
}

// ── Skill match display ─────────────────────────────────────────────────
function SkillMatchDisplay({
  matched, missing, compact = false,
}: {
  matched: MatchedSkill[]; missing: MissingSkill[]; compact?: boolean;
}) {
  if (matched.length === 0 && missing.length === 0) return null
  const total = matched.length + missing.length

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          Skills ({matched.length}/{total})
        </span>
        {matched.length > 0 && (
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
              style={{ width: `${(matched.length / total) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Matched skills */}
      {matched.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(compact ? matched.slice(0, 5) : matched).map((s) => (
            <Badge key={s.skill_name} className="bg-emerald-50 text-emerald-700 border border-emerald-200 gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3" />{s.skill_name}
              {s.proficiency_level >= 4 && <Star className="h-2.5 w-2.5 fill-current text-amber-500" />}
            </Badge>
          ))}
          {compact && matched.length > 5 && (
            <Badge variant="outline" className="text-xs">+{matched.length - 5}</Badge>
          )}
        </div>
      )}

      {/* Missing skills */}
      {missing.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(compact ? missing.slice(0, 3) : missing).map((s) => (
            <Badge key={s.skill_name} className="bg-red-50 text-red-600 border border-red-200 gap-1 text-xs">
              <XCircle className="h-3 w-3" />{s.skill_name}
              {s.is_mandatory && <span className="text-[10px] font-bold">REQ</span>}
            </Badge>
          ))}
          {compact && missing.length > 3 && (
            <Badge variant="outline" className="text-xs text-red-600">+{missing.length - 3} missing</Badge>
          )}
        </div>
      )}
    </div>
  )
}

// ── Gap Courses ─────────────────────────────────────────────────────────
function GapCoursesSection({ courses }: { courses: GapCourse[] }) {
  if (!courses || courses.length === 0) return null
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap className="h-4 w-4 text-amber-600" />
        <h4 className="font-semibold text-sm text-amber-900">Boost Your Match</h4>
      </div>
      <div className="flex flex-col gap-2">
        {courses.map((c) => (
          <div key={c.course_id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-white border border-amber-100">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{c.title}</p>
              <p className="text-xs text-muted-foreground">
                Teaches: {c.teaches_skills.join(", ")}
              </p>
            </div>
            <Badge variant="outline" className="shrink-0 text-xs font-medium">
              {c.price > 0 ? `₹${c.price}` : "Free"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Job Card ────────────────────────────────────────────────────────────

function JobCard({ job, onView }: { job: JobListItem; onView: () => void }) {
  const salary = job.salary_is_visible ? formatSalary(job.salary_min, job.salary_max, job.salary_currency) : null
  const hasBreakdown = job.match_breakdown !== null

  return (
    <Card className="transition-all hover:shadow-md hover:border-primary/20 cursor-pointer" onClick={onView}>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground truncate">{job.title}</h3>
              <MatchBadge score={job.match_score} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground truncate">{job.company.company_name}</span>
              {job.company.industry && (
                <span className="text-xs text-muted-foreground/60">· {job.company.industry}</span>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {job.location && (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
              )}
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" />{typeLabels[job.employment_type] || job.employment_type}
              </span>
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />{remoteLabels[job.remote_type] || job.remote_type}
              </span>
              {salary && (
                <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{salary}</span>
              )}
              {job.posted_at && (
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(job.posted_at)}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
            <Button variant="outline" size="sm" className="gap-1">
              View <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Skill match tags (compact) */}
        {(job.matched_skills.length > 0 || job.missing_skills.length > 0) ? (
          <SkillMatchDisplay matched={job.matched_skills} missing={job.missing_skills} compact />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {job.skills.slice(0, 5).map((s) => (
              <Badge key={s.skill_id} variant="secondary" className="text-xs">
                {s.name}{s.is_mandatory && <Star className="h-2.5 w-2.5 ml-0.5 fill-current" />}
              </Badge>
            ))}
            {job.skills.length > 5 && (
              <Badge variant="outline" className="text-xs">+{job.skills.length - 5}</Badge>
            )}
          </div>
        )}

        {/* Mini breakdown bars */}
        {hasBreakdown && <MatchBreakdownMini breakdown={job.match_breakdown} />}
      </CardContent>
    </Card>
  )
}

// ── Job Detail Sheet ────────────────────────────────────────────────────

function JobDetailSheet({
  jobId, open, onClose, onApply,
}: {
  jobId: number | null; open: boolean; onClose: () => void; onApply: (job: JobDetailFull) => void;
}) {
  const [job, setJob] = useState<JobDetailFull | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!jobId || !open) return
    setLoading(true)
    getJobDetail(jobId)
      .then(setJob)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [jobId, open])

  const salary = job?.salary_is_visible ? formatSalary(job.salary_min, job.salary_max, job.salary_currency) : null

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {loading ? (
          <>
            <SheetHeader><SheetTitle className="sr-only">Loading job details</SheetTitle></SheetHeader>
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </>
        ) : job ? (
          <>
            <SheetHeader className="pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SheetTitle className="text-xl">{job.title}</SheetTitle>
                  <p className="text-sm text-muted-foreground mt-1">{job.company.company_name}</p>
                </div>
                <MatchBadge score={job.match_score} />
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-5 pb-6">
              {/* Match breakdown (full) */}
              {job.match_breakdown && (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Match Analysis
                  </h4>
                  <div className="flex flex-col gap-2">
                    <ScoreBar label="Semantic" score={job.match_breakdown.vector_score} icon={<Target className="h-3 w-3 text-violet-500" />} color="bg-violet-400" />
                    <ScoreBar label="Skills" score={job.match_breakdown.skill_score} icon={<Award className="h-3 w-3 text-blue-500" />} color="bg-blue-400" />
                    <ScoreBar label="Experience" score={job.match_breakdown.experience_score} icon={<TrendingUp className="h-3 w-3 text-amber-500" />} color="bg-amber-400" />
                    <ScoreBar label="Preferences" score={job.match_breakdown.preference_score} icon={<Sparkles className="h-3 w-3 text-emerald-500" />} color="bg-emerald-400" />
                  </div>
                  <div className="mt-3 pt-2 border-t flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Composite Score</span>
                    <span className="text-sm font-bold">{Math.round(job.match_breakdown.composite_score * 100)}%</span>
                  </div>
                </div>
              )}

              {/* Skill match breakdown (full) */}
              {(job.matched_skills.length > 0 || job.missing_skills.length > 0) && (
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4 text-blue-500" />
                    Skill Analysis
                  </h4>
                  <SkillMatchDisplay matched={job.matched_skills} missing={job.missing_skills} />
                </div>
              )}

              {/* Gap courses */}
              <GapCoursesSection courses={job.gap_courses} />

              {/* Meta */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{typeLabels[job.employment_type] || job.employment_type}</Badge>
                <Badge variant="outline">{remoteLabels[job.remote_type] || job.remote_type}</Badge>
                {job.location && <Badge variant="outline"><MapPin className="h-3 w-3 mr-1" />{job.location}</Badge>}
                {job.department && <Badge variant="outline">{job.department}</Badge>}
              </div>

              {/* Salary & Experience */}
              <div className="grid grid-cols-2 gap-3">
                {salary && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Salary</p>
                    <p className="font-semibold text-sm mt-0.5">{salary}</p>
                  </div>
                )}
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Experience</p>
                  <p className="font-semibold text-sm mt-0.5">
                    {job.experience_min_years}–{job.experience_max_years || "10+"} years
                  </p>
                </div>
                {job.deadline && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Deadline</p>
                    <p className="font-semibold text-sm mt-0.5">{new Date(job.deadline).toLocaleDateString()}</p>
                  </div>
                )}
                {job.posted_at && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Posted</p>
                    <p className="font-semibold text-sm mt-0.5">{timeAgo(job.posted_at)}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h4 className="font-semibold text-sm mb-1.5">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{job.description}</p>
              </div>

              {job.responsibilities && (
                <div>
                  <h4 className="font-semibold text-sm mb-1.5">Responsibilities</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{job.responsibilities}</p>
                </div>
              )}

              {job.requirements && (
                <div>
                  <h4 className="font-semibold text-sm mb-1.5">Requirements</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{job.requirements}</p>
                </div>
              )}

              {job.nice_to_have && (
                <div>
                  <h4 className="font-semibold text-sm mb-1.5">Nice to Have</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{job.nice_to_have}</p>
                </div>
              )}

              {/* Skills (from job listing — shown if no match data) */}
              {job.skills.length > 0 && job.matched_skills.length === 0 && job.missing_skills.length === 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-1.5">Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {job.skills.map((s) => (
                      <Badge key={s.skill_id} variant={s.is_mandatory ? "default" : "secondary"} className="text-xs">
                        {s.name}
                        {s.min_experience_years ? ` (${s.min_experience_years}+ yr)` : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Benefits */}
              {job.benefits && job.benefits.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-1.5">Benefits</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {job.benefits.map((b) => (
                      <Badge key={b} variant="outline" className="text-xs">{b}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Company */}
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold text-sm mb-2">About {job.company.company_name}</h4>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {job.company.industry && <span>{job.company.industry}</span>}
                  {job.company.company_size && <span>· {job.company.company_size} employees</span>}
                  {job.company.company_location && <span>· {job.company.company_location}</span>}
                </div>
                {job.company.company_description && (
                  <p className="text-sm text-muted-foreground mt-2">{job.company.company_description}</p>
                )}
              </div>

              {/* Apply Button */}
              <div className="pt-2">
                {job.has_applied ? (
                  <Button disabled className="w-full gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Already Applied
                  </Button>
                ) : (
                  <Button className="w-full gap-2" onClick={() => onApply(job)}>
                    <Send className="h-4 w-4" /> Apply Now
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <SheetHeader><SheetTitle className="sr-only">Job not found</SheetTitle></SheetHeader>
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              Job not found
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ── Apply Dialog ────────────────────────────────────────────────────────

function ApplyDialog({
  job, open, onClose, onSuccess,
}: {
  job: JobDetailFull | null; open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [coverLetter, setCoverLetter] = useState("")
  const [expectedSalary, setExpectedSalary] = useState("")
  const [noticePeriod, setNoticePeriod] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (!job) return
    setSubmitting(true)
    setError("")
    try {
      const payload: ApplyPayload = {}
      if (coverLetter.trim()) payload.cover_letter = coverLetter.trim()
      if (expectedSalary) payload.expected_salary = parseFloat(expectedSalary)
      if (noticePeriod) payload.notice_period_days = parseInt(noticePeriod)
      await applyToJob(job.job_id, payload)
      onSuccess()
      onClose()
      setCoverLetter("")
      setExpectedSalary("")
      setNoticePeriod("")
    } catch (e: any) {
      setError(e.message || "Failed to submit application")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply to {job?.title}</DialogTitle>
          <DialogDescription>
            at {job?.company.company_name} · Your application will be reviewed by our team first.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label>Cover Letter (optional)</Label>
            <Textarea
              placeholder="Tell the company why you're a great fit for this role..."
              rows={5}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Expected Salary (annual)</Label>
              <Input
                type="number"
                placeholder="e.g. 800000"
                value={expectedSalary}
                onChange={(e) => setExpectedSalary(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Notice Period (days)</Label>
              <Input
                type="number"
                placeholder="e.g. 30"
                value={noticePeriod}
                onChange={(e) => setNoticePeriod(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <XCircle className="h-4 w-4" />{error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────

export default function JobBoard() {
  const [initialLoading, setInitialLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState("recommended")

  // Recommended jobs
  const [recommended, setRecommended] = useState<JobListItem[]>([])
  const [recLoading, setRecLoading] = useState(true)
  const [recError, setRecError] = useState(false)

  // All jobs
  const [allJobs, setAllJobs] = useState<JobListItem[]>([])
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [remoteFilter, setRemoteFilter] = useState("")
  const [searchDebounced, setSearchDebounced] = useState("")

  // Applications
  const [applications, setApplications] = useState<ApplicationOut[]>([])

  // Detail & Apply
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [applyJob, setApplyJob] = useState<JobDetailFull | null>(null)
  const [applyOpen, setApplyOpen] = useState(false)

  // Initial page load — fetch recommended + all jobs in parallel, show skeleton until both done
  useEffect(() => {
    const loadInitial = async () => {
      const recPromise = getRecommendedJobs(50)
        .then((res) => {
          setRecommended(res.jobs)
          setRecError(false)
        })
        .catch((err) => {
          console.warn("[JobBoard] Recommended jobs failed:", err)
          setRecommended([])
          setRecError(true)
        })
        .finally(() => setRecLoading(false))

      const jobsPromise = getStudentJobs({})
        .then((res) => setAllJobs(res.jobs))
        .catch((err) => {
          console.warn("[JobBoard] All jobs failed:", err)
          setAllJobs([])
        })

      await Promise.all([recPromise, jobsPromise])
      setInitialLoading(false)
    }
    loadInitial()
  }, [])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400)
    return () => clearTimeout(t)
  }, [search])

  // Reload jobs when filters change (skip if initial load hasn't finished)
  const loadJobs = useCallback(() => {
    if (initialLoading) return
    setLoading(true)
    getStudentJobs({
      search: searchDebounced,
      employment_type: typeFilter === "all_types" ? "" : typeFilter,
      remote_type: remoteFilter === "all_modes" ? "" : remoteFilter,
    })
      .then((res) => setAllJobs(res.jobs))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [searchDebounced, typeFilter, remoteFilter, initialLoading])

  useEffect(() => { loadJobs() }, [loadJobs])

  // Load applications when tab switches
  useEffect(() => {
    if (tab === "applications") {
      getMyApplications()
        .then((res) => setApplications(res.applications))
        .catch((err) => console.warn("[JobBoard] Applications failed:", err))
    }
  }, [tab])

  const openJobDetail = (jobId: number) => {
    setSelectedJobId(jobId)
    setDetailOpen(true)
  }

  const handleApplySuccess = () => {
    loadJobs()
    if (tab === "applications") {
      getMyApplications()
        .then((res) => setApplications(res.applications))
        .catch(() => {})
    }
  }

  // Show full-page skeleton on initial load
  if (initialLoading) return <JobBoardSkeleton />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Job Board</h1>
        <p className="text-muted-foreground">Find opportunities matched to your skills and experience.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto flex overflow-x-auto no-scrollbar">
            <TabsTrigger value="recommended" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap flex-1 sm:flex-none">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="sm:hidden">AI Match</span>
              <span className="hidden sm:inline">AI Recommendations</span>
              {recommended.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-4 sm:h-5 px-1 sm:px-1.5 text-[9px] sm:text-[10px] font-bold">
                  {recommended.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="browse" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap flex-1 sm:flex-none">
              <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="sm:hidden">Browse</span>
              <span className="hidden sm:inline">Browse Jobs</span>
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap flex-1 sm:flex-none">
              <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="sm:hidden">Applied</span>
              <span className="hidden sm:inline">My Applications</span>
            </TabsTrigger>
          </TabsList>

        {/* ── AI Recommendations Tab ── */}
        <TabsContent value="recommended" className="mt-6 flex flex-col gap-6">
          {recLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Analyzing your profile for best matches...</span>
            </div>
          ) : recommended.length > 0 ? (
            <>
              {/* Hero header */}
              <div className="rounded-xl border bg-gradient-to-br from-violet-50 via-blue-50 to-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-foreground">
                      {recommended.length} Jobs Matched for You
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Ranked by composite score — Semantic 35% + Skills 35% + Experience 20% + Preferences 10%.
                      Only jobs with ≥65% composite match are shown.
                    </p>
                  </div>
                </div>
              </div>

              {/* Recommended job cards */}
              <div className="flex flex-col gap-3">
                {recommended.map((job) => (
                  <JobCard key={job.job_id} job={job} onView={() => openJobDetail(job.job_id)} />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 mb-4">
                <Sparkles className="h-8 w-8 text-amber-500" />
              </div>
              <p className="text-lg font-semibold text-foreground">No AI Recommendations Yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                {recError
                  ? "We couldn't generate recommendations right now. Please try again later."
                  : "Complete your profile, add your skills, and upload your resume to unlock personalized job recommendations powered by our hybrid matching algorithm."
                }
              </p>
              <div className="flex gap-3 mt-5">
                <Button variant="outline" onClick={() => setTab("browse")} className="gap-1.5">
                  <Briefcase className="h-4 w-4" /> Browse All Jobs
                </Button>
                <Button asChild className="gap-1.5">
                  <a href="/student/profile">
                    <Users className="h-4 w-4" /> Complete Profile
                  </a>
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Browse Jobs Tab ── */}
        <TabsContent value="browse" className="mt-6 flex flex-col gap-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search jobs, companies, or skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_types">All Types</SelectItem>
                <SelectItem value="full_time">Full-time</SelectItem>
                <SelectItem value="part_time">Part-time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="internship">Internship</SelectItem>
                <SelectItem value="freelance">Freelance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={remoteFilter} onValueChange={setRemoteFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Modes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_modes">All Modes</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="on_site">On-site</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* All Jobs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-semibold text-foreground">All Openings</h2>
              {!loading && (
                <Badge variant="secondary" className="text-xs">{allJobs.length} jobs</Badge>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allJobs.length > 0 ? (
              <div className="flex flex-col gap-3">
                {allJobs.map((job) => (
                  <JobCard key={job.job_id} job={job} onView={() => openJobDetail(job.job_id)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Briefcase className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-lg font-medium text-foreground">No jobs found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── My Applications Tab ── */}
        <TabsContent value="applications" className="mt-6">
          {applications.length > 0 ? (
            <div className="flex flex-col gap-3">
              {applications.map((app) => {
                const st = statusLabels[app.status] || { label: app.status, color: "bg-gray-100 text-gray-600" }
                return (
                  <Card key={app.application_id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{app.job_title}</p>
                          <Badge className={`${st.color} text-xs`}>{st.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {app.company_name}
                          {app.applied_at && ` · Applied ${timeAgo(app.applied_at)}`}
                        </p>
                        {app.match_score && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            AI Match: {Math.round(app.match_score)}%
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openJobDetail(app.job_id)}
                      >
                        View Job
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Send className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-lg font-medium text-foreground">No applications yet</p>
              <p className="text-sm text-muted-foreground">Browse jobs and apply to get started.</p>
              <Button variant="outline" className="mt-4" onClick={() => setTab("browse")}>
                Browse Jobs
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Job Detail Sheet */}
      <JobDetailSheet
        jobId={selectedJobId}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onApply={(job) => {
          setDetailOpen(false)
          setApplyJob(job)
          setApplyOpen(true)
        }}
      />

      {/* Apply Dialog */}
      <ApplyDialog
        job={applyJob}
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        onSuccess={handleApplySuccess}
      />
    </div>
  )
}
