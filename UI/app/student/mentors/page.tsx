"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Star,
  Clock,
  Calendar,
  Building2,
  Briefcase,
  IndianRupee,
  CheckCircle2,
  Users,
  ExternalLink,
  MessageSquare,
} from "lucide-react"
import { mentors, mentorSessions } from "@/lib/mock-data"
import { MentorsSkeleton } from "@/components/skeletons"

const statusColors: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-muted text-muted-foreground",
  rescheduled: "bg-accent/10 text-accent",
}

export default function MentorsPage() {
  const [search, setSearch] = useState("")
  const [priceFilter, setPriceFilter] = useState("All")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(t)
  }, [])

  if (loading) return <MentorsSkeleton />

  const filtered = mentors.filter((m) => {
    if (!m.isActive) return false
    if (
      search &&
      !m.name.toLowerCase().includes(search.toLowerCase()) &&
      !m.expertiseAreas.some((e) => e.toLowerCase().includes(search.toLowerCase())) &&
      !m.currentCompany.toLowerCase().includes(search.toLowerCase())
    )
      return false
    if (priceFilter === "Free" && !m.isFree) return false
    if (priceFilter === "Paid" && m.isFree) return false
    return true
  })

  const upcomingSessions = mentorSessions.filter((s) => s.status === "scheduled")
  const pastSessions = mentorSessions.filter((s) => s.status === "completed")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mentors</h1>
        <p className="text-muted-foreground">
          Connect with industry experts for 1:1 guidance on your career and skills.
        </p>
      </div>

      <Tabs defaultValue="discover" className="flex flex-col gap-4">
        <TabsList className="self-start">
          <TabsTrigger value="discover">Discover Mentors</TabsTrigger>
          <TabsTrigger value="sessions">My Sessions ({mentorSessions.length})</TabsTrigger>
        </TabsList>

        {/* Discover Mentors */}
        <TabsContent value="discover" className="flex flex-col gap-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, expertise, company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {["All", "Free", "Paid"].map((f) => (
                <Button
                  key={f}
                  variant={priceFilter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPriceFilter(f)}
                  className={priceFilter !== f ? "bg-transparent" : ""}
                >
                  {f}
                </Button>
              ))}
            </div>
          </div>

          {/* Mentor Cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((mentor) => (
              <Card key={mentor.id} className="overflow-hidden transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col gap-4 p-5">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                      {mentor.firstName[0]}
                      {mentor.lastName[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">{mentor.name}</h3>
                        {mentor.isVerified && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{mentor.headline}</p>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {mentor.currentCompany}
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      {mentor.yearsOfExperience} yrs
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {mentor.averageRating}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {mentor.totalSessions} sessions
                    </span>
                  </div>

                  {/* Bio */}
                  <p className="text-sm text-muted-foreground line-clamp-2">{mentor.bio}</p>

                  {/* Expertise */}
                  <div className="flex flex-wrap gap-1.5">
                    {mentor.expertiseAreas.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  {/* Pricing + Book */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div>
                      {mentor.isFree ? (
                        <Badge className="bg-success/10 text-success border-success/20">Free</Badge>
                      ) : (
                        <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                          <IndianRupee className="h-3.5 w-3.5" />
                          {mentor.sessionPrice.toLocaleString()}
                          <span className="text-xs font-normal text-muted-foreground">
                            / {mentor.sessionDurationMinutes} min
                          </span>
                        </div>
                      )}
                    </div>
                    <Button size="sm">Book Session</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-lg font-medium text-foreground">No mentors found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          )}
        </TabsContent>

        {/* My Sessions */}
        <TabsContent value="sessions" className="flex flex-col gap-6">
          {/* Upcoming Sessions */}
          {upcomingSessions.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-foreground">Upcoming Sessions</h2>
              <div className="flex flex-col gap-3">
                {upcomingSessions.map((session) => (
                  <Card key={session.id} className="transition-shadow hover:shadow-md">
                    <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{session.topic}</h3>
                          <p className="text-sm text-muted-foreground">{session.mentorName} · {session.mentorRole}</p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {session.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {session.time}
                            </span>
                            <span>{session.duration} min</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                        <Badge className={statusColors[session.status]}>{session.status}</Badge>
                        <Button size="sm" variant="outline" className="bg-transparent gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Join
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Past Sessions */}
          {pastSessions.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-foreground">Past Sessions</h2>
              <div className="flex flex-col gap-3">
                {pastSessions.map((session) => (
                  <Card key={session.id} className="transition-shadow hover:shadow-sm opacity-90">
                    <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10">
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{session.topic}</h3>
                          <p className="text-sm text-muted-foreground">{session.mentorName} · {session.mentorRole}</p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {session.date}
                            </span>
                            <span>{session.duration} min</span>
                          </div>
                          {session.feedback && (
                            <div className="mt-2 flex items-start gap-2 rounded-lg bg-muted/50 p-2">
                              <MessageSquare className="h-3 w-3 mt-0.5 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">{session.feedback}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                        <Badge className={statusColors[session.status]}>{session.status}</Badge>
                        {session.rating && (
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < session.rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
