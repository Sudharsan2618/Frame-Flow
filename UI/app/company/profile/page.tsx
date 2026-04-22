"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Building2, Loader2, CheckCircle2, Save, Link2, Mail, Phone,
  Globe, CreditCard, ShieldCheck, Briefcase
} from "lucide-react"
import { getCompanyProfile, updateCompanyProfile, type CompanyProfile } from "@/lib/api"
import { CompanyProfileSkeleton } from "@/components/skeletons"

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Editable fields
  const [companyName, setCompanyName] = useState("")
  const [description, setDescription] = useState("")
  const [industry, setIndustry] = useState("")
  const [companySize, setCompanySize] = useState("")
  const [foundedYear, setFoundedYear] = useState("")
  const [location, setLocation] = useState("")
  const [phone, setPhone] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [twitterUrl, setTwitterUrl] = useState("")
  const [billingEmail, setBillingEmail] = useState("")
  const [gstNumber, setGstNumber] = useState("")
  const [billingAddress, setBillingAddress] = useState("")

  useEffect(() => {
    getCompanyProfile()
      .then((p) => {
        setProfile(p)
        setCompanyName(p.company_name)
        setDescription(p.description || "")
        setIndustry(p.industry || "")
        setCompanySize(p.company_size || "")
        setFoundedYear(p.founded_year ? String(p.founded_year) : "")
        setLocation(p.headquarters_location || "")
        setPhone(p.phone || "")
        setWebsiteUrl(p.website_url || "")
        setContactEmail(p.contact_email || "")
        setContactPhone(p.contact_phone || "")
        setLinkedinUrl(p.linkedin_url || "")
        setTwitterUrl(p.twitter_url || "")
        setBillingEmail(p.billing_email || "")
        setGstNumber(p.gst_number || "")
        setBillingAddress(p.billing_address || "")
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const body: Record<string, unknown> = {
        company_name: companyName,
      }
      if (description) body.description = description
      if (industry) body.industry = industry
      if (companySize) body.company_size = companySize
      if (foundedYear) body.founded_year = parseInt(foundedYear)
      if (location) body.headquarters_location = location
      if (phone) body.phone = phone
      if (websiteUrl) body.website_url = websiteUrl
      if (contactEmail) body.contact_email = contactEmail
      if (contactPhone) body.contact_phone = contactPhone
      if (linkedinUrl) body.linkedin_url = linkedinUrl
      if (twitterUrl) body.twitter_url = twitterUrl
      if (billingEmail) body.billing_email = billingEmail
      if (gstNumber) body.gst_number = gstNumber
      if (billingAddress) body.billing_address = billingAddress

      const updated = await updateCompanyProfile(body as Partial<CompanyProfile>)
      setProfile(updated)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <CompanyProfileSkeleton />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Company Profile</h1>
          <p className="text-muted-foreground">Manage your company public profile and contact details.</p>
        </div>
        {profile?.is_verified && (
          <Badge variant="outline" className="gap-1 border-green-300 text-green-700 bg-green-50">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified
          </Badge>
        )}
      </div>

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

      <Tabs defaultValue="info" className="flex flex-col gap-4">
        <TabsList className="self-start">
          <TabsTrigger value="info">Company Info</TabsTrigger>
          <TabsTrigger value="contact">Contact & Social</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Company Info Tab */}
        <TabsContent value="info">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Company Information</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Company Name</Label>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Industry</Label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Technology">Technology</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="E-commerce">E-commerce</SelectItem>
                        <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="Consulting">Consulting</SelectItem>
                        <SelectItem value="Media">Media</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Company Size</Label>
                    <Select value={companySize} onValueChange={setCompanySize}>
                      <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10 employees">1-10 employees</SelectItem>
                        <SelectItem value="10-50 employees">10-50 employees</SelectItem>
                        <SelectItem value="50-200 employees">50-200 employees</SelectItem>
                        <SelectItem value="200-1000 employees">200-1000 employees</SelectItem>
                        <SelectItem value="1000+ employees">1000+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Founded Year</Label>
                    <Input type="number" placeholder="e.g. 2018" value={foundedYear} onChange={(e) => setFoundedYear(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label>Headquarters Location</Label>
                    <Input placeholder="e.g. Chennai, India" value={location} onChange={(e) => setLocation(e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Description</Label>
                  <Textarea placeholder="Tell candidates about your company..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                </div>
                <Button className="self-start gap-2" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-6">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="text-base">Company Logo</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <div className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted">
                    <Building2 className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <Button variant="outline" size="sm">Upload Logo</Button>
                  <p className="text-center text-xs text-muted-foreground">PNG or JPG, max 2MB. This will appear on your job listings.</p>
                </CardContent>
              </Card>

              {profile && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Jobs Posted</span>
                      <span className="font-medium">{profile.total_jobs_posted}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Hires</span>
                      <span className="font-medium">{profile.total_hires}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Account Email</span>
                      <span className="font-medium text-xs truncate ml-2">{profile.email}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Contact & Social Tab */}
        <TabsContent value="contact">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> Contact Details</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Contact Email</Label>
                  <Input placeholder="hr@company.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Contact Phone</Label>
                  <Input placeholder="+91 98765 43210" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Phone (account-level)</Label>
                  <Input placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Website</Label>
                  <Input placeholder="https://company.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" /> Social Links</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>LinkedIn</Label>
                  <Input placeholder="https://linkedin.com/company/..." value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Twitter / X</Label>
                  <Input placeholder="https://twitter.com/..." value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-4">
            <Button className="gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save Contact Info"}
            </Button>
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Billing Information</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Billing Email</Label>
                  <Input placeholder="billing@company.com" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>GST Number</Label>
                  <Input placeholder="22AAAAA0000A1Z5" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Billing Address</Label>
                <Textarea placeholder="Full billing address..." value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} rows={3} />
              </div>
              <Button className="self-start gap-2" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save Billing Info"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
