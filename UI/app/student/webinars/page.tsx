"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Users, Video } from "lucide-react"
import { webinars } from "@/lib/mock-data"
import { WebinarsSkeleton } from "@/components/skeletons"

export default function WebinarsPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(t)
  }, [])

  if (loading) return <WebinarsSkeleton />

  const upcoming = webinars.filter(w => w.status === "upcoming")
  const completed = webinars.filter(w => w.status === "completed")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Live Webinars</h1>
        <p className="text-muted-foreground">Register for upcoming live sessions and access recordings.</p>
      </div>

      {/* Upcoming */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Upcoming Sessions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((w) => (
            <Card key={w.id} className="overflow-hidden">
              <div className="flex h-32 items-center justify-center bg-primary/5">
                <Video className="h-10 w-10 text-primary/30" />
              </div>
              <CardContent className="flex flex-col gap-3 p-5">
                <Badge variant="outline" className="self-start border-success text-success">Upcoming</Badge>
                <h3 className="font-semibold text-foreground">{w.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{w.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{w.date}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{w.time}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{w.attendees} registered</span>
                </div>
                <p className="text-xs text-muted-foreground">Hosted by {w.instructor}</p>
                <Button size="sm" className="mt-1">Register Now</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Completed */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Past Sessions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {completed.map((w) => (
            <Card key={w.id} className="overflow-hidden opacity-80">
              <div className="flex h-32 items-center justify-center bg-muted">
                <Video className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <CardContent className="flex flex-col gap-3 p-5">
                <Badge variant="secondary" className="self-start">Completed</Badge>
                <h3 className="font-semibold text-foreground">{w.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{w.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{w.date}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{w.attendees} attended</span>
                </div>
                <Button size="sm" variant="outline" className="mt-1 bg-transparent">Watch Recording</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
