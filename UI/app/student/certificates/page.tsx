"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Award, ExternalLink, Loader2, BookOpen } from "lucide-react"
import Link from "next/link"
import { getMyCertificates, getCertificateViewUrl, type Certificate } from "@/lib/api"

export default function MyCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyCertificates()
      .then((res) => setCertificates(res.certificates))
      .catch((err) => console.error("Failed to load certificates:", err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Certificates</h1>
          <p className="text-muted-foreground">Your earned course completion certificates.</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Certificates</h1>
        <p className="text-muted-foreground">Your earned course completion certificates.</p>
      </div>

      {certificates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Award className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No Certificates Yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Complete a course to earn your first certificate. Certificates are issued automatically when you finish all lessons.
            </p>
            <Button asChild className="mt-4">
              <Link href="/student/courses">
                <BookOpen className="mr-2 h-4 w-4" />
                Browse Courses
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certificates.map((cert) => (
            <Card key={cert.enrollment_id} className="group hover:shadow-md transition-shadow">
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Award className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{cert.course_title}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {(cert.difficulty_level || "").replace("_", " ")}
                      </Badge>
                      {cert.duration_hours && (
                        <span className="text-[10px] text-muted-foreground">{cert.duration_hours}h</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Issued: {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
                  </span>
                  <span className="font-mono text-[10px]">SB-{String(cert.enrollment_id).padStart(6, "0")}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => window.open(getCertificateViewUrl(cert.enrollment_id), "_blank")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Certificate
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/student/courses/${cert.course_slug}`}>
                      Course
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
