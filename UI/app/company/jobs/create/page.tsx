"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft, ArrowRight, Check, Loader2, Briefcase, MapPin,
  DollarSign, Sparkles, X, Plus, AlertCircle,
} from "lucide-react"
import { createCompanyJob, type JobCreatePayload, type JobSkillInput } from "@/lib/api"

const STEPS = [
  { id: 1, title: "Job Details", description: "Title, description & requirements" },
  { id: 2, title: "Employment", description: "Type, location & experience" },
  { id: 3, title: "Compensation", description: "Salary range & benefits" },
  { id: 4, title: "Skills", description: "Required & preferred skills" },
  { id: 5, title: "Review & Post", description: "Preview and publish" },
]

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance" },
]

const REMOTE_TYPES = [
  { value: "on_site", label: "On-site" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
]

const COMMON_BENEFITS = [
  "Health Insurance", "Dental Insurance", "Vision Insurance",
  "401(k) / PF", "Paid Time Off", "Remote Work",
  "Flexible Hours", "Stock Options", "Learning Budget",
  "Gym Membership", "Free Meals", "Relocation Assistance",
  "Parental Leave", "Mental Health Support", "Annual Bonus",
]

export default function CreateJobPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Job Details
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [responsibilities, setResponsibilities] = useState("")
  const [requirements, setRequirements] = useState("")
  const [niceToHave, setNiceToHave] = useState("")

  // Step 2: Employment
  const [department, setDepartment] = useState("")
  const [employmentType, setEmploymentType] = useState("full_time")
  const [remoteType, setRemoteType] = useState("on_site")
  const [location, setLocation] = useState("")
  const [expMin, setExpMin] = useState("0")
  const [expMax, setExpMax] = useState("")

  // Step 3: Compensation
  const [salaryMin, setSalaryMin] = useState("")
  const [salaryMax, setSalaryMax] = useState("")
  const [salaryCurrency, setSalaryCurrency] = useState("INR")
  const [salaryVisible, setSalaryVisible] = useState(false)
  const [benefits, setBenefits] = useState<string[]>([])
  const [customBenefit, setCustomBenefit] = useState("")

  // Step 4: Skills
  const [skills, setSkills] = useState<JobSkillInput[]>([])
  const [skillInput, setSkillInput] = useState("")
  const [skillMandatory, setSkillMandatory] = useState(true)
  const [skillExpYears, setSkillExpYears] = useState("")

  // Step 5: Publish settings
  const [status, setStatus] = useState<"draft" | "active">("active")
  const [deadline, setDeadline] = useState("")

  function addSkill() {
    const name = skillInput.trim()
    if (!name) return
    if (skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) return
    setSkills([
      ...skills,
      {
        name,
        is_mandatory: skillMandatory,
        min_experience_years: skillExpYears ? parseInt(skillExpYears) : null,
      },
    ])
    setSkillInput("")
    setSkillExpYears("")
    setSkillMandatory(true)
  }

  function removeSkill(name: string) {
    setSkills(skills.filter((s) => s.name !== name))
  }

  function toggleBenefit(b: string) {
    setBenefits((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    )
  }

  function addCustomBenefit() {
    const b = customBenefit.trim()
    if (!b || benefits.includes(b)) return
    setBenefits([...benefits, b])
    setCustomBenefit("")
  }

  function canProceed(): boolean {
    switch (step) {
      case 1:
        return title.trim().length >= 3 && description.trim().length >= 10
      case 2:
        return !!employmentType
      case 3:
        return true
      case 4:
        return true
      case 5:
        return true
      default:
        return false
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const payload: JobCreatePayload = {
        title: title.trim(),
        description: description.trim(),
        responsibilities: responsibilities.trim() || undefined,
        requirements: requirements.trim() || undefined,
        nice_to_have: niceToHave.trim() || undefined,
        department: department.trim() || undefined,
        employment_type: employmentType,
        remote_type: remoteType,
        location: location.trim() || undefined,
        experience_min_years: parseInt(expMin) || 0,
        experience_max_years: expMax ? parseInt(expMax) : null,
        salary_min: salaryMin ? parseFloat(salaryMin) : null,
        salary_max: salaryMax ? parseFloat(salaryMax) : null,
        salary_currency: salaryCurrency,
        salary_is_visible: salaryVisible,
        benefits,
        skills,
        status,
        deadline: deadline || null,
      }
      await createCompanyJob(payload)
      router.push("/company/jobs")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job")
    } finally {
      setSubmitting(false)
    }
  }

  const labelFor = (t: string) =>
    EMPLOYMENT_TYPES.find((e) => e.value === t)?.label || t
  const remoteLabel = (t: string) =>
    REMOTE_TYPES.find((e) => e.value === t)?.label || t

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/company/jobs")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Post a New Job</h1>
          <p className="text-muted-foreground">
            Step {step} of {STEPS.length} — {STEPS[step - 1].description}
          </p>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="flex items-center gap-1">
        {STEPS.map((s) => (
          <div key={s.id} className="flex items-center flex-1">
            <button
              onClick={() => s.id < step && setStep(s.id)}
              className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold shrink-0 transition-colors ${
                s.id < step
                  ? "bg-primary text-primary-foreground cursor-pointer"
                  : s.id === step
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s.id < step ? <Check className="h-4 w-4" /> : s.id}
            </button>
            {s.id < STEPS.length && (
              <div
                className={`h-0.5 flex-1 mx-1 rounded ${
                  s.id < step ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive border border-destructive/20">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Step Content */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Job Details
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>
                Job Title <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Senior Frontend Developer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Write a compelling job description that explains the role, your team, and what makes this opportunity unique..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                This is the main description candidates will see. Be specific and engaging.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Responsibilities</Label>
              <Textarea
                placeholder="• Lead the frontend architecture&#10;• Mentor junior developers&#10;• Collaborate with product and design teams"
                value={responsibilities}
                onChange={(e) => setResponsibilities(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Requirements</Label>
              <Textarea
                placeholder="• 3+ years of experience with React&#10;• Strong TypeScript skills&#10;• Experience with REST APIs"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Nice to Have</Label>
              <Textarea
                placeholder="• Experience with Next.js&#10;• Familiarity with GraphQL&#10;• Contributions to open source"
                value={niceToHave}
                onChange={(e) => setNiceToHave(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Employment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>
                  Employment Type <span className="text-destructive">*</span>
                </Label>
                <Select value={employmentType} onValueChange={setEmploymentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Work Mode</Label>
                <Select value={remoteType} onValueChange={setRemoteType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REMOTE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Location</Label>
                <Input
                  placeholder="e.g. Chennai, India"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Department</Label>
                <Input
                  placeholder="e.g. Engineering, Marketing"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Min Experience (years)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={expMin}
                  onChange={(e) => setExpMin(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Max Experience (years)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 5"
                  value={expMax}
                  onChange={(e) => setExpMax(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Compensation & Benefits
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label>Min Salary</Label>
                <Input
                  type="number"
                  placeholder="e.g. 600000"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Max Salary</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1200000"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Currency</Label>
                <Select value={salaryCurrency} onValueChange={setSalaryCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={salaryVisible}
                onCheckedChange={setSalaryVisible}
              />
              <Label className="cursor-pointer">
                Show salary to candidates
              </Label>
            </div>

            <div className="border-t border-border pt-4">
              <Label className="text-sm font-medium mb-3 block">Benefits & Perks</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_BENEFITS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => toggleBenefit(b)}
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      benefits.includes(b)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {benefits.includes(b) && (
                      <Check className="h-3 w-3 mr-1" />
                    )}
                    {b}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Input
                  placeholder="Add custom benefit..."
                  value={customBenefit}
                  onChange={(e) => setCustomBenefit(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomBenefit())}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCustomBenefit}
                  disabled={!customBenefit.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Required Skills
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Add skills that candidates should have. These are used for AI-powered matching with student profiles.
            </p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
              <Input
                placeholder="e.g. React, Python, Machine Learning"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
              />
              <div className="flex items-center gap-2">
                <Switch
                  checked={skillMandatory}
                  onCheckedChange={setSkillMandatory}
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {skillMandatory ? "Required" : "Preferred"}
                </span>
              </div>
              <Input
                type="number"
                min={0}
                placeholder="Min yrs"
                value={skillExpYears}
                onChange={(e) => setSkillExpYears(e.target.value)}
                className="w-24"
              />
              <Button variant="outline" onClick={addSkill} disabled={!skillInput.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>

            {skills.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                {skills.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{s.name}</span>
                      <Badge
                        variant={s.is_mandatory ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {s.is_mandatory ? "Required" : "Preferred"}
                      </Badge>
                      {s.min_experience_years != null && s.min_experience_years > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {s.min_experience_years}+ yrs
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeSkill(s.name)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {skills.length === 0 && (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-8">
                <p className="text-sm text-muted-foreground">
                  No skills added yet. Skills improve AI matching accuracy.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <div className="flex flex-col gap-6">
          {/* Publish settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publish Settings</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Status</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as "draft" | "active")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Publish Now</SelectItem>
                      <SelectItem value="draft">Save as Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Application Deadline (optional)</Label>
                  <Input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Review summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Review Summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Title</span>
                  <p className="font-medium">{title || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Department</span>
                  <p className="font-medium">{department || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Employment Type</span>
                  <p className="font-medium">{labelFor(employmentType)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Work Mode</span>
                  <p className="font-medium">{remoteLabel(remoteType)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Location</span>
                  <p className="font-medium">{location || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Experience</span>
                  <p className="font-medium">
                    {expMin || 0}
                    {expMax ? `–${expMax}` : "+"} years
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Salary</span>
                  <p className="font-medium">
                    {salaryMin || salaryMax
                      ? `${salaryCurrency} ${salaryMin || "—"} – ${salaryMax || "—"}`
                      : "Not specified"}
                    {salaryVisible ? " (visible)" : " (hidden)"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Deadline</span>
                  <p className="font-medium">{deadline || "No deadline"}</p>
                </div>
              </div>

              {description && (
                <div className="border-t border-border pt-3">
                  <span className="text-muted-foreground">Description</span>
                  <p className="mt-1 whitespace-pre-line text-foreground line-clamp-4">
                    {description}
                  </p>
                </div>
              )}

              {skills.length > 0 && (
                <div className="border-t border-border pt-3">
                  <span className="text-muted-foreground">Skills ({skills.length})</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {skills.map((s) => (
                      <Badge
                        key={s.name}
                        variant={s.is_mandatory ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {s.name}
                        {s.min_experience_years ? ` (${s.min_experience_years}+ yrs)` : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {benefits.length > 0 && (
                <div className="border-t border-border pt-3">
                  <span className="text-muted-foreground">Benefits ({benefits.length})</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {benefits.map((b) => (
                      <Badge key={b} variant="outline" className="text-xs">
                        {b}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                An AI embedding will be generated from this job post for smart candidate matching.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pb-6">
        <Button
          variant="outline"
          onClick={() => (step > 1 ? setStep(step - 1) : router.push("/company/jobs"))}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {step > 1 ? "Back" : "Cancel"}
        </Button>

        {step < STEPS.length ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="gap-2"
          >
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !description.trim()}
            className="gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {status === "active" ? "Publishing..." : "Saving..."}
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {status === "active" ? "Publish Job" : "Save Draft"}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
