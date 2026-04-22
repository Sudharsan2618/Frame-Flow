"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, ArrowLeft, Loader2, User, Briefcase, Link2, CheckCircle2 } from "lucide-react"
import { Logo } from "@/components/logo"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

const STEPS = [
  { id: 1, title: "About You", icon: User, description: "Tell us a bit about yourself" },
  { id: 2, title: "Job Preferences", icon: Briefcase, description: "What are you looking for?" },
  { id: 3, title: "Social Links", icon: Link2, description: "Connect your profiles" },
]

const JOB_TYPES = [
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance" },
]

const REMOTE_TYPES = [
  { value: "remote", label: "Remote" },
  { value: "on_site", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
]

export default function StudentOnboardingPage() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, token, updateUser } = useAuth()
  const router = useRouter()

  // Step 1: About You
  const [phone, setPhone] = useState("")
  const [headline, setHeadline] = useState("")
  const [bio, setBio] = useState("")
  const [location, setLocation] = useState("")
  const [education, setEducation] = useState("")
  const [experienceYears, setExperienceYears] = useState("")

  // Step 2: Job Preferences
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([])
  const [selectedRemoteTypes, setSelectedRemoteTypes] = useState<string[]>([])
  const [preferredLocations, setPreferredLocations] = useState("")
  const [salaryMin, setSalaryMin] = useState("")
  const [salaryMax, setSalaryMax] = useState("")
  const [noticePeriod, setNoticePeriod] = useState("")

  // Step 3: Social Links
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [githubUrl, setGithubUrl] = useState("")
  const [portfolioUrl, setPortfolioUrl] = useState("")
  const [personalWebsite, setPersonalWebsite] = useState("")

  function toggleChip(value: string, list: string[], setList: (v: string[]) => void) {
    if (list.includes(value)) {
      setList(list.filter((v) => v !== value))
    } else {
      setList([...list, value])
    }
  }

  async function handleSubmit() {
    setIsLoading(true)
    setError(null)

    const body: Record<string, unknown> = {}

    // Step 1 fields
    if (phone) body.phone = phone
    if (headline) body.headline = headline
    if (bio) body.bio = bio
    if (location) body.location = location
    if (education) body.education = education
    if (experienceYears) body.experience_years = parseInt(experienceYears)

    // Step 2 fields
    if (selectedJobTypes.length) body.preferred_job_types = selectedJobTypes
    if (selectedRemoteTypes.length) body.preferred_remote_types = selectedRemoteTypes
    if (preferredLocations) body.preferred_locations = preferredLocations.split(",").map((s) => s.trim()).filter(Boolean)
    if (salaryMin) body.salary_expectation_min = parseFloat(salaryMin)
    if (salaryMax) body.salary_expectation_max = parseFloat(salaryMax)
    if (noticePeriod) body.notice_period_days = parseInt(noticePeriod)

    // Step 3 fields
    if (linkedinUrl) body.linkedin_url = linkedinUrl
    if (githubUrl) body.github_url = githubUrl
    if (portfolioUrl) body.portfolio_url = portfolioUrl
    if (personalWebsite) body.personal_website = personalWebsite

    try {
      const res = await fetch(`${API_BASE}/auth/onboarding/student`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed to save" }))
        setError(err.detail || "Failed to save profile")
        setIsLoading(false)
        return
      }

      const updatedUser = await res.json()
      updateUser({ ...updatedUser, onboarding_completed: true })
      router.push("/student")
    } catch {
      setError("Network error. Please try again.")
    }
    setIsLoading(false)
  }

  function handleNext() {
    if (step < 3) setStep(step + 1)
    else handleSubmit()
  }

  function handleSkip() {
    handleSubmit()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Logo size={40} />
          <div>
            <p className="text-xs font-semibold text-muted-foreground">SkillBridge</p>
            <h1 className="text-lg font-bold text-foreground">
              Welcome, {user?.first_name}! Let&apos;s set up your profile
            </h1>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  step > s.id
                    ? "bg-primary text-primary-foreground"
                    : step === s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.id}
              </div>
              <div className="hidden sm:block min-w-0">
                <p className={`text-xs font-medium truncate ${step >= s.id ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.title}
                </p>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 rounded ${step > s.id ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-lg">{STEPS[step - 1].title}</CardTitle>
            <CardDescription>{STEPS[step - 1].description}</CardDescription>
            <p className="text-xs text-muted-foreground mt-1">All fields are optional — fill what you&apos;d like.</p>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive border border-destructive/20">
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Phone Number</Label>
                  <Input placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Professional Headline</Label>
                  <Input
                    placeholder="e.g. Full Stack Developer | Data Science Enthusiast"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Bio</Label>
                  <Textarea
                    placeholder="Tell us about yourself, your goals, and what you're passionate about..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Location</Label>
                    <Input placeholder="e.g. Chennai, India" value={location} onChange={(e) => setLocation(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Years of Experience</Label>
                    <Select value={experienceYears} onValueChange={setExperienceYears}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Fresher (0)</SelectItem>
                        <SelectItem value="1">1 year</SelectItem>
                        <SelectItem value="2">2 years</SelectItem>
                        <SelectItem value="3">3 years</SelectItem>
                        <SelectItem value="5">5+ years</SelectItem>
                        <SelectItem value="10">10+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Highest Education</Label>
                  <Input
                    placeholder="e.g. B.Tech in Computer Science, Anna University"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-5">
                <div className="flex flex-col gap-2">
                  <Label>Preferred Job Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {JOB_TYPES.map((jt) => (
                      <button
                        key={jt.value}
                        type="button"
                        onClick={() => toggleChip(jt.value, selectedJobTypes, setSelectedJobTypes)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          selectedJobTypes.includes(jt.value)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {jt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Work Mode Preference</Label>
                  <div className="flex flex-wrap gap-2">
                    {REMOTE_TYPES.map((rt) => (
                      <button
                        key={rt.value}
                        type="button"
                        onClick={() => toggleChip(rt.value, selectedRemoteTypes, setSelectedRemoteTypes)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          selectedRemoteTypes.includes(rt.value)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {rt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Preferred Work Locations</Label>
                  <Input
                    placeholder="e.g. Chennai, Bangalore, Hyderabad (comma separated)"
                    value={preferredLocations}
                    onChange={(e) => setPreferredLocations(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Expected Salary (Min, INR/yr)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 400000"
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Expected Salary (Max, INR/yr)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 800000"
                      value={salaryMax}
                      onChange={(e) => setSalaryMax(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Notice Period (days)</Label>
                  <Select value={noticePeriod} onValueChange={setNoticePeriod}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Immediate</SelectItem>
                      <SelectItem value="15">15 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>LinkedIn Profile</Label>
                  <Input
                    placeholder="https://linkedin.com/in/yourprofile"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>GitHub Profile</Label>
                  <Input
                    placeholder="https://github.com/yourusername"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Portfolio URL</Label>
                  <Input
                    placeholder="https://yourportfolio.com"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Personal Website</Label>
                  <Input
                    placeholder="https://yourblog.com"
                    value={personalWebsite}
                    onChange={(e) => setPersonalWebsite(e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-2 bg-transparent">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                Skip for now
              </Button>
            )}
          </div>
          <Button onClick={handleNext} disabled={isLoading} className="gap-2">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : step < 3 ? (
              <>
                Next <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                Complete Setup <CheckCircle2 className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
