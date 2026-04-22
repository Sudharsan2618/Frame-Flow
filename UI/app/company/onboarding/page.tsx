"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, ArrowRight, ArrowLeft, Loader2, Info, Phone, Link2, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

const STEPS = [
  { id: 1, title: "Company Info", icon: Info, description: "Tell us about your company" },
  { id: 2, title: "Contact Details", icon: Phone, description: "How can people reach you?" },
  { id: 3, title: "Social & Billing", icon: Link2, description: "Online presence and billing" },
]

const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Education", "E-commerce",
  "Manufacturing", "Consulting", "Media", "Real Estate", "Logistics",
  "Retail", "Telecommunications", "Energy", "Agriculture", "Other",
]

const COMPANY_SIZES = [
  "1-10 employees", "11-50 employees", "51-200 employees",
  "201-500 employees", "501-1000 employees", "1000+ employees",
]

export default function CompanyOnboardingPage() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, token, updateUser } = useAuth()
  const router = useRouter()

  // Step 1: Company Info
  const [description, setDescription] = useState("")
  const [industry, setIndustry] = useState("")
  const [companySize, setCompanySize] = useState("")
  const [foundedYear, setFoundedYear] = useState("")
  const [headquartersLocation, setHeadquartersLocation] = useState("")

  // Step 2: Contact
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")

  // Step 3: Social & Billing
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [twitterUrl, setTwitterUrl] = useState("")
  const [billingEmail, setBillingEmail] = useState("")
  const [gstNumber, setGstNumber] = useState("")
  const [billingAddress, setBillingAddress] = useState("")

  async function handleSubmit() {
    setIsLoading(true)
    setError(null)

    const body: Record<string, unknown> = {}

    if (description) body.description = description
    if (industry) body.industry = industry
    if (companySize) body.company_size = companySize
    if (foundedYear) body.founded_year = parseInt(foundedYear)
    if (headquartersLocation) body.headquarters_location = headquartersLocation
    if (websiteUrl) body.website_url = websiteUrl
    if (contactEmail) body.contact_email = contactEmail
    if (contactPhone) body.contact_phone = contactPhone
    if (linkedinUrl) body.linkedin_url = linkedinUrl
    if (twitterUrl) body.twitter_url = twitterUrl
    if (billingEmail) body.billing_email = billingEmail
    if (gstNumber) body.gst_number = gstNumber
    if (billingAddress) body.billing_address = billingAddress

    try {
      const res = await fetch(`${API_BASE}/auth/onboarding/company`, {
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
      router.push("/company")
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
            <Building2 className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">SkillBridge</p>
            <h1 className="text-lg font-bold text-foreground">
              Welcome, {user?.company_name}! Let&apos;s complete your profile
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
                    ? "bg-accent text-accent-foreground"
                    : step === s.id
                    ? "bg-accent text-accent-foreground"
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
                <div className={`h-0.5 flex-1 rounded ${step > s.id ? "bg-accent" : "bg-muted"}`} />
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
                  <Label>Company Description</Label>
                  <Textarea
                    placeholder="Describe what your company does, your mission, and culture..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Industry</Label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((ind) => (
                          <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Company Size</Label>
                    <Select value={companySize} onValueChange={setCompanySize}>
                      <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                      <SelectContent>
                        {COMPANY_SIZES.map((size) => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Founded Year</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 2015"
                      value={foundedYear}
                      onChange={(e) => setFoundedYear(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Headquarters</Label>
                    <Input
                      placeholder="e.g. Bangalore, India"
                      value={headquartersLocation}
                      onChange={(e) => setHeadquartersLocation(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Company Website</Label>
                  <Input
                    placeholder="https://yourcompany.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    placeholder="contact@yourcompany.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Contact Phone</Label>
                  <Input
                    placeholder="+91 44 1234 5678"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>LinkedIn Page</Label>
                  <Input
                    placeholder="https://linkedin.com/company/yourcompany"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Twitter / X Handle</Label>
                  <Input
                    placeholder="https://twitter.com/yourcompany"
                    value={twitterUrl}
                    onChange={(e) => setTwitterUrl(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Billing Email</Label>
                  <Input
                    type="email"
                    placeholder="billing@yourcompany.com"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>GST Number</Label>
                  <Input
                    placeholder="e.g. 29AXXXX1234X1Z5"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Billing Address</Label>
                  <Textarea
                    placeholder="Your company billing address..."
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    rows={2}
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
