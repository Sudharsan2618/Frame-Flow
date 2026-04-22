"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  User, Mail, MapPin, GraduationCap, Award, FileText, Clock,
  Upload, Loader2, CheckCircle2, Briefcase, Languages, ShieldCheck,
  Sparkles, AlertCircle, Link2, Save
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { uploadResume, getResumeAnalysis, getStudentProfile, updateStudentProfile, type ResumeAnalysis, type StudentProfile } from "@/lib/api"
import { ProfileSkeleton } from "@/components/skeletons"

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

export default function ProfilePage() {
  const { user } = useAuth()

  // Profile data
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Editable fields
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [headline, setHeadline] = useState("")
  const [bio, setBio] = useState("")
  const [location, setLocation] = useState("")
  const [education, setEducation] = useState("")
  const [experienceYears, setExperienceYears] = useState("0")
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [githubUrl, setGithubUrl] = useState("")
  const [portfolioUrl, setPortfolioUrl] = useState("")
  const [personalWebsite, setPersonalWebsite] = useState("")
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([])
  const [selectedRemoteTypes, setSelectedRemoteTypes] = useState<string[]>([])
  const [preferredLocations, setPreferredLocations] = useState("")
  const [salaryMin, setSalaryMin] = useState("")
  const [salaryMax, setSalaryMax] = useState("")
  const [noticePeriod, setNoticePeriod] = useState("")

  // Resume upload state
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load profile + resume analysis on mount
  useEffect(() => {
    getStudentProfile()
      .then((p) => {
        setProfile(p)
        setFirstName(p.first_name)
        setLastName(p.last_name)
        setEmail(p.email)
        setPhone(p.phone || "")
        setHeadline(p.headline || "")
        setBio(p.bio || "")
        setLocation(p.location || "")
        setEducation(p.education || "")
        setExperienceYears(String(p.experience_years))
        setLinkedinUrl(p.linkedin_url || "")
        setGithubUrl(p.github_url || "")
        setPortfolioUrl(p.portfolio_url || "")
        setPersonalWebsite(p.personal_website || "")
        setSelectedJobTypes(p.preferred_job_types || [])
        setSelectedRemoteTypes(p.preferred_remote_types || [])
        setPreferredLocations((p.preferred_locations || []).join(", "))
        setSalaryMin(p.salary_expectation_min ? String(p.salary_expectation_min) : "")
        setSalaryMax(p.salary_expectation_max ? String(p.salary_expectation_max) : "")
        setNoticePeriod(p.notice_period_days ? String(p.notice_period_days) : "")
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false))
  }, [])

  useEffect(() => {
    if (!user?.student_id) return
    setLoadingAnalysis(true)
    getResumeAnalysis(user.student_id)
      .then((data) => { if (data) setAnalysis(data) })
      .catch(() => {})
      .finally(() => setLoadingAnalysis(false))
  }, [user?.student_id])

  function toggleChip(value: string, list: string[], setList: (v: string[]) => void) {
    if (list.includes(value)) setList(list.filter((v) => v !== value))
    else setList([...list, value])
  }

  async function handleSaveProfile() {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const body: Record<string, unknown> = {
        first_name: firstName,
        last_name: lastName,
      }
      if (phone) body.phone = phone
      if (headline) body.headline = headline
      if (bio) body.bio = bio
      if (location) body.location = location
      if (education) body.education = education
      body.experience_years = parseInt(experienceYears) || 0
      if (linkedinUrl) body.linkedin_url = linkedinUrl
      if (githubUrl) body.github_url = githubUrl
      if (portfolioUrl) body.portfolio_url = portfolioUrl
      if (personalWebsite) body.personal_website = personalWebsite
      if (selectedJobTypes.length) body.preferred_job_types = selectedJobTypes
      if (selectedRemoteTypes.length) body.preferred_remote_types = selectedRemoteTypes
      if (preferredLocations) body.preferred_locations = preferredLocations.split(",").map(s => s.trim()).filter(Boolean)
      if (salaryMin) body.salary_expectation_min = parseFloat(salaryMin)
      if (salaryMax) body.salary_expectation_max = parseFloat(salaryMax)
      if (noticePeriod) body.notice_period_days = parseInt(noticePeriod)

      const updated = await updateStudentProfile(body as Partial<StudentProfile>)
      setProfile(updated)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const handleFileSelect = useCallback((file: File) => {
    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are accepted")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File must be under 5 MB")
      return
    }
    setResumeFile(file)
    setUploadError(null)
  }, [])

  const handleUpload = async () => {
    if (!resumeFile || !user?.student_id) return
    setUploading(true)
    setUploadError(null)
    try {
      const result = await uploadResume(user.student_id, resumeFile)
      setAnalysis(result.analysis)
      setResumeFile(null)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  if (loadingProfile) return <ProfileSkeleton />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground">Manage your profile, resume, and track applications.</p>
      </div>

      <Tabs defaultValue="profile" className="flex flex-col gap-4">
        <TabsList className="w-full sm:w-auto flex overflow-x-auto no-scrollbar">
          <TabsTrigger value="profile" className="text-xs sm:text-sm whitespace-nowrap flex-1 sm:flex-none">
            <span className="sm:hidden">Profile</span>
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="text-xs sm:text-sm whitespace-nowrap flex-1 sm:flex-none">
            <span className="sm:hidden">Job Prefs</span>
            <span className="hidden sm:inline">Job Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="resume" className="text-xs sm:text-sm whitespace-nowrap flex-1 sm:flex-none">
            <span className="sm:hidden">Resume</span>
            <span className="hidden sm:inline">Resume & AI Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="applications" className="text-xs sm:text-sm whitespace-nowrap flex-1 sm:flex-none">
            <span className="sm:hidden">Applied</span>
            <span className="hidden sm:inline">Applications</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {saveError && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive border border-destructive/20">
                    {saveError}
                  </div>
                )}
                {saveSuccess && (
                  <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 border border-green-200">
                    <CheckCircle2 className="h-4 w-4" /> Profile saved successfully!
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>First Name</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Last Name</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Email</Label>
                    <Input value={email} disabled className="bg-muted" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Phone</Label>
                    <Input placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
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
                  <Label>Headline</Label>
                  <Input placeholder="e.g. Full Stack Developer | ML Enthusiast" value={headline} onChange={(e) => setHeadline(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Education</Label>
                  <Input placeholder="e.g. B.Tech CS, Anna University" value={education} onChange={(e) => setEducation(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Bio</Label>
                  <Textarea placeholder="Tell us about yourself..." value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
                </div>
                <Button className="self-start gap-2" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-6">
              {/* Social Links */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" /> Social Links</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">LinkedIn</Label>
                    <Input placeholder="https://linkedin.com/in/..." value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">GitHub</Label>
                    <Input placeholder="https://github.com/..." value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Portfolio</Label>
                    <Input placeholder="https://..." value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Personal Website</Label>
                    <Input placeholder="https://..." value={personalWebsite} onChange={(e) => setPersonalWebsite(e.target.value)} />
                  </div>
                </CardContent>
              </Card>

              {/* Stats */}
              {profile && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Learning Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Courses Enrolled</span>
                      <span className="font-medium">{profile.total_courses_enrolled}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Courses Completed</span>
                      <span className="font-medium">{profile.total_courses_completed}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Learning Hours</span>
                      <span className="font-medium">{Math.round(profile.total_learning_hours)}h</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avg Quiz Score</span>
                      <span className="font-medium">{Math.round(profile.average_quiz_score)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Day Streak</span>
                      <span className="font-medium">{profile.streak_days}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Job Preferences Tab */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job Preferences</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
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
                <Label>Work Mode</Label>
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
                <Label>Preferred Locations</Label>
                <Input placeholder="Chennai, Bangalore, Hyderabad (comma separated)" value={preferredLocations} onChange={(e) => setPreferredLocations(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Salary Min (INR/yr)</Label>
                  <Input type="number" placeholder="400000" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Salary Max (INR/yr)</Label>
                  <Input type="number" placeholder="800000" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5 max-w-xs">
                <Label>Notice Period</Label>
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
              <Button className="self-start gap-2" onClick={handleSaveProfile} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save Preferences"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resume & AI Analysis Tab */}
        <TabsContent value="resume">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Upload Resume
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {/* Drag & Drop Zone */}
                <div
                  className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer
                    ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect(file)
                    }}
                  />
                  <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    {resumeFile ? resumeFile.name : "Drop your PDF resume here"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {resumeFile
                      ? `${(resumeFile.size / 1024).toFixed(0)} KB — Ready to upload`
                      : "PDF only, max 5 MB"}
                  </p>
                </div>

                {uploadError && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {uploadError}
                  </div>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={!resumeFile || uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Upload & Analyze
                    </>
                  )}
                </Button>

                {analysis && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Last analyzed: {new Date(analysis.analyzed_at).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Resume Preview/Download */}
            {analysis && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Current Resume
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-primary/10 p-2">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {analysis.file_url.split("/").pop()?.split("_").slice(2).join("_") || "Resume.pdf"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last updated: {new Date(analysis.analyzed_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={analysis.file_url} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                      <Button size="sm" asChild>
                        <a href={analysis.file_url} download>
                          Download
                        </a>
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Updating your resume will replace the current file and trigger a new AI analysis.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {/* Analysis Results Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> AI Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAnalysis ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="mt-2 text-sm text-muted-foreground">Loading analysis...</p>
                  </div>
                ) : analysis ? (
                  <div className="flex flex-col gap-5">
                    {/* Summary */}
                    {analysis.extracted_data.summary && (
                      <div>
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1.5">
                          <User className="h-3.5 w-3.5" /> Summary
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {analysis.extracted_data.summary}
                        </p>
                      </div>
                    )}

                    {/* Skills */}
                    {analysis.extracted_data.skills.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1.5">
                          <ShieldCheck className="h-3.5 w-3.5" /> Skills
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.extracted_data.skills.map((s) => (
                            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Experience */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1.5">
                        <Briefcase className="h-3.5 w-3.5" /> Experience
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {analysis.extracted_data.experience_years} years
                      </p>
                    </div>

                    {/* Job Titles */}
                    {analysis.extracted_data.job_titles.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1.5">
                          <Briefcase className="h-3.5 w-3.5" /> Previous Roles
                        </h4>
                        <ul className="flex flex-col gap-1">
                          {analysis.extracted_data.job_titles.map((t) => (
                            <li key={t} className="text-sm text-muted-foreground flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />{t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Education */}
                    {analysis.extracted_data.education.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1.5">
                          <GraduationCap className="h-3.5 w-3.5" /> Education
                        </h4>
                        <ul className="flex flex-col gap-1">
                          {analysis.extracted_data.education.map((e) => (
                            <li key={e} className="text-sm text-muted-foreground flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />{e}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Certifications */}
                    {analysis.extracted_data.certifications.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1.5">
                          <Award className="h-3.5 w-3.5" /> Certifications
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.extracted_data.certifications.map((c) => (
                            <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Languages */}
                    {analysis.extracted_data.languages.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1.5">
                          <Languages className="h-3.5 w-3.5" /> Languages
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.extracted_data.languages.map((l) => (
                            <Badge key={l} variant="secondary" className="text-xs">{l}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Match Ready Badge */}
                    {analysis.match_score_ready && (
                      <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-3 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        <p className="text-sm text-green-700">
                          Embedding generated — ready for job matching
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-foreground">No analysis yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload your resume to get AI-powered insights and enable job matching
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">My Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Briefcase className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-foreground">No applications yet</p>
                <p className="text-xs text-muted-foreground mt-1">Browse jobs and apply to see your applications here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
