"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, AlertTriangle, BookOpen, Layers, Clock } from "lucide-react"
import { getCourseForBuilder, publishCourse, type CourseBuilderData } from "@/lib/api/admin-courses"

interface StepPublishProps {
  courseId: number
  courseData: CourseBuilderData | null
  onBack: () => void
  onPublished: () => void
}

export function StepPublish({ courseId, courseData: initialData, onBack, onPublished }: StepPublishProps) {
  const [course, setCourse] = useState<CourseBuilderData | null>(initialData)
  const [loading, setLoading] = useState(!initialData)
  const [publishing, setPublishing] = useState(false)
  const [publishErrors, setPublishErrors] = useState<string[]>([])
  const [published, setPublished] = useState(false)

  useEffect(() => {
    if (!initialData) {
      getCourseForBuilder(courseId)
        .then(setCourse)
        .catch(console.error)
        .finally(() => setLoading(false))
    } else {
      // Refresh to get latest data
      getCourseForBuilder(courseId).then(setCourse).catch(() => {})
    }
  }, [courseId])

  async function handlePublish() {
    setPublishing(true)
    setPublishErrors([])
    try {
      const result = await publishCourse(courseId)
      if (result.success) {
        setPublished(true)
        setTimeout(onPublished, 1500)
      } else {
        setPublishErrors(result.errors || ["Unknown validation error"])
      }
    } catch (e: any) {
      setPublishErrors([e.message || "Failed to publish"])
    } finally {
      setPublishing(false)
    }
  }

  if (loading || !course) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
        <span className="text-sm text-muted-foreground">Loading preview...</span>
      </div>
    )
  }

  const totalLessons = course.modules.reduce((s, m) => s + m.lessons.length, 0)
  const totalDuration = course.modules.reduce(
    (s, m) => s + m.lessons.reduce((ls, l) => ls + (l.duration_minutes || 0), 0), 0
  )

  return (
    <div className="space-y-6 max-w-3xl">
      {published && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-sm font-medium text-green-700 dark:text-green-400">Course published successfully! Redirecting...</p>
          </CardContent>
        </Card>
      )}

      {/* Course Summary */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Course Preview</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            {course.thumbnail_url && (
              <img src={course.thumbnail_url} alt="" className="w-32 h-20 rounded-md object-cover border" />
            )}
            <div className="flex-1">
              <h3 className="text-xl font-bold">{course.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{course.short_description || "No description"}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{course.difficulty_level}</Badge>
                <Badge variant="outline">{course.pricing_model === "free" ? "Free" : `₹${course.price}`}</Badge>
                {course.is_published && <Badge className="bg-green-100 text-green-700">Published</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{course.modules.length}</p>
              <p className="text-xs text-muted-foreground">Modules</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Layers className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalLessons}</p>
              <p className="text-xs text-muted-foreground">Lessons</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalDuration > 0 ? `${totalDuration}m` : "—"}</p>
              <p className="text-xs text-muted-foreground">Total Duration</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Curriculum Summary */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Curriculum Summary</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {course.modules.map((mod, mIdx) => (
            <div key={mod.module_id} className="space-y-1">
              <div className="flex items-center gap-2">
                {mod.lessons.length > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                )}
                <span className="text-sm font-medium">
                  Module {mIdx + 1}: {mod.title}
                </span>
                <span className="text-xs text-muted-foreground">({mod.lessons.length} lessons)</span>
              </div>
              <div className="pl-6 space-y-0.5">
                {mod.lessons.map((les, lIdx) => {
                  const hasContent = !!(les.content_url || les.text_content || les.video_external_id || les.content_type === "quiz" || les.content_type === "flashcard")
                  return (
                    <div key={les.lesson_id} className="flex items-center gap-2 text-xs">
                      {hasContent ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      )}
                      <span className={hasContent ? "text-muted-foreground" : "text-yellow-600"}>
                        {lIdx + 1}. {les.title}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">{les.content_type}</Badge>
                      {!hasContent && <span className="text-[10px] text-yellow-500">— missing content</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          {course.modules.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No modules added yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {publishErrors.length > 0 && (
        <Card className="border-destructive">
          <CardContent className="p-4 space-y-1">
            <p className="text-sm font-medium text-destructive">Cannot publish — please fix:</p>
            {publishErrors.map((err, i) => (
              <p key={i} className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {err}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Back to Curriculum</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onPublished}>Save as Draft</Button>
          <Button onClick={handlePublish} disabled={publishing || published}>
            {publishing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {published ? "Published!" : "Publish Course"}
          </Button>
        </div>
      </div>
    </div>
  )
}
