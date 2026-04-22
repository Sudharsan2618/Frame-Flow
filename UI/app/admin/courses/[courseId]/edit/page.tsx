"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StepCourseInfo } from "@/components/course-builder/step-course-info"
import { StepCurriculum } from "@/components/course-builder/step-curriculum"
import { StepPublish } from "@/components/course-builder/step-publish"
import { getCourseForBuilder } from "@/lib/api/admin-courses"
import { cn } from "@/lib/utils"
import type { CourseBuilderData } from "@/lib/api/admin-courses"

const STEPS = [
  { label: "Course Info", number: 1 },
  { label: "Curriculum", number: 2 },
  { label: "Review & Publish", number: 3 },
]

export default function EditCoursePage() {
  const router = useRouter()
  const params = useParams()
  const courseId = Number(params.courseId)

  const [currentStep, setCurrentStep] = useState(1)
  const [courseSlug, setCourseSlug] = useState<string>("")
  const [courseData, setCourseData] = useState<CourseBuilderData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCourseForBuilder(courseId)
      .then((data) => {
        setCourseData(data)
        setCourseSlug(data.slug)
      })
      .catch((err) => console.error("Failed to load course:", err))
      .finally(() => setLoading(false))
  }, [courseId])

  const handleStep1Complete = useCallback((_id: number, slug: string) => {
    setCourseSlug(slug)
    setCurrentStep(2)
  }, [])

  const handleCourseDataUpdate = useCallback((data: CourseBuilderData) => {
    setCourseData(data)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-muted-foreground">Loading course...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/courses"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Course</h1>
          <p className="text-sm text-muted-foreground">{courseData?.title || "Loading..."}</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => (
          <div key={step.number} className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStep(step.number)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                currentStep === step.number
                  ? "bg-primary text-primary-foreground"
                  : currentStep > step.number
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {currentStep > step.number ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs">
                  {step.number}
                </span>
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn("h-px w-8 sm:w-12", currentStep > step.number ? "bg-primary" : "bg-border")} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {currentStep === 1 && (
        <StepCourseInfo
          courseId={courseId}
          initialData={courseData}
          onComplete={handleStep1Complete}
        />
      )}
      {currentStep === 2 && (
        <StepCurriculum
          courseId={courseId}
          courseSlug={courseSlug}
          onNext={() => setCurrentStep(3)}
          onBack={() => setCurrentStep(1)}
          onCourseDataUpdate={handleCourseDataUpdate}
        />
      )}
      {currentStep === 3 && (
        <StepPublish
          courseId={courseId}
          courseData={courseData}
          onBack={() => setCurrentStep(2)}
          onPublished={() => router.push("/admin/courses")}
        />
      )}
    </div>
  )
}
