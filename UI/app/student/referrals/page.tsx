"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Users,
  UserPlus,
  Gift,
  TrendingUp,
  Copy,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  MessageSquare,
  ArrowRight,
} from "lucide-react"
import { referralContacts, referralStats } from "@/lib/mock-data"
import { ReferralsSkeleton } from "@/components/skeletons"

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  contacted: "bg-accent/10 text-accent",
  interested: "bg-primary/10 text-primary",
  converted: "bg-success/10 text-success",
  not_interested: "bg-destructive/10 text-destructive",
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  contacted: "Contacted",
  interested: "Interested",
  converted: "Converted",
  not_interested: "Not Interested",
}

export default function ReferralsPage() {
  const [referralLink] = useState("https://recruitlms.com/ref/ALEX2026")
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(t)
  }, [])

  if (loading) return <ReferralsSkeleton />

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const myReferrals = referralContacts.filter((r) => r.referrerStudentId === 1)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Referrals</h1>
        <p className="text-muted-foreground">
          Refer friends and earn rewards when they join the platform.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
              <p className="text-2xl font-bold text-foreground">{referralStats.totalReferrals}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Converted</p>
              <p className="text-2xl font-bold text-foreground">{referralStats.convertedReferrals}</p>
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
              <p className="text-2xl font-bold text-foreground">{referralStats.conversionRate}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Gift className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rewards Earned</p>
              <p className="text-2xl font-bold text-foreground">₹{referralStats.rewardEarned.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Share your unique referral link. When someone signs up through your link, you&apos;ll both earn rewards!
          </p>
          <div className="flex gap-2">
            <Input value={referralLink} readOnly className="font-mono text-sm" />
            <Button onClick={handleCopy} variant="outline" className="shrink-0 gap-2 bg-transparent">
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="contacts" className="flex flex-col gap-4">
        <TabsList className="self-start">
          <TabsTrigger value="contacts">My Referrals ({myReferrals.length})</TabsTrigger>
          <TabsTrigger value="add">Add Referral</TabsTrigger>
        </TabsList>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="flex flex-col gap-3">
          {myReferrals.map((referral) => (
            <Card key={referral.id} className="transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    {referral.referredName.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{referral.referredName}</h3>
                    <p className="text-sm text-muted-foreground">{referral.relationship}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {referral.referredEmail}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {referral.referredPhone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Referred {referral.referredAt}
                      </span>
                    </div>
                    {referral.notes && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{referral.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Badge className={statusColors[referral.status]}>
                  {statusLabels[referral.status]}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Add Referral Tab */}
        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Refer a Friend</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 max-w-md">
              <div className="flex flex-col gap-1.5">
                <Label>Friend&apos;s Name</Label>
                <Input placeholder="Enter full name" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Email Address</Label>
                <Input type="email" placeholder="Enter email address" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Phone Number</Label>
                <Input type="tel" placeholder="+91-9876543210" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Relationship</Label>
                <Input placeholder="e.g., College Friend, Work Colleague" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Notes (Optional)</Label>
                <Input placeholder="What courses might interest them?" />
              </div>
              <Button className="self-start gap-2">
                <UserPlus className="h-4 w-4" />
                Send Referral
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
