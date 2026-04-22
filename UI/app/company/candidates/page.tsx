"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronRight, Search, Loader2, ExternalLink, MapPin, Briefcase } from "lucide-react"
import { CompanyCandidatesSkeleton } from "@/components/skeletons"
import { getCompanyCandidates, updateCandidateStage, type CompanyCandidate } from "@/lib/api"

const stages = [
  { id: "new_candidates", label: "New Candidates", color: "bg-primary/10 text-primary" },
  { id: "under_review", label: "Under Review", color: "bg-accent/10 text-accent-foreground" },
  { id: "interviewing", label: "Interviewing", color: "bg-amber-100 text-amber-800" },
  { id: "offer_extended", label: "Offer Extended", color: "bg-success/10 text-success" },
  { id: "hired", label: "Hired", color: "bg-emerald-100 text-emerald-800" },
]

function getMatchColor(score: number) {
  if (score >= 80) return "bg-emerald-100 text-emerald-800"
  if (score >= 60) return "bg-amber-100 text-amber-800"
  return "bg-muted text-muted-foreground"
}

export default function CandidatePipeline() {
  const [candidates, setCandidates] = useState<CompanyCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [searchDebounced, setSearchDebounced] = useState("")

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const loadCandidates = useCallback(() => {
    setLoading(true)
    getCompanyCandidates({ search: searchDebounced, limit: 200 })
      .then((res) => setCandidates(res.candidates))
      .catch((err) => console.error("Failed to load candidates:", err))
      .finally(() => setLoading(false))
  }, [searchDebounced])

  useEffect(() => { loadCandidates() }, [loadCandidates])

  async function moveToStage(applicationId: number, newStage: string) {
    setActionLoading(applicationId)
    try {
      await updateCandidateStage(applicationId, newStage)
      loadCandidates()
    } catch (err) {
      console.error("Stage update failed:", err)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading && candidates.length === 0) return <CompanyCandidatesSkeleton />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Candidate Pipeline</h1>
        <p className="text-muted-foreground">Manage candidates forwarded by the admin team. Move them through your hiring pipeline.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search candidates..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Refreshing...
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid gap-4 lg:grid-cols-5">
        {stages.map((stage, stageIdx) => {
          const stageCandidates = candidates.filter((c) => c.company_stage === stage.id)
          const nextStage = stageIdx < stages.length - 1 ? stages[stageIdx + 1] : null
          return (
            <div key={stage.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span className="text-sm font-semibold text-foreground">{stage.label}</span>
                <Badge variant="secondary" className="text-xs">{stageCandidates.length}</Badge>
              </div>
              <div className="flex flex-col gap-3">
                {stageCandidates.map((c) => (
                  <Card key={c.application_id} className="transition-shadow hover:shadow-md">
                    <CardContent className="flex flex-col gap-2.5 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {c.name ? c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{c.headline || c.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Briefcase className="h-3 w-3" />
                        <span className="truncate">{c.job_title}</span>
                      </div>

                      {c.current_location && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{c.current_location}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1">
                        {c.skills.slice(0, 3).map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">{s}</Badge>
                        ))}
                        {c.skills.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{c.skills.length - 3}</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge className={getMatchColor(c.match_score)}>
                          {c.match_score.toFixed(0)}% match
                        </Badge>
                        {c.total_experience_months != null && c.total_experience_months > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {Math.floor(c.total_experience_months / 12)}y exp
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        {c.linkedin_url && (
                          <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5">
                            LinkedIn <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                        {c.github_url && (
                          <a href={c.github_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5">
                            GitHub <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>

                      {nextStage && (
                        <div className="pt-1 border-t border-border">
                          {actionLoading === c.application_id ? (
                            <div className="flex justify-center py-1">
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-full gap-1 text-xs h-7"
                              onClick={() => moveToStage(c.application_id, nextStage.id)}
                            >
                              Move to {nextStage.label} <ChevronRight className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}

                      <p className="text-[10px] text-muted-foreground">
                        Forwarded {c.forwarded_at ? new Date(c.forwarded_at).toLocaleDateString() : "—"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {stageCandidates.length === 0 && (
                  <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-8">
                    <p className="text-xs text-muted-foreground">No candidates</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
